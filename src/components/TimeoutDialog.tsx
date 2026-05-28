import type { Player } from '../game/types'

interface TimeoutDialogProps {
  winner: Player
  myColor: Player
  onConfirm: () => void
}

export function TimeoutDialog({ winner, myColor, onConfirm }: TimeoutDialogProps) {
  const isWinner = winner === myColor
  const winnerLabel = winner === 'black' ? '黑方' : '白方'
  const loserLabel = winner === 'black' ? '白方' : '黑方'

  return (
    <div className="dialog-overlay">
      <div className="dialog-box">
        <p>{isWinner ? '对方超时，你赢了！' : `${loserLabel}超时，${winnerLabel}获胜`}</p>
        <p className="dialog-hint">点击确认后开始新一局</p>
        <div className="dialog-actions">
          <button type="button" className="dialog-btn accept" onClick={onConfirm}>
            确认
          </button>
        </div>
      </div>
    </div>
  )
}
