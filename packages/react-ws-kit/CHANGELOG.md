# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- **Zero Dependencies**: Only peer dependency is React 18+

[1.0.0]: https://github.com/yourusername/react-ws-kit/releases/tag/v1.0.0

