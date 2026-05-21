# 五子棋录像回放功能实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为五子棋游戏添加录像回放和悔棋功能

**Architecture:** 新建独立 `ReplayEngine`（reducer + hooks）与游戏引擎完全解耦。游戏引擎扩展 `GameState` 增加 `moveHistory` 字段自动收集录像数据，游戏结束时生成 `GameRecord` 存入 localStorage。悔棋通过 `UNDO` action 利用 `moveHistory` 实现。

**Tech Stack:** React + TypeScript + useReducer + localStorage

---

## 文件结构

```
src/
  ├─ game/
  │    ├─ types.ts           (修改) - 增加 MoveRecord, GameRecord, UNDO action
  │    ├─ gameReducer.ts     (修改) - 实现 moveHistory 收集 + UNDO 处理
  │    └─ gameLogic.test.ts  (修改) - 新增 moveHistory 相关测试
  ├─ replay/                  (新建)
  │    ├─ types.ts           - ReplayState, ReplayAction
  │    ├─ replayEngine.ts    - 纯函数 forward/backward/jumpTo/replayReducer
  │    ├─ replayEngine.test.ts
  │    └─ useReplay.ts       - React Hook：封装 useReducer + 自动播放定时器
  └─ components/
       ├─ ReplayBar.tsx      (新建) - 回放控制栏
       ├─ ReplayBar.css
       ├─ GameRecordList.tsx  (新建) - 历史对局列表抽屉
       ├─ GameRecordList.css
       ├─ Cell.tsx           (修改) - 回放模式显示步数标注
       └─ Board.tsx          (修改) - 传递 moveNumbers 给 Cell
```

---

## Task 1: 扩展 GameState 数据类型

**Files:**
- Modify: `src/game/types.ts`

- [ ] **Step 1: 写失败的测试**

在 `src/game/gameLogic.test.ts` 末尾追加：

```typescript
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
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npx vitest src/game/gameLogic.test.ts --run`
Expected: FAIL — "moveHistory" does not exist on type

- [ ] **Step 3: 扩展 types.ts**

```typescript
// 新增类型
export interface MoveRecord {
  index: number
  player: 'black' | 'white'
  position: { row: number; col: number }
  timestamp: number
}

export interface GameRecord {
  id: string
  version: 1
  createdAt: string
  boardSize: 15
  gameMode: 'pvp' | 'ai'
  aiDifficulty?: AIDifficulty
  players: {
    black: { name: string; isAI: boolean }
    white: { name: string; isAI: boolean }
  }
  result: {
    winner: 'black' | 'white' | 'draw' | null
    winningCells?: Position[]
  }
  moves: MoveRecord[]
}

// 修改 GameState
export interface GameState {
  board: Board
  currentPlayer: Player
  status: GameStatus
  winner: Player | null
  lastMove: Position | null
  winningCells: Position[]
  settings: GameSettings
  isAIThinking: boolean
  moveHistory: MoveRecord[]       // 新增
  gameStartTime: number          // 新增
}

// 修改 GameAction
export type GameAction =
  | { type: 'MOVE'; row: number; col: number }
  | { type: 'RESET' }
  | { type: 'SET_MODE'; mode: GameMode; aiDifficulty?: AIDifficulty }
  | { type: 'SET_AI_THINKING'; isThinking: boolean }
  | { type: 'AI_MOVE'; row: number; col: number }
  | { type: 'UNDO' }              // 新增
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npx vitest src/game/gameLogic.test.ts --run`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/game/types.ts src/game/gameLogic.test.ts
git commit -m "feat: 扩展 GameState 增加 moveHistory 和 UNDO 类型"
```

---

## Task 2: 实现 moveHistory 收集和 UNDO 处理

**Files:**
- Modify: `src/game/gameReducer.ts`

- [ ] **Step 1: 修改 getInitialGameState**

```typescript
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
```

- [ ] **Step 2: 修改 RESET case**

```typescript
case 'RESET':
  return {
    ...getInitialGameState(),
    settings: state.settings,
    moveHistory: [],
    gameStartTime: Date.now(),
  }
```

- [ ] **Step 3: 修改 SET_MODE case**

```typescript
case 'SET_MODE':
  return {
    ...getInitialGameState(),
    settings: {
      mode: action.mode,
      aiDifficulty: action.aiDifficulty ?? state.settings.aiDifficulty,
    },
    moveHistory: [],
    gameStartTime: Date.now(),
  }
```

- [ ] **Step 4: 修改 AI_MOVE case — 在 return 中追加 moveHistory**

在 `AI_MOVE` return 对象的 `isAIThinking: false` 之后追加：

```typescript
moveHistory: [
  ...state.moveHistory,
  {
    index: state.moveHistory.length + 1,
    player: state.currentPlayer,
    position: { row: action.row, col: action.col },
    timestamp: Date.now() - state.gameStartTime,
  },
],
```

- [ ] **Step 5: 修改 MOVE case — 在 return 中追加 moveHistory**

同样在 `MOVE` return 对象中追加：

```typescript
moveHistory: [
  ...state.moveHistory,
  {
    index: state.moveHistory.length + 1,
    player: state.currentPlayer,
    position: { row: action.row, col: action.col },
    timestamp: Date.now() - state.gameStartTime,
  },
],
```

- [ ] **Step 6: 添加 UNDO case（在 default 之前）**

```typescript
case 'UNDO': {
  if (state.status !== 'playing') return state
  if (state.moveHistory.length === 0) return state
  if (state.isAIThinking) return state

  const stepsToUndo = state.settings.mode === 'ai' ? 2 : 1
  const actualSteps = Math.min(stepsToUndo, state.moveHistory.length)
  const newHistory = state.moveHistory.slice(0, -actualSteps)

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
  }
}
```

- [ ] **Step 7: 运行测试**

Run: `npx vitest src/game/gameLogic.test.ts --run`
Expected: PASS

- [ ] **Step 8: 提交**

```bash
git add src/game/gameReducer.ts
git commit -m "feat: 实现 moveHistory 收集和 UNDO 悔棋"
```

---

## Task 3: 创建回放引擎类型和纯函数

**Files:**
- Create: `src/replay/types.ts`
- Create: `src/replay/replayEngine.ts`
- Create: `src/replay/replayEngine.test.ts`

- [ ] **Step 1: 创建 src/replay/types.ts**

```typescript
import type { Board } from '../game/types'
import type { MoveRecord, GameRecord } from '../game/types'

export interface ReplayState {
  moves: MoveRecord[]
  currentIndex: number
  board: Board
  isPlaying: boolean
  speed: number
}

export type ReplayAction =
  | { type: 'LOAD_RECORD'; record: GameRecord }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'STEP_FORWARD' }
  | { type: 'STEP_BACKWARD' }
  | { type: 'JUMP_TO_START' }
  | { type: 'JUMP_TO_END' }
  | { type: 'JUMP_TO'; index: number }
  | { type: 'SET_SPEED'; speed: number }
  | { type: 'TICK' }

export const REPLAY_SPEEDS = [2000, 1000, 500, 250] as const
```

- [ ] **Step 2: 创建 src/replay/replayEngine.ts**

```typescript
import type { Board } from '../game/types'
import type { MoveRecord, GameRecord } from '../game/types'
import { createEmptyBoard } from '../game/gameLogic'
import type { ReplayAction } from './types'

export interface ReplayState {
  moves: MoveRecord[]
  currentIndex: number
  board: Board
  isPlaying: boolean
  speed: number
}

export function getInitialReplayState(): ReplayState {
  return {
    moves: [],
    currentIndex: -1,
    board: createEmptyBoard(),
    isPlaying: false,
    speed: 1000,
  }
}

export function replayReducer(state: ReplayState, action: ReplayAction): ReplayState {
  switch (action.type) {
    case 'LOAD_RECORD': {
      const { record } = action
      return {
        ...getInitialReplayState(),
        moves: record.moves,
      }
    }

    case 'PLAY':
      return { ...state, isPlaying: true }

    case 'PAUSE':
      return { ...state, isPlaying: false }

    case 'STEP_FORWARD': {
      if (state.currentIndex >= state.moves.length - 1) return state
      const nextMove = state.moves[state.currentIndex + 1]
      const newBoard = state.board.map(r => [...r])
      newBoard[nextMove.position.row][nextMove.position.col] = nextMove.player
      return { ...state, currentIndex: state.currentIndex + 1, board: newBoard }
    }

    case 'STEP_BACKWARD': {
      if (state.currentIndex < 0) return state
      const currentMove = state.moves[state.currentIndex]
      const newBoard = state.board.map(r => [...r])
      newBoard[currentMove.position.row][currentMove.position.col] = null
      return { ...state, currentIndex: state.currentIndex - 1, board: newBoard }
    }

    case 'JUMP_TO_START':
      return { ...state, currentIndex: -1, board: createEmptyBoard(), isPlaying: false }

    case 'JUMP_TO_END': {
      const newBoard = createEmptyBoard()
      for (const move of state.moves) {
        newBoard[move.position.row][move.position.col] = move.player
      }
      return { ...state, currentIndex: state.moves.length - 1, board: newBoard, isPlaying: false }
    }

    case 'JUMP_TO': {
      const { index } = action
      if (index < -1 || index >= state.moves.length) return state
      const newBoard = createEmptyBoard()
      for (let i = 0; i <= index; i++) {
        const move = state.moves[i]
        newBoard[move.position.row][move.position.col] = move.player
      }
      return { ...state, currentIndex: index, board: newBoard }
    }

    case 'SET_SPEED':
      return { ...state, speed: action.speed }

    case 'TICK': {
      if (!state.isPlaying) return state
      if (state.currentIndex >= state.moves.length - 1) {
        return { ...state, isPlaying: false }
      }
      const nextMove = state.moves[state.currentIndex + 1]
      const newBoard = state.board.map(r => [...r])
      newBoard[nextMove.position.row][nextMove.position.col] = nextMove.player
      return { ...state, currentIndex: state.currentIndex + 1, board: newBoard }
    }

    default:
      return state
  }
}
```

- [ ] **Step 3: 创建 src/replay/replayEngine.test.ts**

```typescript
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
```

- [ ] **Step 4: 运行测试**

Run: `npx vitest src/replay/replayEngine.test.ts --run`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/replay/types.ts src/replay/replayEngine.ts src/replay/replayEngine.test.ts
git commit -m "feat: 创建回放引擎 types 和纯函数"
```

---

## Task 4: 创建 useReplay Hook

**Files:**
- Create: `src/replay/useReplay.ts`

- [ ] **Step 1: 创建 useReplay Hook**

```typescript
import { useReducer, useEffect, useRef, useCallback } from 'react'
import { replayReducer, getInitialReplayState } from './replayEngine'
import type { ReplayAction } from './types'
import type { GameRecord } from '../game/types'

export function useReplay() {
  const [state, dispatch] = useReducer(replayReducer, getInitialReplayState())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (state.isPlaying) {
      intervalRef.current = setInterval(() => {
        dispatch({ type: 'TICK' } as ReplayAction)
      }, state.speed)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [state.isPlaying, state.speed])

  const loadRecord = useCallback((record: GameRecord) => {
    dispatch({ type: 'LOAD_RECORD', record } as ReplayAction)
  }, [])

  const play = useCallback(() => dispatch({ type: 'PLAY' } as ReplayAction), [])
  const pause = useCallback(() => dispatch({ type: 'PAUSE' } as ReplayAction), [])
  const stepForward = useCallback(() => dispatch({ type: 'STEP_FORWARD' } as ReplayAction), [])
  const stepBackward = useCallback(() => dispatch({ type: 'STEP_BACKWARD' } as ReplayAction), [])
  const jumpToStart = useCallback(() => dispatch({ type: 'JUMP_TO_START' } as ReplayAction), [])
  const jumpToEnd = useCallback(() => dispatch({ type: 'JUMP_TO_END' } as ReplayAction), [])
  const jumpTo = useCallback((index: number) => dispatch({ type: 'JUMP_TO', index } as ReplayAction), [])
  const setSpeed = useCallback((speed: number) => dispatch({ type: 'SET_SPEED', speed } as ReplayAction), [])

  return { state, loadRecord, play, pause, stepForward, stepBackward, jumpToStart, jumpToEnd, jumpTo, setSpeed }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/replay/useReplay.ts
git commit -m "feat: 创建 useReplay Hook"
```

---

## Task 5: 创建 localStorage 存储模块

**Files:**
- Create: `src/replay/storage.ts`

- [ ] **Step 1: 创建 storage.ts**

```typescript
import type { GameRecord } from '../game/types'

const STORAGE_KEY = 'gomoku-game-records'
const MAX_RECORDS = 50

export function loadGameRecords(): GameRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const records = JSON.parse(raw)
    if (!Array.isArray(records)) return []
    return records as GameRecord[]
  } catch {
    return []
  }
}

export function saveGameRecord(record: GameRecord): void {
  const records = loadGameRecords()
  records.unshift(record)
  if (records.length > MAX_RECORDS) {
    records.splice(MAX_RECORDS)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

export function deleteGameRecord(id: string): void {
  const records = loadGameRecords()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.filter(r => r.id !== id)))
}

export function clearGameRecords(): void {
  localStorage.removeItem(STORAGE_KEY)
}
```

- [ ] **Step 2: 提交**

```bash
git add src/replay/storage.ts
git commit -m "feat: 创建 localStorage 存储模块"
```

---

## Task 6: 创建 ReplayBar 组件

**Files:**
- Create: `src/components/ReplayBar.tsx`
- Create: `src/components/ReplayBar.css`

- [ ] **Step 1: 创建 ReplayBar.tsx**

```typescript
import './ReplayBar.css'

interface ReplayBarProps {
  currentIndex: number
  totalMoves: number
  isPlaying: boolean
  speed: number
  onPlay: () => void
  onPause: () => void
  onStepForward: () => void
  onStepBackward: () => void
  onJumpToStart: () => void
  onJumpToEnd: () => void
  onJumpTo: (index: number) => void
  onSetSpeed: (speed: number) => void
}

const REPLAY_SPEEDS = [2000, 1000, 500, 250]
const SPEED_LABELS: Record<number, string> = { 2000: '0.5x', 1000: '1x', 500: '2x', 250: '4x' }

export function ReplayBar({
  currentIndex,
  totalMoves,
  isPlaying,
  speed,
  onPlay,
  onPause,
  onStepForward,
  onStepBackward,
  onJumpToStart,
  onJumpToEnd,
  onJumpTo,
  onSetSpeed,
}: ReplayBarProps) {
  return (
    <div className="replay-bar">
      <div className="replay-progress">
        <span className="replay-progress-label">第 {currentIndex + 1} 手</span>
        <input
          type="range"
          className="replay-slider"
          min={-1}
          max={totalMoves - 1}
          value={currentIndex}
          onChange={e => onJumpTo(parseInt(e.target.value, 10))}
        />
        <span className="replay-progress-label">共 {totalMoves} 手</span>
      </div>

      <div className="replay-controls">
        <button className="replay-btn" onClick={onJumpToStart} title="跳到开头" aria-label="跳到开头">⏮</button>
        <button className="replay-btn" onClick={onStepBackward} title="上一步" aria-label="上一步">⏪</button>
        <button className="replay-btn replay-btn-play" onClick={isPlaying ? onPause : onPlay} title={isPlaying ? '暂停' : '播放'}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button className="replay-btn" onClick={onStepForward} title="下一步" aria-label="下一步">⏩</button>
        <button className="replay-btn" onClick={onJumpToEnd} title="跳到结尾" aria-label="跳到结尾">⏭</button>

        <div className="replay-speed-group">
          {REPLAY_SPEEDS.map(s => (
            <button
              key={s}
              className={`replay-speed-btn ${speed === s ? 'active' : ''}`}
              onClick={() => onSetSpeed(s)}
              aria-pressed={speed === s}
            >
              {SPEED_LABELS[s]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 创建 ReplayBar.css**

```css
.replay-bar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 16px;
  border: 1px solid var(--panel-line);
  border-radius: 8px;
  background: var(--panel);
  box-shadow: var(--shadow-panel);
  backdrop-filter: blur(14px);
  animation: fadeSlideUp 260ms ease-out;
}

.replay-progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.replay-progress-label {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  min-width: 52px;
  text-align: center;
}

.replay-slider {
  flex: 1;
  height: 6px;
  appearance: none;
  background: #5a4a36;
  border-radius: 3px;
  cursor: pointer;
}

.replay-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  background: var(--accent-gold);
  border-radius: 50%;
  border: 2px solid var(--panel);
  cursor: pointer;
}

.replay-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: var(--accent-gold);
  border-radius: 50%;
  border: 2px solid var(--panel);
  cursor: pointer;
}

.replay-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.replay-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(28, 18, 12, 0.74);
  border: 1px solid rgba(201, 168, 108, 0.28);
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 18px;
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
}

.replay-btn:hover {
  border-color: rgba(242, 206, 122, 0.62);
  color: var(--text-primary);
  background: rgba(52, 34, 23, 0.88);
}

.replay-btn:focus-visible {
  outline: 3px solid rgba(242, 206, 122, 0.64);
  outline-offset: 3px;
}

.replay-btn-play {
  width: 44px;
  height: 44px;
  background: var(--accent-gold);
  border-color: var(--accent-gold);
  color: #2a1f14;
  font-size: 20px;
}

.replay-btn-play:hover {
  background: var(--accent-gold-bright);
  border-color: var(--accent-gold-bright);
  color: #2a1f14;
}

.replay-speed-group {
  display: flex;
  gap: 4px;
  margin-left: 8px;
  padding-left: 12px;
  border-left: 1px solid rgba(201, 168, 108, 0.18);
}

.replay-speed-btn {
  padding: 4px 8px;
  min-height: 32px;
  background: rgba(28, 18, 12, 0.74);
  border: 1px solid rgba(201, 168, 108, 0.28);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 11px;
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
}

.replay-speed-btn:hover {
  border-color: rgba(242, 206, 122, 0.62);
  color: var(--text-primary);
}

.replay-speed-btn.active {
  border-color: var(--accent-gold);
  background: linear-gradient(180deg, rgba(242, 206, 122, 0.18), rgba(201, 168, 108, 0.08)), rgba(58, 37, 24, 0.96);
  color: var(--accent-gold-bright);
}
```

- [ ] **Step 3: 提交**

```bash
git add src/components/ReplayBar.tsx src/components/ReplayBar.css
git commit -m "feat: 创建 ReplayBar 回放控制栏组件"
```

---

## Task 7: 创建 GameRecordList 组件（历史对局抽屉）

**Files:**
- Create: `src/components/GameRecordList.tsx`
- Create: `src/components/GameRecordList.css`

- [ ] **Step 1: 创建 GameRecordList.tsx**

```typescript
import { useState, useEffect } from 'react'
import type { GameRecord } from '../game/types'
import { loadGameRecords, deleteGameRecord, clearGameRecords } from '../replay/storage'
import './GameRecordList.css'

interface GameRecordListProps {
  isOpen: boolean
  onClose: () => void
  onSelectRecord: (record: GameRecord) => void
}

function formatTimeAgo(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  return `${days}天前`
}

function getResultBadge(winner: 'black' | 'white' | 'draw' | null) {
  if (winner === 'black') return { label: '⚫ 黑方胜', className: 'badge-black' }
  if (winner === 'white') return { label: '⚪ 白方胜', className: 'badge-white' }
  return { label: '🤝 平局', className: 'badge-draw' }
}

export function GameRecordList({ isOpen, onClose, onSelectRecord }: GameRecordListProps) {
  const [records, setRecords] = useState<GameRecord[]>([])

  useEffect(() => {
    if (isOpen) setRecords(loadGameRecords())
  }, [isOpen])

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteGameRecord(id)
    setRecords(records => records.filter(r => r.id !== id))
  }

  const handleClear = () => {
    clearGameRecords()
    setRecords([])
  }

  if (!isOpen) return null

  return (
    <>
      <div className="record-list-overlay" onClick={onClose} />
      <div className="record-list-drawer">
        <div className="record-list-header">
          <h3>📜 历史对局</h3>
          {records.length > 0 && (
            <button className="record-list-clear" onClick={handleClear}>清空</button>
          )}
        </div>

        <div className="record-list-body">
          {records.length === 0 ? (
            <div className="record-list-empty">
              <p>暂无录像记录</p>
              <p className="record-list-empty-hint">完成对局后会保存到这里</p>
            </div>
          ) : (
            <div className="record-list-items">
              {records.map(record => {
                const badge = getResultBadge(record.result.winner)
                const modeLabel = record.gameMode === 'pvp' ? 'PvP' : `AI·${record.aiDifficulty}`
                return (
                  <div
                    key={record.id}
                    className="record-item"
                    onClick={() => onSelectRecord(record)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && onSelectRecord(record)}
                  >
                    <div className="record-item-top">
                      <span className={`record-badge ${badge.className}`}>{badge.label}</span>
                      <span className="record-time">{formatTimeAgo(record.createdAt)}</span>
                    </div>
                    <div className="record-item-meta">
                      {modeLabel} · {record.moves.length}手 · {new Date(record.createdAt).toLocaleDateString()}
                    </div>
                    <button
                      className="record-delete-btn"
                      onClick={e => handleDelete(e, record.id)}
                      aria-label="删除此录像"
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
```

- [ ] **Step 2: 创建 GameRecordList.css**

```css
.record-list-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  animation: fadeIn 200ms ease-out;
}

.record-list-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(360px, 90vw);
  background: var(--panel);
  border-left: 1px solid var(--panel-line);
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.4);
  z-index: 101;
  display: flex;
  flex-direction: column;
  animation: slideInRight 260ms ease-out;
}

.record-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--panel-line);
}

.record-list-header h3 {
  margin: 0;
  font-size: 16px;
  color: var(--text-primary);
}

.record-list-clear {
  padding: 4px 10px;
  background: rgba(28, 18, 12, 0.74);
  border: 1px solid rgba(201, 168, 108, 0.28);
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: background 160ms ease, color 160ms ease;
}

.record-list-clear:hover {
  color: var(--accent-red);
  border-color: var(--accent-red);
}

.record-list-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.record-list-empty {
  text-align: center;
  padding: 48px 16px;
  color: var(--text-secondary);
}

.record-list-empty p { margin: 0; }

.record-list-empty-hint {
  margin-top: 8px !important;
  font-size: 13px;
  opacity: 0.6;
}

.record-list-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.record-item {
  position: relative;
  padding: 12px 14px;
  background: rgba(28, 18, 12, 0.6);
  border: 1px solid rgba(201, 168, 108, 0.1);
  border-left: 3px solid var(--accent-gold);
  border-radius: 8px;
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease;
}

.record-item:hover {
  background: rgba(52, 34, 23, 0.88);
  border-color: rgba(242, 206, 122, 0.3);
}

.record-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}

.record-badge {
  font-size: 13px;
  font-weight: 650;
}

.badge-black { color: var(--text-primary); }
.badge-white { color: var(--text-secondary); }
.badge-draw { color: var(--text-muted); }

.record-time {
  font-size: 11px;
  opacity: 0.6;
}

.record-item-meta {
  font-size: 12px;
  color: var(--text-muted);
}

.record-delete-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 16px;
  cursor: pointer;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 160ms ease, color 160ms ease;
}

.record-item:hover .record-delete-btn { opacity: 1; }
.record-delete-btn:hover { color: var(--accent-red); }

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}
```

- [ ] **Step 3: 提交**

```bash
git add src/components/GameRecordList.tsx src/components/GameRecordList.css
git commit -m "feat: 创建 GameRecordList 历史对局抽屉组件"
```

---

## Task 8: 集成回放和悔棋到 Game 组件

**Files:**
- Modify: `src/components/Cell.tsx`
- Modify: `src/components/Board.tsx`
- Modify: `src/components/Game.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: 修改 Cell.tsx — 增加 moveNumber 显示**

```typescript
// CellProps 接口修改
interface CellProps {
  piece: Player | null
  onClick: () => void
  className?: string
  moveNumber?: number | null
  isLastMove?: boolean
}

// Cell 函数签名修改
export function Cell({ piece, onClick, className = '', moveNumber, isLastMove }: CellProps) {
  // ... handleKeyDown 不变
  return (
    <div
      role="button"
      aria-label={piece ? pieceLabel[piece] : '空位'}
      tabIndex={0}
      className={`cell ${className}`.trim()}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      data-piece={piece ?? ''}
    >
      {piece && <div className={`piece ${piece}`} />}
      {moveNumber && piece && (
        <span className={`move-number ${isLastMove ? 'last' : ''}`}>{moveNumber}</span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 修改 Board.tsx — 传递 moveNumbers**

```typescript
// BoardProps 接口修改
interface BoardProps {
  board: Board
  onCellClick: (row: number, col: number) => void
  lastMove?: { row: number; col: number } | null
  winningCells?: Array<{ row: number; col: number }>
  moveNumbers?: Map<string, number>
  currentMoveIndex?: number
}

// getCellClassName 和 isWinningCell 不变
// Cell 调用处改为：
<Cell
  key={`${rowIndex}-${colIndex}`}
  piece={piece}
  onClick={() => onCellClick(rowIndex, colIndex)}
  className={getCellClassName(rowIndex, colIndex)}
  moveNumber={moveNumbers?.get(`${rowIndex},${colIndex}`)}
  isLastMove={
    currentMoveIndex !== undefined &&
    moveNumbers?.get(`${rowIndex},${colIndex}`) === currentMoveIndex + 1
  }
/>
```

- [ ] **Step 3: 修改 Game.tsx — 集成所有功能**

在 `Game.tsx` 顶部添加导入：

```typescript
import { useReplay } from '../replay/useReplay'
import { saveGameRecord } from '../replay/storage'
import type { GameRecord } from '../game/types'
import { ReplayBar } from './ReplayBar'
import { GameRecordList } from './GameRecordList'
```

在 `Game` 组件内添加状态和逻辑：

```typescript
const [replayOpen, setReplayOpen] = useState(false)
const [isReplayMode, setIsReplayMode] = useState(false)
const replay = useReplay()

// 游戏结束时保存录像并进入回放模式
useEffect(() => {
  if (state.status === 'won' || state.status === 'draw') {
    const record: GameRecord = {
      id: crypto.randomUUID(),
      version: 1,
      createdAt: new Date().toISOString(),
      boardSize: 15,
      gameMode: state.settings.mode,
      aiDifficulty: state.settings.aiDifficulty,
      players: {
        black: { name: '黑方', isAI: state.settings.mode === 'ai' },
        white: { name: state.settings.mode === 'ai' ? 'AI' : '白方', isAI: false },
      },
      result: {
        winner: state.winner,
        winningCells: state.winningCells,
      },
      moves: state.moveHistory,
    }
    saveGameRecord(record)
    setIsReplayMode(true)
    replay.loadRecord(record)
  }
}, [state.status])

// 新增回调
const handleUndo = useCallback(() => {
  dispatch({ type: 'UNDO' })
  audio.playSFX('click')
}, [audio])

const handleOpenReplayList = useCallback(() => {
  setReplayOpen(true)
  audio.playSFX('click')
}, [audio])

const handleCloseReplayList = useCallback(() => setReplayOpen(false), [])

const handleSelectRecord = useCallback((record: GameRecord) => {
  setReplayOpen(false)
  setIsReplayMode(true)
  replay.loadRecord(record)
  audio.playSFX('click')
}, [audio])

const handleExitReplay = useCallback(() => {
  setIsReplayMode(false)
  dispatch({ type: 'RESET' })
  audio.playSFX('click')
}, [audio])
```

修改 footer 区域：

```typescript
<footer className="game-footer">
  <span className="mode-badge">{modeLabel}</span>
  {isReplayMode ? (
    <ReplayBar
      currentIndex={replay.state.currentIndex}
      totalMoves={replay.state.moves.length}
      isPlaying={replay.state.isPlaying}
      speed={replay.state.speed}
      onPlay={replay.play}
      onPause={replay.pause}
      onStepForward={replay.stepForward}
      onStepBackward={replay.stepBackward}
      onJumpToStart={replay.jumpToStart}
      onJumpToEnd={replay.jumpToEnd}
      onJumpTo={replay.jumpTo}
      onSetSpeed={replay.setSpeed}
    />
  ) : (
    <Status gameState={state} />
  )}
  {state.status !== 'playing' && !isReplayMode && (
    <button type="button" className="reset-button" onClick={handleReset}>重新开始</button>
  )}
  {state.status === 'playing' && state.moveHistory.length > 0 && !isReplayMode && (
    <button type="button" className="undo-button" onClick={handleUndo}>悔棋</button>
  )}
  {!isReplayMode && (
    <button type="button" className="replay-list-button" onClick={handleOpenReplayList}>📜 录像列表</button>
  )}
  {isReplayMode && (
    <button type="button" className="reset-button" onClick={handleExitReplay}>退出回放</button>
  )}
</footer>
```

修改 board 区域：

```typescript
<Board
  board={isReplayMode ? replay.state.board : state.board}
  onCellClick={isReplayMode ? () => {} : handleCellClick}
  lastMove={isReplayMode
    ? (replay.state.currentIndex >= 0 ? replay.state.moves[replay.state.currentIndex].position : null)
    : state.lastMove}
  winningCells={isReplayMode ? [] : state.winningCells || []}
  moveNumbers={isReplayMode
    ? new Map(replay.state.moves.map((m, i) => [`${m.position.row},${m.position.col}`, i + 1]))
    : undefined}
  currentMoveIndex={isReplayMode ? replay.state.currentIndex : undefined}
/>
```

添加 `GameRecordList` 到 JSX（在 `AudioPanel` 之前）：

```typescript
<GameRecordList
  isOpen={replayOpen}
  onClose={handleCloseReplayList}
  onSelectRecord={handleSelectRecord}
/>
```

- [ ] **Step 4: 在 src/index.css 末尾追加样式**

```css
/* 步数标注 */
.move-number {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(var(--cell-size) * 0.28);
  font-weight: 700;
  color: inherit;
  pointer-events: none;
  z-index: 1;
}

.piece.black + .move-number {
  color: #fff;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.8);
}

.piece.white + .move-number {
  color: #333;
}

.move-number.last {
  font-size: calc(var(--cell-size) * 0.34);
  color: var(--accent-gold-bright);
  text-shadow: 0 0 6px rgba(242, 206, 122, 0.6);
}

/* 悔棋按钮 */
.undo-button {
  padding: 0 14px;
  min-height: 44px;
  border: 1px solid rgba(201, 168, 108, 0.28);
  border-radius: 8px;
  background: rgba(28, 18, 12, 0.74);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
}

.undo-button:hover {
  border-color: rgba(242, 206, 122, 0.62);
  color: var(--text-primary);
  background: rgba(52, 34, 23, 0.88);
}

/* 录像列表按钮 */
.replay-list-button {
  padding: 0 14px;
  min-height: 44px;
  border: 1px solid rgba(201, 168, 108, 0.28);
  border-radius: 8px;
  background: rgba(28, 18, 12, 0.74);
  color: var(--text-secondary);
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease, color 160ms ease;
}

.replay-list-button:hover {
  border-color: rgba(242, 206, 122, 0.62);
  color: var(--text-primary);
  background: rgba(52, 34, 23, 0.88);
}
```

- [ ] **Step 5: 运行测试**

Run: `npx vitest --run`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/components/Cell.tsx src/components/Board.tsx src/components/Game.tsx src/index.css
git commit -m "feat: 集成回放和悔棋功能到 Game 组件"
```

---

## Task 9: UI 美化（使用 ui-ux-pro-max 技能）

**Files:**
- Review and polish: `ReplayBar.css`, `GameRecordList.css`

- [ ] **Step 1: 调用 ui-ux-pro-max 技能**

使用 ui-ux-pro-max 技能对 `ReplayBar` 和 `GameRecordList` 的视觉效果进行评审，确保与深色檀木主题一致，必要时调整颜色变量、间距、动画。

- [ ] **Step 2: 根据评审建议优化 CSS**

根据 ui-ux-pro-max 的建议优化 CSS。

- [ ] **Step 3: 提交**

```bash
git add src/components/ReplayBar.css src/components/GameRecordList.css
git commit -m "style: 美化回放和录像列表 UI"
```

---

## 规格覆盖检查

| 规格章节 | 对应 Task |
|----------|----------|
| 数据结构 MoveRecord/GameRecord | Task 1 |
| 回放引擎 ReplayState/ReplayAction | Task 3 |
| 核心算法 forward/backward/jumpTo | Task 3 |
| useReplay Hook | Task 4 |
| moveHistory 数据收集 | Task 2 |
| UNDO 悔棋 | Task 2 |
| GameRecordList 抽屉 | Task 7 |
| ReplayBar 控制栏 | Task 6 |
| 步数标注 | Task 8 |
| localStorage 存储 | Task 5 |
| UI 美化 | Task 9 |
