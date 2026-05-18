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