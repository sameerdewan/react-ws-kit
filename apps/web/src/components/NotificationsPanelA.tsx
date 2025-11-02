import { useSocket } from 'react-websocket-kit'
import type { NotificationIn } from '../types'

const WS_URL = 'ws://localhost:3001/notifications'

export default function NotificationsPanelA() {
  const { 
    connect, 
    disconnect, 
    killSocketForAllSubscribers, 
    status, 
    lastReturnedData, 
    allData 
  } = useSocket<NotificationIn, never>(WS_URL, {
    autoConnect: false,
    autoReconnect: true,
    reconnectAttempts: 3,
    reconnectDelay: 2000,
    key: 'notifications-v1'
  })

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Notifications Panel A</h3>
        <span className={`status-badge status-${status}`}>{status}</span>
      </div>

      <div className="button-group">
        <button onClick={connect}>Connect</button>
        <button onClick={disconnect} className="secondary">Disconnect</button>
        <button onClick={killSocketForAllSubscribers} className="danger">
          Kill
        </button>
      </div>

      <div className="info-row">
        <span className="info-label">Total Notifications:</span>
        <span className="info-value">{allData.length}</span>
      </div>

      <div className="info-row">
        <span className="info-label">Latest:</span>
        <span className="info-value">
          {lastReturnedData?.title || 'None'}
        </span>
      </div>

      {allData.length > 0 && (
        <div className="messages">
          {allData.slice(-5).reverse().map((notif) => (
            <div key={notif.id} className="message">
              {notif.title}
              <div className="message-meta">
                {new Date(notif.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

