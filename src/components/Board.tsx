import type { Board } from '../game/types'
import { Cell } from './Cell'

interface BoardProps {
  board: Board
  onCellClick: (row: number, col: number) => void
  lastMove?: { row: number; col: number } | null
  winningCells?: Array<{ row: number; col: number }>
  moveNumbers?: Array<{ row: number; col: number; number: number }>
  currentMoveIndex?: number
}

export function Board({ board, onCellClick, lastMove, winningCells = [], moveNumbers, currentMoveIndex = -1 }: BoardProps) {
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

  const getMoveNumber = (row: number, col: number) => {
    const move = moveNumbers?.find(m => m.row === row && m.col === col)
    return move?.number
  }

  const isCellLastMove = (row: number, col: number) => {
    return lastMove?.row === row && lastMove?.col === col
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
            moveNumber={getMoveNumber(rowIndex, colIndex)}
            isLastMove={isCellLastMove(rowIndex, colIndex)}
          />
        ))
      )}
    </div>
  )
}
