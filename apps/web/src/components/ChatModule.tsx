import ChatWindowA from './ChatWindowA'
import ChatWindowB from './ChatWindowB'
import ChatController from './ChatController'

export default function ChatModule() {
  return (
    <div className="grid">
      <ChatWindowA />
      <ChatWindowB />
      <ChatController />
    </div>
  )
}

