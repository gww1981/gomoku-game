// src/components/AudioPanel.tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAudio } from '../audio/useAudio'
import './AudioPanel.css'

export function AudioPanel() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const { bgmVolume, sfxVolume, muted, toggleMute, setBGMVolume, setSFXVolume } = useAudio()

  const handleClose = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="audio-panel-float" ref={panelRef}>
      <button
        type="button"
        className={`audio-toggle-btn${muted ? ' muted' : ''}`}
        aria-label="音频控制"
        onClick={() => setOpen((o) => !o)}
      >
        {muted ? '🔇' : '🎵'}
      </button>

      {open && (
        <div className="audio-panel-body">
          <div className="audio-panel-header">
            <span>音频控制</span>
            <button
              type="button"
              className="audio-close-btn"
              aria-label="关闭"
              onClick={handleClose}
            >
              ✕
            </button>
          </div>

          <div className="audio-slider-group">
            <div className="audio-slider-label">
              <span>背景音乐</span>
              <span className="audio-slider-value">{Math.round(bgmVolume * 100)}%</span>
            </div>
            <input
              type="range"
              className={`audio-slider${muted ? ' muted-slider' : ''}`}
              aria-label="背景音乐音量"
              min={0}
              max={1}
              step={0.01}
              value={bgmVolume}
              onChange={(e) => setBGMVolume(Number(e.target.value))}
            />
          </div>

          <div className="audio-slider-group">
            <div className="audio-slider-label">
              <span>音效</span>
              <span className="audio-slider-value">{Math.round(sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              className={`audio-slider${muted ? ' muted-slider' : ''}`}
              aria-label="音效音量"
              min={0}
              max={1}
              step={0.01}
              value={sfxVolume}
              onChange={(e) => setSFXVolume(Number(e.target.value))}
            />
          </div>

          <button
            type="button"
            className={`audio-mute-btn${muted ? ' is-muted' : ''}`}
            aria-label={muted ? '取消静音' : '静音'}
            onClick={toggleMute}
          >
            {muted ? '🔇 取消静音' : '🔊 静音'}
          </button>
        </div>
      )}
    </div>
  )
}
