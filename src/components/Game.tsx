// src/components/Game.tsx
import { useReducer, useEffect, useCallback, useRef, useState } from 'react'
import { gameReducer, getInitialGameState } from '../game/gameReducer'
import { getAIMove } from '../game/ai'
import type { GameMode, AIDifficulty } from '../game/types'
import { Board } from './Board'
import { Status } from './Status'
import { ModeSelect } from './ModeSelect'
import { AudioPanel } from './AudioPanel'
import { useAudio } from '../audio/useAudio'
import { useReplay } from '../replay/useReplay'
import { saveGameRecord } from '../replay/storage'
import { ReplayBar } from './ReplayBar'
import { GameRecordList } from './GameRecordList'

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

  const [replayOpen, setReplayOpen] = useState(false)
  const [isReplayMode, setIsReplayMode] = useState(false)
  const replay = useReplay()
  const { loadRecord } = replay
  const { playSFX, resumeBGM, stopBGM } = audio
  const savedTerminalGameRef = useRef<string | null>(null)

  const handleModeSelect = useCallback((mode: GameMode, aiDifficulty?: AIDifficulty) => {
    dispatch({ type: 'SET_MODE', mode, aiDifficulty })
    playSFX('click')
  }, [playSFX])

  const handleCellClick = useCallback((row: number, col: number) => {
    if (state.status !== 'playing') return
    if (state.isAIThinking) return
    if (state.settings.mode === 'ai' && state.currentPlayer !== 'black') return

    dispatch({ type: 'MOVE', row, col })
    playSFX('move')
  }, [state.status, state.isAIThinking, state.settings.mode, state.currentPlayer, playSFX])

  const handleUndo = useCallback(() => {
    dispatch({ type: 'UNDO' })
    playSFX('move')
  }, [playSFX])

  const handleOpenReplayList = useCallback(() => {
    setReplayOpen(true)
  }, [])

  const handleCloseReplayList = useCallback(() => {
    setReplayOpen(false)
  }, [])

  const handleSelectRecord = useCallback((record: import('../game/types').GameRecord) => {
    loadRecord(record)
    setIsReplayMode(true)
    setReplayOpen(false)
  }, [loadRecord])

  const handleExitReplay = useCallback(() => {
    savedTerminalGameRef.current = null
    setIsReplayMode(false)
    dispatch({ type: 'RESET' })
  }, [])

  // Save game record when game ends and enter replay mode
  useEffect(() => {
    if ((state.status === 'won' || state.status === 'draw') && state.moveHistory.length > 0) {
      const terminalGameKey = `${state.status}:${state.moveHistory.length}`
      if (savedTerminalGameRef.current === terminalGameKey) return
      savedTerminalGameRef.current = terminalGameKey

      const record: import('../game/types').GameRecord = {
        id: crypto.randomUUID(),
        version: 1,
        createdAt: new Date().toISOString(),
        boardSize: 15,
        gameMode: state.settings.mode,
        aiDifficulty: state.settings.aiDifficulty,
        players: {
          black: { name: '黑方', isAI: state.settings.mode === 'ai' },
          white: { name: '白方', isAI: false },
        },
        result: {
          winner: state.winner,
          winningCells: state.winningCells,
        },
        moves: state.moveHistory,
      }
      saveGameRecord(record)
      loadRecord(record)
      setIsReplayMode(true)
    }
  }, [state.status, state.moveHistory, state.winner, state.winningCells, state.settings, loadRecord])

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
        playSFX('move')
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
    playSFX,
  ])

  useEffect(() => {
    if (prevStatusRef.current === 'playing' && state.status === 'won') {
      playSFX('win')
    } else if (prevStatusRef.current === 'playing' && state.status === 'draw') {
      playSFX('draw')
    }
    prevStatusRef.current = state.status
  }, [state.status, playSFX])

  useEffect(() => {
    if (!prevAIThinkingRef.current && state.isAIThinking) {
      playSFX('thinking')
    }
    prevAIThinkingRef.current = state.isAIThinking
  }, [state.isAIThinking, playSFX])

  useEffect(() => {
    if (state.status === 'playing') {
      resumeBGM()
    } else {
      stopBGM()
    }
  }, [state.status, resumeBGM, stopBGM])

  const handleReset = useCallback(() => {
    savedTerminalGameRef.current = null
    dispatch({ type: 'RESET' })
    playSFX('click')
  }, [playSFX])

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
            board={isReplayMode ? replay.state.board : state.board}
            onCellClick={isReplayMode ? () => {} : handleCellClick}
            lastMove={isReplayMode ? (replay.state.moves[replay.state.currentIndex]?.position ?? null) : state.lastMove}
            winningCells={isReplayMode ? [] : state.winningCells || []}
            moveNumbers={replay.state.moves.map((m) => ({ row: m.position.row, col: m.position.col, number: m.index }))}
            currentMoveIndex={replay.state.currentIndex}
          />
        </div>
        <footer className="game-footer">
          <span className="mode-badge">{modeLabel}</span>
          {isReplayMode ? (
            <>
              <button type="button" className="replay-list-button" onClick={handleOpenReplayList}>
                录像列表
              </button>
              <button type="button" className="undo-button" onClick={handleExitReplay}>
                退出回放
              </button>
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
            </>
          ) : (
            <>
              <Status gameState={state} />
              {state.status !== 'playing' && (
                <button type="button" className="reset-button" onClick={handleReset}>
                  重新开始
                </button>
              )}
              {state.status === 'playing' && state.moveHistory.length > 0 && (
                <button type="button" className="undo-button" onClick={handleUndo}>
                  悔棋
                </button>
              )}
              <button type="button" className="replay-list-button" onClick={handleOpenReplayList}>
                录像列表
              </button>
            </>
          )}
        </footer>
      </section>
      <AudioPanel />
      <GameRecordList
        isOpen={replayOpen}
        onClose={handleCloseReplayList}
        onSelectRecord={handleSelectRecord}
      />
    </main>
  )
}
