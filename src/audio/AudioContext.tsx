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
  const mutedRef = useRef(false)
  const sfxVolumeRef = useRef(0.7)

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
    sfxEngineRef.current.setVolume(sfxVolumeRef.current)
    sfxEngineRef.current.preload().catch(() => {})
  }, [])

  useEffect(() => {
    initAudio()

    const handleFirstInteraction = () => {
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {})
      }
      if (audioRef.current && audioRef.current.paused && !mutedRef.current) {
        audioRef.current.play().catch(() => {})
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
      mutedRef.current = next
      if (audioRef.current) {
        if (next) {
          audioRef.current.pause()
        } else {
          audioRef.current.play().catch(() => {})
        }
      }
      if (sfxEngineRef.current) {
        sfxEngineRef.current.setVolume(next ? 0 : sfxVolumeRef.current)
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
    sfxVolumeRef.current = clamped
    if (sfxEngineRef.current) {
      sfxEngineRef.current.setVolume(mutedRef.current ? 0 : clamped)
    }
  }, [])

  const playSFX = useCallback((name: SFXName) => {
    if (mutedRef.current) return
    if (sfxEngineRef.current) {
      sfxEngineRef.current.playSFX(name)
    }
  }, [])

  const resumeBGM = useCallback(() => {
    if (mutedRef.current) return
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
    mutedRef.current = muted
    sfxVolumeRef.current = sfxVolume
    if (sfxEngineRef.current) {
      sfxEngineRef.current.setVolume(muted ? 0 : sfxVolume)
    }
  }, [muted, sfxVolume])

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
        audioRef.current = null
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {})
        audioCtxRef.current = null
      }
      sfxEngineRef.current = null
      initializedRef.current = false
    }
  }, [])

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
