import { describe, it, expect } from 'vitest'
import { createEmptyBoard } from '../gameLogic'
import { getAIMove } from './aiHard'

describe('aiHard', () => {
  it('应返回有效落子位置', () => {
    const board = createEmptyBoard()
    const move = getAIMove(board, 'black')
    expect(move).not.toBeNull()
  })

  it('应在必胜情况下选择获胜位置', () => {
    const board = createEmptyBoard()
    board[7][5] = 'black'
    board[7][6] = 'black'
    board[7][7] = 'black'
    board[7][8] = 'black'
    const move = getAIMove(board, 'white')
    expect(move).not.toBeNull()
    expect(move!.col).toBe(9)
  })
})