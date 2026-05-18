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
  return (
    <div className="status">
      {gameState.currentPlayer === 'black' ? '黑棋' : '白棋'} 回合
    </div>
  )
}
