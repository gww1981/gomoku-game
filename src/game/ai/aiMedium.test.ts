import { describe, it, expect } from 'vitest'
import { createEmptyBoard } from '../gameLogic'
import { getAIMove } from './aiMedium'

describe('aiMedium', () => {
  it('应返回有效落子位置', () => {
    const board = createEmptyBoard()
    const move = getAIMove(board, 'black')
    expect(move).not.toBeNull()
    expect(move!.score).toBeGreaterThan(0)
  })

  it('应在有威胁时识别并防御', () => {
    const board = createEmptyBoard()
    board[7][5] = 'black'
    board[7][6] = 'black'
    board[7][7] = 'black'
    const move = getAIMove(board, 'white')
    expect(move).not.toBeNull()
    expect(move!.col).toBeGreaterThanOrEqual(4)
    expect(move!.col).toBeLessThanOrEqual(8)
  })
})
