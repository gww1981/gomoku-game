import type { GameMode, AIDifficulty } from '../game/types'

interface ModeSelectProps {
  mode: GameMode
  aiDifficulty: AIDifficulty
  isReplayMode?: boolean
  onSelect: (mode: GameMode, aiDifficulty?: AIDifficulty) => void
}

const difficultyOptions: Array<{ difficulty: AIDifficulty; label: string }> = [
  { difficulty: 'easy', label: '简单' },
  { difficulty: 'medium', label: '中等' },
  { difficulty: 'hard', label: '困难' },
]

export function ModeSelect({ mode, aiDifficulty, isReplayMode, onSelect }: ModeSelectProps) {
  return (
    <div className="mode-toolbar">
      <div className="mode-group">
        <button
          type="button"
          aria-pressed={mode === 'pvp'}
          disabled={mode === 'pvp' && !isReplayMode}
          onClick={() => onSelect('pvp')}
        >
          双人
        </button>
        <button
          type="button"
          aria-pressed={mode === 'ai'}
          disabled={mode === 'ai' && !isReplayMode}
          onClick={() => onSelect('ai', aiDifficulty)}
        >
          AI 对战
        </button>
        <button
          type="button"
          aria-pressed={mode === 'lan'}
          disabled={mode === 'lan' && !isReplayMode}
          onClick={() => onSelect('lan')}
        >
          局域网对战
        </button>
      </div>
      <div className="mode-group">
        {difficultyOptions.map((option) => (
          <button
            key={option.difficulty}
            type="button"
            className="difficulty-choice"
            aria-pressed={aiDifficulty === option.difficulty}
            disabled={mode !== 'ai' || aiDifficulty === option.difficulty}
            onClick={() => onSelect('ai', option.difficulty)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
