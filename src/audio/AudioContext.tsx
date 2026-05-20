import { createContext, useState, useRef, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'
import { createSFXEngine } from './soundEffects'
import { BGM_URL } from './types'
import type { AudioContextValue, SFXName } from './types'

// eslint-disable-next-line react-refresh/only-export-components
export const AudioCtx = createContext<AudioContextValue | null>(null)

export function AudioProvider({ children }: { children: ReactNode }) {
  const [bgmVolume, setBGMVolumeState] = useState(0.5)
  const [sfxVolume, setSFXVolumeState] = useState(0.7)
  const [muted, setMuted] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const sfxEngineRef = useRef<ReturnType<typeof createSFXEngine> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const initializedRef = useRef(false)

  const initAudio = useCallback(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const audioEl = document.createElement('audio')
    audioEl.src = BGM_URL
    audioEl.loop = true
    audioEl.volume = 0.5
    audioRef.current = audioEl

    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    sfxEngineRef.current = createSFXEngine(ctx)
    sfxEngineRef.current.preload().catch(() => {})
  }, [])

  useEffect(() => {
    initAudio()

    const handleFirstInteraction = () => {
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(() => {})
      }
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {})
      }
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('keydown', handleFirstInteraction)
    }

    document.addEventListener('click', handleFirstInteraction)
    document.addEventListener('keydown', handleFirstInteraction)

    return () => {
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('keydown', handleFirstInteraction)
    }
  }, [initAudio])

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev
      if (audioRef.current) {
        if (next) {
          audioRef.current.pause()
        } else {
          audioRef.current.play().catch(() => {})
        }
      }
      return next
    })
  }, [])

  const setBGMVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v))
    setBGMVolumeState(clamped)
    if (audioRef.current) {
      audioRef.current.volume = clamped
    }
  }, [])

  const setSFXVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v))
    setSFXVolumeState(clamped)
    if (sfxEngineRef.current) {
      sfxEngineRef.current.setVolume(muted ? 0 : clamped)
    }
  }, [muted])

  const playSFX = useCallback((name: SFXName) => {
    if (sfxEngineRef.current) {
      sfxEngineRef.current.playSFX(name)
    }
  }, [])

  const resumeBGM = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {})
    }
  }, [])

  const stopBGM = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
    }
  }, [])

  useEffect(() => {
    if (sfxEngineRef.current) {
      sfxEngineRef.current.setVolume(muted ? 0 : sfxVolume)
    }
  }, [muted, sfxVolume])

  const value: AudioContextValue = {
    bgmVolume,
    sfxVolume,
    muted,
    toggleMute,
    setBGMVolume,
    setSFXVolume,
    playSFX,
    resumeBGM,
    stopBGM,
  }

  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>
}
