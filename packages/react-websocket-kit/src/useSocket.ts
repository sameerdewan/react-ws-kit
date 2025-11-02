import { useEffect, useRef, useState, useCallback } from 'react'
import type { Options, NormalizedOptions, Status, Subscriber, SocketInstance, UseSocketReturn } from './types'
import { createSocketKey } from './hash'
import { socketStore } from './store'

/**
 * Default parse function
 */
const defaultParse = <TIn,>(event: MessageEvent): TIn => {
  return JSON.parse(event.data) as TIn
}

/**
 * Default serialize function
 */
const defaultSerialize = <TOut,>(data: TOut): string => {
  return JSON.stringify(data)
}

/**
 * Normalize options with defaults
 */
function normalizeOptions<TIn, TOut>(options?: Options<TIn, TOut>): NormalizedOptions<TIn, TOut> {
  return {
    autoConnect: options?.autoConnect ?? false,
    protocols: options?.protocols,
    autoReconnect: options?.autoReconnect ?? false,
    reconnectAttempts: options?.reconnectAttempts ?? Infinity,
    reconnectDelay: options?.reconnectDelay ?? 1000,
    queueMessages: options?.queueMessages ?? false,
    maxQueueSize: options?.maxQueueSize ?? 50,
    parse: options?.parse ?? defaultParse,
    serialize: options?.serialize ?? defaultSerialize,
    key: options?.key
  }
}

/**
 * Generate unique subscriber ID
 */
let subscriberIdCounter = 0
function generateSubscriberId(): string {
  return `sub-${++subscriberIdCounter}-${Date.now()}`
}

/**
 * Typed WebSocket hook with sharing, queuing, and kill switch
 */
export function useSocket<TIn = unknown, TOut = unknown>(
  url: string,
  options?: Options<TIn, TOut>
): UseSocketReturn<TIn, TOut> {
  // Normalize config once
  const config = useRef(normalizeOptions<TIn, TOut>(options)).current
  const socketKey = useRef(createSocketKey(url, config)).current
  const subscriberId = useRef(generateSubscriberId()).current

  // Local state for this hook instance
  const [status, setStatus] = useState<Status>('disconnected')
  const [lastReturnedData, setLastReturnedData] = useState<TIn | undefined>(undefined)
  const [allData, setAllData] = useState<TIn[]>([])

  // Ref to track if we're currently connected
  const isConnectedRef = useRef(false)

  /**
   * Add data to allData array
   */
  const addToAllData = useCallback((data: TIn) => {
    setAllData(prev => [...prev, data])
  }, [])

  /**
   * Create or get the shared socket instance
   */
  const getOrCreateInstance = useCallback((): SocketInstance<TIn, TOut> => {
    let instance = socketStore.get<TIn, TOut>(socketKey)
    
    if (!instance) {
      instance = {
        socket: null,
        key: socketKey,
        status: 'disconnected',
        subscribers: new Set(),
        refCount: 0,
        reconnectAttemptsMade: 0,
        messageQueue: [],
        config,
        killed: false,
        reconnectTimer: null
      }
      socketStore.set(socketKey, instance)
    }
    
    return instance
  }, [socketKey, config])

  /**
   * Update status for all subscribers
   */
  const updateAllSubscribers = useCallback((instance: SocketInstance<TIn, TOut>, newStatus: Status) => {
    instance.status = newStatus
    instance.subscribers.forEach(sub => {
      sub.setStatus(newStatus)
    })
  }, [])

  /**
   * Flush queued messages
   */
  const flushQueue = useCallback((instance: SocketInstance<TIn, TOut>) => {
    if (!instance.socket || instance.socket.readyState !== WebSocket.OPEN) {
      return
    }

    while (instance.messageQueue.length > 0) {
      const data = instance.messageQueue.shift()!
      try {
        const serialized = instance.config.serialize(data)
        instance.socket.send(serialized)
      } catch (error) {
        console.error('[useSocket] Error flushing queued message:', error)
      }
    }
  }, [])

  /**
   * Schedule reconnection with linear backoff
   */
  const scheduleReconnect = useCallback((instance: SocketInstance<TIn, TOut>) => {
    // Clear any existing timer
    if (instance.reconnectTimer) {
      clearTimeout(instance.reconnectTimer)
      instance.reconnectTimer = null
    }

    // Don't reconnect if killed or auto-reconnect is disabled
    if (instance.killed || !instance.config.autoReconnect) {
      return
    }

    // Check if we've exhausted attempts
    if (instance.reconnectAttemptsMade >= instance.config.reconnectAttempts) {
      console.log('[useSocket] Reconnect attempts exhausted')
      updateAllSubscribers(instance, 'error')
      return
    }

    instance.reconnectAttemptsMade++
    const delay = instance.config.reconnectDelay * instance.reconnectAttemptsMade

    console.log(`[useSocket] Scheduling reconnect attempt ${instance.reconnectAttemptsMade} in ${delay}ms`)
    updateAllSubscribers(instance, 'reconnecting')

    instance.reconnectTimer = setTimeout(() => {
      instance.reconnectTimer = null
      connectSocket(instance)
    }, delay)
  }, [updateAllSubscribers])

  /**
   * Connect the WebSocket
   */
  const connectSocket = useCallback((instance: SocketInstance<TIn, TOut>) => {
    // If already connected or connecting, sync status and do nothing
    if (instance.socket?.readyState === WebSocket.OPEN) {
      updateAllSubscribers(instance, 'connected')
      return
    }
    
    if (instance.socket?.readyState === WebSocket.CONNECTING) {
      updateAllSubscribers(instance, 'connecting')
      return
    }

    // Clear any reconnect timers
    if (instance.reconnectTimer) {
      clearTimeout(instance.reconnectTimer)
      instance.reconnectTimer = null
    }

    try {
      updateAllSubscribers(instance, 'connecting')

      const ws = new WebSocket(url, instance.config.protocols)
      instance.socket = ws

      ws.onopen = () => {
        console.log('[useSocket] Connected:', socketKey)
        instance.reconnectAttemptsMade = 0 // Reset on successful connection
        updateAllSubscribers(instance, 'connected')
        
        // Flush queued messages
        flushQueue(instance)
      }

      ws.onmessage = (event: MessageEvent) => {
        try {
          // Parse once at the socket level
          const data = instance.config.parse(event)
          
          // Fan out to all connected subscribers
          instance.subscribers.forEach(sub => {
            if (sub.isConnected) {
              sub.setLastReturnedData(data)
              sub.addToAllData(data)
            }
          })
        } catch (error) {
          console.error('[useSocket] Parse error:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('[useSocket] WebSocket error:', error)
        updateAllSubscribers(instance, 'error')
      }

      ws.onclose = () => {
        console.log('[useSocket] Disconnected:', socketKey)
        instance.socket = null
        
        // If not killed, attempt reconnect
        if (!instance.killed && instance.config.autoReconnect && instance.refCount > 0) {
          scheduleReconnect(instance)
        } else {
          updateAllSubscribers(instance, 'disconnected')
        }
      }
    } catch (error) {
      console.error('[useSocket] Connection error:', error)
      updateAllSubscribers(instance, 'error')
      
      // Schedule reconnect if appropriate
      if (!instance.killed && instance.config.autoReconnect) {
        scheduleReconnect(instance)
      }
    }
  }, [url, socketKey, updateAllSubscribers, flushQueue, scheduleReconnect])

  /**
   * Connect handler
   */
  const connect = useCallback(() => {
    const instance = getOrCreateInstance()
    
    // If this subscriber is not yet registered, register it
    if (!isConnectedRef.current) {
      const subscriber: Subscriber<TIn> = {
        id: subscriberId,
        isConnected: true,
        setStatus,
        setLastReturnedData,
        addToAllData
      }
      
      instance.subscribers.add(subscriber)
      instance.refCount++
      isConnectedRef.current = true
      
      // Immediately sync status with current instance status
      // This fixes the issue where a late-joining subscriber doesn't see the correct status
      setStatus(instance.status)
    }

    // Reset killed flag when manually connecting
    instance.killed = false

    // Connect if needed
    connectSocket(instance)
  }, [getOrCreateInstance, subscriberId, addToAllData, connectSocket])

  /**
   * Disconnect handler
   */
  const disconnect = useCallback(() => {
    const instance = socketStore.get<TIn, TOut>(socketKey)
    if (!instance || !isConnectedRef.current) return

    // Find and remove this subscriber
    const subscriberToRemove = Array.from(instance.subscribers).find(
      sub => sub.id === subscriberId
    )
    
    if (subscriberToRemove) {
      instance.subscribers.delete(subscriberToRemove)
      instance.refCount--
      isConnectedRef.current = false
    }

    // If no more subscribers, close the socket and clean up
    if (instance.refCount <= 0) {
      if (instance.reconnectTimer) {
        clearTimeout(instance.reconnectTimer)
        instance.reconnectTimer = null
      }

      if (instance.socket) {
        instance.socket.close()
        instance.socket = null
      }

      socketStore.delete(socketKey)
    }

    setStatus('disconnected')
  }, [socketKey, subscriberId])

  /**
   * Send handler
   */
  const send = useCallback((data: TOut) => {
    const instance = socketStore.get<TIn, TOut>(socketKey)
    if (!instance) {
      console.error('[useSocket] Cannot send: no instance found')
      return
    }

    // If connected, send immediately
    if (instance.socket?.readyState === WebSocket.OPEN) {
      try {
        const serialized = instance.config.serialize(data)
        instance.socket.send(serialized)
      } catch (error) {
        console.error('[useSocket] Send error:', error)
      }
    } else if (instance.config.queueMessages) {
      // Queue the message
      instance.messageQueue.push(data)
      
      // Drop oldest if queue is full
      while (instance.messageQueue.length > instance.config.maxQueueSize) {
        instance.messageQueue.shift()
      }
      
      console.log(`[useSocket] Message queued (${instance.messageQueue.length}/${instance.config.maxQueueSize})`)
    } else {
      console.error('[useSocket] Cannot send: not connected and queueMessages is false')
    }
  }, [socketKey])

  /**
   * Kill switch - close socket for all subscribers and prevent auto-reconnect
   */
  const killSocketForAllSubscribers = useCallback(() => {
    const instance = socketStore.get<TIn, TOut>(socketKey)
    if (!instance) return

    console.log('[useSocket] Kill switch activated for:', socketKey)

    // Mark as killed
    instance.killed = true

    // Clear reconnect timer
    if (instance.reconnectTimer) {
      clearTimeout(instance.reconnectTimer)
      instance.reconnectTimer = null
    }

    // Close socket
    if (instance.socket) {
      instance.socket.close()
      instance.socket = null
    }

    // Update all subscribers to disconnected
    updateAllSubscribers(instance, 'disconnected')

    // Note: We do NOT clear messageQueue or delete subscribers
    // Queue is preserved for when someone manually reconnects
  }, [socketKey, updateAllSubscribers])

  /**
   * Auto-connect on mount if configured
   */
  useEffect(() => {
    if (config.autoConnect) {
      connect()
    }

    // Cleanup on unmount
    return () => {
      disconnect()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    connect,
    disconnect,
    send,
    status,
    lastReturnedData,
    allData,
    killSocketForAllSubscribers
  }
}

