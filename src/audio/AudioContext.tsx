import { createContext, useState, useRef, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'
import { createSFXEngine } from './soundEffects'
import { createBGMEngine } from './bgmEngine'
import type { AudioContextValue, SFXName } from './types'

// eslint-disable-next-line react-refresh/only-export-components
export const AudioCtx = createContext<AudioContextValue | null>(null)

export function AudioProvider({ children }: { children: ReactNode }) {
  const [bgmVolume, setBGMVolumeState] = useState(0.5)
  const [sfxVolume, setSFXVolumeState] = useState(0.7)
  const [muted, setMuted] = useState(false)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const sfxEngineRef = useRef<ReturnType<typeof createSFXEngine> | null>(null)
  const bgmEngineRef = useRef<ReturnType<typeof createBGMEngine> | null>(null)
  const initializedRef = useRef(false)
  const mutedRef = useRef(false)
  const sfxVolumeRef = useRef(0.7)
  const bgmVolumeRef = useRef(0.5)

  const initAudio = useCallback(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    sfxEngineRef.current = createSFXEngine(ctx)
    sfxEngineRef.current.setVolume(sfxVolumeRef.current)
    bgmEngineRef.current = createBGMEngine(ctx)
    bgmEngineRef.current.setVolume(bgmVolumeRef.current)
  }, [])

  useEffect(() => {
    initAudio()

    const handleFirstInteraction = () => {
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
      mutedRef.current = next
      if (next) {
        bgmEngineRef.current?.stop()
        sfxEngineRef.current?.setVolume(0)
      } else {
        bgmEngineRef.current?.start()
        sfxEngineRef.current?.setVolume(sfxVolumeRef.current)
      }
      return next
    })
  }, [])

  const setBGMVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v))
    setBGMVolumeState(clamped)
    bgmVolumeRef.current = clamped
    bgmEngineRef.current?.setVolume(clamped)
  }, [])

  const setSFXVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v))
    setSFXVolumeState(clamped)
    sfxVolumeRef.current = clamped
    if (!mutedRef.current) {
      sfxEngineRef.current?.setVolume(clamped)
    }
  }, [])

  const playSFX = useCallback((name: SFXName) => {
    if (mutedRef.current) return
    sfxEngineRef.current?.playSFX(name)
  }, [])

  const resumeBGM = useCallback(() => {
    if (mutedRef.current) return
    bgmEngineRef.current?.start()
  }, [])

  const stopBGM = useCallback(() => {
    bgmEngineRef.current?.stop()
  }, [])

  useEffect(() => {
    mutedRef.current = muted
    sfxVolumeRef.current = sfxVolume
    bgmVolumeRef.current = bgmVolume
  }, [muted, sfxVolume, bgmVolume])

  useEffect(() => {
    return () => {
      bgmEngineRef.current?.stop()
      audioCtxRef.current?.close().catch(() => {})
      audioCtxRef.current = null
      sfxEngineRef.current = null
      bgmEngineRef.current = null
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
