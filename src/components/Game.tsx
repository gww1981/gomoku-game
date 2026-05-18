import { useReducer } from 'react'
import { gameReducer, getInitialGameState } from '../game/gameReducer'
import { Board } from './Board'
import { Status } from './Status'

export function Game() {
  const [state, dispatch] = useReducer(gameReducer, getInitialGameState())

  const handleCellClick = (row: number, col: number) => {
    dispatch({ type: 'MOVE', row, col })
  }

  const handleReset = () => {
    dispatch({ type: 'RESET' })
  }

  return (
    <div className="game">
      <h1>五子棋</h1>
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
