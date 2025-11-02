import type { SocketInstance, SocketInfo } from './types'

/**
 * Global singleton store for managing shared WebSocket instances
 */
class SocketStore {
  private sockets = new Map<string, SocketInstance<any, any>>()

  /**
   * Get a socket instance by key
   */
  get<TIn, TOut>(key: string): SocketInstance<TIn, TOut> | undefined {
    return this.sockets.get(key)
  }

  /**
   * Set a socket instance
   */
  set<TIn, TOut>(key: string, instance: SocketInstance<TIn, TOut>): void {
    this.sockets.set(key, instance)
  }

  /**
   * Delete a socket instance
   */
  delete(key: string): void {
    this.sockets.delete(key)
  }

  /**
   * Check if a socket key exists
   */
  has(key: string): boolean {
    return this.sockets.has(key)
  }

  /**
   * Get all socket keys
   */
  keys(): string[] {
    return Array.from(this.sockets.keys())
  }

  /**
   * Get read-only information about all sockets (for debugging/dashboard)
   */
  getAllSocketInfo(): SocketInfo[] {
    return Array.from(this.sockets.entries()).map(([key, instance]) => ({
      key,
      url: instance.socket?.url || 'N/A',
      status: instance.status,
      refCount: instance.refCount,
      queueLength: instance.messageQueue.length,
      reconnectAttemptsMade: instance.reconnectAttemptsMade,
      killed: instance.killed
    }))
  }

  /**
   * Clear a socket's message queue (for debugging/testing)
   */
  clearQueue(key: string): void {
    const instance = this.sockets.get(key)
    if (instance) {
      instance.messageQueue = []
    }
  }
}

/**
 * Singleton instance
 */
export const socketStore = new SocketStore()

/**
 * Export for debugging/dashboard use
 */
export function getSocketStore() {
  return {
    getAllSocketInfo: () => socketStore.getAllSocketInfo(),
    clearQueue: (key: string) => socketStore.clearQueue(key)
  }
}

