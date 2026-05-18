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