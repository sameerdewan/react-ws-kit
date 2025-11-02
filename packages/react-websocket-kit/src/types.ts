/**
 * WebSocket connection status
 */
export type Status = 
  | "disconnected" 
  | "connecting" 
  | "connected" 
  | "error" 
  | "reconnecting"

/**
 * Options for configuring the WebSocket hook
 */
export interface Options<TIn = unknown, TOut = unknown> {
  /**
   * Automatically connect when the hook mounts
   * @default false
   */
  autoConnect?: boolean

  /**
   * WebSocket sub-protocols
   */
  protocols?: string | string[]

  /**
   * Automatically reconnect on disconnect
   * @default false
   */
  autoReconnect?: boolean

  /**
   * Maximum number of reconnection attempts (Infinity = unlimited)
   * @default Infinity
   */
  reconnectAttempts?: number

  /**
   * Base delay in milliseconds for reconnection
   * Actual delay = reconnectDelay * attemptNumber (linear backoff)
   * @default 1000
   */
  reconnectDelay?: number

  /**
   * Queue outgoing messages when disconnected
   * @default false
   */
  queueMessages?: boolean

  /**
   * Maximum size of the message queue
   * @default 50
   */
  maxQueueSize?: number

  /**
   * Custom parser for incoming messages
   * @default (event) => JSON.parse(event.data)
   */
  parse?: (event: MessageEvent) => TIn

  /**
   * Custom serializer for outgoing messages
   * @default (data) => JSON.stringify(data)
   */
  serialize?: (data: TOut) => string

  /**
   * Optional deterministic key for function identity
   * Use when parse/serialize functions are not referentially stable
   */
  key?: string
}

/**
 * Normalized internal options with all defaults applied
 */
export interface NormalizedOptions<TIn = unknown, TOut = unknown> {
  autoConnect: boolean
  protocols?: string | string[]
  autoReconnect: boolean
  reconnectAttempts: number
  reconnectDelay: number
  queueMessages: boolean
  maxQueueSize: number
  parse: (event: MessageEvent) => TIn
  serialize: (data: TOut) => string
  key?: string
}

/**
 * Subscriber state for a single hook instance
 */
export interface Subscriber<TIn = unknown> {
  id: string
  isConnected: boolean
  setStatus: (status: Status) => void
  setLastReturnedData: (data: TIn) => void
  addToAllData: (data: TIn) => void
}

/**
 * Shared socket instance state
 */
export interface SocketInstance<TIn = unknown, TOut = unknown> {
  socket: WebSocket | null
  key: string
  status: Status
  subscribers: Set<Subscriber<TIn>>
  refCount: number
  reconnectAttemptsMade: number
  messageQueue: TOut[]
  config: NormalizedOptions<TIn, TOut>
  killed: boolean
  reconnectTimer: ReturnType<typeof setTimeout> | null
}

/**
 * Return value of the useSocket hook
 */
export interface UseSocketReturn<TIn = unknown, TOut = unknown> {
  /**
   * Manually connect to the WebSocket
   */
  connect: () => void

  /**
   * Manually disconnect from the WebSocket
   */
  disconnect: () => void

  /**
   * Send a typed message through the WebSocket
   */
  send: (data: TOut) => void

  /**
   * Current connection status
   */
  status: Status

  /**
   * Most recently received message
   */
  lastReturnedData?: TIn

  /**
   * All messages received by this hook instance
   */
  allData: TIn[]

  /**
   * Close the socket for all subscribers and disable auto-reconnect
   */
  killSocketForAllSubscribers: () => void
}

/**
 * Read-only socket information for debugging/dashboard
 */
export interface SocketInfo {
  key: string
  url: string
  status: Status
  refCount: number
  queueLength: number
  reconnectAttemptsMade: number
  killed: boolean
}

