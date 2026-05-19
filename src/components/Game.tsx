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
    ? '双人'
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
