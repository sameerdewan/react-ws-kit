import { useState } from 'react'
import { useSocket } from 'react-websocket-kit'
import type { ChatMessageIn, ChatMessageOut } from '../types'

const WS_URL = 'ws://localhost:3001/chat'

export default function ChatController() {
  const [messageInput, setMessageInput] = useState('')
  
  const { connect, disconnect, send, killSocketForAllSubscribers, status } = 
    useSocket<ChatMessageIn, ChatMessageOut>(WS_URL, {
      autoConnect: false,
      autoReconnect: true,
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      queueMessages: true,
      maxQueueSize: 100,
      key: 'chat-v1' // Force socket sharing
    })

  const handleSend = () => {
    if (messageInput.trim()) {
      send({ message: messageInput })
      setMessageInput('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend()
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Chat Controller</h3>
        <span className={`status-badge status-${status}`}>{status}</span>
      </div>

      <div className="button-group">
        <button onClick={connect}>Connect</button>
        <button onClick={disconnect} className="secondary">Disconnect</button>
        <button onClick={killSocketForAllSubscribers} className="danger">
          Kill Socket
        </button>
      </div>

      <input
        type="text"
        value={messageInput}
        onChange={(e) => setMessageInput(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Type a message..."
      />

      <button onClick={handleSend} style={{ width: '100%' }}>
        Send Message
      </button>

      <div style={{ marginTop: '15px', fontSize: '0.85rem', color: '#71767b' }}>
        💡 This controller shares the same socket as Windows A & B.
        Try sending messages, disconnecting, or using the kill switch!
      </div>
    </div>
  )
}

