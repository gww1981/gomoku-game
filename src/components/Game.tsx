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
import { Lobby } from './Lobby'
import { NetworkStatus } from './NetworkStatus'
import { ChatPanel } from './ChatPanel'
import { UndoConfirmDialog } from './UndoConfirmDialog'
import { ResignDialog } from './ResignDialog'
import { TimeoutDialog } from './TimeoutDialog'
import { useNetworkGame } from '../network/useNetworkGame'

const AI_THINKING_DELAY = 400

const difficultyText: Record<AIDifficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}

export function Game() {
  const [state, dispatch] = useReducer(gameReducer, getInitialGameState())
  const audio = useAudio()
  const network = useNetworkGame(dispatch)
  const [showResignDialog, setShowResignDialog] = useState(false)
  const [showTimeoutDialog, setShowTimeoutDialog] = useState(false)
  const prevStatusRef = useRef(state.status)
  const prevAIThinkingRef = useRef(state.isAIThinking)

  const [replayOpen, setReplayOpen] = useState(false)
  const [isReplayMode, setIsReplayMode] = useState(false)
  const replay = useReplay()
  const { loadRecord } = replay
  const { playSFX, resumeBGM, stopBGM } = audio
  const savedTerminalGameRef = useRef<string | null>(null)

  const handleModeSelect = useCallback((mode: GameMode, aiDifficulty?: AIDifficulty) => {
    // 离开 LAN 模式或切换到不同模式时清理网络房间状态
    if (state.settings.mode === 'lan' && mode !== 'lan' && state.lanState) {
      network.leaveRoom()
    }
    dispatch({ type: 'SET_MODE', mode, aiDifficulty })
    playSFX('click')
  }, [state.settings.mode, state.lanState, network, playSFX])

  const handleCellClick = useCallback((row: number, col: number) => {
    if (state.status !== 'playing') return
    if (state.isAIThinking) return
    if (state.settings.mode === 'ai' && state.currentPlayer !== 'black') return
    if (state.settings.mode === 'lan') {
      if (!state.lanState) return
      if (!state.lanState.opponentConnected) return
      if (state.currentPlayer !== state.lanState.myColor) return
    }

    dispatch({ type: 'MOVE', row, col })
    playSFX('move')

    if (state.settings.mode === 'lan' && state.lanState) {
      network.sendMove(row, col, state.lanState.myColor)
    }
  }, [state.status, state.isAIThinking, state.settings.mode, state.currentPlayer, state.lanState, playSFX, network])

  const handleUndo = useCallback(() => {
    if (state.settings.mode === 'lan') {
      network.requestUndo()
      playSFX('click')
      return
    }
    dispatch({ type: 'UNDO' })
    playSFX('move')
  }, [state.settings.mode, network, playSFX])

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

      // 超时结束不进入回放，由 TimeoutDialog 处理
      if (state.winReason === 'timeout' && state.settings.mode === 'lan') return

      const record: import('../game/types').GameRecord = {
        id: crypto.randomUUID(),
        version: 1,
        createdAt: new Date().toISOString(),
        boardSize: 15,
        gameMode: state.settings.mode,
        aiDifficulty: state.settings.aiDifficulty,
        players: {
          black: { name: state.settings.mode === 'lan' ? '黑方玩家' : '黑方', isAI: false },
          white: { name: state.settings.mode === 'lan' ? '白方玩家' : '白方', isAI: state.settings.mode === 'ai' },
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
      if (state.settings.mode === 'lan') {
        network.notifyGameOver()
        if (state.winReason === 'timeout') {
          setShowTimeoutDialog(true)
        }
      }
    } else if (prevStatusRef.current === 'playing' && state.status === 'draw') {
      playSFX('draw')
    }
    prevStatusRef.current = state.status
  }, [state.status, state.settings.mode, state.winReason, playSFX, network])

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
    // LAN 模式下重新开始 → 离开房间回到大厅
    if (state.settings.mode === 'lan') {
      network.leaveRoom()
      dispatch({ type: 'SET_MODE', mode: 'lan' })
    } else {
      dispatch({ type: 'RESET' })
    }
    playSFX('click')
  }, [state.settings.mode, network, playSFX])

  const modeLabel = state.settings.mode === 'pvp'
    ? '双人'
    : state.settings.mode === 'lan'
    ? '局域网对战'
    : `人机对战 · ${difficultyText[state.settings.aiDifficulty]}`

  const isLanLobbyView =
    state.settings.mode === 'lan' &&
    (!state.lanState || (!state.lanState.opponentConnected && state.moveHistory.length === 0))

  const handleResignConfirm = useCallback(() => {
    setShowResignDialog(false)
    network.resign()
  }, [network])

  const handleTimeoutConfirm = useCallback(() => {
    setShowTimeoutDialog(false)
    savedTerminalGameRef.current = null
    network.resetGame()
  }, [network])

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
          {state.settings.mode === 'lan' && state.lanState && state.lanState.opponentConnected && (
            <NetworkStatus lanState={state.lanState} currentPlayer={state.currentPlayer} />
          )}
          {isLanLobbyView ? (
            <Lobby
              onCreateRoom={network.createRoom}
              onJoinRoom={network.joinRoom}
              connectionStatus={network.connectionStatus}
              connectError={network.connectError}
            />
          ) : (
            <Board
              board={isReplayMode ? replay.state.board : state.board}
              onCellClick={isReplayMode ? () => {} : handleCellClick}
              lastMove={isReplayMode ? (replay.state.moves[replay.state.currentIndex]?.position ?? null) : state.lastMove}
              winningCells={isReplayMode ? [] : state.winningCells || []}
              moveNumbers={replay.state.moves.map((m) => ({ row: m.position.row, col: m.position.col, number: m.index }))}
              currentMoveIndex={replay.state.currentIndex}
            />
          )}
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
                  {state.settings.mode === 'lan' ? '请求悔棋' : '悔棋'}
                </button>
              )}
              {state.settings.mode === 'lan' && state.lanState?.opponentConnected && state.status === 'playing' && (
                <button type="button" className="resign-button" onClick={() => setShowResignDialog(true)}>
                  认输
                </button>
              )}
              <button type="button" className="replay-list-button" onClick={handleOpenReplayList}>
                录像列表
              </button>
            </>
          )}
        </footer>
        {state.settings.mode === 'lan' && state.lanState?.opponentConnected && state.status === 'playing' && (
          <div className="lan-chat-area">
            <ChatPanel sendChat={network.sendChat} subscribeChat={network.subscribeChat} />
          </div>
        )}
      </section>
      <AudioPanel />
      <GameRecordList
        isOpen={replayOpen}
        onClose={handleCloseReplayList}
        onSelectRecord={handleSelectRecord}
      />
      {state.lanState?.undoRequested && (
        <UndoConfirmDialog
          onAccept={() => network.respondUndo(true)}
          onReject={() => network.respondUndo(false)}
        />
      )}
      {showResignDialog && (
        <ResignDialog
          onConfirm={handleResignConfirm}
          onCancel={() => setShowResignDialog(false)}
        />
      )}
      {showTimeoutDialog && state.winner && state.lanState && (
        <TimeoutDialog
          winner={state.winner}
          myColor={state.lanState.myColor}
          onConfirm={handleTimeoutConfirm}
        />
      )}
    </main>
  )
}
