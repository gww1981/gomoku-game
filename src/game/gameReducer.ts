import type { GameState, GameAction, Player, GameMode, AIDifficulty } from './types'
import { createEmptyBoard, canPlacePiece, checkWin } from './gameLogic'

export function getInitialGameState(): GameState {
  return {
    board: createEmptyBoard(),
    currentPlayer: 'black',
    status: 'playing',
    winner: null,
    lastMove: null,
    settings: {
      mode: 'pvp',
      aiDifficulty: 'medium',
    },
    isAIThinking: false,
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'RESET':
      return {
        ...getInitialGameState(),
        settings: state.settings,
      }

    case 'SET_MODE':
      return {
        ...getInitialGameState(),
        settings: {
          mode: action.mode,
          aiDifficulty: action.aiDifficulty ?? state.settings.aiDifficulty,
        },
      }

    case 'SET_AI_THINKING':
      return {
        ...state,
        isAIThinking: action.isThinking,
      }

    case 'AI_MOVE': {
      if (state.status !== 'playing') return state
      if (!canPlacePiece(state.board, action.row, action.col)) return state

      const newBoard = state.board.map(r => [...r])
      newBoard[action.row][action.col] = state.currentPlayer
      const won = checkWin(newBoard, action.row, action.col, state.currentPlayer)

      return {
        ...state,
        board: newBoard,
        currentPlayer: won ? state.currentPlayer : (state.currentPlayer === 'black' ? 'white' : 'black') as Player,
        status: won ? 'won' : 'playing',
        winner: won ? state.currentPlayer : null,
        lastMove: { row: action.row, col: action.col },
        isAIThinking: false,
      }
    }

    case 'MOVE': {
      if (state.status !== 'playing') return state
      if (!canPlacePiece(state.board, action.row, action.col)) return state

      const newBoard = state.board.map(r => [...r])
      newBoard[action.row][action.col] = state.currentPlayer
      const won = checkWin(newBoard, action.row, action.col, state.currentPlayer)

      return {
        ...state,
        board: newBoard,
        currentPlayer: won ? state.currentPlayer : (state.currentPlayer === 'black' ? 'white' : 'black') as Player,
        status: won ? 'won' : 'playing',
        winner: won ? state.currentPlayer : null,
        lastMove: { row: action.row, col: action.col },
      }
    }

    default:
      return state
  }
}