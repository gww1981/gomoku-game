import type { Board } from '../game/types'
import { Cell } from './Cell'

interface BoardProps {
  board: Board
  onCellClick: (row: number, col: number) => void
  lastMove?: { row: number; col: number } | null
  winningCells?: Array<{ row: number; col: number }>
}

export function Board({ board, onCellClick, lastMove, winningCells = [] }: BoardProps) {
  const isWinningCell = (row: number, col: number) => {
    return winningCells.some(cell => cell.row === row && cell.col === col)
  }

  const getCellClassName = (row: number, col: number) => {
    const classes: string[] = []
    if (lastMove && lastMove.row === row && lastMove.col === col) {
      classes.push('last-move')
    }
    if (isWinningCell(row, col)) {
      classes.push('winning')
    }
    return classes.join(' ')
  }

  return (
    <div className="board">
      {board.map((row, rowIndex) =>
        row.map((piece, colIndex) => (
          <Cell
            key={`${rowIndex}-${colIndex}`}
            piece={piece}
            onClick={() => onCellClick(rowIndex, colIndex)}
            className={getCellClassName(rowIndex, colIndex)}
          />
        ))
      )}
    </div>
  )
}
