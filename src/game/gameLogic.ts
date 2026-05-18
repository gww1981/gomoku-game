import type { Board, Player } from './types'

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
  for (let c = col - 1; c >= 0 && board[row][c] === player; c--) count++
  for (let c = col + 1; c < BOARD_SIZE && board[row][c] === player; c++) count++
  if (count >= 5) return true

  // Check vertical (up-down)
  count = 1
  for (let r = row - 1; r >= 0 && board[r][col] === player; r--) count++
  for (let r = row + 1; r < BOARD_SIZE && board[r][col] === player; r++) count++
  if (count >= 5) return true

  // Check left diagonal (top-left to bottom-right)
  count = 1
  for (let i = 1; row - i >= 0 && col - i >= 0 && board[row - i][col - i] === player; i++) count++
  for (let i = 1; row + i < BOARD_SIZE && col + i < BOARD_SIZE && board[row + i][col + i] === player; i++) count++
  if (count >= 5) return true

  // Check right diagonal (top-right to bottom-left)
  count = 1
  for (let i = 1; row - i >= 0 && col + i < BOARD_SIZE && board[row - i][col + i] === player; i++) count++
  for (let i = 1; row + i < BOARD_SIZE && col - i >= 0 && board[row + i][col - i] === player; i++) count++
  if (count >= 5) return true

  return false
}
