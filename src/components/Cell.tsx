import type { Player } from '../game/types'

interface CellProps {
  piece: Player | null
  onClick: () => void
  className?: string
}

export function Cell({ piece, onClick, className = '' }: CellProps) {
  return (
    <div
      className={`cell ${className}`.trim()}
      onClick={onClick}
      data-piece={piece}
    >
      {piece && <div className={`piece ${piece}`} />}
    </div>
  )
}
