# react-ws-kit

📦 **[View the full package documentation →](./packages/react-ws-kit/README.md)**

Production-quality typed WebSocket hook for React with intelligent connection sharing, auto-reconnect, and message queuing.

```bash
npm install react-ws-kit
```

---

# Demo App for Package: Realtime Control Center

A complete TypeScript monorepo demonstrating a production-quality typed WebSocket hook system with React and Express.

## Features

- **Shared WebSocket Connections**: Multiple React components share a single WebSocket instance when using identical URLs and options
- **Typed Send/Receive**: Full TypeScript generics support with `useSocket<TIn, TOut>`
- **Per-Hook Isolation**: Each hook maintains its own `allData` history while sharing the underlying connection
- **Auto-Reconnect**: Configurable linear backoff strategy with attempt limits
- **Message Queuing**: Queue outgoing messages when disconnected with FIFO and size limits
- **Kill Switch API**: `killSocketForAllSubscribers()` closes the socket for all subscribers and prevents auto-reconnect until manual reconnection
- **Zero Polling**: Event-driven architecture only
- **Reference Counting**: Automatic socket cleanup when all subscribers disconnect

## Architecture

```
realtime-control-center/
├── packages/
│   └── react-ws-kit/    # The core WebSocket hook library
├── apps/
│   ├── server/                  # Express + ws backend with demo endpoints
│   └── web/                     # Vite + React demo application
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm 8+

### Installation

```bash
npm install
```

### Development

Start both server and web app concurrently:

```bash
npm run dev
```

This will start:
- WebSocket server on `ws://localhost:3001`
- React dev server on `http://localhost:5173`

### Build

```bash
npm run build
```

### Test

```bash
npm run test
```

## Demo Endpoints

The server provides three WebSocket endpoints:

1. **`/chat`**: Broadcast chat with message echoing and metadata
2. **`/notifications`**: Random notifications every 3-8 seconds
3. **`/prices?symbol=BTC|ETH|DOGE`**: Real-time price ticks every 2 seconds

## Usage Example

```typescript
import { useSocket } from 'react-ws-kit'

type ChatMessage = {
  type: 'chat'
  user: string
  message: string
  at: number
}

type ChatSend = {
  message: string
}

function ChatComponent() {
  const {
    connect,
    disconnect,
    send,
    status,
    lastReturnedData,
    allData,
    killSocketForAllSubscribers
  } = useSocket<ChatMessage, ChatSend>('ws://localhost:3001/chat', {
    autoConnect: false,
    autoReconnect: true,
    reconnectAttempts: 5,
    reconnectDelay: 1000,
    queueMessages: true,
    maxQueueSize: 100
  })

  return (
    <div>
      <button onClick={connect}>Connect</button>
      <button onClick={disconnect}>Disconnect</button>
      <button onClick={() => send({ message: 'Hello!' })}>Send</button>
      <button onClick={killSocketForAllSubscribers}>Kill Socket</button>
      <p>Status: {status}</p>
      <p>Messages: {allData.length}</p>
    </div>
  )
}
```

## Kill Switch Behavior

The `killSocketForAllSubscribers()` function:

1. Closes the WebSocket for all subscribers sharing that connection
2. Sets status to "disconnected" for all subscribers
3. Prevents auto-reconnect until any subscriber manually calls `connect()`
4. Preserves queued messages (if queueing is enabled)
5. Flushes queued messages after manual reconnection

## Manual Test Script

1. **Start the application**: `npm run dev`
2. **Open two browser tabs** at `http://localhost:5173`

### Test Chat (Shared Socket)

- Connect both Chat A & B windows
- Send messages from either → both receive
- Disconnect Chat A → Chat B still receives
- Click "Kill Chat Socket" → both drop; auto-reconnect disabled
- Send messages → queued (if queueing enabled)
- Click Connect on either → both reconnect; queued messages flush

### Test Notifications (Manual Connect)

- Connect Notifications A only → receives random notifications
- Connect Notifications B later → also receives, but has separate `allData` history
- Kill → both drop
- Reconnect manually → both resume

### Test Prices (Independent Sockets)

- BTC and ETH use different URLs (query params) → independent sockets
- Connect both
- Kill BTC → ETH unaffected
- Reconnect BTC → only BTC reconnects

### Test Socket Dashboard

- View all active sockets with refCounts, statuses, and queue lengths
- Use per-socket controls to kill or clear queues

## Library: react-ws-kit

See `packages/react-ws-kit/README.md` for detailed API documentation.

## License

MIT

