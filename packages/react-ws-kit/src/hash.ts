import type { NormalizedOptions } from './types'

/**
 * Simple hash function for strings
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString(36)
}

/**
 * Checks if a function is the default parse function
 */
function isDefaultParse(fn: Function): boolean {
  const fnStr = fn.toString()
  return fnStr.includes('JSON.parse') && fnStr.includes('event.data')
}

/**
 * Checks if a function is the default serialize function
 */
function isDefaultSerialize(fn: Function): boolean {
  const fnStr = fn.toString()
  return fnStr.includes('JSON.stringify') && !fnStr.includes('event')
}

/**
 * Creates a stable key for a socket based on URL and normalized options
 * This key determines which hooks share the same WebSocket instance
 */
export function createSocketKey<TIn, TOut>(
  url: string,
  config: NormalizedOptions<TIn, TOut>
): string {
  const parts: string[] = [url]

  // Protocol(s)
  if (config.protocols) {
    const protocols = Array.isArray(config.protocols) 
      ? config.protocols.sort().join(',') 
      : config.protocols
    parts.push(`proto:${protocols}`)
  }

  // Reconnection settings
  parts.push(`ar:${config.autoReconnect}`)
  parts.push(`ra:${config.reconnectAttempts}`)
  parts.push(`rd:${config.reconnectDelay}`)

  // Queue settings
  parts.push(`qm:${config.queueMessages}`)
  parts.push(`mqs:${config.maxQueueSize}`)

  // Function identity - use provided key or detect default functions
  if (config.key) {
    parts.push(`key:${config.key}`)
  } else {
    // Use a consistent marker for default functions
    const parseHash = isDefaultParse(config.parse) 
      ? 'default-parse' 
      : simpleHash(config.parse.toString())
    const serializeHash = isDefaultSerialize(config.serialize) 
      ? 'default-serialize' 
      : simpleHash(config.serialize.toString())
    parts.push(`ph:${parseHash}`)
    parts.push(`sh:${serializeHash}`)
  }

  return parts.join('|')
}

