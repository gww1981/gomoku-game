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
