import type { GameState, GameAction, Player, Position } from './types'
import { createEmptyBoard, canPlacePiece, checkWin, BOARD_SIZE } from './gameLogic'

function getWinningCells(board: (Player | null)[][], row: number, col: number, player: Player): Position[] {
  const directions = [
    { dr: 0, dc: 1 },   // horizontal
    { dr: 1, dc: 0 },   // vertical
    { dr: 1, dc: 1 },   // diagonal top-left to bottom-right
    { dr: 1, dc: -1 },  // diagonal top-right to bottom-left
  ]

  for (const { dr, dc } of directions) {
    const cells: Position[] = [{ row, col }]

    // Check positive direction
    for (let i = 1; i < 5; i++) {
      const r = row + dr * i
      const c = col + dc * i
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) {
        cells.push({ row: r, col: c })
      } else break
    }

    // Check negative direction
    for (let i = 1; i < 5; i++) {
      const r = row - dr * i
      const c = col - dc * i
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) {
        cells.push({ row: r, col: c })
      } else break
    }

    if (cells.length >= 5) return cells
  }

  return []
}

export function getInitialGameState(): GameState {
  return {
    board: createEmptyBoard(),
    currentPlayer: 'black',
    status: 'playing',
    winner: null,
    lastMove: null,
    winningCells: [],
    settings: {
      mode: 'pvp',
      aiDifficulty: 'medium',
    },
    isAIThinking: false,
    moveHistory: [],
    gameStartTime: Date.now(),
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'RESET':
      return {
        ...getInitialGameState(),
        settings: state.settings,
      }

    case 'UNDO': {
      if (state.moveHistory.length === 0) return state
      const lastMove = state.moveHistory[state.moveHistory.length - 1]
      const newBoard = state.board.map(r => [...r])
      newBoard[lastMove.position.row][lastMove.position.col] = null
      const newHistory = state.moveHistory.slice(0, -1)
      return {
        ...state,
        board: newBoard,
        currentPlayer: lastMove.player,
        moveHistory: newHistory,
        lastMove: newHistory.length > 0
          ? newHistory[newHistory.length - 1].position
          : null,
        status: 'playing',
        winner: null,
        winningCells: [],
      }
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
      const newWinningCells = won ? getWinningCells(newBoard, action.row, action.col, state.currentPlayer) : []

      return {
        ...state,
        board: newBoard,
        currentPlayer: won ? state.currentPlayer : (state.currentPlayer === 'black' ? 'white' : 'black') as Player,
        status: won ? 'won' : 'playing',
        winner: won ? state.currentPlayer : null,
        lastMove: { row: action.row, col: action.col },
        winningCells: newWinningCells,
        isAIThinking: false,
      }
    }

    case 'MOVE': {
      if (state.status !== 'playing') return state
      if (!canPlacePiece(state.board, action.row, action.col)) return state

      const newBoard = state.board.map(r => [...r])
      newBoard[action.row][action.col] = state.currentPlayer
      const won = checkWin(newBoard, action.row, action.col, state.currentPlayer)
      const newWinningCells = won ? getWinningCells(newBoard, action.row, action.col, state.currentPlayer) : []
      const newMoveRecord = {
        index: state.moveHistory.length + 1,
        player: state.currentPlayer,
        position: { row: action.row, col: action.col },
        timestamp: Date.now(),
      }

      return {
        ...state,
        board: newBoard,
        currentPlayer: won ? state.currentPlayer : (state.currentPlayer === 'black' ? 'white' : 'black') as Player,
        status: won ? 'won' : 'playing',
        winner: won ? state.currentPlayer : null,
        lastMove: { row: action.row, col: action.col },
        winningCells: newWinningCells,
        moveHistory: [...state.moveHistory, newMoveRecord],
      }
    }

    default:
      return state
  }
}
