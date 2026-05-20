// src/components/Game.tsx
import { useReducer, useEffect, useCallback, useRef } from 'react'
import { gameReducer, getInitialGameState } from '../game/gameReducer'
import { getAIMove } from '../game/ai'
import type { GameMode, AIDifficulty } from '../game/types'
import { Board } from './Board'
import { Status } from './Status'
import { ModeSelect } from './ModeSelect'
import { AudioPanel } from './AudioPanel'
import { useAudio } from '../audio/useAudio'

const AI_THINKING_DELAY = 400

const difficultyText: Record<AIDifficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}

export function Game() {
  const [state, dispatch] = useReducer(gameReducer, getInitialGameState())
  const audio = useAudio()
  const prevStatusRef = useRef(state.status)
  const prevAIThinkingRef = useRef(state.isAIThinking)

  const handleModeSelect = useCallback((mode: GameMode, aiDifficulty?: AIDifficulty) => {
    dispatch({ type: 'SET_MODE', mode, aiDifficulty })
    audio.playSFX('click')
  }, [audio])

  const handleCellClick = useCallback((row: number, col: number) => {
    if (state.status !== 'playing') return
    if (state.isAIThinking) return
    if (state.settings.mode === 'ai' && state.currentPlayer !== 'black') return

    dispatch({ type: 'MOVE', row, col })
    audio.playSFX('move')
  }, [state.status, state.isAIThinking, state.settings.mode, state.currentPlayer, audio])

  useEffect(() => {
    if (state.status !== 'playing') return
    if (state.settings.mode !== 'ai') return
    if (state.currentPlayer !== 'white') return
    if (state.isAIThinking) return

    dispatch({ type: 'SET_AI_THINKING', isThinking: true })
  }, [state.status, state.settings.mode, state.currentPlayer, state.isAIThinking])

  useEffect(() => {
    if (state.status !== 'playing') return
    if (state.settings.mode !== 'ai') return
    if (state.currentPlayer !== 'white') return
    if (!state.isAIThinking) return

    const timeoutId = setTimeout(() => {
      const decision = getAIMove(state.board, 'white', state.settings.aiDifficulty)
      if (decision) {
        dispatch({ type: 'AI_MOVE', row: decision.row, col: decision.col })
        audio.playSFX('move')
      }
    }, AI_THINKING_DELAY)

    return () => clearTimeout(timeoutId)
  }, [
    state.status,
    state.settings.mode,
    state.settings.aiDifficulty,
    state.currentPlayer,
    state.isAIThinking,
    state.board,
    audio,
  ])

  useEffect(() => {
    if (prevStatusRef.current === 'playing' && state.status === 'won') {
      audio.playSFX('win')
    } else if (prevStatusRef.current === 'playing' && state.status === 'draw') {
      audio.playSFX('draw')
    }
    prevStatusRef.current = state.status
  }, [state.status, audio])

  useEffect(() => {
    if (!prevAIThinkingRef.current && state.isAIThinking) {
      audio.playSFX('thinking')
    }
    prevAIThinkingRef.current = state.isAIThinking
  }, [state.isAIThinking, audio])

  useEffect(() => {
    if (state.status === 'playing') {
      audio.resumeBGM()
    }
  }, [state.status, audio])

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET' })
    audio.playSFX('click')
  }, [audio])

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
      <AudioPanel />
    </main>
  )
}
