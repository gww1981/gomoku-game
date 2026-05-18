export type Player = 'black' | 'white'
export type Board = (Player | null)[][]
export interface Position {
  row: number
  col: number
}
export type GameStatus = 'playing' | 'won' | 'draw'
export interface GameState {
  board: Board
  currentPlayer: Player
  status: GameStatus
  winner: Player | null
  lastMove: Position | null
  settings: GameSettings
  isAIThinking: boolean
}
export type GameAction =
  | { type: 'MOVE'; row: number; col: number }
  | { type: 'RESET' }
  | { type: 'SET_MODE'; mode: GameMode; aiDifficulty?: AIDifficulty }
  | { type: 'SET_AI_THINKING'; isThinking: boolean }
  | { type: 'AI_MOVE'; row: number; col: number }
export const BOARD_SIZE = 15
/** 游戏模式 */
export type GameMode = 'pvp' | 'ai'
/** AI 难度级别 */
export type AIDifficulty = 'easy' | 'medium' | 'hard'
/** 游戏设置（用于模式选择） */
export interface GameSettings {
  mode: GameMode
  aiDifficulty: AIDifficulty
}
