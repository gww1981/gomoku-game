import './ReplayBar.css'

interface ReplayBarProps {
  currentIndex: number
  totalMoves: number
  isPlaying: boolean
  speed: number
  onPlay: () => void
  onPause: () => void
  onStepForward: () => void
  onStepBackward: () => void
  onJumpToStart: () => void
  onJumpToEnd: () => void
  onJumpTo: (index: number) => void
  onSetSpeed: (speed: number) => void
}

const REPLAY_SPEEDS = [2000, 1000, 500, 250]
const SPEED_LABELS: Record<number, string> = { 2000: '0.5x', 1000: '1x', 500: '2x', 250: '4x' }

export function ReplayBar({
  currentIndex,
  totalMoves,
  isPlaying,
  speed,
  onPlay,
  onPause,
  onStepForward,
  onStepBackward,
  onJumpToStart,
  onJumpToEnd,
  onJumpTo,
  onSetSpeed,
}: ReplayBarProps) {
  return (
    <div className="replay-bar">
      <div className="replay-progress">
        <span className="replay-progress-label">第 {currentIndex + 1} 手</span>
        <input
          type="range"
          className="replay-slider"
          min={-1}
          max={totalMoves - 1}
          value={currentIndex}
          onChange={e => onJumpTo(parseInt(e.target.value, 10))}
        />
        <span className="replay-progress-label">共 {totalMoves} 手</span>
      </div>

      <div className="replay-controls">
        <button className="replay-btn" onClick={onJumpToStart} title="跳到开头" aria-label="跳到开头">⏮</button>
        <button className="replay-btn" onClick={onStepBackward} title="上一步" aria-label="上一步">⏪</button>
        <button className="replay-btn replay-btn-play" onClick={isPlaying ? onPause : onPlay} title={isPlaying ? '暂停' : '播放'}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button className="replay-btn" onClick={onStepForward} title="下一步" aria-label="下一步">⏩</button>
        <button className="replay-btn" onClick={onJumpToEnd} title="跳到结尾" aria-label="跳到结尾">⏭</button>

        <div className="replay-speed-group">
          {REPLAY_SPEEDS.map(s => (
            <button
              key={s}
              className={`replay-speed-btn ${speed === s ? 'active' : ''}`}
              onClick={() => onSetSpeed(s)}
              aria-pressed={speed === s}
            >
              {SPEED_LABELS[s]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}