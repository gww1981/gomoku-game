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
    lanState: null,
    gameStartTime: Date.now(),
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'RESET':
      return {
        ...getInitialGameState(),
        settings: state.settings,
        lanState: state.lanState,
      }

    case 'UNDO': {
      if (state.status !== 'playing') return state
      if (state.moveHistory.length === 0) return state
      if (state.isAIThinking) return state

      let stepsToUndo: number
      if (state.settings.mode === 'ai') {
        stepsToUndo = 2
      } else if (state.settings.mode === 'lan' && action.requestedBy) {
        // LAN 模式撤回到"最近一手属于请求方"的那步之前
        const history = state.moveHistory
        const lastMover = history[history.length - 1].player
        stepsToUndo = lastMover === action.requestedBy ? 1 : 2
      } else {
        stepsToUndo = 1
      }
      const actualSteps = Math.min(stepsToUndo, state.moveHistory.length)
      const newHistory = state.moveHistory.slice(0, -actualSteps)

      // 从空棋盘重放 newHistory 重建棋盘
      const newBoard = createEmptyBoard()
      let lastMove: Position | null = null
      for (const move of newHistory) {
        newBoard[move.position.row][move.position.col] = move.player
        lastMove = move.position
      }

      const currentPlayer = newHistory.length % 2 === 0 ? 'black' : 'white'

      return {
        ...state,
        board: newBoard,
        moveHistory: newHistory,
        currentPlayer,
        lastMove,
        winningCells: [],
        status: 'playing',
        winner: null,
        lanState: state.lanState ? { ...state.lanState, undoRequested: false, moveDeadline: null, timerFor: null } : null,
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
        moveHistory: [
          ...state.moveHistory,
          {
            index: state.moveHistory.length + 1,
            player: state.currentPlayer,
            position: { row: action.row, col: action.col },
            timestamp: Date.now() - state.gameStartTime,
          },
        ],
      }
    }

    case 'MOVE': {
      if (state.winReason) return state
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
        timestamp: Date.now() - state.gameStartTime,
      }

      return {
        ...state,
        board: newBoard,
        currentPlayer: won ? state.currentPlayer : (state.currentPlayer === 'black' ? 'white' : 'black') as Player,
        status: won ? 'won' : 'playing',
        winner: won ? state.currentPlayer : null,
        winReason: won ? 'five' : undefined,
        lastMove: { row: action.row, col: action.col },
        winningCells: newWinningCells,
        moveHistory: [...state.moveHistory, newMoveRecord],
      }
    }

    default:
      return handleLanAction(state, action)
  }
}

function handleLanAction(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_LAN_STATE': {
      const prev = state.lanState ?? {
        myColor: 'black' as Player,
        roomId: '',
        opponentConnected: false,
        undoRequested: false,
        moveDeadline: null,
        timerFor: null,
      }
      return {
        ...state,
        lanState: { ...prev, ...action.lanState },
      }
    }

    case 'OPPONENT_MOVE': {
      if (state.winReason) return state
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
        winReason: won ? 'five' : undefined,
        lastMove: { row: action.row, col: action.col },
        winningCells: newWinningCells,
        moveHistory: [
          ...state.moveHistory,
          {
            index: state.moveHistory.length + 1,
            player: state.currentPlayer,
            position: { row: action.row, col: action.col },
            timestamp: Date.now() - state.gameStartTime,
          },
        ],
      }
    }

    case 'OPPONENT_UNDO_REQUEST': {
      if (!state.lanState) return state
      return {
        ...state,
        lanState: { ...state.lanState, undoRequested: true },
      }
    }

    case 'OPPONENT_LEFT': {
      if (!state.lanState) return state
      return {
        ...state,
        lanState: { ...state.lanState, opponentConnected: false },
      }
    }

    case 'RESIGN': {
      if (state.status !== 'playing') return state
      const winner: Player = action.resignedBy === 'black' ? 'white' : 'black'
      return {
        ...state,
        status: 'won',
        winner,
        winReason: 'resign',
        winningCells: [],
      }
    }

    case 'MOVE_TIMEOUT': {
      if (state.status !== 'playing') return state
      const winner: Player = action.loser === 'black' ? 'white' : 'black'
      return {
        ...state,
        status: 'won',
        winner,
        winReason: 'timeout',
        winningCells: [],
        lanState: state.lanState
          ? { ...state.lanState, moveDeadline: null, timerFor: null }
          : null,
      }
    }

    default:
      return state
  }
}
