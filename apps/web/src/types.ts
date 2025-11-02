/**
 * Type definitions for WebSocket messages
 */

export type ChatMessageIn = {
  type: 'chat'
  user: string
  message: string
  at: number
}

export type ChatMessageOut = {
  message: string
}

export type NotificationIn = {
  type: 'notification'
  title: string
  timestamp: number
  id: string
}

export type PriceTickIn = {
  type: 'price'
  symbol: string
  price: number
  change: number
  timestamp: number
}

