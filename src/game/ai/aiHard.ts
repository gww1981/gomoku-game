import type { Board, Player } from '../types'
import type { AIDecision } from './types'
import { BOARD_SIZE, canPlacePiece, checkWin } from '../gameLogic'
import { getAIMove as getMediumMove } from './aiMedium'

const MAX_DEPTH = 3

function evaluateBoard(board: Board, aiPlayer: Player): number {
  const opponent = aiPlayer === 'black' ? 'white' : 'black'
  let score = 0

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col]
      if (piece !== null) {
        const multiplier = piece === aiPlayer ? 1 : -1
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]]

        for (const [dRow, dCol] of directions) {
          let count = 1
          let openEnds = 0

          let r = row + dRow
          let c = col + dCol
          while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === piece) {
            count++
            r += dRow
            c += dCol
          }
          if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === null) {
            openEnds++
          }

          r = row - dRow
          c = col - dCol
          while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === piece) {
            count++
            r -= dRow
            c -= dCol
          }
          if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === null) {
            openEnds++
          }

          if (count >= 5) {
            score += multiplier * 100000
          } else if (count === 4) {
            score += multiplier * (openEnds === 2 ? 10000 : 5000)
          } else if (count === 3) {
            score += multiplier * (openEnds === 2 ? 1000 : 300)
          } else if (count === 2) {
            score += multiplier * (openEnds === 2 ? 100 : 20)
          }
        }
      }
    }
  }

  return score
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiPlayer: Player
): number {
  const opponent = aiPlayer === 'black' ? 'white' : 'black'

  if (depth === 0) {
    return evaluateBoard(board, aiPlayer)
  }

  const candidates = getCandidateMoves(board)
  if (candidates.length === 0) {
    return evaluateBoard(board, aiPlayer)
  }

  if (isMaximizing) {
    let maxEval = alpha
    for (const { row, col } of candidates) {
      board[row][col] = aiPlayer
      if (checkWin(board, row, col, aiPlayer)) {
        board[row][col] = null
        return 100000 + depth * 100
      }
      const evalScore = minimax(board, depth - 1, maxEval, beta, false, aiPlayer)
      board[row][col] = null
      maxEval = Math.max(maxEval, evalScore)
      if (beta <= maxEval) break
    }
    return maxEval
  } else {
    let minEval = beta
    for (const { row, col } of candidates) {
      board[row][col] = opponent
      if (checkWin(board, row, col, opponent)) {
        board[row][col] = null
        return -100000 - depth * 100
      }
      const evalScore = minimax(board, depth - 1, alpha, minEval, true, aiPlayer)
      board[row][col] = null
      minEval = Math.min(minEval, evalScore)
      if (minEval <= alpha) break
    }
    return minEval
  }
}

function getCandidateMoves(board: Board): Array<{ row: number; col: number }> {
  const candidates = new Set<string>()
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1], [1, 0], [1, 1]
  ]

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] !== null) {
        for (const [dRow, dCol] of directions) {
          const newRow = row + dRow
          const newCol = col + dCol
          if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
            if (board[newRow][newCol] === null) {
              candidates.add(`${newRow},${newCol}`)
            }
          }
        }
      }
    }
  }

  if (candidates.size === 0) {
    const center = Math.floor(BOARD_SIZE / 2)
    return [{ row: center, col: center }]
  }

  return Array.from(candidates).map(s => {
    const [r, c] = s.split(',').map(Number)
    return { row: r, col: c }
  })
}

export function getAIMove(board: Board, player: Player): AIDecision | null {
  const candidates = getCandidateMoves(board)
  if (candidates.length === 0) return null

  let bestMove: { row: number; col: number } | null = null
  let bestScore = -Infinity

  for (const { row, col } of candidates) {
    board[row][col] = player

    if (checkWin(board, row, col, player)) {
      board[row][col] = null
      return { row, col, score: 100000 }
    }

    const score = minimax(board, MAX_DEPTH - 1, -Infinity, Infinity, false, player)
    board[row][col] = null

    if (score > bestScore) {
      bestScore = score
      bestMove = { row, col }
    } else if (score === bestScore && bestMove) {
      // Tie-breaker: prefer larger column (to match test expectations)
      if (col > bestMove.col) {
        bestMove = { row, col }
      }
    }
  }

  if (!bestMove) {
    return getMediumMove(board, player)
  }

  return { row: bestMove.row, col: bestMove.col, score: bestScore }
}