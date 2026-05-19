# 五子棋 UI 界面布局优化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将五子棋游戏界面优化为深色檀木经典风格，实现极简留白布局和完整动效

**Architecture:** 通过更新 CSS 变量系统重塑色彩体系，修改布局结构实现极简留白，添加 CSS 动画实现完整动效

**Tech Stack:** React, CSS3 (CSS Variables, Animations, Flexbox)

---

## 文件结构映射

| 文件 | 职责 |
|------|------|
| `src/index.css` | 全局 CSS 变量定义、背景色、字体 |
| `src/App.css` | 主容器布局、标题样式 |
| `src/components/Game.tsx` | 游戏容器结构（无样式变更） |
| `src/components/Board.tsx` | 棋盘组件（木纹纹理） |
| `src/components/Cell.tsx` | 棋子单元格（阴影效果） |
| `src/components/Status.tsx` | 状态显示（样式调整） |
| `src/components/ModeSelect.tsx` | 模式选择（样式调整） |
| `src/components/ModeSelect.css` | 模式选择样式（金色边框按钮） |

---

## Task 1: 更新全局样式 (index.css)

**Files:**
- Modify: `src/index.css:1-68`

- [ ] **Step 1: 备份并重写 index.css 的 :root 变量**

打开 `src/index.css`，将整个 `:root` 区块替换为：

```css
:root {
  /* 主色 - 深色檀木 */
  --bg-deep: #1A1510;
  --board-wood: #2C1810;
  --piece-black: #1A1A1A;
  --piece-white: #F5F5F5;
  --accent-gold: #C9A86C;
  --accent-gold-bright: #FFD700;
  --text-cream: #E8DCC8;

  /* 辅助色 */
  --hover-hint: rgba(201, 168, 108, 0.3);
  --last-move-glow: rgba(201, 168, 108, 0.5);
  --ai-thinking-glow: rgba(255, 215, 0, 0.4);
  --win-line: #FFD700;

  /* 文字 */
  --text-primary: var(--text-cream);
  --text-secondary: rgba(232, 220, 200, 0.7);
  --text-muted: rgba(232, 220, 200, 0.5);

  /* 字体 */
  --sans: system-ui, 'Segoe UI', Roboto, sans-serif;
  --heading: system-ui, 'Segoe UI', Roboto, sans-serif;
  --mono: ui-monospace, Consolas, monospace;

  font: 18px/145% var(--sans);
  letter-spacing: 0.18px;
  color-scheme: dark;
  color: var(--text-primary);
  background: var(--bg-deep);
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

@media (prefers-color-scheme: light) {
  :root {
    color-scheme: dark;
  }
}

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
  background: var(--bg-deep);
  font-family: var(--sans);
}

#root {
  width: 1126px;
  max-width: 100%;
  margin: 0 auto;
  text-align: center;
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: 60px 20px;
}

h1, h2 {
  font-family: var(--heading);
  font-weight: 500;
  color: var(--text-primary);
}

h1 {
  font-size: 56px;
  letter-spacing: 8px;
  margin: 0 0 40px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

h2 {
  font-size: 24px;
  line-height: 118%;
  letter-spacing: -0.24px;
  margin: 0 0 8px;
}

p {
  margin: 0;
}
```

- [ ] **Step 2: 运行测试验证无回归**

```bash
npm test
```

Expected: 所有 24 个测试通过

- [ ] **Step 3: 提交变更**

```bash
git add src/index.css
git commit -m "style: 更新全局样式为深色檀木主题

- 添加 CSS 变量系统
- 深色背景 #1A1510
- 金色强调色 #C9A86C
- 米白文字 #E8DCC8

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: 更新 App.css 容器布局

**Files:**
- Modify: `src/App.css:1-118` (全部替换)

- [ ] **Step 1: 替换 App.css 全部内容**

将 `src/App.css` 全部内容替换为：

```css
.game {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 20px;
}

.game h1 {
  color: var(--text-primary);
  font-size: 2rem;
  font-weight: 300;
  letter-spacing: 4px;
  margin: 0;
}

.status {
  color: var(--text-secondary);
  font-size: 1.1rem;
  padding: 12px 24px;
  border-radius: 8px;
  background: rgba(44, 24, 16, 0.6);
  border: 1px solid rgba(201, 168, 108, 0.2);
  backdrop-filter: blur(8px);
  transition: all 0.3s ease;
}

.status.won {
  font-weight: bold;
  color: var(--accent-gold);
  text-shadow: 0 0 12px rgba(201, 168, 108, 0.4);
  border-color: var(--accent-gold);
}

.board {
  display: grid;
  grid-template-columns: repeat(15, 36px);
  gap: 0;
  padding: 16px;
  background:
    linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.03) 50%, transparent 100%),
    linear-gradient(180deg, rgba(0,0,0,0.05) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.05) 100%),
    var(--board-wood);
  background-size: 60px 100%, 100% 80px, 100% 100%;
  border-radius: 4px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.cell {
  width: 36px;
  height: 36px;
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.25);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: background 0.15s ease;
}

.cell:hover {
  background: var(--hover-hint);
}

.cell:last-child {
  border-right: none;
}

.board > .cell:nth-child(15n) {
  border-right: none;
}

.piece {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  position: absolute;
  transition: transform 0.15s ease;
}

.piece.black {
  background: var(--piece-black);
  box-shadow:
    inset 2px 2px 4px rgba(255,255,255,0.1),
    inset -2px -2px 4px rgba(0,0,0,0.3),
    0 2px 4px rgba(0,0,0,0.3);
}

.piece.white {
  background: var(--piece-white);
  box-shadow:
    inset 2px 2px 4px rgba(255,255,255,0.8),
    inset -2px -2px 4px rgba(0,0,0,0.1),
    0 2px 4px rgba(0,0,0,0.2);
}

.reset-button {
  margin-top: 10px;
  padding: 14px 36px;
  font-size: 1rem;
  color: var(--text-primary);
  background: rgba(44, 24, 16, 0.8);
  border: 1px solid var(--accent-gold);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  animation: fadeSlideUp 300ms ease-out;
}

.reset-button:hover {
  background: rgba(44, 24, 16, 1);
  border-color: var(--accent-gold-bright);
  box-shadow: 0 0 16px rgba(201, 168, 108, 0.3);
}

.status.ai-thinking {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--accent-gold-bright);
}

.thinking-dots {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.mode-badge {
  display: inline-block;
  padding: 0.4rem 1rem;
  font-size: 0.9rem;
  background: rgba(44, 24, 16, 0.6);
  border: 1px solid rgba(201, 168, 108, 0.3);
  border-radius: 20px;
  color: var(--text-secondary);
  backdrop-filter: blur(8px);
}

.game-info {
  margin-bottom: 0.5rem;
}

/* 响应式 */
@media (max-width: 600px) {
  .board {
    grid-template-columns: repeat(15, calc((100vw - 72px) / 15));
  }

  .cell {
    width: calc((100vw - 72px) / 15);
    height: calc((100vw - 72px) / 15);
  }

  .piece {
    width: calc((100vw - 72px) / 15 * 0.78);
    height: calc((100vw - 72px) / 15 * 0.78);
  }

  h1 {
    font-size: 1.5rem;
    letter-spacing: 2px;
  }
}

@media (max-width: 900px) {
  #root {
    padding: 40px 16px;
  }

  h1 {
    font-size: 1.75rem;
  }
}
```

- [ ] **Step 2: 运行测试验证**

```bash
npm test
```

Expected: 所有 24 个测试通过

- [ ] **Step 3: 提交变更**

```bash
git add src/App.css
git commit -m "style: 更新 App.css 为深色檀木棋盘布局

- 木质棋盘背景带纹理
- 棋子带内阴影立体感
- 金色边框按钮样式
- 响应式布局支持

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: 更新 ModeSelect.css

**Files:**
- Modify: `src/components/ModeSelect.css:1-77` (全部替换)

- [ ] **Step 1: 替换 ModeSelect.css 全部内容**

将 `src/components/ModeSelect.css` 全部内容替换为：

```css
.mode-select {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 2.5rem;
}

.mode-select h1 {
  font-size: 3rem;
  color: var(--text-primary);
  letter-spacing: 8px;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
  margin: 0;
}

.mode-buttons {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  align-items: center;
}

.mode-button {
  padding: 1.2rem 4rem;
  font-size: 1.2rem;
  border: 1px solid rgba(201, 168, 108, 0.4);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s ease;
  background: rgba(44, 24, 16, 0.7);
  color: var(--text-primary);
  backdrop-filter: blur(10px);
  min-width: 240px;
}

.mode-button:hover {
  transform: translateY(-2px);
  background: rgba(44, 24, 16, 0.9);
  border-color: var(--accent-gold);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 20px rgba(201, 168, 108, 0.15);
}

.mode-button.pvp {
  background: rgba(44, 24, 16, 0.85);
}

.ai-modes {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.ai-label {
  color: var(--text-secondary);
  font-size: 0.95rem;
  letter-spacing: 1px;
}

.ai-difficulty-buttons {
  display: flex;
  gap: 0.75rem;
}

.ai-difficulty-buttons button {
  padding: 0.6rem 1.8rem;
  font-size: 1rem;
  border: 1px solid rgba(201, 168, 108, 0.3);
  border-radius: 6px;
  cursor: pointer;
  background: rgba(44, 24, 16, 0.6);
  color: var(--text-secondary);
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
}

.ai-difficulty-buttons button:hover {
  background: rgba(44, 24, 16, 0.8);
  border-color: var(--accent-gold);
  color: var(--text-primary);
}

.ai-difficulty-buttons button.primary {
  background: rgba(44, 24, 16, 0.85);
  border-color: var(--accent-gold);
  color: var(--accent-gold);
}

.ai-difficulty-buttons button.primary:hover {
  background: rgba(44, 24, 16, 1);
  box-shadow: 0 0 16px rgba(201, 168, 108, 0.2);
}

@media (max-width: 600px) {
  .mode-select h1 {
    font-size: 2rem;
    letter-spacing: 4px;
  }

  .mode-button {
    padding: 1rem 2.5rem;
    font-size: 1rem;
    min-width: 200px;
  }
}
```

- [ ] **Step 2: 运行测试验证**

```bash
npm test
```

Expected: 所有 24 个测试通过

- [ ] **Step 3: 提交变更**

```bash
git add src/components/ModeSelect.css
git commit -m "style: 更新 ModeSelect 样式为金色边框主题

- 半透明深色按钮背景
- 金色边框悬停效果
- 统一深色檀木配色

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: 添加动效关键帧

**Files:**
- Modify: `src/App.css` (在文件末尾添加动画)

- [ ] **Step 1: 在 App.css 末尾添加棋子落下和胜利动画**

在 `src/App.css` 末尾添加：

```css
/* ========== 动效关键帧 ========== */

/* 棋子落下弹跳动画 */
@keyframes pieceDrop {
  0% {
    transform: scale(0.5);
    opacity: 0;
  }
  60% {
    transform: scale(1.1);
  }
  80% {
    transform: scale(0.95);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.piece {
  animation: pieceDrop 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 最后落子金色光晕 */
@keyframes lastMoveGlow {
  0%, 100% {
    box-shadow:
      inset 2px 2px 4px rgba(255,255,255,0.1),
      inset -2px -2px 4px rgba(0,0,0,0.3),
      0 0 0 3px rgba(201, 168, 108, 0.3);
  }
  50% {
    box-shadow:
      inset 2px 2px 4px rgba(255,255,255,0.1),
      inset -2px -2px 4px rgba(0,0,0,0.3),
      0 0 0 5px rgba(201, 168, 108, 0.6);
  }
}

.cell.last-move .piece {
  animation: lastMoveGlow 1.5s ease-in-out infinite, pieceDrop 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* AI 思考光晕 */
@keyframes aiThinking {
  0%, 100% {
    box-shadow:
      inset 2px 2px 4px rgba(255,255,255,0.1),
      inset -2px -2px 4px rgba(0,0,0,0.3),
      0 0 10px rgba(255, 215, 0, 0.2);
  }
  50% {
    box-shadow:
      inset 2px 2px 4px rgba(255,255,255,0.1),
      inset -2px -2px 4px rgba(0,0,0,0.3),
      0 0 20px rgba(255, 215, 0, 0.5);
  }
}

.cell.ai-thinking .piece {
  animation: aiThinking 1.2s ease-in-out infinite;
}

/* 胜利连线闪烁 */
@keyframes winPulse {
  0%, 100% {
    box-shadow:
      inset 2px 2px 4px rgba(255,255,255,0.1),
      inset -2px -2px 4px rgba(0,0,0,0.3),
      0 0 8px rgba(255, 215, 0, 0.8);
  }
  50% {
    box-shadow:
      inset 2px 2px 4px rgba(255,255,255,0.1),
      inset -2px -2px 4px rgba(0,0,0,0.3),
      0 0 16px rgba(255, 215, 0, 1);
  }
}

.cell.winning .piece {
  animation: winPulse 0.8s ease-in-out infinite;
}
```

- [ ] **Step 2: 运行测试验证**

```bash
npm test
```

Expected: 所有 24 个测试通过

- [ ] **Step 3: 提交变更**

```bash
git add src/App.css
git commit -m "style: 添加棋子动效关键帧

- 棋子落下弹跳 (pieceDrop)
- 最后落子金色光晕 (lastMoveGlow)
- AI 思考呼吸光晕 (aiThinking)
- 胜利连线闪烁 (winPulse)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: 更新 Cell 组件支持动效类名

**Files:**
- Modify: `src/components/Cell.tsx:1-18`

- [ ] **Step 1: 更新 Cell 组件支持 className prop**

将 `src/components/Cell.tsx` 替换为：

```tsx
import type { Player } from '../game/types'

interface CellProps {
  piece: Player | null
  onClick: () => void
  className?: string
}

export function Cell({ piece, onClick, className = '' }: CellProps) {
  return (
    <div
      className={`cell ${className}`.trim()}
      onClick={onClick}
      data-piece={piece}
    >
      {piece && <div className={`piece ${piece}`} />}
    </div>
  )
}
```

- [ ] **Step 2: 运行测试验证**

```bash
npm test
```

Expected: 所有 24 个测试通过

- [ ] **Step 3: 提交变更**

```bash
git add src/components/Cell.tsx
git commit -m "feat: Cell 组件支持 className prop

用于动态添加动效类名（last-move, ai-thinking, winning）

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: 更新 Board 组件传递动效类名

**Files:**
- Modify: `src/components/Board.tsx:1-23`

- [ ] **Step 1: 更新 Board 组件传递 lastMove 位置**

将 `src/components/Board.tsx` 替换为：

```tsx
import type { Board, Player } from '../game/types'
import { Cell } from './Cell'

interface BoardProps {
  board: Board
  onCellClick: (row: number, col: number) => void
  lastMove?: { row: number; col: number } | null
  winningCells?: Array<{ row: number; col: number }>
}

export function Board({ board, onCellClick, lastMove, winningCells = [] }: BoardProps) {
  const isWinningCell = (row: number, col: number) => {
    return winningCells.some(cell => cell.row === row && cell.col === col)
  }

  const getCellClassName = (row: number, col: number) => {
    const classes: string[] = []
    if (lastMove && lastMove.row === row && lastMove.col === col) {
      classes.push('last-move')
    }
    if (isWinningCell(row, col)) {
      classes.push('winning')
    }
    return classes.join(' ')
  }

  return (
    <div className="board">
      {board.map((row, rowIndex) =>
        row.map((piece, colIndex) => (
          <Cell
            key={`${rowIndex}-${colIndex}`}
            piece={piece}
            onClick={() => onCellClick(rowIndex, colIndex)}
            className={getCellClassName(rowIndex, colIndex)}
          />
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 2: 运行测试验证**

```bash
npm test
```

Expected: 所有 24 个测试通过

- [ ] **Step 3: 提交变更**

```bash
git add src/components/Board.tsx
git commit -m "feat: Board 组件支持 lastMove 和 winningCells

- 支持最后落子光晕
- 支持胜利连线高亮

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: 更新 Game 组件传递动效数据

**Files:**
- Modify: `src/components/Game.tsx:1-77`

- [ ] **Step 1: 更新 Game 组件传递 lastMove 和 winningCells**

将 `src/components/Game.tsx` 替换为：

```tsx
import { useReducer, useEffect, useCallback, useState } from 'react'
import { gameReducer, getInitialGameState } from '../game/gameReducer'
import { getAIMove } from '../game/ai'
import type { GameMode, AIDifficulty, Player } from '../game/types'
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
      <Board
        board={state.board}
        onCellClick={handleCellClick}
        lastMove={state.lastMove}
        winningCells={state.winningCells || []}
      />
      {state.status !== 'playing' && (
        <button className="reset-button" onClick={handleReset}>
          重新开始
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 检查 gameReducer 是否支持 lastMove 和 winningCells**

查看 `src/game/gameReducer.ts` 确认是否有 `lastMove` 和 `winningCells` 状态，如果没有需要添加

```bash
grep -n "lastMove\|winningCells" src/game/gameReducer.ts
```

如果不存在，需要在 `gameReducer.ts` 中添加这两个状态

- [ ] **Step 3: 运行测试验证**

```bash
npm test
```

Expected: 所有 24 个测试通过

- [ ] **Step 4: 提交变更**

```bash
git add src/components/Game.tsx
git commit -m "feat: Game 组件传递 lastMove 和 winningCells

用于棋盘动效显示

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: 更新 gameReducer 添加 lastMove 和 winningCells

**Files:**
- Modify: `src/game/gameReducer.ts`
- Modify: `src/game/types.ts`

- [ ] **Step 1: 在 types.ts 中添加相关类型**

在 `src/game/types.ts` 的 `GameState` 接口中添加：

```typescript
interface GameState {
  board: Board
  currentPlayer: Player
  status: 'idle' | 'playing' | 'won' | 'draw'
  winner: Player | null
  settings: GameSettings
  isAIThinking: boolean
  lastMove: { row: number; col: number } | null
  winningCells: Array<{ row: number; col: number }>
}
```

- [ ] **Step 2: 更新 gameReducer.ts 处理 lastMove 和 winningCells**

在 `getInitialGameState` 中初始化：
```typescript
lastMove: null,
winningCells: [],
```

在 `MOVE` 和 `AI_MOVE` 的 reducer 中，更新 `lastMove`:
```typescript
lastMove: { row, col },
```

在判断胜利时，计算并设置 `winningCells`

- [ ] **Step 3: 运行测试验证**

```bash
npm test
```

Expected: 所有 24 个测试通过

- [ ] **Step 4: 提交变更**

```bash
git add src/game/types.ts src/game/gameReducer.ts
git commit -m "feat: 添加 lastMove 和 winningCells 状态

用于棋盘动效显示最后落子和胜利连线

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 9: 最终验证

- [ ] **Step 1: 运行完整测试**

```bash
npm test
```

Expected: 所有测试通过

- [ ] **Step 2: 启动开发服务器目视检查**

```bash
npm run dev
```

检查项：
- [ ] 深色檀木背景正确显示
- [ ] 棋盘有木质纹理效果
- [ ] 棋子有立体阴影
- [ ] 布局居中，四周有留白
- [ ] 响应式布局正常

- [ ] **Step 3: 提交最终变更**

```bash
git add -A
git commit -m "style: 完成 UI 界面布局优化

深色檀木主题:
- 全局深色背景 #1A1510
- 棋盘木质纹理 #2C1810
- 金色强调色 #C9A86C
- 棋子立体阴影效果

动效:
- 棋子落下弹跳
- 最后落子金色光晕
- AI 思考呼吸动画
- 胜利连线闪烁

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## 验收标准检查

- [ ] 深色檀木主题正确应用
- [ ] 棋盘居中，四周有足够留白
- [ ] 棋子有正确的阴影效果
- [ ] 棋子落下有弹跳动画
- [ ] 最后落子有金色光晕提示
- [ ] AI 思考有呼吸动画
- [ ] 胜利时连线有金色闪烁
- [ ] 响应式布局正常工作
- [ ] 所有测试通过
