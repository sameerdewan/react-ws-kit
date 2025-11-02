import { useSocket } from 'react-ws-kit'
import type { PriceTickIn } from '../types'

interface PriceWidgetProps {
  symbol: string
}

export default function PriceWidget({ symbol }: PriceWidgetProps) {
  const wsUrl = `ws://localhost:3001/prices?symbol=${symbol}`
  
  const { 
    connect, 
    disconnect, 
    killSocketForAllSubscribers, 
    status, 
    lastReturnedData, 
    allData 
  } = useSocket<PriceTickIn, never>(wsUrl, {
    autoConnect: false,
    autoReconnect: true,
    reconnectAttempts: 3,
    reconnectDelay: 1500
  })

  const latestPrice = lastReturnedData?.price
  const latestChange = lastReturnedData?.change

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">{symbol} Price</h3>
        <span className={`status-badge status-${status}`}>{status}</span>
      </div>

      <div className="button-group">
        <button onClick={connect}>Connect</button>
        <button onClick={disconnect} className="secondary">Disconnect</button>
        <button onClick={killSocketForAllSubscribers} className="danger">
          Kill
        </button>
      </div>

      {latestPrice !== undefined && (
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1d9bf0' }}>
            ${latestPrice.toLocaleString()}
          </div>
          {latestChange !== undefined && (
            <div style={{ 
              fontSize: '1rem', 
              color: latestChange >= 0 ? '#00ba7c' : '#f4212e',
              fontWeight: '600'
            }}>
              {latestChange >= 0 ? '↑' : '↓'} {Math.abs(latestChange).toFixed(2)}%
            </div>
          )}
        </div>
      )}

      <div className="info-row">
        <span className="info-label">Updates Received:</span>
        <span className="info-value">{allData.length}</span>
      </div>
    </div>
  )
}

