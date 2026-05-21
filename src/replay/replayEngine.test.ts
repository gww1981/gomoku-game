import { describe, it, expect } from 'vitest'
import { replayReducer, getInitialReplayState } from './replayEngine'
import type { ReplayAction } from './types'

const makeRecord = (moves: Array<{ row: number; col: number; player: 'black' | 'white' }>) => ({
  id: 'test-id',
  version: 1 as const,
  createdAt: '2026-05-21T00:00:00.000Z',
  boardSize: 15,
  gameMode: 'pvp' as const,
  players: {
    black: { name: '黑方', isAI: false },
    white: { name: '白方', isAI: false },
  },
  result: { winner: null },
  moves: moves.map((m, i) => ({ index: i + 1, player: m.player, position: { row: m.row, col: m.col }, timestamp: i * 1000 })),
})

describe('replayReducer', () => {
  it('LOAD_RECORD should initialize state', () => {
    const record = makeRecord([{ row: 7, col: 7, player: 'black' }])
    const state = replayReducer(getInitialReplayState(), { type: 'LOAD_RECORD', record } as ReplayAction)
    expect(state.moves).toHaveLength(1)
    expect(state.currentIndex).toBe(-1)
  })

  it('STEP_FORWARD should place piece on board', () => {
    const record = makeRecord([{ row: 7, col: 7, player: 'black' }])
    let state = replayReducer(getInitialReplayState(), { type: 'LOAD_RECORD', record } as ReplayAction)
    state = replayReducer(state, { type: 'STEP_FORWARD' } as ReplayAction)
    expect(state.board[7][7]).toBe('black')
    expect(state.currentIndex).toBe(0)
  })

  it('STEP_BACKWARD should remove piece from board', () => {
    const record = makeRecord([{ row: 7, col: 7, player: 'black' }])
    let state = replayReducer(getInitialReplayState(), { type: 'LOAD_RECORD', record } as ReplayAction)
    state = replayReducer(state, { type: 'STEP_FORWARD' } as ReplayAction)
    state = replayReducer(state, { type: 'STEP_BACKWARD' } as ReplayAction)
    expect(state.board[7][7]).toBeNull()
    expect(state.currentIndex).toBe(-1)
  })

  it('JUMP_TO_END should rebuild full board', () => {
    const record = makeRecord([
      { row: 7, col: 7, player: 'black' },
      { row: 8, col: 8, player: 'white' },
    ])
    let state = replayReducer(getInitialReplayState(), { type: 'LOAD_RECORD', record } as ReplayAction)
    state = replayReducer(state, { type: 'JUMP_TO_END' } as ReplayAction)
    expect(state.board[7][7]).toBe('black')
    expect(state.board[8][8]).toBe('white')
    expect(state.currentIndex).toBe(1)
  })

  it('JUMP_TO should rebuild board up to index', () => {
    const record = makeRecord([
      { row: 7, col: 7, player: 'black' },
      { row: 8, col: 8, player: 'white' },
    ])
    let state = replayReducer(getInitialReplayState(), { type: 'LOAD_RECORD', record } as ReplayAction)
    state = replayReducer(state, { type: 'JUMP_TO', index: 0 } as ReplayAction)
    expect(state.board[7][7]).toBe('black')
    expect(state.board[8][8]).toBeNull()
  })

  it('PLAY/PAUSE should toggle isPlaying', () => {
    let state = getInitialReplayState()
    state = replayReducer(state, { type: 'PLAY' } as ReplayAction)
    expect(state.isPlaying).toBe(true)
    state = replayReducer(state, { type: 'PAUSE' } as ReplayAction)
    expect(state.isPlaying).toBe(false)
  })

  it('SET_SPEED should update speed', () => {
    let state = getInitialReplayState()
    state = replayReducer(state, { type: 'SET_SPEED', speed: 500 } as ReplayAction)
    expect(state.speed).toBe(500)
  })
})
