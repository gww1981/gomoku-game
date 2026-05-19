import type { GameState } from '../game/types'

interface StatusProps {
  gameState: GameState
}

export function Status({ gameState }: StatusProps) {
  if (gameState.status === 'won') {
    return (
      <div className="status won">
        {gameState.winner === 'black' ? '黑棋获胜!' : '白棋获胜!'}
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
  const turnLabel = isAITurn
    ? '白棋 (AI)回合'
    : `${gameState.currentPlayer === 'black' ? '黑棋' : '白棋'}回合`

  return (
    <div className="status">
      {turnLabel}
    </div>
  )
}
