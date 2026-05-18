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
