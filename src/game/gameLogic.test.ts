import { describe, it, expect } from 'vitest'
import { createEmptyBoard, canPlacePiece, BOARD_SIZE } from './gameLogic'

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
