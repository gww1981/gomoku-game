import { describe, it, expect } from 'vitest'
import { createEmptyBoard } from '../gameLogic'
import { getAIMove } from './aiEasy'

describe('aiEasy', () => {
  it('应在空棋盘上返回有效落子位置', () => {
    const board = createEmptyBoard()
    const move = getAIMove(board, 'black')
    expect(move).not.toBeNull()
    expect(move!.row).toBeGreaterThanOrEqual(0)
    expect(move!.row).toBeLessThan(15)
    expect(move!.col).toBeGreaterThanOrEqual(0)
    expect(move!.col).toBeLessThan(15)
  })

  it('应在部分填充的棋盘上返回空位', () => {
    const board = createEmptyBoard()
    board[7][7] = 'black'
    board[7][8] = 'white'
    const move = getAIMove(board, 'black')
    expect(move).not.toBeNull()
    expect(board[move!.row][move!.col]).toBeNull()
  })

  it('应在满棋盘上返回 null', () => {
    const board = Array(15).fill(null).map(() => Array(15).fill('black'))
    const move = getAIMove(board, 'black')
    expect(move).toBeNull()
  })
})
