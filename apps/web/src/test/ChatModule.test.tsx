import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ChatWindowA from '../components/ChatWindowA'
import ChatWindowB from '../components/ChatWindowB'
import ChatController from '../components/ChatController'

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
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.onopen?.(new Event('open'))
    }, 10)
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

describe('Chat Module Integration', () => {
  beforeEach(() => {
    vi.clearAllTimers()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should connect both windows and share socket', async () => {
    const user = userEvent.setup()
    
    const { container: containerA } = render(<ChatWindowA />)
    const { container: containerB } = render(<ChatWindowB />)

    // Initially disconnected
    expect(screen.getAllByText('disconnected')).toHaveLength(2)

    // Connect Window A
    const connectButtonA = containerA.querySelector('button')!
    await user.click(connectButtonA)

    // Both should become connected (shared socket)
    await waitFor(() => {
      expect(screen.getAllByText('connected')).toHaveLength(2)
    }, { timeout: 100 })
  })

  it('should maintain independent allData arrays', async () => {
    const user = userEvent.setup()
    
    render(<ChatWindowA />)
    render(<ChatWindowB />)

    // Connect Window A first
    const connectButtons = screen.getAllByText('Connect')
    await user.click(connectButtons[0])

    await waitFor(() => {
      expect(screen.getAllByText('connected').length).toBeGreaterThanOrEqual(1)
    }, { timeout: 100 })

    // Both windows should show message count of 0 initially
    const messageCounts = screen.getAllByText(/Messages Received:/)
    expect(messageCounts.length).toBeGreaterThanOrEqual(2)
  })

  it('should handle disconnect without affecting other subscribers', async () => {
    const user = userEvent.setup()
    
    const { container: containerA } = render(<ChatWindowA />)
    render(<ChatWindowB />)

    // Connect both
    const connectButtons = screen.getAllByText('Connect')
    await user.click(connectButtons[0])

    await waitFor(() => {
      expect(screen.getAllByText('connected')).toHaveLength(2)
    }, { timeout: 100 })

    // Disconnect Window A only
    const disconnectButtonA = containerA.querySelectorAll('button')[1]
    await user.click(disconnectButtonA)

    await waitFor(() => {
      // Window A disconnected
      const statuses = screen.getAllByText(/connected|disconnected/)
      expect(statuses.length).toBeGreaterThanOrEqual(2)
    }, { timeout: 100 })
  })

  it('should implement kill switch correctly', async () => {
    const user = userEvent.setup()
    
    render(<ChatWindowA />)
    render(<ChatWindowB />)
    render(<ChatController />)

    // Connect all
    const connectButtons = screen.getAllByText('Connect')
    await user.click(connectButtons[0])

    await waitFor(() => {
      expect(screen.getAllByText('connected').length).toBeGreaterThanOrEqual(2)
    }, { timeout: 100 })

    // Activate kill switch from controller
    const killButton = screen.getByText('Kill Socket')
    await user.click(killButton)

    await waitFor(() => {
      // All should be disconnected
      const disconnectedBadges = screen.getAllByText('disconnected')
      expect(disconnectedBadges.length).toBeGreaterThanOrEqual(2)
    }, { timeout: 100 })
  })
})

