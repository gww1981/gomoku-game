import type { LanState, Player } from '../game/types'
import './NetworkStatus.css'

interface NetworkStatusProps {
  lanState: LanState
  currentPlayer: Player
}

export function NetworkStatus({ lanState, currentPlayer }: NetworkStatusProps) {
  const isMyTurn = lanState.myColor === currentPlayer
  const statusClass = lanState.opponentConnected ? 'connected' : 'disconnected'
  const statusText = lanState.opponentConnected ? '已连接' : '等待重连'
  const colorEmoji = lanState.myColor === 'black' ? '⚫' : '⚪'

  return (
    <div className="network-status">
      <span className={`status-dot ${statusClass}`} />
      <span className={`status-text ${statusClass}`}>{statusText}</span>
      <span className="status-divider">|</span>
      <span className="status-room">房间: {lanState.roomId}</span>
      <span className="status-divider">|</span>
      <span className={`status-turn ${isMyTurn ? 'my-turn' : 'opponent-turn'}`}>
        {isMyTurn ? `你的回合 ${colorEmoji}` : '等待对方落子'}
      </span>
    </div>
  )
}
