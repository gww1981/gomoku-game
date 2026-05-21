import type { Board } from '../game/types'
import type { MoveRecord, GameRecord } from '../game/types'
import { createEmptyBoard } from '../game/gameLogic'
import type { ReplayAction } from './types'

export interface ReplayState {
  moves: MoveRecord[]
  currentIndex: number
  board: Board
  isPlaying: boolean
  speed: number
}

export function getInitialReplayState(): ReplayState {
  return {
    moves: [],
    currentIndex: -1,
    board: createEmptyBoard(),
    isPlaying: false,
    speed: 1000,
  }
}

export function replayReducer(state: ReplayState, action: ReplayAction): ReplayState {
  switch (action.type) {
    case 'LOAD_RECORD': {
      const { record } = action
      return {
        ...getInitialReplayState(),
        moves: record.moves,
      }
    }

    case 'PLAY':
      return { ...state, isPlaying: true }

    case 'PAUSE':
      return { ...state, isPlaying: false }

    case 'STEP_FORWARD': {
      if (state.currentIndex >= state.moves.length - 1) return state
      const nextMove = state.moves[state.currentIndex + 1]
      const newBoard = state.board.map(r => [...r])
      newBoard[nextMove.position.row][nextMove.position.col] = nextMove.player
      return { ...state, currentIndex: state.currentIndex + 1, board: newBoard }
    }

    case 'STEP_BACKWARD': {
      if (state.currentIndex < 0) return state
      const currentMove = state.moves[state.currentIndex]
      const newBoard = state.board.map(r => [...r])
      newBoard[currentMove.position.row][currentMove.position.col] = null
      return { ...state, currentIndex: state.currentIndex - 1, board: newBoard }
    }

    case 'JUMP_TO_START':
      return { ...state, currentIndex: -1, board: createEmptyBoard(), isPlaying: false }

    case 'JUMP_TO_END': {
      const newBoard = createEmptyBoard()
      for (const move of state.moves) {
        newBoard[move.position.row][move.position.col] = move.player
      }
      return { ...state, currentIndex: state.moves.length - 1, board: newBoard, isPlaying: false }
    }

    case 'JUMP_TO': {
      const { index } = action
      if (index < -1 || index >= state.moves.length) return state
      const newBoard = createEmptyBoard()
      for (let i = 0; i <= index; i++) {
        const move = state.moves[i]
        newBoard[move.position.row][move.position.col] = move.player
      }
      return { ...state, currentIndex: index, board: newBoard }
    }

    case 'SET_SPEED':
      return { ...state, speed: action.speed }

    case 'TICK': {
      if (!state.isPlaying) return state
      if (state.currentIndex >= state.moves.length - 1) {
        return { ...state, isPlaying: false }
      }
      const nextMove = state.moves[state.currentIndex + 1]
      const newBoard = state.board.map(r => [...r])
      newBoard[nextMove.position.row][nextMove.position.col] = nextMove.player
      return { ...state, currentIndex: state.currentIndex + 1, board: newBoard }
    }

    default:
      return state
  }
}
