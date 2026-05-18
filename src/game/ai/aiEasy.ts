import type { Board, Player } from '../types'
import type { AIDecision } from './types'
import { BOARD_SIZE } from '../gameLogic'

export function getAIMove(board: Board, player: Player): AIDecision | null {
  const emptyPositions: Array<{ row: number; col: number }> = []

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === null) {
        emptyPositions.push({ row, col })
      }
    }
  }

  if (emptyPositions.length === 0) {
    return null
  }

  const randomIndex = Math.floor(Math.random() * emptyPositions.length)
  const { row, col } = emptyPositions[randomIndex]

  return { row, col, score: 0 }
}