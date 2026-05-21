import type { KeyboardEvent } from 'react'
import type { Player } from '../game/types'

interface CellProps {
  piece: Player | null
  onClick: () => void
  className?: string
  moveNumber?: number
  isLastMove?: boolean
}

const pieceLabel: Record<Player, string> = {
  black: '黑棋',
  white: '白棋',
}

export function Cell({ piece, onClick, className = '', moveNumber, isLastMove }: CellProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      onClick()
    }

    if (event.key === ' ') {
      event.preventDefault()
      onClick()
    }
  }

  return (
    <div
      role="button"
      aria-label={piece ? pieceLabel[piece] : '空位'}
      tabIndex={0}
      className={`cell ${className}`.trim()}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      data-piece={piece ?? ''}
    >
      {piece && <div className={`piece ${piece}`} />}
      {moveNumber !== undefined && moveNumber > 0 && (
        <span className="move-number">{moveNumber}</span>
      )}
    </div>
  )
}
