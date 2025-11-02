import express from 'express'
import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import cors from 'cors'

const app = express()
const server = createServer(app)

app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3001

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

/**
 * Chat WebSocket - Broadcast messages to all clients
 */
const chatWss = new WebSocketServer({ noServer: true })
const chatClients = new Set<WebSocket>()

chatWss.on('connection', (ws: WebSocket) => {
  console.log('[Chat] Client connected')
  chatClients.add(ws)

  ws.on('message', (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString())
      console.log('[Chat] Received:', message)

      // Echo back with metadata
      const response = {
        type: 'chat',
        user: 'Server',
        message: message.message || 'No message',
        at: Date.now()
      }

      // Broadcast to all clients
      chatClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(response))
        }
      })
    } catch (error) {
      console.error('[Chat] Error processing message:', error)
    }
  })

  ws.on('close', () => {
    console.log('[Chat] Client disconnected')
    chatClients.delete(ws)
  })

  ws.on('error', (error) => {
    console.error('[Chat] WebSocket error:', error)
  })

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'chat',
    user: 'System',
    message: 'Welcome to the chat!',
    at: Date.now()
  }))
})

/**
 * Notifications WebSocket - Emit random notifications
 */
const notificationsWss = new WebSocketServer({ noServer: true })

notificationsWss.on('connection', (ws: WebSocket) => {
  console.log('[Notifications] Client connected')

  const notifications = [
    'New user registered',
    'System update available',
    'Your report is ready',
    'New comment on your post',
    'Backup completed successfully',
    'Security alert: New login detected'
  ]

  // Send random notifications every 3-8 seconds
  const interval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      const notification = {
        type: 'notification',
        title: notifications[Math.floor(Math.random() * notifications.length)],
        timestamp: Date.now(),
        id: Math.random().toString(36).substring(7)
      }
      ws.send(JSON.stringify(notification))
    }
  }, 3000 + Math.random() * 5000)

  ws.on('close', () => {
    console.log('[Notifications] Client disconnected')
    clearInterval(interval)
  })

  ws.on('error', (error) => {
    console.error('[Notifications] WebSocket error:', error)
    clearInterval(interval)
  })
})

/**
 * Prices WebSocket - Emit price ticks based on symbol query param
 */
const pricesWss = new WebSocketServer({ noServer: true })

pricesWss.on('connection', (ws: WebSocket, req) => {
  const url = new URL(req.url!, `http://${req.headers.host}`)
  const symbol = url.searchParams.get('symbol') || 'BTC'
  
  console.log(`[Prices] Client connected for ${symbol}`)

  const basePrice: Record<string, number> = {
    BTC: 50000,
    ETH: 3000,
    DOGE: 0.25
  }

  let currentPrice = basePrice[symbol] || 100

  // Send price ticks every 2 seconds
  const interval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      // Random price movement
      const change = (Math.random() - 0.5) * 0.02 // ±1%
      currentPrice *= (1 + change)

      const tick = {
        type: 'price',
        symbol,
        price: parseFloat(currentPrice.toFixed(2)),
        change: parseFloat((change * 100).toFixed(2)),
        timestamp: Date.now()
      }
      ws.send(JSON.stringify(tick))
    }
  }, 2000)

  ws.on('close', () => {
    console.log(`[Prices] Client disconnected for ${symbol}`)
    clearInterval(interval)
  })

  ws.on('error', (error) => {
    console.error(`[Prices] WebSocket error for ${symbol}:`, error)
    clearInterval(interval)
  })

  // Send initial price
  ws.send(JSON.stringify({
    type: 'price',
    symbol,
    price: currentPrice,
    change: 0,
    timestamp: Date.now()
  }))
})

/**
 * Upgrade handler - Route WebSocket connections based on path
 */
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url!, `http://${request.headers.host}`)
  const pathname = url.pathname

  if (pathname === '/chat') {
    chatWss.handleUpgrade(request, socket, head, (ws) => {
      chatWss.emit('connection', ws, request)
    })
  } else if (pathname === '/notifications') {
    notificationsWss.handleUpgrade(request, socket, head, (ws) => {
      notificationsWss.emit('connection', ws, request)
    })
  } else if (pathname === '/prices') {
    pricesWss.handleUpgrade(request, socket, head, (ws) => {
      pricesWss.emit('connection', ws, request)
    })
  } else {
    socket.destroy()
  }
})

/**
 * Graceful shutdown
 */
const shutdown = () => {
  console.log('\nShutting down gracefully...')
  
  chatWss.close(() => console.log('Chat WebSocket closed'))
  notificationsWss.close(() => console.log('Notifications WebSocket closed'))
  pricesWss.close(() => console.log('Prices WebSocket closed'))
  
  server.close(() => {
    console.log('HTTP server closed')
    process.exit(0)
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

/**
 * Start server
 */
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`)
  console.log(`📡 WebSocket endpoints:`)
  console.log(`   - ws://localhost:${PORT}/chat`)
  console.log(`   - ws://localhost:${PORT}/notifications`)
  console.log(`   - ws://localhost:${PORT}/prices?symbol=BTC`)
})

