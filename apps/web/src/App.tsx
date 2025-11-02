import ChatModule from './components/ChatModule'
import NotificationsModule from './components/NotificationsModule'
import PricesModule from './components/PricesModule'
import SocketDashboard from './components/SocketDashboard'

function App() {
  return (
    <div className="container">
      <header className="header">
        <h1>⚡ Realtime Control Center</h1>
        <p>Demonstrating typed WebSocket hooks with intelligent sharing</p>
      </header>

      <section className="section">
        <h2 className="section-title">💬 Chat Module (Shared Socket)</h2>
        <p className="section-description">
          Both windows connect to the same WebSocket endpoint and share the connection.
          Disconnect one, the other keeps receiving. Kill switch affects both.
        </p>
        <ChatModule />
      </section>

      <section className="section">
        <h2 className="section-title">🔔 Notifications Module (Manual Connect)</h2>
        <p className="section-description">
          Demonstrates manual connection control and independent allData histories.
          Each panel maintains its own message history despite sharing the socket.
        </p>
        <NotificationsModule />
      </section>

      <section className="section">
        <h2 className="section-title">💰 Prices Module (Independent Sockets)</h2>
        <p className="section-description">
          Different query parameters create independent WebSocket connections.
          Killing one price feed doesn't affect others.
        </p>
        <PricesModule />
      </section>

      <section className="section">
        <h2 className="section-title">📊 Socket Dashboard</h2>
        <p className="section-description">
          Real-time view of all active WebSocket connections with their states and metrics.
        </p>
        <SocketDashboard />
      </section>
    </div>
  )
}

export default App

