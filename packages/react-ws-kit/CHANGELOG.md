# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-11-09

### Added
- **Heartbeat/Ping Feature**: Built-in connection health monitoring with automatic ping/pong
  - Configurable ping interval and pong timeout
  - Custom ping messages (static or dynamic via function)
  - Custom pong detection logic
  - Automatic reconnection on heartbeat failure (configurable)
  - Pong messages filtered from user subscribers
  - Proper cleanup on disconnect, unmount, and kill switch
  - Full TypeScript support with `HeartbeatOptions` interface
- New `heartbeat` configuration option in `Options` interface
- Extended `SocketInstance` interface with heartbeat state tracking
- Comprehensive documentation in README with usage examples

### Improved
- Better connection reliability with health monitoring
- Enhanced type safety with heartbeat options
- More resilient to network issues with automatic health checks

## [1.0.2] - 2025-11-03

### Added
- Comprehensive test suite with 36 unit tests
- Test coverage for error handling paths
- Test coverage for store integration
- Test coverage for edge cases (rapid connect/disconnect, message fan-out, etc.)
- Coverage reports via `@vitest/coverage-v8`

### Improved
- Test coverage increased to 87.14% (from 79.22%)
- Store test coverage increased to 89.15% (from 71.08%)
- useSocket test coverage increased to 88.63% (from 81.06%)
- Branch coverage increased to 89.71% (from 85.86%)
- Function coverage increased to 76% (from 65.21%)

### Fixed
- Test reliability improvements with proper async handling
- Better test isolation with cleanup between tests

## [1.0.0] - 2025-11-02

### Added
- Initial release of react-ws-kit
- `useSocket<TIn, TOut>` hook with full TypeScript generic support
- Intelligent connection sharing across components with matching configurations
- Per-hook state isolation (status, lastReturnedData, allData)
- Auto-reconnect with configurable linear backoff strategy
- Message queuing with FIFO and size limits
- Kill switch API for coordinated disconnection across all subscribers
- Custom parse and serialize functions for flexible message handling
- Deterministic key system for function identity
- Reference counting for automatic socket cleanup
- Comprehensive TypeScript types and interfaces
- Zero polling - fully event-driven architecture
- Production-ready error handling and edge case management

### Features
- **Connection Sharing**: Multiple components share a single WebSocket instance
- **Type Safety**: Full generic type support for incoming and outgoing messages
- **Auto-Reconnect**: Linear backoff with configurable attempts and delays
- **Message Queue**: FIFO queue with configurable size and overflow handling
- **Kill Switch**: Coordinated disconnection across all subscribers
- **Status Sync**: Real-time status updates for all subscribers
- **Zero Dependencies**: Only peer dependency is React 16.8+

[1.1.0]: https://github.com/sameerdewan/react-ws-kit/compare/v1.0.2...v1.1.0
[1.0.2]: https://github.com/sameerdewan/react-ws-kit/compare/v1.0.0...v1.0.2
[1.0.0]: https://github.com/sameerdewan/react-ws-kit/releases/tag/v1.0.0

