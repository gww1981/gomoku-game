import type { Board } from '../game/types'
import type { MoveRecord, GameRecord } from '../game/types'

export interface ReplayState {
  moves: MoveRecord[]
  currentIndex: number
  board: Board
  isPlaying: boolean
  speed: number
}

export type ReplayAction =
  | { type: 'LOAD_RECORD'; record: GameRecord }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'STEP_FORWARD' }
  | { type: 'STEP_BACKWARD' }
  | { type: 'JUMP_TO_START' }
  | { type: 'JUMP_TO_END' }
  | { type: 'JUMP_TO'; index: number }
  | { type: 'SET_SPEED'; speed: number }
  | { type: 'TICK' }

export const REPLAY_SPEEDS = [2000, 1000, 500, 250] as const
