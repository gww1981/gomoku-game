export type Player = 'black' | 'white'
export type Board = (Player | null)[][]
export interface Position {
  row: number
  col: number
}
export type GameStatus = 'playing' | 'won' | 'draw'

export interface MoveRecord {
  index: number
  player: 'black' | 'white'
  position: { row: number; col: number }
  timestamp: number
}

export interface GameRecord {
  id: string
  version: 1
  createdAt: string
  boardSize: 15
  gameMode: 'pvp' | 'ai' | 'lan'
  aiDifficulty?: AIDifficulty
  players: {
    black: { name: string; isAI: boolean }
    white: { name: string; isAI: boolean }
  }
  result: {
    winner: 'black' | 'white' | 'draw' | null
    winningCells?: Position[]
  }
  moves: MoveRecord[]
}

export interface LanState {
  myColor: Player
  roomId: string
  opponentConnected: boolean
  undoRequested: boolean
  moveDeadline: number | null
  timerFor: Player | null
}

export interface GameState {
  board: Board
  currentPlayer: Player
  status: GameStatus
  winner: Player | null
  lastMove: Position | null
  winningCells: Position[]
  settings: GameSettings
  isAIThinking: boolean
  moveHistory: MoveRecord[]
  lanState: LanState | null
  gameStartTime: number
  winReason?: 'five' | 'timeout' | 'resign'
}
export type GameAction =
  | { type: 'MOVE'; row: number; col: number }
  | { type: 'RESET' }
  | { type: 'SET_MODE'; mode: GameMode; aiDifficulty?: AIDifficulty }
  | { type: 'SET_AI_THINKING'; isThinking: boolean }
  | { type: 'AI_MOVE'; row: number; col: number }
  | { type: 'UNDO'; requestedBy?: Player }
  | { type: 'SET_LAN_STATE'; lanState: Partial<LanState> }
  | { type: 'OPPONENT_MOVE'; row: number; col: number }
  | { type: 'OPPONENT_UNDO_REQUEST' }
  | { type: 'OPPONENT_LEFT' }
  | { type: 'RESIGN'; resignedBy: Player }
  | { type: 'MOVE_TIMEOUT'; loser: Player }
export const BOARD_SIZE = 15
/** 游戏模式 */
export type GameMode = 'pvp' | 'ai' | 'lan'
/** AI 难度级别 */
export type AIDifficulty = 'easy' | 'medium' | 'hard'
/** 游戏设置（用于模式选择） */
export interface GameSettings {
  mode: GameMode
  aiDifficulty: AIDifficulty
}
