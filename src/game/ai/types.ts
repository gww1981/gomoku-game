import type { Board, Player } from '../types'

/** 棋型评分 */
export type PatternType =
  | 'block_live_three'   // 阻挡活三
  | 'live_three'          // 活三
  | 'block_four'          // 阻挡四
  | 'four'                // 四
  | 'five'                // 五
  | 'block_live_two'      // 阻挡活二
  | 'live_two'            // 活二
  | 'one'                 // 一

/** 棋型评分表 */
export const PATTERN_SCORES: Record<PatternType, number> = {
  'five': 100000,          // 五连（最高）
  'four': 10000,           // 四
  'live_three': 5000,      // 活三
  'block_live_three': 1000, // 阻挡活三
  'live_two': 500,         // 活二
  'block_live_two': 100,   // 阻挡活二
  'one': 10,              // 一
  'block_four': 8000,     // 阻挡四（眠四）
}

/** AI 决策结果 */
export interface AIDecision {
  row: number
  col: number
  score: number
}