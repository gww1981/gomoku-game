import { describe, it, expect } from 'vitest'
import { createEmptyBoard, canPlacePiece, BOARD_SIZE, checkWin } from './gameLogic'

describe('createEmptyBoard', () => {
  it('should create 15x15 board filled with null', () => {
    const board = createEmptyBoard()
    expect(board).toHaveLength(BOARD_SIZE)
    board.forEach(row => {
      expect(row).toHaveLength(BOARD_SIZE)
      row.forEach(cell => expect(cell).toBeNull())
    })
  })
})

describe('canPlacePiece', () => {
  it('should return true for empty position', () => {
    const board = createEmptyBoard()
    expect(canPlacePiece(board, 0, 0)).toBe(true)
  })

  it('should return false for occupied position', () => {
    const board = createEmptyBoard()
    board[0][0] = 'black'
    expect(canPlacePiece(board, 0, 0)).toBe(false)
  })

  it('should return false for out of bounds position', () => {
    const board = createEmptyBoard()
    expect(canPlacePiece(board, 15, 0)).toBe(false)
    expect(canPlacePiece(board, 0, 15)).toBe(false)
    expect(canPlacePiece(board, -1, 0)).toBe(false)
  })
})

describe('checkWin - horizontal', () => {
  it('should return true for 5 consecutive black pieces horizontally', () => {
    const board = createEmptyBoard()
    board[7][3] = 'black'
    board[7][4] = 'black'
    board[7][5] = 'black'
    board[7][6] = 'black'
    board[7][7] = 'black'
    expect(checkWin(board, 7, 5, 'black')).toBe(true)
  })

  it('should return false for less than 5 consecutive pieces', () => {
    const board = createEmptyBoard()
    board[7][3] = 'black'
    board[7][4] = 'black'
    board[7][5] = 'black'
    board[7][6] = 'black'
    expect(checkWin(board, 7, 5, 'black')).toBe(false)
  })

  it('should return false for opponent pieces', () => {
    const board = createEmptyBoard()
    board[7][3] = 'white'
    board[7][4] = 'white'
    board[7][5] = 'white'
    board[7][6] = 'white'
    board[7][7] = 'white'
    expect(checkWin(board, 7, 5, 'black')).toBe(false)
  })
})

describe('checkWin - vertical', () => {
  it('should return true for 5 consecutive black pieces vertically', () => {
    const board = createEmptyBoard()
    board[3][7] = 'black'
    board[4][7] = 'black'
    board[5][7] = 'black'
    board[6][7] = 'black'
    board[7][7] = 'black'
    expect(checkWin(board, 5, 7, 'black')).toBe(true)
  })

  it('should return false for less than 5 consecutive pieces', () => {
    const board = createEmptyBoard()
    board[3][7] = 'black'
    board[4][7] = 'black'
    board[5][7] = 'black'
    board[6][7] = 'black'
    expect(checkWin(board, 5, 7, 'black')).toBe(false)
  })
})

describe('checkWin - left diagonal', () => {
  it('should return true for 5 consecutive black pieces on left diagonal', () => {
    const board = createEmptyBoard()
    board[3][3] = 'black'
    board[4][4] = 'black'
    board[5][5] = 'black'
    board[6][6] = 'black'
    board[7][7] = 'black'
    expect(checkWin(board, 5, 5, 'black')).toBe(true)
  })

  it('should return false for less than 5 consecutive pieces on left diagonal', () => {
    const board = createEmptyBoard()
    board[3][3] = 'black'
    board[4][4] = 'black'
    board[5][5] = 'black'
    board[6][6] = 'black'
    expect(checkWin(board, 5, 5, 'black')).toBe(false)
  })
})

import { gameReducer, getInitialGameState } from './gameReducer'
import type { GameAction } from './types'

describe('gameReducer', () => {
  it('should return initial state', () => {
    const state = getInitialGameState()
    expect(state.board).toHaveLength(15)
    expect(state.currentPlayer).toBe('black')
    expect(state.status).toBe('playing')
    expect(state.winner).toBeNull()
  })

  it('should place piece and switch player', () => {
    const state = getInitialGameState()
    const action: GameAction = { type: 'MOVE', row: 7, col: 7 }
    const newState = gameReducer(state, action)
    expect(newState.board[7][7]).toBe('black')
    expect(newState.currentPlayer).toBe('white')
  })

  it('should reject move on occupied position', () => {
    let state = getInitialGameState()
    state = gameReducer(state, { type: 'MOVE', row: 7, col: 7 })
    state = gameReducer(state, { type: 'MOVE', row: 7, col: 7 })
    expect(state.board[7][7]).toBe('black')
    expect(state.currentPlayer).toBe('white') // Should not switch
  })

  it('should set winner when 5 in a row', () => {
    let state = getInitialGameState()
    // Black makes a horizontal 5 in a row
    const moves = [
      [7, 3], [8, 3], // Black, White
      [7, 4], [8, 4], // Black, White
      [7, 5], [8, 5], // Black, White
      [7, 6], [8, 6], // Black, White
      [7, 7], // Black wins!
    ]
    moves.forEach(([row, col]) => {
      state = gameReducer(state, { type: 'MOVE', row, col })
    })
    expect(state.status).toBe('won')
    expect(state.winner).toBe('black')
  })

  it('should reject moves after game is won', () => {
    let state = getInitialGameState()
    // Build a winning line for black
    const moves = [
      [7, 3], [8, 3],
      [7, 4], [8, 4],
      [7, 5], [8, 5],
      [7, 6], [8, 6],
      [7, 7],
    ]
    moves.forEach(([row, col]) => {
      state = gameReducer(state, { type: 'MOVE', row, col })
    })
    // Try to make another move after win
    state = gameReducer(state, { type: 'MOVE', row: 0, col: 0 })
    expect(state.board[0][0]).toBeNull() // Move should be rejected
  })

  it('should reset game', () => {
    let state = getInitialGameState()
    state = gameReducer(state, { type: 'MOVE', row: 7, col: 7 })
    state = gameReducer(state, { type: 'RESET' })
    expect(state.board[7][7]).toBeNull()
    expect(state.currentPlayer).toBe('black')
    expect(state.status).toBe('playing')
  })
})

describe('moveHistory collection', () => {
  it('MOVE action should record move to history', () => {
    const state = getInitialGameState()
    const newState = gameReducer(state, { type: 'MOVE', row: 7, col: 7 })
    expect(newState.moveHistory).toHaveLength(1)
    expect(newState.moveHistory[0]).toEqual({
      index: 1,
      player: 'black',
      position: { row: 7, col: 7 },
      timestamp: expect.any(Number),
    })
  })

  it('RESET should clear moveHistory', () => {
    let state = getInitialGameState()
    state = gameReducer(state, { type: 'MOVE', row: 7, col: 7 })
    state = gameReducer(state, { type: 'RESET' })
    expect(state.moveHistory).toHaveLength(0)
    expect(state.gameStartTime).toBeGreaterThan(0)
  })

  it('UNDO should revert one move in pvp mode', () => {
    let state = getInitialGameState()
    state = gameReducer(state, { type: 'MOVE', row: 7, col: 7 })
    state = gameReducer(state, { type: 'MOVE', row: 8, col: 8 })
    state = gameReducer(state, { type: 'UNDO' })
    expect(state.moveHistory).toHaveLength(1)
    expect(state.board[7][7]).toBe('black')
    expect(state.board[8][8]).toBeNull()
    expect(state.currentPlayer).toBe('white')
  })
})
