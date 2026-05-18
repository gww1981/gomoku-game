import { Player } from '../game/types'

interface CellProps {
  piece: Player | null
  onClick: () => void
}

export function Cell({ piece, onClick }: CellProps) {
  return (
    <div
      className="cell"
      onClick={onClick}
      data-piece={piece}
    >
      {piece && <div className={`piece ${piece}`} />}
    </div>
  )
}
