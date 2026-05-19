# Home Board Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the separate mode-selection homepage with a single first-screen Gomoku dashboard where the board, mode controls, status, and restart flow are visible together.

**Architecture:** Keep `Game` as the state coordinator and reuse the existing reducer, board, status, and AI flow. Convert `ModeSelect` from a full-screen entry page into a compact mode toolbar, then restyle the page around a centered board-first dashboard.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, CSS modules-by-convention through the existing global CSS files.

---

## File Structure

- Modify `src/components/Game.tsx`: remove the `gameStarted` gate, render the dashboard layout at all times, pass current settings into `ModeSelect`, and keep AI/move logic unchanged.
- Modify `src/components/ModeSelect.tsx`: change the component API to receive current mode/difficulty and render compact toolbar buttons with `aria-pressed`.
- Modify `src/components/Status.tsx`: replace mojibake copy with readable Chinese strings and keep the existing status branching.
- Modify `src/components/Cell.tsx`: add `role="button"` and `aria-label` so tests and assistive tech can identify board cells.
- Modify `src/App.css`: replace the full-screen stacked layout with the board-centered dashboard, toolbar, state panel, responsive board sizing, and button states.
- Modify `src/index.css`: tune global sizing, background, typography, and root layout for the dashboard.
- Delete or empty `src/components/ModeSelect.css`: the toolbar styles will live with the rest of the game surface in `App.css` because the mode selector is no longer a standalone page.
- Create `src/components/Game.test.tsx`: cover the user-facing dashboard flow.

## Task 1: Add Dashboard Behavior Tests

**Files:**
- Create: `src/components/Game.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/Game.test.tsx` with this content:

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Game } from './Game'

function getCells(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>('.cell'))
}

describe('Game dashboard', () => {
  it('shows the board, mode controls, and status on first render', () => {
    const { container } = render(<Game />)

    expect(screen.getByRole('heading', { name: '五子棋' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '双人对战' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'AI 简单' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'AI 中等' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'AI 困难' })).toBeInTheDocument()
    expect(screen.getByText('双人对战')).toBeInTheDocument()
    expect(screen.getByText('黑棋回合')).toBeInTheDocument()
    expect(getCells(container)).toHaveLength(225)
  })

  it('switches to AI medium without hiding the board', () => {
    const { container } = render(<Game />)

    fireEvent.click(screen.getByRole('button', { name: 'AI 中等' }))

    expect(screen.getByRole('button', { name: 'AI 中等' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('人机对战 · 中等')).toBeInTheDocument()
    expect(getCells(container)).toHaveLength(225)
  })

  it('resets the board when the player changes mode', () => {
    const { container } = render(<Game />)
    const cells = getCells(container)

    fireEvent.click(cells[0])
    expect(cells[0]).toHaveAttribute('data-piece', 'black')

    fireEvent.click(screen.getByRole('button', { name: 'AI 困难' }))

    expect(screen.getByText('人机对战 · 困难')).toBeInTheDocument()
    expect(cells[0]).toHaveAttribute('data-piece', '')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- --run src/components/Game.test.tsx
```

Expected: FAIL because `Game` still renders the full-screen `ModeSelect` before the board, `ModeSelect` does not expose `aria-pressed`, and `Cell` does not yet provide accessible labels.

- [ ] **Step 3: Commit the failing tests**

```bash
git add src/components/Game.test.tsx
git commit -m "test: cover board dashboard homepage"
```

## Task 2: Convert Mode Selection Into a Toolbar

**Files:**
- Modify: `src/components/ModeSelect.tsx`
- Modify: `src/components/Game.tsx`
- Modify: `src/components/Status.tsx`
- Modify: `src/components/Cell.tsx`

- [ ] **Step 1: Update `ModeSelect` props and markup**

Replace `src/components/ModeSelect.tsx` with:

```tsx
import type { GameMode, AIDifficulty } from '../game/types'

interface ModeSelectProps {
  mode: GameMode
  aiDifficulty: AIDifficulty
  onSelect: (mode: GameMode, aiDifficulty?: AIDifficulty) => void
}

const difficultyOptions: Array<{ difficulty: AIDifficulty; label: string }> = [
  { difficulty: 'easy', label: 'AI 简单' },
  { difficulty: 'medium', label: 'AI 中等' },
  { difficulty: 'hard', label: 'AI 困难' },
]

export function ModeSelect({ mode, aiDifficulty, onSelect }: ModeSelectProps) {
  return (
    <div className="mode-toolbar" aria-label="对局模式">
      <button
        type="button"
        className="mode-choice"
        aria-pressed={mode === 'pvp'}
        onClick={() => onSelect('pvp')}
      >
        双人对战
      </button>
      {difficultyOptions.map(option => (
        <button
          key={option.difficulty}
          type="button"
          className="mode-choice"
          aria-pressed={mode === 'ai' && aiDifficulty === option.difficulty}
          onClick={() => onSelect('ai', option.difficulty)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Update `Game` to render the dashboard immediately**

Replace `src/components/Game.tsx` with:

```tsx
import { useReducer, useEffect, useCallback } from 'react'
import { gameReducer, getInitialGameState } from '../game/gameReducer'
import { getAIMove } from '../game/ai'
import type { GameMode, AIDifficulty } from '../game/types'
import { Board } from './Board'
import { Status } from './Status'
import { ModeSelect } from './ModeSelect'

const AI_THINKING_DELAY = 400

const difficultyText: Record<AIDifficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}

export function Game() {
  const [state, dispatch] = useReducer(gameReducer, getInitialGameState())

  const handleModeSelect = useCallback((mode: GameMode, aiDifficulty?: AIDifficulty) => {
    dispatch({ type: 'SET_MODE', mode, aiDifficulty })
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

  const modeLabel = state.settings.mode === 'pvp'
    ? '双人对战'
    : `人机对战 · ${difficultyText[state.settings.aiDifficulty]}`

  return (
    <main className="game-shell">
      <section className="game-dashboard" aria-label="五子棋棋盘仪表盘">
        <header className="game-header">
          <div className="brand-block">
            <p className="eyebrow">Gomoku</p>
            <h1>五子棋</h1>
          </div>
          <ModeSelect
            mode={state.settings.mode}
            aiDifficulty={state.settings.aiDifficulty}
            onSelect={handleModeSelect}
          />
        </header>

        <div className="board-stage">
          <Board
            board={state.board}
            onCellClick={handleCellClick}
            lastMove={state.lastMove}
            winningCells={state.winningCells || []}
          />
        </div>

        <footer className="game-footer">
          <span className="mode-badge">{modeLabel}</span>
          <Status gameState={state} />
          {state.status !== 'playing' && (
            <button type="button" className="reset-button" onClick={handleReset}>
              重新开始
            </button>
          )}
        </footer>
      </section>
    </main>
  )
}
```

- [ ] **Step 3: Replace status copy**

Replace `src/components/Status.tsx` with:

```tsx
import type { GameState } from '../game/types'

interface StatusProps {
  gameState: GameState
}

export function Status({ gameState }: StatusProps) {
  if (gameState.status === 'won') {
    return (
      <div className="status won">
        {gameState.winner === 'black' ? '黑棋' : '白棋'}获胜!
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
  const playerText = isAITurn
    ? '白棋 (AI)'
    : gameState.currentPlayer === 'black'
      ? '黑棋'
      : '白棋'

  return <div className="status">{playerText}回合</div>
}
```

- [ ] **Step 4: Add accessible cell metadata**

Replace `src/components/Cell.tsx` with:

```tsx
import type { Player } from '../game/types'

interface CellProps {
  piece: Player | null
  onClick: () => void
  className?: string
}

const pieceLabel: Record<Player, string> = {
  black: '黑棋',
  white: '白棋',
}

export function Cell({ piece, onClick, className = '' }: CellProps) {
  return (
    <div
      className={`cell ${className}`.trim()}
      onClick={onClick}
      role="button"
      aria-label={piece ? pieceLabel[piece] : '空位'}
      data-piece={piece ?? ''}
    >
      {piece && <div className={`piece ${piece}`} />}
    </div>
  )
}
```

- [ ] **Step 5: Run dashboard tests**

Run:

```bash
npm test -- --run src/components/Game.test.tsx
```

Expected: PASS. The tests should now find the board, toolbar buttons, selected mode state, and reset-on-mode-change behavior.

- [ ] **Step 6: Commit behavior changes**

```bash
git add src/components/Game.tsx src/components/ModeSelect.tsx src/components/Status.tsx src/components/Cell.tsx
git commit -m "feat: show board dashboard on homepage"
```

## Task 3: Restyle the Dashboard

**Files:**
- Modify: `src/App.css`
- Modify: `src/index.css`
- Modify: `src/components/ModeSelect.css`

- [ ] **Step 1: Replace global layout styles**

Replace `src/index.css` with:

```css
:root {
  --bg-deep: #17130f;
  --bg-table: #211812;
  --panel: rgba(44, 24, 16, 0.72);
  --panel-soft: rgba(232, 220, 200, 0.08);
  --board-wood: #2c1810;
  --piece-black: #1a1a1a;
  --piece-white: #f5f1e8;
  --accent-gold: #c9a86c;
  --accent-gold-bright: #f3cf79;
  --text-cream: #e8dcc8;
  --hover-hint: rgba(201, 168, 108, 0.28);
  --last-move-glow: rgba(201, 168, 108, 0.5);
  --ai-thinking-glow: rgba(243, 207, 121, 0.4);
  --win-line: #f3cf79;
  --text-primary: var(--text-cream);
  --text-secondary: rgba(232, 220, 200, 0.72);
  --text-muted: rgba(232, 220, 200, 0.52);
  --sans: "Microsoft YaHei", "PingFang SC", "Noto Sans SC", system-ui, sans-serif;
  --heading: "Microsoft YaHei", "PingFang SC", "Noto Sans SC", system-ui, sans-serif;

  font: 16px/1.5 var(--sans);
  color-scheme: dark;
  color: var(--text-primary);
  background: var(--bg-deep);
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  min-width: 320px;
  min-height: 100vh;
  background:
    radial-gradient(circle at 50% 0%, rgba(201, 168, 108, 0.12), transparent 34rem),
    linear-gradient(145deg, #120f0c 0%, var(--bg-deep) 45%, #201711 100%);
  font-family: var(--sans);
}

button {
  font: inherit;
}

#root {
  min-height: 100svh;
}

h1,
h2 {
  font-family: var(--heading);
  color: var(--text-primary);
}
```

- [ ] **Step 2: Replace game dashboard styles**

Replace `src/App.css` with the dashboard, board, status, responsive, and animation styles from the design:

```css
.game-shell {
  min-height: 100svh;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: clamp(16px, 3vw, 40px);
}

.game-dashboard {
  width: min(100%, 980px);
  display: grid;
  gap: clamp(16px, 2.4vw, 26px);
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
  padding: 14px;
  border: 1px solid rgba(201, 168, 108, 0.22);
  border-radius: 8px;
  background: rgba(23, 19, 15, 0.72);
  box-shadow: 0 18px 52px rgba(0, 0, 0, 0.22);
}

.brand-block {
  text-align: left;
  min-width: max-content;
}

.eyebrow {
  color: var(--accent-gold);
  font-size: 0.75rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.game-header h1 {
  font-size: clamp(1.85rem, 4vw, 3rem);
  line-height: 1;
  letter-spacing: 0;
  margin-top: 4px;
}

.mode-toolbar {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
}

.mode-choice {
  min-height: 38px;
  padding: 0 14px;
  color: var(--text-secondary);
  background: rgba(232, 220, 200, 0.07);
  border: 1px solid rgba(201, 168, 108, 0.28);
  border-radius: 7px;
  cursor: pointer;
  transition: transform 160ms ease, border-color 160ms ease, background 160ms ease, color 160ms ease;
}

.mode-choice:hover {
  transform: translateY(-1px);
  color: var(--text-primary);
  border-color: rgba(201, 168, 108, 0.55);
  background: rgba(201, 168, 108, 0.14);
}

.mode-choice[aria-pressed="true"] {
  color: #1a1510;
  background: var(--accent-gold);
  border-color: var(--accent-gold-bright);
  box-shadow: 0 8px 22px rgba(201, 168, 108, 0.18);
}

.board-stage {
  display: flex;
  justify-content: center;
  align-items: center;
}

.board {
  --cell-size: clamp(19px, 5.4vw, 36px);
  display: grid;
  grid-template-columns: repeat(15, var(--cell-size));
  gap: 0;
  padding: clamp(10px, 2.4vw, 16px);
  background:
    linear-gradient(90deg, transparent 0%, rgba(0, 0, 0, 0.04) 50%, transparent 100%),
    linear-gradient(180deg, rgba(0, 0, 0, 0.06) 0%, transparent 30%, transparent 70%, rgba(0, 0, 0, 0.06) 100%),
    var(--board-wood);
  background-size: 60px 100%, 100% 80px, 100% 100%;
  border: 1px solid rgba(201, 168, 108, 0.24);
  border-radius: 6px;
  box-shadow:
    0 22px 70px rgba(0, 0, 0, 0.46),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.cell {
  width: var(--cell-size);
  height: var(--cell-size);
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

.board > .cell:nth-child(15n) {
  border-right: none;
}

.piece {
  width: calc(var(--cell-size) * 0.78);
  height: calc(var(--cell-size) * 0.78);
  border-radius: 50%;
  position: absolute;
  transition: transform 0.15s ease;
  animation: pieceDrop 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.piece.black {
  background: var(--piece-black);
  box-shadow:
    inset 2px 2px 4px rgba(255, 255, 255, 0.1),
    inset -2px -2px 4px rgba(0, 0, 0, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.3);
}

.piece.white {
  background: var(--piece-white);
  box-shadow:
    inset 2px 2px 4px rgba(255, 255, 255, 0.8),
    inset -2px -2px 4px rgba(0, 0, 0, 0.1),
    0 2px 4px rgba(0, 0, 0, 0.2);
}

.game-footer {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px;
  border: 1px solid rgba(201, 168, 108, 0.18);
  border-radius: 8px;
  background: rgba(23, 19, 15, 0.58);
}

.mode-badge,
.status {
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  color: var(--text-secondary);
  background: rgba(44, 24, 16, 0.72);
  border: 1px solid rgba(201, 168, 108, 0.22);
  border-radius: 7px;
  backdrop-filter: blur(8px);
}

.status.won {
  font-weight: 700;
  color: var(--accent-gold-bright);
  text-shadow: 0 0 12px rgba(201, 168, 108, 0.38);
  border-color: rgba(243, 207, 121, 0.66);
}

.status.ai-thinking {
  gap: 0.3rem;
  color: var(--accent-gold-bright);
}

.thinking-dots {
  animation: pulse 1.5s infinite;
}

.reset-button {
  min-height: 38px;
  padding: 0 20px;
  color: #1a1510;
  background: var(--accent-gold);
  border: 1px solid var(--accent-gold-bright);
  border-radius: 7px;
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease;
  animation: fadeSlideUp 300ms ease-out;
}

.reset-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(201, 168, 108, 0.22);
}

@media (max-width: 720px) {
  .game-shell {
    align-items: flex-start;
  }

  .game-header {
    flex-direction: column;
    align-items: stretch;
  }

  .brand-block {
    text-align: center;
  }

  .mode-toolbar {
    justify-content: center;
  }
}

@media (max-width: 420px) {
  .mode-choice {
    flex: 1 1 calc(50% - 8px);
    padding-inline: 8px;
  }
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

@keyframes lastMoveGlow {
  0%, 100% {
    box-shadow:
      inset 2px 2px 4px rgba(255, 255, 255, 0.1),
      inset -2px -2px 4px rgba(0, 0, 0, 0.3),
      0 0 0 3px rgba(201, 168, 108, 0.3);
  }
  50% {
    box-shadow:
      inset 2px 2px 4px rgba(255, 255, 255, 0.1),
      inset -2px -2px 4px rgba(0, 0, 0, 0.3),
      0 0 0 5px rgba(201, 168, 108, 0.6);
  }
}

.cell.last-move .piece {
  animation: lastMoveGlow 1.5s ease-in-out infinite, pieceDrop 400ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes aiThinking {
  0%, 100% {
    box-shadow:
      inset 2px 2px 4px rgba(255, 255, 255, 0.1),
      inset -2px -2px 4px rgba(0, 0, 0, 0.3),
      0 0 10px rgba(243, 207, 121, 0.2);
  }
  50% {
    box-shadow:
      inset 2px 2px 4px rgba(255, 255, 255, 0.1),
      inset -2px -2px 4px rgba(0, 0, 0, 0.3),
      0 0 20px rgba(243, 207, 121, 0.48);
  }
}

.cell.ai-thinking .piece {
  animation: aiThinking 1.2s ease-in-out infinite;
}

@keyframes winPulse {
  0%, 100% {
    box-shadow:
      inset 2px 2px 4px rgba(255, 255, 255, 0.1),
      inset -2px -2px 4px rgba(0, 0, 0, 0.3),
      0 0 8px rgba(243, 207, 121, 0.78);
  }
  50% {
    box-shadow:
      inset 2px 2px 4px rgba(255, 255, 255, 0.1),
      inset -2px -2px 4px rgba(0, 0, 0, 0.3),
      0 0 16px rgba(243, 207, 121, 1);
  }
}

.cell.winning .piece {
  animation: winPulse 0.8s ease-in-out infinite;
}
```

- [ ] **Step 3: Remove obsolete mode page styles**

Replace `src/components/ModeSelect.css` with:

```css
/* Mode selector styles live in src/App.css because it is now part of the dashboard surface. */
```

- [ ] **Step 4: Run tests and build**

Run:

```bash
npm test -- --run
npm run build
```

Expected: both commands PASS.

- [ ] **Step 5: Commit style changes**

```bash
git add src/App.css src/index.css src/components/ModeSelect.css
git commit -m "style: polish board dashboard layout"
```

## Task 4: Browser Verification and Final Polish

**Files:**
- Modify only files touched in Tasks 2-3 if browser verification reveals layout defects.

- [ ] **Step 1: Start the dev server**

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Expected: Vite prints a local URL, usually `http://127.0.0.1:5173/`.

- [ ] **Step 2: Verify desktop layout in browser**

Open the local URL at a desktop viewport around `1280x800`.

Expected:
- Header, mode toolbar, board, mode badge, and status are visible in the first viewport.
- Board is centered and visually dominant.
- Mode toolbar buttons do not wrap on desktop.
- No text overlaps or spills out of buttons.

- [ ] **Step 3: Verify mobile layout in browser**

Set viewport around `390x844`.

Expected:
- Header stacks cleanly.
- Mode buttons wrap into two rows without clipping text.
- Board fits horizontally with no page-level horizontal scroll.
- Status and mode badge remain readable below the board.

- [ ] **Step 4: Verify key interactions**

In the browser:
- Click one empty cell. Expected: a black piece appears and the status changes to white turn in PVP mode.
- Click `AI 中等`. Expected: board clears, mode badge reads `人机对战 · 中等`, and black can move first.
- Click a cell in AI mode. Expected: black piece appears, AI thinking status appears briefly, then white AI move appears.

- [ ] **Step 5: Apply focused CSS fixes if needed**

If text clips on mobile mode buttons, adjust only `.mode-choice` and the mobile media query. Use this patch shape:

```css
@media (max-width: 420px) {
  .mode-choice {
    flex: 1 1 calc(50% - 8px);
    min-width: 0;
    padding-inline: 6px;
    font-size: 0.92rem;
  }
}
```

If the board overflows on very narrow screens, adjust only the board variable:

```css
.board {
  --cell-size: clamp(17px, 5.25vw, 36px);
}
```

- [ ] **Step 6: Run final verification**

Run:

```bash
npm test -- --run
npm run build
```

Expected: both commands PASS.

- [ ] **Step 7: Commit final polish if files changed**

If Step 5 changed files:

```bash
git add src/App.css src/index.css
git commit -m "fix: refine responsive dashboard layout"
```

If Step 5 did not change files, do not create an empty commit.

## Self-Review

- Spec coverage: Tasks 1-4 cover simultaneous board/homepage rendering, compact mode selection, current mode state, mode-change reset, status copy, responsive layout, browser verification, tests, and build.
- Deferred-work scan: This plan contains no deferred work markers; every implementation step lists exact files, code, commands, and expected outcomes.
- Type consistency: `GameMode`, `AIDifficulty`, `mode`, `aiDifficulty`, `SET_MODE`, and `data-piece` match the existing reducer and component contracts.
