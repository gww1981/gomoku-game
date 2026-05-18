# 五子棋游戏实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 实现一个 15×15 双人对战五子棋 Web 游戏，使用 React + TypeScript + Vite

**架构：** 游戏核心逻辑（src/game/）与 React 组件完全分离，核心逻辑为纯函数便于单元测试

**技术栈：** React 19 + TypeScript + Vite + Vitest + @testing-library/react

---

## 任务分解

### Task 1: 创建类型定义

**Files:**
- Create: `src/game/types.ts`

- [ ] **Step 1: 创建 types.ts**

```typescript
export type Player = 'black' | 'white'
export type Board = (Player | null)[][]
export interface Position {
  row: number
  col: number
}
export type GameStatus = 'playing' | 'won' | 'draw'
export interface GameState {
  board: Board
  currentPlayer: Player
  status: GameStatus
  winner: Player | null
  lastMove: Position | null
}
export type GameAction =
  | { type: 'MOVE'; row: number; col: number }
  | { type: 'RESET' }
export const BOARD_SIZE = 15
```

- [ ] **Step 2: 提交**

```bash
git add src/game/types.ts
git commit -m "feat: add game types definition

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 2: 编写 createEmptyBoard 和 canPlacePiece 测试

**Files:**
- Create: `src/game/gameLogic.test.ts`

- [ ] **Step 1: 编写 createEmptyBoard 和 canPlacePiece 的失败测试**

```typescript
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
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npm run test:run -- src/game/gameLogic.test.ts`
Expected: FAIL with "canPlacePiece is not a function" or similar

- [ ] **Step 3: 创建最小实现**

```typescript
import { Board, Player } from './types'

export const BOARD_SIZE = 15

export function createEmptyBoard(): Board {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null))
}

export function canPlacePiece(board: Board, row: number, col: number): boolean {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
    return false
  }
  return board[row][col] === null
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npm run test:run -- src/game/gameLogic.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/game/gameLogic.ts src/game/gameLogic.test.ts
git commit -m "feat: add createEmptyBoard and canPlacePiece

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: 编写横向胜利判断测试

**Files:**
- Modify: `src/game/gameLogic.test.ts`

- [ ] **Step 1: 编写横向五子连珠胜利测试**

```typescript
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
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npm run test:run -- src/game/gameLogic.test.ts`
Expected: FAIL with "checkWin is not defined"

- [ ] **Step 3: 实现 checkWin 函数（横向检查）**

```typescript
export function checkWin(board: Board, row: number, col: number, player: Player): boolean {
  // Check horizontal (left-right)
  let count = 1
  // Left
  for (let c = col - 1; c >= 0 && board[row][c] === player; c--) {
    count++
  }
  // Right
  for (let c = col + 1; c < BOARD_SIZE && board[row][c] === player; c++) {
    count++
  }
  if (count >= 5) return true

  return false
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npm run test:run -- src/game/gameLogic.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/game/gameLogic.ts src/game/gameLogic.test.ts
git commit -m "feat: add horizontal win check

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: 编写纵向胜利判断测试

**Files:**
- Modify: `src/game/gameLogic.test.ts`

- [ ] **Step 1: 编写纵向五子连珠胜利测试**

```typescript
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
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npm run test:run -- src/game/gameLogic.test.ts`
Expected: FAIL (纵向检查未实现)

- [ ] **Step 3: 更新 checkWin 函数添加纵向检查**

```typescript
export function checkWin(board: Board, row: number, col: number, player: Player): boolean {
  // Check horizontal (left-right)
  let count = 1
  for (let c = col - 1; c >= 0 && board[row][c] === player; c--) count++
  for (let c = col + 1; c < BOARD_SIZE && board[row][c] === player; c++) count++
  if (count >= 5) return true

  // Check vertical (up-down)
  count = 1
  for (let r = row - 1; r >= 0 && board[r][col] === player; r--) count++
  for (let r = row + 1; r < BOARD_SIZE && board[r][col] === player; r++) count++
  if (count >= 5) return true

  return false
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npm run test:run -- src/game/gameLogic.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/game/gameLogic.ts src/game/gameLogic.test.ts
git commit -m "feat: add vertical win check

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: 编写左斜胜利判断测试

**Files:**
- Modify: `src/game/gameLogic.test.ts`

- [ ] **Step 1: 编写左斜五子连珠胜利测试（左斜 = row 和 col 同方向变化）**

```typescript
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
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npm run test:run -- src/game/gameLogic.test.ts`
Expected: FAIL (左斜检查未实现)

- [ ] **Step 3: 更新 checkWin 函数添加左斜检查**

```typescript
export function checkWin(board: Board, row: number, col: number, player: Player): boolean {
  // Check horizontal
  let count = 1
  for (let c = col - 1; c >= 0 && board[row][c] === player; c--) count++
  for (let c = col + 1; c < BOARD_SIZE && board[row][c] === player; c++) count++
  if (count >= 5) return true

  // Check vertical
  count = 1
  for (let r = row - 1; r >= 0 && board[r][col] === player; r--) count++
  for (let r = row + 1; r < BOARD_SIZE && board[r][col] === player; r++) count++
  if (count >= 5) return true

  // Check left diagonal (top-left to bottom-right)
  count = 1
  for (let i = 1; row - i >= 0 && col - i >= 0 && board[row - i][col - i] === player; i++) count++
  for (let i = 1; row + i < BOARD_SIZE && col + i < BOARD_SIZE && board[row + i][col + i] === player; i++) count++
  if (count >= 5) return true

  return false
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npm run test:run -- src/game/gameLogic.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/game/gameLogic.ts src/game/gameLogic.test.ts
git commit -m "feat: add left diagonal win check

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 6: 编写右斜胜利判断测试

**Files:**
- Modify: `src/game/gameLogic.test.ts`

- [ ] **Step 1: 编写右斜五子连珠胜利测试（右斜 = row 和 col 反方向变化）**

```typescript
describe('checkWin - right diagonal', () => {
  it('should return true for 5 consecutive black pieces on right diagonal', () => {
    const board = createEmptyBoard()
    board[3][11] = 'black'
    board[4][10] = 'black'
    board[5][9] = 'black'
    board[6][8] = 'black'
    board[7][7] = 'black'
    expect(checkWin(board, 5, 9, 'black')).toBe(true)
  })

  it('should return false for less than 5 consecutive pieces on right diagonal', () => {
    const board = createEmptyBoard()
    board[3][11] = 'black'
    board[4][10] = 'black'
    board[5][9] = 'black'
    board[6][8] = 'black'
    expect(checkWin(board, 5, 9, 'black')).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npm run test:run -- src/game/gameLogic.test.ts`
Expected: FAIL (右斜检查未实现)

- [ ] **Step 3: 更新 checkWin 函数添加右斜检查**

```typescript
export function checkWin(board: Board, row: number, col: number, player: Player): boolean {
  // Check horizontal
  let count = 1
  for (let c = col - 1; c >= 0 && board[row][c] === player; c--) count++
  for (let c = col + 1; c < BOARD_SIZE && board[row][c] === player; c++) count++
  if (count >= 5) return true

  // Check vertical
  count = 1
  for (let r = row - 1; r >= 0 && board[r][col] === player; r--) count++
  for (let r = row + 1; r < BOARD_SIZE && board[r][col] === player; r++) count++
  if (count >= 5) return true

  // Check left diagonal
  count = 1
  for (let i = 1; row - i >= 0 && col - i >= 0 && board[row - i][col - i] === player; i++) count++
  for (let i = 1; row + i < BOARD_SIZE && col + i < BOARD_SIZE && board[row + i][col + i] === player; i++) count++
  if (count >= 5) return true

  // Check right diagonal (top-right to bottom-left)
  count = 1
  for (let i = 1; row - i >= 0 && col + i < BOARD_SIZE && board[row - i][col + i] === player; i++) count++
  for (let i = 1; row + i < BOARD_SIZE && col - i >= 0 && board[row + i][col - i] === player; i++) count++
  if (count >= 5) return true

  return false
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npm run test:run -- src/game/gameLogic.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/game/gameLogic.ts src/game/gameLogic.test.ts
git commit -m "feat: add right diagonal win check

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 7: 编写 gameReducer 测试

**Files:**
- Create: `src/game/gameReducer.ts`
- Modify: `src/game/gameLogic.test.ts`

- [ ] **Step 1: 编写 gameReducer 测试**

```typescript
import { describe, it, expect } from 'vitest'
import { createEmptyBoard, canPlacePiece, checkWin } from './gameLogic'
import { gameReducer, getInitialGameState } from './gameReducer'
import { GameAction } from './types'

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
```

- [ ] **Step 2: 运行测试验证失败**

Run: `npm run test:run -- src/game/gameLogic.test.ts`
Expected: FAIL with "gameReducer is not a function"

- [ ] **Step 3: 实现 gameReducer**

```typescript
import { GameState, GameAction, Player } from './types'
import { createEmptyBoard, canPlacePiece, checkWin } from './gameLogic'

export function getInitialGameState(): GameState {
  return {
    board: createEmptyBoard(),
    currentPlayer: 'black',
    status: 'playing',
    winner: null,
    lastMove: null,
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'RESET':
      return getInitialGameState()

    case 'MOVE': {
      if (state.status !== 'playing') {
        return state
      }
      const { row, col } = action
      if (!canPlacePiece(state.board, row, col)) {
        return state
      }
      const newBoard = state.board.map(r => [...r])
      newBoard[row][col] = state.currentPlayer
      const won = checkWin(newBoard, row, col, state.currentPlayer)
      return {
        ...state,
        board: newBoard,
        currentPlayer: won ? state.currentPlayer : (state.currentPlayer === 'black' ? 'white' : 'black') as Player,
        status: won ? 'won' : 'playing',
        winner: won ? state.currentPlayer : null,
        lastMove: { row, col },
      }
    }

    default:
      return state
  }
}
```

- [ ] **Step 4: 运行测试验证通过**

Run: `npm run test:run -- src/game/gameLogic.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/game/gameReducer.ts src/game/gameLogic.test.ts
git commit -m "feat: add gameReducer for state management

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 8: 创建 Cell 组件

**Files:**
- Create: `src/components/Cell.tsx`

- [ ] **Step 1: 创建 Cell 组件**

```tsx
import { Player } from '../game/types'

interface CellProps {
  piece: Player | null
  onClick: () => void
}

export function Cell({ piece, onClick }: CellProps) {
  return (
    <div
      className="cell"
      onClick={onClick}
      data-piece={piece}
    >
      {piece && <div className={`piece ${piece}`} />}
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/Cell.tsx
git commit -m "feat: create Cell component

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 9: 创建 Board 组件

**Files:**
- Create: `src/components/Board.tsx`

- [ ] **Step 1: 创建 Board 组件**

```tsx
import { Board } from '../game/types'
import { Cell } from './Cell'

interface BoardProps {
  board: Board
  onCellClick: (row: number, col: number) => void
}

export function Board({ board, onCellClick }: BoardProps) {
  return (
    <div className="board">
      {board.map((row, rowIndex) =>
        row.map((piece, colIndex) => (
          <Cell
            key={`${rowIndex}-${colIndex}`}
            piece={piece}
            onClick={() => onCellClick(rowIndex, colIndex)}
          />
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/Board.tsx
git commit -m "feat: create Board component

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 10: 创建 Status 组件

**Files:**
- Create: `src/components/Status.tsx`

- [ ] **Step 1: 创建 Status 组件**

```tsx
import { GameState } from '../game/types'

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
  return (
    <div className="status">
      {gameState.currentPlayer === 'black' ? '黑棋' : '白棋'} 回合
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/Status.tsx
git commit -m "feat: create Status component

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 11: 创建 Game 主容器组件

**Files:**
- Create: `src/components/Game.tsx`

- [ ] **Step 1: 创建 Game 组件**

```tsx
import { useReducer } from 'react'
import { gameReducer, getInitialGameState } from '../game/gameReducer'
import { Board } from './Board'
import { Status } from './Status'

export function Game() {
  const [state, dispatch] = useReducer(gameReducer, getInitialGameState())

  const handleCellClick = (row: number, col: number) => {
    dispatch({ type: 'MOVE', row, col })
  }

  const handleReset = () => {
    dispatch({ type: 'RESET' })
  }

  return (
    <div className="game">
      <h1>五子棋</h1>
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

- [ ] **Step 2: 提交**

```bash
git add src/components/Game.tsx
git commit -m "feat: create Game container component

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 12: 更新 App.tsx 和添加样式

**Files:**
- Modify: `src/App.tsx`
- Create: `src/App.css`

- [ ] **Step 1: 更新 App.tsx**

```tsx
import { Game } from './components/Game'
import './App.css'

function App() {
  return <Game />
}

export default App
```

- [ ] **Step 2: 创建 App.css 样式**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.game {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 20px;
}

.game h1 {
  color: #ffffff;
  font-size: 2rem;
  font-weight: 300;
  letter-spacing: 4px;
}

.status {
  color: #ffffff;
  font-size: 1.25rem;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

.status.won {
  font-weight: bold;
  background: rgba(255, 255, 255, 0.25);
}

.board {
  display: grid;
  grid-template-columns: repeat(15, 1fr);
  gap: 1px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  backdrop-filter: blur(10px);
}

.cell {
  width: 30px;
  height: 30px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.cell:hover {
  background: rgba(255, 255, 255, 0.15);
}

.piece {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  position: absolute;
}

.piece.black {
  background: #1a1a1a;
}

.piece.white {
  background: #ffffff;
}

.reset-button {
  margin-top: 10px;
  padding: 12px 32px;
  font-size: 1rem;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: all 0.2s;
}

.reset-button:hover {
  background: rgba(255, 255, 255, 0.3);
}
```

- [ ] **Step 3: 运行开发服务器验证 UI**

Run: `npm run dev`
Expected: 在浏览器看到 15×15 棋盘和交互

- [ ] **Step 4: 提交**

```bash
git add src/App.tsx src/App.css
git commit -m "feat: integrate App with Game component and add styles

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 13: 最终测试验证

**Files:**
- (运行测试)

- [ ] **Step 1: 运行完整测试套件**

Run: `npm run test:run`
Expected: All tests PASS

- [ ] **Step 2: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: 运行构建**

Run: `npm run build`
Expected: BUILD SUCCESS

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "feat: complete gomoku game v1.0

- 15x15 board with click to place pieces
- Black first, alternating turns
- Win detection for all 4 directions
- Block moves after win
- Reset game functionality

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## 自检清单

- [ ] **Spec 覆盖：** 每个设计需求都有对应任务实现
- [ ] **占位符扫描：** 无 "TBD"、"TODO"、未完成代码
- [ ] **类型一致性：** types.ts → gameLogic.ts → gameReducer.ts → components 类型匹配

---

## 运行方式

```bash
# 开发
npm run dev

# 测试
npm run test:run

# 构建
npm run build
```
