import { useState, useEffect } from 'react'
import { getSocketStore } from 'react-ws-kit'
import type { SocketInfo } from 'react-ws-kit'

export default function SocketDashboard() {
  const [sockets, setSockets] = useState<SocketInfo[]>([])
  const store = getSocketStore()

  useEffect(() => {
    const interval = setInterval(() => {
      setSockets(store.getAllSocketInfo())
    }, 500)

    return () => clearInterval(interval)
  }, [store])

  // Calculate totals
  const totalConnections = sockets.length
  const activeConnections = sockets.filter(s => s.status === 'connected').length
  const totalSubscribers = sockets.reduce((sum, socket) => sum + socket.refCount, 0)

  if (sockets.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <p>No active WebSocket connections</p>
          <p style={{ fontSize: '0.9rem', marginTop: '10px' }}>
            Connect to any endpoint above to see live socket information here
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Summary Header */}
      <div style={{ 
        display: 'flex', 
        gap: '15px', 
        marginBottom: '20px',
        padding: '20px',
        background: '#16181c',
        border: '1px solid #2f3336',
        borderRadius: '12px'
      }}>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1d9bf0' }}>
            {totalConnections}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#71767b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Socket Instances
          </div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: activeConnections > 0 ? '#00ba7c' : '#71767b' }}>
            {activeConnections}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#71767b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Active Connections
          </div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#7856ff' }}>
            {totalSubscribers}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#71767b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Total Subscribers
          </div>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#ffd400' }}>
            {totalSubscribers > 0 ? (totalSubscribers / totalConnections).toFixed(1) : '0'}
          </div>
          <div style={{ fontSize: '0.85rem', color: '#71767b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Avg Subscribers/Instance
          </div>
        </div>
      </div>

      {/* Individual Socket Details */}
      <div className="dashboard-grid">
        {sockets.map((socket) => (
        <div 
          key={socket.key} 
          className="socket-item"
          style={{
            opacity: socket.status === 'connected' ? 1 : 0.6,
            borderColor: socket.status === 'connected' ? '#1d9bf0' : socket.killed ? '#f4212e' : '#2f3336'
          }}
        >
          <div className="socket-header">
            <div>
              <div className="socket-url">{socket.url}</div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                <span className={`status-badge status-${socket.status}`}>
                  {socket.status}
                </span>
                {socket.killed && (
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    background: 'rgba(244, 33, 46, 0.2)',
                    color: '#f4212e'
                  }}>
                    KILLED
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="socket-stats">
            <div className="stat">
              <div className="stat-value">{socket.refCount}</div>
              <div className="stat-label">Subscribers</div>
            </div>
            <div className="stat">
              <div className="stat-value">{socket.queueLength}</div>
              <div className="stat-label">Queue</div>
            </div>
            <div className="stat">
              <div className="stat-value">{socket.reconnectAttemptsMade}</div>
              <div className="stat-label">Reconnects</div>
            </div>
            <div className="stat">
              <div className="stat-value">{socket.killed ? '🔴' : '🟢'}</div>
              <div className="stat-label">Killed</div>
            </div>
          </div>

          <div className="button-group" style={{ marginTop: '10px' }}>
            <button 
              onClick={() => store.clearQueue(socket.key)}
              className="secondary"
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            >
              Clear Queue
            </button>
          </div>
        </div>
        ))}
      </div>
    </div>
  )
}

