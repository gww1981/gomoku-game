// src/components/AudioPanel.tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAudio } from '../audio/useAudio'
import type { BGMTrackId } from '../audio/types'
import './AudioPanel.css'

export function AudioPanel() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    bgmVolume,
    sfxVolume,
    muted,
    currentTrackId,
    availableTracks,
    isTrackLoading,
    audioError,
    toggleMute,
    setBGMVolume,
    setSFXVolume,
    switchTrack,
    loadCustomFile,
    clearAudioError,
  } = useAudio()

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

  const handleTrackClick = (trackId: BGMTrackId) => {
    void switchTrack(trackId)
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    void loadCustomFile(file)
    event.target.value = ''
  }

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

          <div className="audio-track-section">
            <div className="audio-track-title">
              <span>选择曲目</span>
              {isTrackLoading && (
                <span className="audio-loading" aria-live="polite">
                  <span className="audio-loading-dot" />
                  加载中
                </span>
              )}
            </div>
            <div className="audio-track-list">
              {availableTracks.map((track) => (
                <button
                  key={track.id}
                  type="button"
                  className={`audio-track-btn${currentTrackId === track.id ? ' is-active' : ''}`}
                  aria-label={track.name}
                  onClick={() => handleTrackClick(track.id)}
                  disabled={isTrackLoading}
                >
                  <span className="audio-track-emoji">{track.emoji}</span>
                  <span className="audio-track-name">{track.name}</span>
                </button>
              ))}
              <button
                type="button"
                className="audio-track-btn audio-file-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={isTrackLoading}
              >
                <span className="audio-track-emoji">📁</span>
                <span className="audio-track-name">选择本地文件...</span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="audio-file-input"
              aria-label="选择本地音频文件"
              accept="audio/*"
              onChange={handleFileChange}
            />
          </div>

          {audioError && (
            <div className="audio-error" role="status">
              <span>{audioError}</span>
              <button
                type="button"
                className="audio-error-close"
                aria-label="关闭音频错误提示"
                onClick={clearAudioError}
              >
                ✕
              </button>
            </div>
          )}

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
