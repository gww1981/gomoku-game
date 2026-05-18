import type { Board, Player } from '../types'
import type { AIDifficulty, AIDecision } from './types'
import { getAIMove as getEasyMove } from './aiEasy'
import { getAIMove as getMediumMove } from './aiMedium'
import { getAIMove as getHardMove } from './aiHard'

export function getAIMove(
  board: Board,
  player: Player,
  difficulty: AIDifficulty
): AIDecision | null {
  switch (difficulty) {
    case 'easy':
      return getEasyMove(board, player)
    case 'medium':
      return getMediumMove(board, player)
    case 'hard':
      return getHardMove(board, player)
    default:
      return getEasyMove(board, player)
  }
}

export type { AIDifficulty, AIDecision } from './types'