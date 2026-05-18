import type { Board, Player } from '../types'
import type { AIDecision, PatternType } from './types'
import { BOARD_SIZE, canPlacePiece } from '../gameLogic'
import { PATTERN_SCORES } from './types'

interface Pattern {
  type: PatternType
  count: number
  openEnds: number
}

function scanLine(
  board: Board,
  row: number,
  col: number,
  dRow: number,
  dCol: number,
  player: Player
): Pattern | null {
  let count = 0
  let openEnds = 0
  let r = row + dRow
  let c = col + dCol

  while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
    if (board[r][c] === player) {
      count++
    } else if (board[r][c] === null) {
      openEnds++
      break
    } else {
      break
    }
    r += dRow
    c += dCol
  }

  if (count === 0) return null

  r = row - dRow
  c = col - dCol
  let reverseOpenEnds = 0
  while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
    if (board[r][c] === player) {
      count++
    } else if (board[r][c] === null) {
      reverseOpenEnds++
      break
    } else {
      break
    }
    r -= dRow
    c -= dCol
  }

  openEnds += reverseOpenEnds

  let type: PatternType
  if (count >= 5) {
    type = 'five'
  } else if (count === 4) {
    type = openEnds === 2 ? 'four' : 'block_four'
  } else if (count === 3) {
    if (openEnds === 2) {
      type = 'live_three'
    } else if (openEnds === 1) {
      type = 'block_live_three'
    } else {
      type = 'one'
    }
  } else if (count === 2) {
    type = openEnds === 2 ? 'live_two' : openEnds === 1 ? 'block_live_two' : 'one'
  } else {
    type = 'one'
  }

  return { type, count, openEnds }
}

function evaluatePosition(board: Board, row: number, col: number, player: Player): number {
  if (!canPlacePiece(board, row, col)) return -1

  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]]
  let totalScore = 0

  for (const [dRow, dCol] of directions) {
    const pattern = scanLine(board, row, col, dRow, dCol, player)
    if (pattern) {
      totalScore += PATTERN_SCORES[pattern.type]
    }

    const opponent = player === 'black' ? 'white' : 'black'
    const opponentPattern = scanLine(board, row, col, dRow, dCol, opponent)
    if (opponentPattern) {
      totalScore += PATTERN_SCORES[opponentPattern.type] * 0.9
    }
  }

  const center = Math.floor(BOARD_SIZE / 2)
  const distanceFromCenter = Math.abs(row - center) + Math.abs(col - center)
  totalScore += Math.max(0, 10 - distanceFromCenter)

  return totalScore
}

export function getAIMove(board: Board, player: Player): AIDecision | null {
  const emptyPositions: Array<{ row: number; col: number; score: number }> = []

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === null) {
        const score = evaluatePosition(board, row, col, player)
        if (score > 0) {
          emptyPositions.push({ row, col, score })
        }
      }
    }
  }

  if (emptyPositions.length === 0) {
    const center = Math.floor(BOARD_SIZE / 2)
    if (canPlacePiece(board, center, center)) {
      return { row: center, col: center, score: 1 }
    }
    return null
  }

  emptyPositions.sort((a, b) => b.score - a.score)

  const topCandidates = emptyPositions.slice(0, Math.min(5, emptyPositions.length))
  const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)]

  return { row: selected.row, col: selected.col, score: selected.score }
}