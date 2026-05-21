import { createContext, useState, useRef, useCallback, useEffect, useMemo } from 'react'
import type { ReactNode } from 'react'
import { createSFXEngine } from './soundEffects'
import { createBGMManager, type BGMManager } from './bgmManager'
import {
  BGM_STORAGE_KEYS,
  getAvailableBGMTracks,
  restoreBoolean,
  restoreNumber,
  restoreTrackId,
} from './bgmTracks'
import type { AudioContextValue, AudioErrorMessage, BGMTrack, BGMTrackId, SFXName } from './types'

// eslint-disable-next-line react-refresh/only-export-components
export const AudioCtx = createContext<AudioContextValue | null>(null)

function safeStorageGet(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeStorageSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Ignore blocked storage; audio controls should still work.
  }
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const [bgmVolume, setBGMVolumeState] = useState(() =>
    restoreNumber(safeStorageGet(BGM_STORAGE_KEYS.bgmVolume), 0.5)
  )
  const [sfxVolume, setSFXVolumeState] = useState(() =>
    restoreNumber(safeStorageGet(BGM_STORAGE_KEYS.sfxVolume), 0.7)
  )
  const [muted, setMuted] = useState(() =>
    restoreBoolean(safeStorageGet(BGM_STORAGE_KEYS.muted), false)
  )
  const [currentTrackId, setCurrentTrackId] = useState<BGMTrackId>(() =>
    restoreTrackId(safeStorageGet(BGM_STORAGE_KEYS.trackId))
  )
  const [customTrack, setCustomTrack] = useState<BGMTrack | null>(null)
  const [isTrackLoading, setIsTrackLoading] = useState(false)
  const [audioError, setAudioError] = useState<AudioErrorMessage>(null)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const sfxEngineRef = useRef<ReturnType<typeof createSFXEngine> | null>(null)
  const bgmManagerRef = useRef<BGMManager | null>(null)
  const initializedRef = useRef(false)
  const mutedRef = useRef(muted)
  const sfxVolumeRef = useRef(sfxVolume)
  const bgmVolumeRef = useRef(bgmVolume)
  const initialTrackIdRef = useRef(currentTrackId)

  const availableTracks = useMemo(() => getAvailableBGMTracks(customTrack), [customTrack])

  const initAudio = useCallback(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    sfxEngineRef.current = createSFXEngine(ctx)
    sfxEngineRef.current.setVolume(mutedRef.current ? 0 : sfxVolumeRef.current)
    bgmManagerRef.current = createBGMManager({
      initialTrackId: initialTrackIdRef.current,
      initialVolume: bgmVolumeRef.current,
      onLoadingChange: setIsTrackLoading,
      onError: setAudioError,
      onTrackChange: (trackId, nextCustomTrack) => {
        setCurrentTrackId(trackId)
        setCustomTrack(nextCustomTrack)
        safeStorageSet(BGM_STORAGE_KEYS.trackId, trackId === 'custom' ? 'synthetic' : trackId)
      },
    })
    bgmManagerRef.current.setVolume(bgmVolumeRef.current)
    if (!mutedRef.current) {
      bgmManagerRef.current.start(ctx)
    }
  }, [])

  const resumeAudioContext = useCallback(async () => {
    const ctx = audioCtxRef.current
    if (ctx?.state === 'suspended') {
      await ctx.resume().catch(() => {})
    }
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
      safeStorageSet(BGM_STORAGE_KEYS.muted, String(next))
      if (next) {
        bgmManagerRef.current?.stop()
        sfxEngineRef.current?.setVolume(0)
      } else if (audioCtxRef.current) {
        bgmManagerRef.current?.start(audioCtxRef.current)
        sfxEngineRef.current?.setVolume(sfxVolumeRef.current)
      }
      return next
    })
  }, [])

  const setBGMVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v))
    setBGMVolumeState(clamped)
    bgmVolumeRef.current = clamped
    safeStorageSet(BGM_STORAGE_KEYS.bgmVolume, String(clamped))
    bgmManagerRef.current?.setVolume(clamped)
  }, [])

  const setSFXVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v))
    setSFXVolumeState(clamped)
    sfxVolumeRef.current = clamped
    safeStorageSet(BGM_STORAGE_KEYS.sfxVolume, String(clamped))
    if (!mutedRef.current) {
      sfxEngineRef.current?.setVolume(clamped)
    }
  }, [])

  const playSFX = useCallback((name: SFXName) => {
    if (mutedRef.current) return
    sfxEngineRef.current?.playSFX(name)
  }, [])

  const resumeBGM = useCallback(() => {
    if (mutedRef.current || !audioCtxRef.current) return
    bgmManagerRef.current?.start(audioCtxRef.current)
  }, [])

  const stopBGM = useCallback(() => {
    bgmManagerRef.current?.stop()
  }, [])

  const switchTrack = useCallback(async (trackId: BGMTrackId) => {
    setAudioError(null)
    await resumeAudioContext()
    await bgmManagerRef.current?.switchTrack(trackId)
    if (mutedRef.current) {
      bgmManagerRef.current?.stop()
    }
  }, [resumeAudioContext])

  const loadCustomFile = useCallback(async (file: File) => {
    setAudioError(null)
    await resumeAudioContext()
    await bgmManagerRef.current?.loadCustomFile(file)
    if (mutedRef.current) {
      bgmManagerRef.current?.stop()
    }
  }, [resumeAudioContext])

  const clearAudioError = useCallback(() => setAudioError(null), [])

  useEffect(() => {
    mutedRef.current = muted
    sfxVolumeRef.current = sfxVolume
    bgmVolumeRef.current = bgmVolume
  }, [muted, sfxVolume, bgmVolume])

  useEffect(() => {
    return () => {
      bgmManagerRef.current?.dispose()
      audioCtxRef.current?.close().catch(() => {})
      audioCtxRef.current = null
      sfxEngineRef.current = null
      bgmManagerRef.current = null
      initializedRef.current = false
    }
  }, [])

  const value: AudioContextValue = useMemo(() => ({
    bgmVolume,
    sfxVolume,
    muted,
    currentTrackId,
    availableTracks,
    customTrack,
    isTrackLoading,
    audioError,
    toggleMute,
    setBGMVolume,
    setSFXVolume,
    playSFX,
    resumeBGM,
    stopBGM,
    switchTrack,
    loadCustomFile,
    clearAudioError,
  }), [
    bgmVolume,
    sfxVolume,
    muted,
    currentTrackId,
    availableTracks,
    customTrack,
    isTrackLoading,
    audioError,
    toggleMute,
    setBGMVolume,
    setSFXVolume,
    playSFX,
    resumeBGM,
    stopBGM,
    switchTrack,
    loadCustomFile,
    clearAudioError,
  ])

  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>
}
