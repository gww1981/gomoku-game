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
}
export type GameAction =
  | { type: 'MOVE'; row: number; col: number }
  | { type: 'RESET' }
export const BOARD_SIZE = 15
