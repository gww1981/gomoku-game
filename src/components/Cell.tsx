import type { Player } from '../game/types'

interface CellProps {
  piece: Player | null
  onClick: () => void
  className?: string
}

const pieceLabel: Record<Player, string> = {
  black: '黑棋',
  white: '白棋',
}

export function Cell({ piece, onClick, className = '' }: CellProps) {
  return (
    <div
      role="button"
      aria-label={piece ? pieceLabel[piece] : '空位'}
      className={`cell ${className}`.trim()}
      onClick={onClick}
      data-piece={piece ?? ''}
    >
      {piece && <div className={`piece ${piece}`} />}
    </div>
  )
}
