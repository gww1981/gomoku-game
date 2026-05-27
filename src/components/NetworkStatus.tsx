import { useState, useEffect } from 'react'
import type { LanState, Player } from '../game/types'
import './NetworkStatus.css'

interface NetworkStatusProps {
  lanState: LanState
  currentPlayer: Player
}

function calcRemaining(deadline: number | null): number {
  if (!deadline) return 0
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
}

export function NetworkStatus({ lanState, currentPlayer }: NetworkStatusProps) {
  const isMyTurn = lanState.myColor === currentPlayer
  const statusClass = lanState.opponentConnected ? 'connected' : 'disconnected'
  const statusText = lanState.opponentConnected ? '已连接' : '等待重连'
  const colorEmoji = lanState.myColor === 'black' ? '⚫' : '⚪'

  const [remaining, setRemaining] = useState<number>(() => calcRemaining(lanState.moveDeadline))

  useEffect(() => {
    if (!lanState.moveDeadline) {
      setRemaining(0)
      return
    }
    const update = () => setRemaining(calcRemaining(lanState.moveDeadline))
    update()
    const id = setInterval(update, 500)
    return () => clearInterval(id)
  }, [lanState.moveDeadline])

  const isMyTimer = lanState.timerFor === lanState.myColor
  const isUrgent = lanState.moveDeadline !== null && remaining <= 10 && isMyTimer

  return (
    <div className={`network-status${isUrgent ? ' urgent' : ''}`}>
      <span className={`status-dot ${statusClass}`} />
      <span className={`status-text ${statusClass}`}>{statusText}</span>
      <span className="status-divider">|</span>
      <span className="status-room">房间: {lanState.roomId}</span>
      <span className="status-divider">|</span>
      <span className={`status-turn ${isMyTurn ? 'my-turn' : 'opponent-turn'}`}>
        {isMyTurn ? `你的回合 ${colorEmoji}` : '等待对方落子'}
      </span>
      {lanState.moveDeadline !== null && (
        <>
          <span className="status-divider">|</span>
          <span className={`timer-block ${isUrgent ? 'timer-urgent' : 'timer-normal'}`}>
            ⏱ {remaining}s
          </span>
        </>
      )}
    </div>
  )
}
