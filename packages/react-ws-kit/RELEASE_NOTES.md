# react-ws-kit v1.1.0 Release Notes

## 🎉 New Feature: Heartbeat/Ping

This release introduces built-in connection health monitoring with automatic ping/pong functionality to detect and handle stale connections.

### What's New

- **Opt-in Heartbeat**: Enable connection health monitoring via configuration
- **Automatic Reconnection**: Detects failed connections and triggers reconnect
- **Fully Customizable**: Configure ping intervals, timeouts, and message formats
- **Type-Safe**: Full TypeScript support with generic types

### Configuration

```typescript
const { status, lastReturnedData, send } = useSocket<MessageIn, MessageOut>(
  'wss://api.example.com',
  {
    autoConnect: true,
    heartbeat: {
      enabled: true,                              // Enable heartbeat
      interval: 30000,                            // Ping every 30 seconds
      timeout: 5000,                              // Wait 5s for pong
      pingMessage: { type: 'ping' },              // Custom ping message
      isPong: (msg) => msg?.type === 'pong',      // Custom pong detector
      reconnectOnFailure: true                    // Reconnect on timeout
    }
  }
)
```

### Use Cases

- **Long-lived connections**: Detect network issues or load balancer timeouts
- **Mobile apps**: Handle network switches and intermittent connectivity
- **Real-time apps**: Ensure connection health for critical data streams
- **Compliance**: Meet requirements for connection monitoring

### Features

✅ Configurable ping interval and pong timeout  
✅ Custom ping messages (static or dynamic via function)  
✅ Custom pong detection logic  
✅ Automatic reconnection on heartbeat failure  
✅ Pong messages filtered from user subscribers  
✅ Proper cleanup on disconnect, unmount, and kill switch  
✅ Full TypeScript support  
✅ Works with connection sharing  

## Package Status

- **Version**: 1.1.0
- **Tests**: 36/36 passing ✅
- **Build**: All distribution files generated ✅
- **TypeScript**: Type definitions included ✅
- **Documentation**: README updated with examples ✅

## Publishing Checklist

- [x] Version bumped to 1.1.0
- [x] CHANGELOG.md updated
- [x] README.md updated with heartbeat documentation
- [x] All tests passing (36/36)
- [x] Build successful (CJS, ESM, DTS)
- [x] TypeScript errors resolved
- [x] Keywords updated (added "heartbeat", "ping-pong")

## How to Publish

```bash
cd packages/react-ws-kit

# Publish to npm (will run prepublishOnly script to build)
npm publish

# Or with tag for testing
npm publish --tag beta
```

## Breaking Changes

None! This is a minor version bump with full backward compatibility.

## Migration Guide

No migration needed. Heartbeat is opt-in - existing code works without changes.

To enable heartbeat:

```typescript
// Before (still works)
useSocket('wss://api.example.com')

// After (with heartbeat)
useSocket('wss://api.example.com', {
  heartbeat: { enabled: true }
})
```

## Links

- **GitHub**: https://github.com/sameerdewan/react-ws-kit
- **npm**: https://www.npmjs.com/package/react-ws-kit
- **Changelog**: https://github.com/sameerdewan/react-ws-kit/blob/main/packages/react-ws-kit/CHANGELOG.md

