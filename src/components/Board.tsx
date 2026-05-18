import type { Board } from '../game/types'
import { Cell } from './Cell'

interface BoardProps {
  board: Board
  onCellClick: (row: number, col: number) => void
}

export function Board({ board, onCellClick }: BoardProps) {
  return (
    <div className="board">
      {board.map((row, rowIndex) =>
        row.map((piece, colIndex) => (
          <Cell
            key={`${rowIndex}-${colIndex}`}
            piece={piece}
            onClick={() => onCellClick(rowIndex, colIndex)}
          />
        ))
      )}
    </div>
  )
}
