import { GameState, GameAction, Player } from './types'
import { createEmptyBoard, canPlacePiece, checkWin } from './gameLogic'

export function getInitialGameState(): GameState {
  return {
    board: createEmptyBoard(),
    currentPlayer: 'black',
    status: 'playing',
    winner: null,
    lastMove: null,
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'RESET':
      return getInitialGameState()

    case 'MOVE': {
      if (state.status !== 'playing') {
        return state
      }
      const { row, col } = action
      if (!canPlacePiece(state.board, row, col)) {
        return state
      }
      const newBoard = state.board.map(r => [...r])
      newBoard[row][col] = state.currentPlayer
      const won = checkWin(newBoard, row, col, state.currentPlayer)
      return {
        ...state,
        board: newBoard,
        currentPlayer: won ? state.currentPlayer : (state.currentPlayer === 'black' ? 'white' : 'black') as Player,
        status: won ? 'won' : 'playing',
        winner: won ? state.currentPlayer : null,
        lastMove: { row, col },
      }
    }

    default:
      return state
  }
}