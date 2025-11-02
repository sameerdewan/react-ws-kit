import { useSocket } from 'react-websocket-kit'
import type { ChatMessageIn, ChatMessageOut } from '../types'

const WS_URL = 'ws://localhost:3001/chat'

export default function ChatWindowB() {
  const { connect, disconnect, status, lastReturnedData, allData } = 
    useSocket<ChatMessageIn, ChatMessageOut>(WS_URL, {
      autoConnect: false,
      autoReconnect: true,
      reconnectAttempts: 5,
      reconnectDelay: 1000,
      queueMessages: true,
      maxQueueSize: 100,
      key: 'chat-v1' // Force socket sharing
    })

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Chat Window B</h3>
        <span className={`status-badge status-${status}`}>{status}</span>
      </div>

      <div className="button-group">
        <button onClick={connect}>Connect</button>
        <button onClick={disconnect} className="secondary">Disconnect</button>
      </div>

      <div className="info-row">
        <span className="info-label">Last Message:</span>
        <span className="info-value">
          {lastReturnedData?.message || 'None'}
        </span>
      </div>

      <div className="info-row">
        <span className="info-label">Messages Received:</span>
        <span className="info-value">{allData.length}</span>
      </div>

      {allData.length > 0 && (
        <div className="messages">
          {allData.slice(-5).map((msg, idx) => (
            <div key={idx} className="message">
              <strong>{msg.user}:</strong> {msg.message}
              <div className="message-meta">
                {new Date(msg.at).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

