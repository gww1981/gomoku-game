# 人机对战功能实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为五子棋游戏添加人机对战功能，支持三个难度级别（简单/中等/困难），默认中难度

**Architecture:** 采用分层 AI 架构，将 AI 算法独立到 `game/ai/` 目录。游戏状态扩展 `GameMode` 类型，Reducer 处理人机切换。UI 层增加模式选择菜单，AI 落子通过 `setTimeout` 模拟思考延迟。

**Tech Stack:** React 19, TypeScript, Vitest

---

## 文件结构

```
src/
├── game/
│   ├── types.ts              # 扩展：增加 GameMode, AIDifficulty, GameSettings, isAIThinking
│   ├── gameReducer.ts        # 扩展：支持 AI 模式动作
│   └── ai/
│       ├── types.ts          # AI 类型定义
│       ├── aiEasy.ts         # 简单 AI：随机落子
│       ├── aiMedium.ts       # 中等 AI：威胁评估评分
│       ├── aiHard.ts         # 困难 AI：Minimax + Alpha-Beta
│       └── index.ts          # AI 统一入口
├── components/
│   ├── ModeSelect.tsx        # 新增：模式选择菜单
│   ├── ModeSelect.css        # 新增：模式选择样式
│   ├── Status.tsx           # 扩展：支持 AI 思考状态
│   ├── Game.tsx             # 扩展：支持人机对战
│   └── Board.tsx            # 现有组件（无需修改）
└── App.tsx                  # 扩展：支持模式选择
```

---

## 任务 1: 扩展类型定义

**Files:**
- Modify: `src/game/types.ts`

- [ ] **Step 1: 读取现有 types.ts**

```bash
cat src/game/types.ts
```

- [ ] **Step 2: 添加 AI 相关类型**

在文件末尾添加：

```typescript
/** 游戏模式 */
export type GameMode = 'pvp' | 'ai'

/** AI 难度级别 */
export type AIDifficulty = 'easy' | 'medium' | 'hard'

/** 游戏设置（用于模式选择） */
export interface GameSettings {
  mode: GameMode
  aiDifficulty: AIDifficulty
}

/** 扩展后的游戏状态 */
export interface GameState {
  board: Board
  currentPlayer: Player
  status: GameStatus
  winner: Player | null
  lastMove: Position | null
  settings: GameSettings
  isAIThinking: boolean
}

/** 扩展后的游戏动作 */
export type GameAction =
  | { type: 'MOVE'; row: number; col: number }
  | { type: 'RESET' }
  | { type: 'SET_MODE'; mode: GameMode; aiDifficulty?: AIDifficulty }
  | { type: 'SET_AI_THINKING'; isThinking: boolean }
  | { type: 'AI_MOVE'; row: number; col: number }
```

- [ ] **Step 3: 运行测试验证**

```bash
npm test -- --run
```

Expected: 原有 17 个测试全部通过（类型变更不影响现有逻辑）

- [ ] **Step 4: 提交**

```bash
git add src/game/types.ts
git commit -m "feat: 扩展类型定义，添加 AI 相关类型"
```

---

## 任务 2: 创建 AI 模块类型

**Files:**
- Create: `src/game/ai/types.ts`
- Create: `src/game/ai/` 目录

- [ ] **Step 1: 创建目录**

```bash
mkdir -p src/game/ai
```

- [ ] **Step 2: 创建 AI 类型文件**

```typescript
import type { Board, Player } from '../types'

/** 棋型评分 */
export type PatternType =
  | 'block_live_three'   // 阻挡活三
  | 'live_three'          // 活三
  | 'block_four'          // 阻挡四
  | 'four'                // 四
  | 'five'                // 五
  | 'block_live_two'      // 阻挡活二
  | 'live_two'            // 活二
  | 'one'                 // 一

/** 棋型评分表 */
export const PATTERN_SCORES: Record<PatternType, number> = {
  'five': 100000,          // 五连（最高）
  'four': 10000,           // 四
  'live_three': 5000,      // 活三
  'block_live_three': 1000, // 阻挡活三
  'live_two': 500,         // 活二
  'block_live_two': 100,   // 阻挡活二
  'one': 10,              // 一
  'block_four': 8000,     // 阻挡四（眠四）
}

/** AI 决策结果 */
export interface AIDecision {
  row: number
  col: number
  score: number
}
```

- [ ] **Step 3: 提交**

```bash
git add src/game/ai/types.ts
git commit -m "feat: 创建 AI 模块类型定义"
```

---

## 任务 3: 实现简单 AI（随机落子）

**Files:**
- Create: `src/game/ai/aiEasy.ts`
- Create: `src/game/ai/index.ts`
- Create: `src/game/ai/aiEasy.test.ts`

- [ ] **Step 1: 编写测试**

```typescript
import { describe, it, expect } from 'vitest'
import { createEmptyBoard } from '../gameLogic'
import { getAIMove } from './aiEasy'

describe('aiEasy', () => {
  it('应在空棋盘上返回有效落子位置', () => {
    const board = createEmptyBoard()
    const move = getAIMove(board, 'black')
    expect(move).not.toBeNull()
    expect(move.row).toBeGreaterThanOrEqual(0)
    expect(move.row).toBeLessThan(15)
    expect(move.col).toBeGreaterThanOrEqual(0)
    expect(move.col).toBeLessThan(15)
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
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npm test -- --run src/game/ai/aiEasy.test.ts
```

Expected: FAIL (aiEasy 模块不存在)

- [ ] **Step 3: 实现简单 AI**

```typescript
import type { Board, Player } from '../types'
import type { AIDecision } from './types'
import { BOARD_SIZE } from '../gameLogic'

export function getAIMove(board: Board, player: Player): AIDecision | null {
  const emptyPositions: Array<{ row: number; col: number }> = []

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === null) {
        emptyPositions.push({ row, col })
      }
    }
  }

  if (emptyPositions.length === 0) {
    return null
  }

  const randomIndex = Math.floor(Math.random() * emptyPositions.length)
  const { row, col } = emptyPositions[randomIndex]

  return { row, col, score: 0 }
}
```

- [ ] **Step 4: 创建统一入口**

```typescript
import type { Board, Player } from '../types'
import type { AIDifficulty, AIDecision } from './types'
import { getAIMove as getEasyMove } from './aiEasy'
import { getAIMove as getMediumMove } from './aiMedium'
import { getAIMove as getHardMove } from './aiHard'

export function getAIMove(
  board: Board,
  player: Player,
  difficulty: AIDifficulty
): AIDecision | null {
  switch (difficulty) {
    case 'easy':
      return getEasyMove(board, player)
    case 'medium':
      return getMediumMove(board, player)
    case 'hard':
      return getHardMove(board, player)
    default:
      return getEasyMove(board, player)
  }
}

export type { AIDifficulty, AIDecision } from './types'
```

- [ ] **Step 5: 运行测试验证通过**

```bash
npm test -- --run src/game/ai/aiEasy.test.ts
```

Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/game/ai/aiEasy.ts src/game/ai/index.ts src/game/ai/aiEasy.test.ts
git commit -m "feat: 实现简单 AI（随机落子）"
```

---

## 任务 4: 实现中等 AI（威胁评估）

**Files:**
- Create: `src/game/ai/aiMedium.ts`
- Create: `src/game/ai/aiMedium.test.ts`

- [ ] **Step 1: 编写测试**

```typescript
import { describe, it, expect } from 'vitest'
import { createEmptyBoard } from '../gameLogic'
import { getAIMove } from './aiMedium'

describe('aiMedium', () => {
  it('应返回有效落子位置', () => {
    const board = createEmptyBoard()
    const move = getAIMove(board, 'black')
    expect(move).not.toBeNull()
    expect(move.score).toBeGreaterThan(0)
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
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npm test -- --run src/game/ai/aiMedium.test.ts
```

Expected: FAIL

- [ ] **Step 3: 实现中等 AI**

```typescript
import type { Board, Player } from '../types'
import type { AIDecision, PatternType } from './types'
import { BOARD_SIZE, canPlacePiece } from '../gameLogic'
import { PATTERN_SCORES } from './types'

interface Pattern {
  type: PatternType
  count: number
  openEnds: number
}

function scanLine(
  board: Board,
  row: number,
  col: number,
  dRow: number,
  dCol: number,
  player: Player
): Pattern | null {
  let count = 0
  let openEnds = 0
  let r = row + dRow
  let c = col + dCol

  while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
    if (board[r][c] === player) {
      count++
    } else if (board[r][c] === null) {
      openEnds++
      break
    } else {
      break
    }
    r += dRow
    c += dCol
  }

  if (count === 0) return null

  r = row - dRow
  c = col - dCol
  let reverseOpenEnds = 0
  while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
    if (board[r][c] === player) {
      count++
    } else if (board[r][c] === null) {
      reverseOpenEnds++
      break
    } else {
      break
    }
    r -= dRow
    c -= dCol
  }

  openEnds += reverseOpenEnds

  let type: PatternType
  if (count >= 5) {
    type = 'five'
  } else if (count === 4) {
    type = openEnds === 2 ? 'four' : 'block_four'
  } else if (count === 3) {
    if (openEnds === 2) {
      type = 'live_three'
    } else if (openEnds === 1) {
      type = 'block_live_three'
    } else {
      type = 'one'
    }
  } else if (count === 2) {
    type = openEnds === 2 ? 'live_two' : openEnds === 1 ? 'block_live_two' : 'one'
  } else {
    type = 'one'
  }

  return { type, count, openEnds }
}

function evaluatePosition(board: Board, row: number, col: number, player: Player): number {
  if (!canPlacePiece(board, row, col)) return -1

  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]]
  let totalScore = 0

  for (const [dRow, dCol] of directions) {
    const pattern = scanLine(board, row, col, dRow, dCol, player)
    if (pattern) {
      totalScore += PATTERN_SCORES[pattern.type]
    }

    const opponent = player === 'black' ? 'white' : 'black'
    const opponentPattern = scanLine(board, row, col, dRow, dCol, opponent)
    if (opponentPattern) {
      totalScore += PATTERN_SCORES[opponentPattern.type] * 0.9
    }
  }

  const center = Math.floor(BOARD_SIZE / 2)
  const distanceFromCenter = Math.abs(row - center) + Math.abs(col - center)
  totalScore += Math.max(0, 10 - distanceFromCenter)

  return totalScore
}

export function getAIMove(board: Board, player: Player): AIDecision | null {
  const emptyPositions: Array<{ row: number; col: number; score: number }> = []

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] === null) {
        const score = evaluatePosition(board, row, col, player)
        if (score > 0) {
          emptyPositions.push({ row, col, score })
        }
      }
    }
  }

  if (emptyPositions.length === 0) {
    const center = Math.floor(BOARD_SIZE / 2)
    if (canPlacePiece(board, center, center)) {
      return { row: center, col: center, score: 1 }
    }
    return null
  }

  emptyPositions.sort((a, b) => b.score - a.score)

  const topCandidates = emptyPositions.slice(0, Math.min(5, emptyPositions.length))
  const selected = topCandidates[Math.floor(Math.random() * topCandidates.length)]

  return { row: selected.row, col: selected.col, score: selected.score }
}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
npm test -- --run src/game/ai/aiMedium.test.ts
```

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/game/ai/aiMedium.ts src/game/ai/aiMedium.test.ts
git commit -m "feat: 实现中等 AI（威胁评估）"
```

---

## 任务 5: 实现困难 AI（Minimax + Alpha-Beta）

**Files:**
- Create: `src/game/ai/aiHard.ts`
- Create: `src/game/ai/aiHard.test.ts`

- [ ] **Step 1: 编写测试**

```typescript
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
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npm test -- --run src/game/ai/aiHard.test.ts
```

Expected: FAIL

- [ ] **Step 3: 实现困难 AI**

```typescript
import type { Board, Player } from '../types'
import type { AIDecision } from './types'
import { BOARD_SIZE, canPlacePiece, checkWin } from '../gameLogic'

const MAX_DEPTH = 3

function evaluateBoard(board: Board, aiPlayer: Player): number {
  const opponent = aiPlayer === 'black' ? 'white' : 'black'
  let score = 0

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const piece = board[row][col]
      if (piece !== null) {
        const multiplier = piece === aiPlayer ? 1 : -1
        const directions = [[0, 1], [1, 0], [1, 1], [1, -1]]

        for (const [dRow, dCol] of directions) {
          let count = 1
          let openEnds = 0

          let r = row + dRow
          let c = col + dCol
          while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === piece) {
            count++
            r += dRow
            c += dCol
          }
          if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === null) {
            openEnds++
          }

          r = row - dRow
          c = col - dCol
          while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === piece) {
            count++
            r -= dRow
            c -= dCol
          }
          if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === null) {
            openEnds++
          }

          if (count >= 5) {
            score += multiplier * 100000
          } else if (count === 4) {
            score += multiplier * (openEnds === 2 ? 10000 : 5000)
          } else if (count === 3) {
            score += multiplier * (openEnds === 2 ? 1000 : 300)
          } else if (count === 2) {
            score += multiplier * (openEnds === 2 ? 100 : 20)
          }
        }
      }
    }
  }

  return score
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiPlayer: Player
): number {
  const opponent = aiPlayer === 'black' ? 'white' : 'black'

  if (depth === 0) {
    return evaluateBoard(board, aiPlayer)
  }

  const candidates = getCandidateMoves(board)
  if (candidates.length === 0) {
    return evaluateBoard(board, aiPlayer)
  }

  if (isMaximizing) {
    let maxEval = alpha
    for (const { row, col } of candidates) {
      board[row][col] = aiPlayer
      if (checkWin(board, row, col, aiPlayer)) {
        board[row][col] = null
        return 100000 + depth * 100
      }
      const evalScore = minimax(board, depth - 1, maxEval, beta, false, aiPlayer)
      board[row][col] = null
      maxEval = Math.max(maxEval, evalScore)
      if (beta <= maxEval) break
    }
    return maxEval
  } else {
    let minEval = beta
    for (const { row, col } of candidates) {
      board[row][col] = opponent
      if (checkWin(board, row, col, opponent)) {
        board[row][col] = null
        return -100000 - depth * 100
      }
      const evalScore = minimax(board, depth - 1, alpha, minEval, true, aiPlayer)
      board[row][col] = null
      minEval = Math.min(minEval, evalScore)
      if (minEval <= alpha) break
    }
    return minEval
  }
}

function getCandidateMoves(board: Board): Array<{ row: number; col: number }> {
  const candidates = new Set<string>()
  const directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1], [1, 0], [1, 1]
  ]

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (board[row][col] !== null) {
        for (const [dRow, dCol] of directions) {
          const newRow = row + dRow
          const newCol = col + dCol
          if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
            if (board[newRow][newCol] === null) {
              candidates.add(`${newRow},${newCol}`)
            }
          }
        }
      }
    }
  }

  if (candidates.size === 0) {
    const center = Math.floor(BOARD_SIZE / 2)
    return [{ row: center, col: center }]
  }

  return Array.from(candidates).map(s => {
    const [r, c] = s.split(',').map(Number)
    return { row: r, col: c }
  })
}

export function getAIMove(board: Board, player: Player): AIDecision | null {
  const candidates = getCandidateMoves(board)
  if (candidates.length === 0) return null

  let bestMove: { row: number; col: number } | null = null
  let bestScore = -Infinity

  for (const { row, col } of candidates) {
    board[row][col] = player

    if (checkWin(board, row, col, player)) {
      board[row][col] = null
      return { row, col, score: 100000 }
    }

    const score = minimax(board, MAX_DEPTH - 1, -Infinity, Infinity, false, player)
    board[row][col] = null

    if (score > bestScore) {
      bestScore = score
      bestMove = { row, col }
    }
  }

  if (!bestMove) {
    const { getAIMove: getMediumMove } = require('./aiMedium')
    return getMediumMove(board, player)
  }

  return { row: bestMove.row, col: bestMove.col, score: bestScore }
}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
npm test -- --run src/game/ai/aiHard.test.ts
```

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/game/ai/aiHard.ts src/game/ai/aiHard.test.ts
git commit -m "feat: 实现困难 AI（Minimax + Alpha-Beta 剪枝）"
```

---

## 任务 6: 扩展游戏 Reducer

**Files:**
- Modify: `src/game/gameReducer.ts`

- [ ] **Step 1: 读取现有 reducer**

```bash
cat src/game/gameReducer.ts
```

- [ ] **Step 2: 重写 Reducer**

```typescript
import type { GameState, GameAction, Player, GameMode, AIDifficulty } from './types'
import { createEmptyBoard, canPlacePiece, checkWin } from './gameLogic'

export function getInitialGameState(): GameState {
  return {
    board: createEmptyBoard(),
    currentPlayer: 'black',
    status: 'playing',
    winner: null,
    lastMove: null,
    settings: {
      mode: 'pvp',
      aiDifficulty: 'medium',
    },
    isAIThinking: false,
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'RESET':
      return {
        ...getInitialGameState(),
        settings: state.settings,
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

      return {
        ...state,
        board: newBoard,
        currentPlayer: won ? state.currentPlayer : (state.currentPlayer === 'black' ? 'white' : 'black') as Player,
        status: won ? 'won' : 'playing',
        winner: won ? state.currentPlayer : null,
        lastMove: { row: action.row, col: action.col },
        isAIThinking: false,
      }
    }

    case 'MOVE': {
      if (state.status !== 'playing') return state
      if (!canPlacePiece(state.board, action.row, action.col)) return state

      const newBoard = state.board.map(r => [...r])
      newBoard[action.row][action.col] = state.currentPlayer
      const won = checkWin(newBoard, action.row, action.col, state.currentPlayer)

      return {
        ...state,
        board: newBoard,
        currentPlayer: won ? state.currentPlayer : (state.currentPlayer === 'black' ? 'white' : 'black') as Player,
        status: won ? 'won' : 'playing',
        winner: won ? state.currentPlayer : null,
        lastMove: { row: action.row, col: action.col },
      }
    }

    default:
      return state
  }
}
```

- [ ] **Step 3: 运行测试验证**

```bash
npm test -- --run
```

Expected: 原有测试全部通过

- [ ] **Step 4: 提交**

```bash
git add src/game/gameReducer.ts
git commit -m "feat: 扩展 Reducer 支持 AI 模式"
```

---

## 任务 7: 创建模式选择菜单组件

**Files:**
- Create: `src/components/ModeSelect.tsx`
- Create: `src/components/ModeSelect.css`

- [ ] **Step 1: 创建 ModeSelect 组件**

```typescript
import type { GameMode, AIDifficulty } from '../game/types'

interface ModeSelectProps {
  onSelect: (mode: GameMode, aiDifficulty?: AIDifficulty) => void
}

export function ModeSelect({ onSelect }: ModeSelectProps) {
  return (
    <div className="mode-select">
      <h1>五子棋</h1>
      <div className="mode-buttons">
        <button
          className="mode-button pvp"
          onClick={() => onSelect('pvp')}
        >
          双人对战
        </button>
        <div className="ai-modes">
          <span className="ai-label">人机对战</span>
          <div className="ai-difficulty-buttons">
            <button onClick={() => onSelect('ai', 'easy')}>简单</button>
            <button className="primary" onClick={() => onSelect('ai', 'medium')}>中等</button>
            <button onClick={() => onSelect('ai', 'hard')}>困难</button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 创建 ModeSelect 样式**

```css
.mode-select {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 2rem;
}

.mode-select h1 {
  font-size: 2.5rem;
  color: #fff;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

.mode-buttons {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.mode-button {
  padding: 1rem 3rem;
  font-size: 1.2rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  backdrop-filter: blur(10px);
}

.mode-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(0, 0, 0, 0.3);
}

.ai-modes {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.ai-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
}

.ai-difficulty-buttons {
  display: flex;
  gap: 0.5rem;
}

.ai-difficulty-buttons button {
  padding: 0.5rem 1.5rem;
  font-size: 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
  transition: background 0.2s;
}

.ai-difficulty-buttons button:hover {
  background: rgba(255, 255, 255, 0.25);
}

.ai-difficulty-buttons button.primary {
  background: #667eea;
}

.ai-difficulty-buttons button.primary:hover {
  background: #5a6fd6;
}
```

- [ ] **Step 3: 提交**

```bash
git add src/components/ModeSelect.tsx src/components/ModeSelect.css
git commit -m "feat: 创建模式选择菜单组件"
```

---

## 任务 8: 扩展状态显示组件

**Files:**
- Modify: `src/components/Status.tsx`

- [ ] **Step 1: 重写 Status 组件**

```typescript
import type { GameState } from '../game/types'

interface StatusProps {
  gameState: GameState
}

export function Status({ gameState }: StatusProps) {
  if (gameGameState.status === 'won') {
    return (
      <div className="status won">
        {gameGameState.winner === 'black' ? '黑棋' : '白棋'} 获胜!
      </div>
    )
  }

  if (gameGameState.isAIThinking) {
    return (
      <div className="status ai-thinking">
        <span>AI 正在思考</span>
        <span className="thinking-dots">...</span>
      </div>
    )
  }

  const isAITurn = gameGameState.settings.mode === 'ai' && gameGameState.currentPlayer === 'white'

  return (
    <div className="status">
      {isAITurn ? '白棋 (AI)' : (gameGameState.currentPlayer === 'black' ? '黑棋' : '白棋')} 回合
    </div>
  )
}
```

**注意：** 上述代码有一个拼写错误 `gameGameState`，正确的应该是 `gameState`

正确的实现：

```typescript
import type { GameState } from '../game/types'

interface StatusProps {
  gameState: GameState
}

export function Status({ gameState }: StatusProps) {
  if (gameState.status === 'won') {
    return (
      <div className="status won">
        {gameState.winner === 'black' ? '黑棋' : '白棋'} 获胜!
      </div>
    )
  }

  if (gameState.isAIThinking) {
    return (
      <div className="status ai-thinking">
        <span>AI 正在思考</span>
        <span className="thinking-dots">...</span>
      </div>
    )
  }

  const isAITurn = gameState.settings.mode === 'ai' && gameState.currentPlayer === 'white'

  return (
    <div className="status">
      {isAITurn ? '白棋 (AI)' : (gameState.currentPlayer === 'black' ? '黑棋' : '白棋')} 回合
    </div>
  )
}
```

- [ ] **Step 2: 添加 AI 思考样式到 App.css**

```css
.status.ai-thinking {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: #ffd700;
}

.thinking-dots {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
```

- [ ] **Step 3: 提交**

```bash
git add src/components/Status.tsx src/App.css
git commit -m "feat: 扩展状态组件支持 AI 思考状态"
```

---

## 任务 9: 集成 AI 到 Game 组件

**Files:**
- Modify: `src/components/Game.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 重写 Game 组件**

```typescript
import { useReducer, useEffect, useCallback, useState } from 'react'
import { gameReducer, getInitialGameState } from '../game/gameReducer'
import { getAIMove } from '../game/ai'
import type { GameMode, AIDifficulty } from '../game/types'
import { Board } from './Board'
import { Status } from './Status'
import { ModeSelect } from './ModeSelect'

const AI_THINKING_DELAY = 400

export function Game() {
  const [state, dispatch] = useReducer(gameReducer, getInitialGameState())
  const [gameStarted, setGameStarted] = useState(false)

  const handleModeSelect = useCallback((mode: GameMode, aiDifficulty?: AIDifficulty) => {
    dispatch({ type: 'SET_MODE', mode, aiDifficulty })
    setGameStarted(true)
  }, [])

  const handleCellClick = useCallback((row: number, col: number) => {
    if (state.status !== 'playing') return
    if (state.isAIThinking) return
    if (state.settings.mode === 'ai' && state.currentPlayer !== 'black') return

    dispatch({ type: 'MOVE', row, col })
  }, [state.status, state.isAIThinking, state.settings.mode, state.currentPlayer])

  useEffect(() => {
    if (state.status !== 'playing') return
    if (state.settings.mode !== 'ai') return
    if (state.currentPlayer !== 'white') return
    if (state.isAIThinking) return

    dispatch({ type: 'SET_AI_THINKING', isThinking: true })

    const timeoutId = setTimeout(() => {
      const decision = getAIMove(state.board, 'white', state.settings.aiDifficulty)
      if (decision) {
        dispatch({ type: 'AI_MOVE', row: decision.row, col: decision.col })
      }
    }, AI_THINKING_DELAY)

    return () => clearTimeout(timeoutId)
  }, [state.status, state.settings, state.currentPlayer, state.isAIThinking, state.board])

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  if (!gameStarted) {
    return <ModeSelect onSelect={handleModeSelect} />
  }

  const difficultyText = {
    easy: '简单',
    medium: '中等',
    hard: '困难'
  }[state.settings.aiDifficulty]

  return (
    <div className="game">
      <h1>五子棋</h1>
      <div className="game-info">
        <span className="mode-badge">
          {state.settings.mode === 'pvp' ? '双人对战' : `人机·${difficultyText}`}
        </span>
      </div>
      <Status gameState={state} />
      <Board board={state.board} onCellClick={handleCellClick} />
      {state.status !== 'playing' && (
        <button className="reset-button" onClick={handleReset}>
          重新开始
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 更新 App.tsx**

```typescript
import { Game } from './components/Game'
import './App.css'

function App() {
  return <Game />
}

export default App
```

- [ ] **Step 3: 添加模式徽章样式到 App.css**

```css
.mode-badge {
  display: inline-block;
  padding: 0.3rem 0.8rem;
  font-size: 0.85rem;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  color: rgba(255, 255, 255, 0.9);
}

.game-info {
  margin-bottom: 1rem;
}
```

- [ ] **Step 4: 运行开发服务器测试**

```bash
npm run dev
```

Expected: 应用启动，显示模式选择菜单

- [ ] **Step 5: 提交**

```bash
git add src/components/Game.tsx src/App.tsx src/App.css
git commit -m "feat: 集成 AI 到 Game 组件"
```

---

## 任务 10: 最终测试和验证

- [ ] **Step 1: 运行所有测试**

```bash
npm test -- --run
```

Expected: 所有测试通过

- [ ] **Step 2: 提交完成**

```bash
git add -A
git commit -m "feat: 完成人机对战功能

- 支持三种 AI 难度：简单（随机）、中等（威胁评估）、困难（Minimax）
- 添加模式选择菜单
- AI 落子带 400ms 思考延迟和状态显示"
```

---

## 自检清单

- [ ] 所有测试通过
- [ ] 模式选择菜单正确显示
- [ ] 双人模式正常对战
- [ ] 人机模式 AI 正确落子
- [ ] 三种难度 AI 行为符合预期
- [ ] AI 思考状态正确显示
- [ ] 胜利判断正确
- [ ] 重新开始功能正常
