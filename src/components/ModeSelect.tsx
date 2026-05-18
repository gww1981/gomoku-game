import type { GameMode, AIDifficulty } from '../game/types'

interface ModeSelectProps {
  onSelect: (mode: GameMode, aiDifficulty?: AIDifficulty) => void
}

export function ModeSelect({ onSelect }: ModeSelectProps) {
  return (
    <div className="mode-select">
      <h1>五子棋</h1>
      <div className="mode-buttons">
        <button
          className="mode-button pvp"
          onClick={() => onSelect('pvp')}
        >
          双人对战
        </button>
        <div className="ai-modes">
          <span className="ai-label">人机对战</span>
          <div className="ai-difficulty-buttons">
            <button onClick={() => onSelect('ai', 'easy')}>简单</button>
            <button className="primary" onClick={() => onSelect('ai', 'medium')}>中等</button>
            <button onClick={() => onSelect('ai', 'hard')}>困难</button>
          </div>
        </div>
      </div>
    </div>
  )
}