import { Board, Player } from './types'

export const BOARD_SIZE = 15

export function createEmptyBoard(): Board {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null))
}

export function canPlacePiece(board: Board, row: number, col: number): boolean {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    return false
  }
  return board[row][col] === null
}

export function checkWin(board: Board, row: number, col: number, player: Player): boolean {
  // Check horizontal (left-right)
  let count = 1
  // Left
  for (let c = col - 1; c >= 0 && board[row][c] === player; c--) {
    count++
  }
  // Right
  for (let c = col + 1; c < BOARD_SIZE && board[row][c] === player; c++) {
    count++
  }
  if (count >= 5) return true

  return false
}
