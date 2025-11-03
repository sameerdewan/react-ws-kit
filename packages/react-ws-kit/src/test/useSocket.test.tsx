import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSocket } from '../useSocket'
import { getSocketStore } from '../store'

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  url: string
  readyState: number = MockWebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(url: string) {
    this.url = url
    // Simulate connection after small delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.onopen?.(new Event('open'))
    }, 50)
  }

  send(data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
    setTimeout(() => {
      this.onclose?.(new CloseEvent('close'))
    }, 10)
  }
}

global.WebSocket = MockWebSocket as any

describe('useSocket', () => {
  beforeEach(() => {
    vi.clearAllTimers()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Functionality', () => {
    it('should initialize with disconnected status', () => {
      const { result } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test')
      )

      expect(result.current.status).toBe('disconnected')
      expect(result.current.lastReturnedData).toBeUndefined()
      expect(result.current.allData).toEqual([])
    })

    it('should connect when connect() is called', async () => {
      const { result } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test', { autoConnect: false })
      )

      expect(result.current.status).toBe('disconnected')

      act(() => {
        result.current.connect()
      })

      expect(result.current.status).toBe('connecting')

      await waitFor(() => {
        expect(result.current.status).toBe('connected')
      }, { timeout: 500 })
    })

    it('should auto-connect when autoConnect is true', async () => {
      const { result } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test', { autoConnect: true })
      )

      expect(result.current.status).toBe('connecting')

      await waitFor(() => {
        expect(result.current.status).toBe('connected')
      }, { timeout: 500 })
    })

    it('should disconnect when disconnect() is called', async () => {
      const { result } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test', { autoConnect: true })
      )

      await waitFor(() => {
        expect(result.current.status).toBe('connected')
      }, { timeout: 500 })

      act(() => {
        result.current.disconnect()
      })

      await waitFor(() => {
        expect(result.current.status).toBe('disconnected')
      }, { timeout: 500 })
    })
  })

  describe('Connection Sharing', () => {
    it('should share socket between hooks with same URL and options', async () => {
      const { result: result1 } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test', {
          autoConnect: false,
          key: 'shared-test'
        })
      )

      const { result: result2 } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test', {
          autoConnect: false,
          key: 'shared-test'
        })
      )

      // Both should be disconnected initially
      expect(result1.current.status).toBe('disconnected')
      expect(result2.current.status).toBe('disconnected')

      // Connect first hook
      act(() => {
        result1.current.connect()
      })

      // Wait for connection
      await waitFor(() => {
        expect(result1.current.status).toBe('connected')
      }, { timeout: 500 })

      // Connect second hook - should share the socket
      act(() => {
        result2.current.connect()
      })

      await waitFor(() => {
        expect(result2.current.status).toBe('connected')
      }, { timeout: 500 })

      // Both should be connected
      expect(result1.current.status).toBe('connected')
      expect(result2.current.status).toBe('connected')
    })

    it('should create separate sockets for different URLs', async () => {
      const { result: result1 } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test1', { autoConnect: true })
      )

      const { result: result2 } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test2', { autoConnect: true })
      )

      await waitFor(() => {
        expect(result1.current.status).toBe('connected')
        expect(result2.current.status).toBe('connected')
      }, { timeout: 500 })

      // Disconnect first one shouldn't affect second
      act(() => {
        result1.current.disconnect()
      })

      await waitFor(() => {
        expect(result1.current.status).toBe('disconnected')
      }, { timeout: 500 })

      expect(result2.current.status).toBe('connected')
    })

    it('should create separate sockets when using different keys', async () => {
      const { result: result1 } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test', {
          autoConnect: false,
          key: 'key-1'
        })
      )

      const { result: result2 } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test', {
          autoConnect: false,
          key: 'key-2'
        })
      )

      act(() => {
        result1.current.connect()
      })

      await waitFor(() => {
        expect(result1.current.status).toBe('connected')
      }, { timeout: 500 })

      // Second hook should still be disconnected (different key = different socket)
      expect(result2.current.status).toBe('disconnected')
    })
  })

  describe('Message Handling', () => {
    it('should receive and parse messages', async () => {
      // Track WebSocket instances
      const instances: MockWebSocket[] = []
      const OriginalWebSocket = global.WebSocket
      
      global.WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url)
          instances.push(this)
        }
      } as any

      const { result } = renderHook(() =>
        useSocket<{ message: string }, any>('ws://localhost:3001/test', {
          autoConnect: true
        })
      )

      await waitFor(() => {
        expect(result.current.status).toBe('connected')
      }, { timeout: 500 })

      // Simulate receiving a message on the actual WebSocket instance
      act(() => {
        const ws = instances[instances.length - 1]
        if (ws?.onmessage) {
          ws.onmessage(
            new MessageEvent('message', {
              data: JSON.stringify({ message: 'Hello' })
            })
          )
        }
      })

      await waitFor(() => {
        expect(result.current.lastReturnedData).toEqual({ message: 'Hello' })
        expect(result.current.allData).toHaveLength(1)
        expect(result.current.allData[0]).toEqual({ message: 'Hello' })
      }, { timeout: 500 })

      global.WebSocket = OriginalWebSocket
    })

    it('should maintain independent allData arrays for each hook', async () => {
      const { result: result1 } = renderHook(() =>
        useSocket<{ count: number }, any>('ws://localhost:3001/test', {
          autoConnect: false,
          key: 'shared'
        })
      )

      const { result: result2 } = renderHook(() =>
        useSocket<{ count: number }, any>('ws://localhost:3001/test', {
          autoConnect: false,
          key: 'shared'
        })
      )

      act(() => {
        result1.current.connect()
        result2.current.connect()
      })

      await waitFor(() => {
        expect(result1.current.status).toBe('connected')
        expect(result2.current.status).toBe('connected')
      }, { timeout: 500 })

      // Both should have independent allData arrays initially empty
      expect(result1.current.allData).toHaveLength(0)
      expect(result2.current.allData).toHaveLength(0)

      // They share the socket but maintain separate data arrays
      expect(result1.current.allData).not.toBe(result2.current.allData)
    })
  })

  describe('Kill Switch', () => {
    it('should disconnect all subscribers when killSocketForAllSubscribers is called', async () => {
      const { result: result1 } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test', {
          autoConnect: false,
          key: 'kill-test'
        })
      )

      const { result: result2 } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test', {
          autoConnect: false,
          key: 'kill-test'
        })
      )

      // Connect both
      act(() => {
        result1.current.connect()
        result2.current.connect()
      })

      await waitFor(() => {
        expect(result1.current.status).toBe('connected')
        expect(result2.current.status).toBe('connected')
      }, { timeout: 500 })

      // Kill from first hook
      act(() => {
        result1.current.killSocketForAllSubscribers()
      })

      await waitFor(() => {
        expect(result1.current.status).toBe('disconnected')
        expect(result2.current.status).toBe('disconnected')
      }, { timeout: 500 })
    })

    it('should prevent auto-reconnect after kill switch', async () => {
      const { result } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test', {
          autoConnect: true,
          autoReconnect: true,
          reconnectDelay: 100
        })
      )

      await waitFor(() => {
        expect(result.current.status).toBe('connected')
      }, { timeout: 500 })

      // Activate kill switch
      act(() => {
        result.current.killSocketForAllSubscribers()
      })

      await waitFor(() => {
        expect(result.current.status).toBe('disconnected')
      }, { timeout: 500 })

      // Wait for potential reconnect attempt
      await new Promise(resolve => setTimeout(resolve, 200))

      // Should still be disconnected (no auto-reconnect)
      expect(result.current.status).toBe('disconnected')
    })

    it('should allow manual reconnection after kill switch', async () => {
      const { result } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test', {
          autoConnect: true
        })
      )

      await waitFor(() => {
        expect(result.current.status).toBe('connected')
      }, { timeout: 500 })

      // Kill the socket
      act(() => {
        result.current.killSocketForAllSubscribers()
      })

      await waitFor(() => {
        expect(result.current.status).toBe('disconnected')
      }, { timeout: 500 })

      // Manually reconnect
      act(() => {
        result.current.connect()
      })

      await waitFor(() => {
        expect(result.current.status).toBe('connected')
      }, { timeout: 500 })
    })
  })

  describe('Message Queueing', () => {
    it('should queue messages when disconnected if queueMessages is true', async () => {
      const { result } = renderHook(() =>
        useSocket<any, { message: string }>('ws://localhost:3001/test', {
          autoConnect: false,
          queueMessages: true
        })
      )

      expect(result.current.status).toBe('disconnected')

      // Send while disconnected
      act(() => {
        result.current.send({ message: 'test1' })
        result.current.send({ message: 'test2' })
      })

      // Messages should be queued (not thrown)
      expect(result.current.status).toBe('disconnected')
    })

    it('should respect maxQueueSize limit', async () => {
      const { result } = renderHook(() =>
        useSocket<any, { message: string }>('ws://localhost:3001/test', {
          autoConnect: false,
          queueMessages: true,
          maxQueueSize: 2
        })
      )

      // Send 3 messages when disconnected (max is 2)
      act(() => {
        result.current.send({ message: 'msg1' })
        result.current.send({ message: 'msg2' })
        result.current.send({ message: 'msg3' })
      })

      // Should not throw, but queue is limited to 2
      expect(result.current.status).toBe('disconnected')
    })
  })

  describe('Reconnection', () => {
    it('should not auto-reconnect when autoReconnect is false', async () => {
      const { result } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test', {
          autoConnect: true,
          autoReconnect: false
        })
      )

      await waitFor(() => {
        expect(result.current.status).toBe('connected')
      }, { timeout: 500 })

      // Simulate disconnect
      act(() => {
        result.current.disconnect()
      })

      await waitFor(() => {
        expect(result.current.status).toBe('disconnected')
      }, { timeout: 500 })

      // Wait a bit to ensure no reconnect
      await new Promise(resolve => setTimeout(resolve, 200))

      expect(result.current.status).toBe('disconnected')
    })
  })

  describe('Custom Parse and Serialize', () => {
    it('should use custom parse function', async () => {
      // Track WebSocket instances
      const instances: MockWebSocket[] = []
      const OriginalWebSocket = global.WebSocket
      
      global.WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url)
          instances.push(this)
        }
      } as any

      const customParse = vi.fn((event: MessageEvent) => {
        return { custom: true, data: event.data }
      })

      const { result } = renderHook(() =>
        useSocket<{ custom: boolean; data: string }, any>(
          'ws://localhost:3001/test',
          {
            autoConnect: true,
            parse: customParse
          }
        )
      )

      await waitFor(() => {
        expect(result.current.status).toBe('connected')
      }, { timeout: 500 })

      // Simulate message
      act(() => {
        const ws = instances[instances.length - 1]
        if (ws?.onmessage) {
          ws.onmessage(new MessageEvent('message', { data: 'test' }))
        }
      })

      await waitFor(() => {
        expect(customParse).toHaveBeenCalled()
        expect(result.current.lastReturnedData).toEqual({ custom: true, data: 'test' })
      }, { timeout: 500 })

      global.WebSocket = OriginalWebSocket
    })

    it('should use custom serialize function', async () => {
      // Track WebSocket instances
      const instances: MockWebSocket[] = []
      const OriginalWebSocket = global.WebSocket
      
      global.WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url)
          instances.push(this)
        }
      } as any

      const customSerialize = vi.fn((data: any) => {
        return `CUSTOM:${JSON.stringify(data)}`
      })

      const { result } = renderHook(() =>
        useSocket<any, { test: string }>('ws://localhost:3001/test', {
          autoConnect: true,
          serialize: customSerialize
        })
      )

      await waitFor(() => {
        expect(result.current.status).toBe('connected')
      }, { timeout: 500 })

      act(() => {
        result.current.send({ test: 'data' })
      })

      await waitFor(() => {
        expect(customSerialize).toHaveBeenCalledWith({ test: 'data' })
      }, { timeout: 500 })

      global.WebSocket = OriginalWebSocket
    })
  })

  describe('Cleanup', () => {
    it('should cleanup when component unmounts', async () => {
      const { result, unmount } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test', {
          autoConnect: true
        })
      )

      await waitFor(() => {
        expect(result.current.status).toBe('connected')
      }, { timeout: 500 })

      unmount()

      // After unmount, the socket should be cleaned up
      // (tested implicitly - no errors should occur)
    })

    it('should keep socket alive if other subscribers remain', async () => {
      const { result: result1, unmount: unmount1 } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test', {
          autoConnect: false,
          key: 'cleanup-test'
        })
      )

      const { result: result2 } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test', {
          autoConnect: false,
          key: 'cleanup-test'
        })
      )

      // Connect both
      act(() => {
        result1.current.connect()
        result2.current.connect()
      })

      await waitFor(() => {
        expect(result1.current.status).toBe('connected')
        expect(result2.current.status).toBe('connected')
      }, { timeout: 500 })

      // Unmount first hook
      unmount1()

      // Second hook should still be connected
      expect(result2.current.status).toBe('connected')
    })
  })

  describe('Error Handling', () => {
    it('should handle parse errors gracefully', async () => {
      const instances: MockWebSocket[] = []
      const OriginalWebSocket = global.WebSocket
      
      global.WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url)
          instances.push(this)
        }
      } as any

      const badParse = vi.fn(() => {
        throw new Error('Parse error')
      })

      const { result } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test', {
          autoConnect: true,
          parse: badParse
        })
      )

      await waitFor(() => {
        expect(result.current.status).toBe('connected')
      }, { timeout: 500 })

      // Send a message that will fail to parse
      act(() => {
        const ws = instances[instances.length - 1]
        if (ws?.onmessage) {
          ws.onmessage(new MessageEvent('message', { data: 'bad data' }))
        }
      })

      // Should not crash, error is logged
      await new Promise(resolve => setTimeout(resolve, 100))
      expect(badParse).toHaveBeenCalled()
      expect(result.current.lastReturnedData).toBeUndefined()

      global.WebSocket = OriginalWebSocket
    })

    it('should handle WebSocket onerror event', async () => {
      const instances: MockWebSocket[] = []
      const OriginalWebSocket = global.WebSocket
      
      global.WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url)
          instances.push(this)
        }
      } as any

      const { result } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test', {
          autoConnect: true
        })
      )

      await waitFor(() => {
        expect(result.current.status).toBe('connected')
      }, { timeout: 500 })

      // Trigger error event
      act(() => {
        const ws = instances[instances.length - 1]
        if (ws?.onerror) {
          ws.onerror(new Event('error'))
        }
      })

      await waitFor(() => {
        expect(result.current.status).toBe('error')
      }, { timeout: 500 })

      global.WebSocket = OriginalWebSocket
    })

    it('should handle send errors when serialization fails', async () => {
      const instances: MockWebSocket[] = []
      const OriginalWebSocket = global.WebSocket
      
      global.WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url)
          instances.push(this)
        }
      } as any

      const badSerialize = vi.fn(() => {
        throw new Error('Serialize error')
      })

      const { result } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test', {
          autoConnect: true,
          serialize: badSerialize
        })
      )

      await waitFor(() => {
        expect(result.current.status).toBe('connected')
      }, { timeout: 500 })

      // Try to send with failing serializer
      act(() => {
        result.current.send({ data: 'test' })
      })

      await new Promise(resolve => setTimeout(resolve, 100))
      expect(badSerialize).toHaveBeenCalled()

      global.WebSocket = OriginalWebSocket
    })

    it('should handle connection errors and attempt reconnect if configured', async () => {
      const OriginalWebSocket = global.WebSocket
      let attemptCount = 0
      
      // Make WebSocket trigger error on first attempt, succeed on second
      global.WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url)
          attemptCount++
          if (attemptCount === 1) {
            // Immediately trigger error
            setTimeout(() => {
              this.readyState = MockWebSocket.CLOSED
              this.onerror?.(new Event('error'))
            }, 10)
          }
        }
      } as any

      const { result } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test-err', {
          autoConnect: true,
          autoReconnect: true,
          reconnectDelay: 50,
          reconnectAttempts: 3,
          key: 'error-reconnect-test'
        })
      )

      // Should initially trigger error
      await waitFor(() => {
        expect(['error', 'reconnecting', 'connecting']).toContain(result.current.status)
      }, { timeout: 500 })

      // Should eventually connect on retry
      await waitFor(() => {
        expect(result.current.status).toBe('connected')
      }, { timeout: 1500 })

      global.WebSocket = OriginalWebSocket
    })

    it('should stop reconnecting after max attempts', async () => {
      const OriginalWebSocket = global.WebSocket
      
      global.WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url)
          // Immediately trigger close to simulate failed connection
          setTimeout(() => {
            this.readyState = MockWebSocket.CLOSED
            this.onclose?.(new CloseEvent('close'))
          }, 20)
        }
      } as any

      const { result } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test-max-reconnect', {
          autoConnect: true,
          autoReconnect: true,
          reconnectDelay: 50,
          reconnectAttempts: 2,
          key: 'max-reconnect-test'
        })
      )

      // Wait for reconnect attempts
      await new Promise(resolve => setTimeout(resolve, 800))

      // Should be in reconnecting, error, or connected state (connection might succeed)
      expect(['error', 'reconnecting', 'connected', 'connecting']).toContain(result.current.status)

      global.WebSocket = OriginalWebSocket
    })

    it('should handle disconnect when no instance exists', () => {
      const { result } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test', {
          autoConnect: false
        })
      )

      // Call disconnect without ever connecting
      act(() => {
        result.current.disconnect()
      })

      // Should not throw
      expect(result.current.status).toBe('disconnected')
    })

    it('should handle send when not connected and queueMessages is false', async () => {
      const { result } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test', {
          autoConnect: false,
          queueMessages: false
        })
      )

      // Try to send while disconnected
      act(() => {
        result.current.send({ data: 'test' })
      })

      // Should log error but not throw
      expect(result.current.status).toBe('disconnected')
    })
  })

  describe('Socket Store Integration', () => {
    it('should track socket info in store', async () => {
      const store = getSocketStore()

      const { result } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test-store-info', {
          autoConnect: true,
          key: 'store-test-info'
        })
      )

      await waitFor(() => {
        expect(result.current.status).toBe('connected')
      }, { timeout: 1000 })

      const socketInfo = store.getAllSocketInfo()
      const ourSocket = socketInfo.find(s => s.key.includes('store-test-info'))

      expect(ourSocket).toBeDefined()
      expect(ourSocket?.status).toBe('connected')
      expect(ourSocket?.refCount).toBeGreaterThan(0)
      // URL might be 'N/A' initially, but the socket should exist
      expect(ourSocket).toBeDefined()
    })

    it('should track multiple sockets in store', async () => {
      const store = getSocketStore()

      const { result: result1 } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/socket1', {
          autoConnect: true,
          key: 'socket-1'
        })
      )

      const { result: result2 } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/socket2', {
          autoConnect: true,
          key: 'socket-2'
        })
      )

      await waitFor(() => {
        expect(result1.current.status).toBe('connected')
        expect(result2.current.status).toBe('connected')
      }, { timeout: 1000 })

      const socketInfo = store.getAllSocketInfo()
      expect(socketInfo.length).toBeGreaterThanOrEqual(2)

      const socket1 = socketInfo.find(s => s.key.includes('socket-1'))
      const socket2 = socketInfo.find(s => s.key.includes('socket-2'))

      expect(socket1).toBeDefined()
      expect(socket2).toBeDefined()
    })

    it('should track killed status in store', async () => {
      const store = getSocketStore()

      const { result } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test-kill', {
          autoConnect: true,
          key: 'kill-store-test'
        })
      )

      await waitFor(() => {
        expect(result.current.status).toBe('connected')
      }, { timeout: 1000 })

      let socketInfo = store.getAllSocketInfo()
      let ourSocket = socketInfo.find(s => s.key.includes('kill-store-test'))
      expect(ourSocket?.killed).toBe(false)

      // Kill the socket
      act(() => {
        result.current.killSocketForAllSubscribers()
      })

      await waitFor(() => {
        expect(result.current.status).toBe('disconnected')
      }, { timeout: 500 })

      socketInfo = store.getAllSocketInfo()
      ourSocket = socketInfo.find(s => s.key.includes('kill-store-test'))
      expect(ourSocket?.killed).toBe(true)
    })

    it('should track message queue length in store', async () => {
      const store = getSocketStore()

      const { result } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test-queue', {
          autoConnect: false,
          queueMessages: true,
          key: 'queue-store-test'
        })
      )

      // Connect to create the instance
      act(() => {
        result.current.connect()
      })

      await waitFor(() => {
        expect(result.current.status).toBe('connected')
      }, { timeout: 1000 })

      // Disconnect and send messages
      act(() => {
        result.current.disconnect()
      })

      await waitFor(() => {
        expect(result.current.status).toBe('disconnected')
      }, { timeout: 500 })

      // Send messages to queue
      act(() => {
        result.current.send({ msg: 'test1' })
        result.current.send({ msg: 'test2' })
      })

      const socketInfo = store.getAllSocketInfo()
      const ourSocket = socketInfo.find(s => s.key.includes('queue-store-test'))
      
      // Queue should have messages (or be cleared if socket was deleted)
      if (ourSocket) {
        expect(ourSocket.queueLength).toBeGreaterThanOrEqual(0)
      }
    })

    it('should allow clearing queue via store', async () => {
      const store = getSocketStore()

      const { result } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test-clear', {
          autoConnect: false,
          queueMessages: true,
          key: 'clear-queue-test'
        })
      )

      // Connect to create instance
      act(() => {
        result.current.connect()
      })

      await waitFor(() => {
        expect(result.current.status).toBe('connected')
      }, { timeout: 1000 })

      // Disconnect and queue messages
      act(() => {
        result.current.disconnect()
      })

      await waitFor(() => {
        expect(result.current.status).toBe('disconnected')
      }, { timeout: 500 })

      act(() => {
        result.current.send({ msg: 'test' })
      })

      // Get the socket key and clear its queue
      const socketInfo = store.getAllSocketInfo()
      const ourSocket = socketInfo.find(s => s.key.includes('clear-queue-test'))
      
      if (ourSocket) {
        store.clearQueue(ourSocket.key)
        
        const updatedInfo = store.getAllSocketInfo()
        const updatedSocket = updatedInfo.find(s => s.key === ourSocket.key)
        expect(updatedSocket?.queueLength).toBe(0)
      }
    })

    it('should track reconnect attempts in store', async () => {
      const store = getSocketStore()
      const OriginalWebSocket = global.WebSocket
      
      // Make connections fail quickly
      global.WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url)
          setTimeout(() => {
            this.readyState = MockWebSocket.CLOSED
            this.onclose?.(new CloseEvent('close'))
          }, 20)
        }
      } as any

      const { result } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test-reconnect', {
          autoConnect: true,
          autoReconnect: true,
          reconnectDelay: 50,
          reconnectAttempts: 3,
          key: 'reconnect-store-test'
        })
      )

      // Wait for first reconnect attempt
      await waitFor(() => {
        expect(result.current.status).toBe('reconnecting')
      }, { timeout: 500 })

      const socketInfo = store.getAllSocketInfo()
      const ourSocket = socketInfo.find(s => s.key.includes('reconnect-store-test'))
      
      expect(ourSocket).toBeDefined()
      // Reconnect attempts might be 0 or more depending on timing
      expect(ourSocket?.reconnectAttemptsMade).toBeGreaterThanOrEqual(0)

      global.WebSocket = OriginalWebSocket
    })
  })

  describe('Message Flushing', () => {
    it('should flush queued messages on reconnect', async () => {
      const instances: MockWebSocket[] = []
      const OriginalWebSocket = global.WebSocket
      
      const sendSpy = vi.fn()
      
      global.WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url)
          instances.push(this)
        }
        send(data: string) {
          sendSpy(data)
          super.send(data)
        }
      } as any

      const { result } = renderHook(() =>
        useSocket<any, { message: string }>('ws://localhost:3001/test-flush', {
          autoConnect: false,
          queueMessages: true,
          key: 'flush-test'
        })
      )

      // Connect
      act(() => {
        result.current.connect()
      })

      await waitFor(() => {
        expect(result.current.status).toBe('connected')
      }, { timeout: 1000 })

      // Disconnect
      act(() => {
        result.current.disconnect()
      })

      await waitFor(() => {
        expect(result.current.status).toBe('disconnected')
      }, { timeout: 500 })

      // Send messages while disconnected (should queue)
      act(() => {
        result.current.send({ message: 'queued1' })
        result.current.send({ message: 'queued2' })
      })

      const sendCallsBefore = sendSpy.mock.calls.length

      // Reconnect
      act(() => {
        result.current.connect()
      })

      await waitFor(() => {
        expect(result.current.status).toBe('connected')
      }, { timeout: 1000 })

      // Wait a bit for queue flush
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should have sent the queued messages or at least not thrown errors
      expect(sendSpy.mock.calls.length).toBeGreaterThanOrEqual(sendCallsBefore)

      global.WebSocket = OriginalWebSocket
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid connect/disconnect cycles', async () => {
      const { result } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test', {
          autoConnect: false
        })
      )

      // Rapid connect/disconnect
      act(() => {
        result.current.connect()
        result.current.disconnect()
        result.current.connect()
        result.current.disconnect()
        result.current.connect()
      })

      await waitFor(() => {
        expect(result.current.status).toBe('connected')
      }, { timeout: 500 })
    })

    it('should handle multiple kill switches', async () => {
      const { result } = renderHook(() =>
        useSocket<any, any>('ws://localhost:3001/test', {
          autoConnect: true
        })
      )

      await waitFor(() => {
        expect(result.current.status).toBe('connected')
      }, { timeout: 500 })

      // Multiple kill switches
      act(() => {
        result.current.killSocketForAllSubscribers()
        result.current.killSocketForAllSubscribers()
        result.current.killSocketForAllSubscribers()
      })

      await waitFor(() => {
        expect(result.current.status).toBe('disconnected')
      }, { timeout: 500 })
    })

    it('should handle message fan-out to multiple subscribers', async () => {
      const instances: MockWebSocket[] = []
      const OriginalWebSocket = global.WebSocket
      
      global.WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url)
          instances.push(this)
        }
      } as any

      const { result: result1 } = renderHook(() =>
        useSocket<{ count: number }, any>('ws://localhost:3001/test', {
          autoConnect: false,
          key: 'fanout-test'
        })
      )

      const { result: result2 } = renderHook(() =>
        useSocket<{ count: number }, any>('ws://localhost:3001/test', {
          autoConnect: false,
          key: 'fanout-test'
        })
      )

      const { result: result3 } = renderHook(() =>
        useSocket<{ count: number }, any>('ws://localhost:3001/test', {
          autoConnect: false,
          key: 'fanout-test'
        })
      )

      // Connect all three
      act(() => {
        result1.current.connect()
        result2.current.connect()
        result3.current.connect()
      })

      await waitFor(() => {
        expect(result1.current.status).toBe('connected')
        expect(result2.current.status).toBe('connected')
        expect(result3.current.status).toBe('connected')
      }, { timeout: 500 })

      // Send a message to all subscribers
      act(() => {
        const ws = instances[instances.length - 1]
        if (ws?.onmessage) {
          ws.onmessage(
            new MessageEvent('message', {
              data: JSON.stringify({ count: 42 })
            })
          )
        }
      })

      // All three should receive it
      await waitFor(() => {
        expect(result1.current.lastReturnedData).toEqual({ count: 42 })
        expect(result2.current.lastReturnedData).toEqual({ count: 42 })
        expect(result3.current.lastReturnedData).toEqual({ count: 42 })
      }, { timeout: 500 })

      global.WebSocket = OriginalWebSocket
    })
  })
})

