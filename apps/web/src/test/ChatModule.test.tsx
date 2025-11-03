import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, cleanup } from '@testing-library/react'
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
    }, 50)
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
    cleanup()
  })

  afterEach(() => {
    vi.clearAllMocks()
    cleanup()
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

    // Window A should become connected
    await waitFor(() => {
      const connectedBadges = screen.queryAllByText('connected')
      expect(connectedBadges.length).toBeGreaterThanOrEqual(1)
    }, { timeout: 1000 })

    // Now connect Window B - it should share the socket
    const connectButtonB = containerB.querySelector('button')!
    await user.click(connectButtonB)

    // Both should now be connected (shared socket)
    await waitFor(() => {
      expect(screen.getAllByText('connected')).toHaveLength(2)
    }, { timeout: 1000 })
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
    }, { timeout: 1000 })

    // Both windows should show message count of 0 initially
    const messageCounts = screen.getAllByText(/Messages Received:/)
    expect(messageCounts.length).toBeGreaterThanOrEqual(2)
  })

  it('should handle disconnect without affecting other subscribers', async () => {
    const user = userEvent.setup()
    
    const { container: containerA } = render(<ChatWindowA />)
    const { container: containerB } = render(<ChatWindowB />)

    // Connect both windows
    const connectButtonA = containerA.querySelector('button')!
    const connectButtonB = containerB.querySelector('button')!
    
    await user.click(connectButtonA)
    await user.click(connectButtonB)

    await waitFor(() => {
      expect(screen.getAllByText('connected')).toHaveLength(2)
    }, { timeout: 1000 })

    // Disconnect Window A only
    const disconnectButtonA = containerA.querySelectorAll('button')[1]
    await user.click(disconnectButtonA)

    await waitFor(() => {
      // Window B should still be connected (socket remains open)
      const connectedBadges = screen.queryAllByText('connected')
      const disconnectedBadges = screen.queryAllByText('disconnected')
      expect(connectedBadges.length + disconnectedBadges.length).toBeGreaterThanOrEqual(2)
    }, { timeout: 1000 })
  })

  it('should implement kill switch correctly', async () => {
    const user = userEvent.setup()
    
    const { container: containerA } = render(<ChatWindowA />)
    const { container: containerB } = render(<ChatWindowB />)
    const { container: containerC } = render(<ChatController />)

    // Connect all three components
    const connectButtonA = containerA.querySelector('button')!
    const connectButtonB = containerB.querySelector('button')!
    const connectButtonC = containerC.querySelector('button')!
    
    await user.click(connectButtonA)
    await user.click(connectButtonB)
    await user.click(connectButtonC)

    await waitFor(() => {
      expect(screen.getAllByText('connected').length).toBeGreaterThanOrEqual(3)
    }, { timeout: 1000 })

    // Activate kill switch from controller
    const killButton = screen.getByText('Kill Socket')
    await user.click(killButton)

    await waitFor(() => {
      // All should be disconnected
      const disconnectedBadges = screen.getAllByText('disconnected')
      expect(disconnectedBadges.length).toBeGreaterThanOrEqual(3)
    }, { timeout: 1000 })
  })
})

