# react-ws-kit

A production-quality, typed WebSocket hook for React with intelligent connection sharing, message queuing, and comprehensive reconnection handling.

## Features

- **TypeScript First**: Full generic type support for send/receive messages
- **Connection Sharing**: Automatically shares WebSocket instances across components with matching configurations
- **Per-Hook State**: Each hook maintains its own `allData` history and UI state
- **Message Queuing**: Optional FIFO queue for offline message buffering
- **Auto-Reconnect**: Configurable linear backoff strategy
- **Heartbeat/Ping**: Built-in connection health monitoring with automatic ping/pong
- **Kill Switch**: Programmatically close connections for all subscribers
- **Zero Dependencies**: Only peer dependency is React 16.8+ (hooks support)

## Installation

```bash
npm install react-ws-kit
```

## Basic Usage

```typescript
import { useSocket } from 'react-ws-kit'

function ChatComponent() {
  const { connect, disconnect, send, status, lastReturnedData, allData } = 
    useSocket('ws://localhost:3001/chat')

  return (
    <div>
      <button onClick={connect}>Connect</button>
      <button onClick={disconnect}>Disconnect</button>
      <button onClick={() => send({ message: 'Hello!' })}>Send</button>
      <p>Status: {status}</p>
    </div>
  )
}
```

## Typed Usage

```typescript
type MessageIn = {
  type: 'chat'
  user: string
  message: string
  timestamp: number
}

type MessageOut = {
  message: string
}

function TypedChat() {
  const { send, lastReturnedData, allData } = useSocket<MessageIn, MessageOut>(
    'ws://localhost:3001/chat',
    {
      autoConnect: true,
      autoReconnect: true,
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      queueMessages: true,
      maxQueueSize: 100
    }
  )

  // lastReturnedData is typed as MessageIn | undefined
  // send accepts MessageOut
  
  return <div>{lastReturnedData?.message}</div>
}
```

## API

### `useSocket<TIn, TOut>(url, options?)`

#### Parameters

- `url: string` - WebSocket URL
- `options?: Options<TIn, TOut>` - Configuration object

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoConnect` | `boolean` | `false` | Connect automatically on mount |
| `protocols` | `string \| string[]` | `undefined` | WebSocket sub-protocols |
| `autoReconnect` | `boolean` | `false` | Enable automatic reconnection |
| `reconnectAttempts` | `number` | `Infinity` | Max reconnection attempts |
| `reconnectDelay` | `number` | `1000` | Base delay in ms (linear backoff) |
| `queueMessages` | `boolean` | `false` | Queue messages when disconnected |
| `maxQueueSize` | `number` | `50` | Maximum queue size |
| `parse` | `(event: MessageEvent) => TIn` | `JSON.parse` | Custom message parser |
| `serialize` | `(data: TOut) => string` | `JSON.stringify` | Custom message serializer |
| `key` | `string` | `undefined` | Deterministic key for function identity |
| `heartbeat` | `HeartbeatOptions` | `undefined` | Heartbeat/ping configuration (see below) |

#### Heartbeat Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `false` | Enable automatic heartbeat/ping |
| `interval` | `number` | `30000` | Interval between ping messages (ms) |
| `timeout` | `number` | `5000` | Timeout waiting for pong response (ms) |
| `pingMessage` | `TOut \| (() => TOut)` | `{ type: 'ping' }` | Message to send as ping |
| `isPong` | `(message: TIn) => boolean` | `(msg) => msg?.type === 'pong'` | Function to detect pong response |
| `reconnectOnFailure` | `boolean` | `true` | Trigger reconnection on heartbeat failure |

#### Return Value

```typescript
{
  connect: () => void
  disconnect: () => void
  send: (data: TOut) => void
  status: "disconnected" | "connecting" | "connected" | "error" | "reconnecting"
  lastReturnedData?: TIn
  allData: TIn[]
  killSocketForAllSubscribers: () => void
}
```

## Connection Sharing

Hooks automatically share a WebSocket if all of the following match:

- URL
- Protocols
- Auto-reconnect settings
- Queue settings
- Parse/serialize functions (by reference or via `key` option)

```typescript
// These two hooks share the same WebSocket
function ComponentA() {
  const ws = useSocket('ws://localhost:3001/chat', { queueMessages: true })
  // ...
}

function ComponentB() {
  const ws = useSocket('ws://localhost:3001/chat', { queueMessages: true })
  // ...
}
```

## Reconnection Strategy

Linear backoff: `delay = reconnectDelay * attemptNumber`

```typescript
useSocket(url, {
  autoReconnect: true,
  reconnectAttempts: 5,
  reconnectDelay: 1000
})

// Attempt 1: 1000ms delay
// Attempt 2: 2000ms delay
// Attempt 3: 3000ms delay
// ...
```

## Kill Switch

The kill switch closes the socket for **all** subscribers and prevents auto-reconnect:

```typescript
const { killSocketForAllSubscribers } = useSocket(url, { autoReconnect: true })

// Disconnects all components using this socket
// Auto-reconnect is disabled until manual connect()
killSocketForAllSubscribers()
```

## Message Queuing

When `queueMessages: true`, messages sent while disconnected are queued and flushed on reconnection:

```typescript
const { send } = useSocket(url, {
  queueMessages: true,
  maxQueueSize: 100
})

// Even if disconnected, messages are queued
send({ message: 'Hello' })
send({ message: 'World' })

// On reconnect, both messages are sent in order
```

## Heartbeat/Ping

Enable automatic connection health monitoring with heartbeat/ping:

```typescript
const socket = useSocket('ws://api.example.com/chat', {
  autoConnect: true,
  autoReconnect: true,
  heartbeat: {
    enabled: true,
    interval: 30000,      // Send ping every 30 seconds
    timeout: 5000,        // Expect pong within 5 seconds
    pingMessage: { type: 'ping' },
    isPong: (msg) => msg.type === 'pong',
    reconnectOnFailure: true  // Auto-reconnect if pong not received
  }
})
```

### Custom Ping/Pong Messages

You can customize the ping message format and pong detection:

```typescript
const socket = useSocket('ws://api.example.com/chat', {
  heartbeat: {
    enabled: true,
    interval: 20000,
    // Dynamic ping message
    pingMessage: () => ({ 
      cmd: 'heartbeat', 
      timestamp: Date.now() 
    }),
    // Custom pong detection
    isPong: (msg) => msg.cmd === 'heartbeat_ack',
  }
})
```

### How It Works

1. **Ping Interval**: When connected, a ping message is sent at the configured interval
2. **Pong Detection**: When a message matching `isPong()` is received, the heartbeat timer is reset
3. **Timeout**: If no pong is received within the timeout period, the connection is considered unhealthy
4. **Reconnection**: If `reconnectOnFailure` is true, the socket will close and trigger auto-reconnect
5. **No Broadcast**: Pong messages are filtered and not broadcast to `allData` or `lastReturnedData`

### Native WebSocket Ping/Pong

If your WebSocket server uses native WebSocket ping/pong frames (not application-level messages), you don't need to configure heartbeat - the browser handles it automatically!

## Testing

The package includes comprehensive unit tests:

```bash
npm test
```

## License

MIT

