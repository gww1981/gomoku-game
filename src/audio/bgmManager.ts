import { createBGMEngine, type BGMEngine } from './bgmEngine'
import { createFileBGMEngine, type FileBGMEngine } from './fileBGMEngine'
import {
  BUILT_IN_BGM_TRACKS,
  MAX_CUSTOM_AUDIO_BYTES,
  findBGMTrack,
  getAvailableBGMTracks,
} from './bgmTracks'
import type { AudioErrorMessage, BGMTrack, BGMTrackId } from './types'

interface BGMManagerOptions {
  initialTrackId?: BGMTrackId
  initialVolume?: number
  onLoadingChange?: (loading: boolean) => void
  onError?: (message: AudioErrorMessage) => void
  onTrackChange?: (trackId: BGMTrackId, customTrack: BGMTrack | null) => void
}

export interface BGMManager {
  start: (audioCtx: AudioContext) => void
  stop: () => void
  switchTrack: (trackId: BGMTrackId) => Promise<void>
  setVolume: (v: number) => void
  getAvailableTracks: () => BGMTrack[]
  getCurrentTrack: () => BGMTrack
  getCustomTrack: () => BGMTrack | null
  loadCustomFile: (file: File) => Promise<void>
  dispose: () => void
}

export function createBGMManager(options: BGMManagerOptions = {}): BGMManager {
  let audioCtx: AudioContext | null = null
  let syntheticEngine: BGMEngine | null = null
  let fileEngine: FileBGMEngine | null = null
  let activeEngine: BGMEngine | null = null
  let currentTrackId: BGMTrackId = options.initialTrackId ?? 'synthetic'
  let customTrack: BGMTrack | null = null
  let volume = options.initialVolume ?? 0.5
  let shouldPlay = false
  let disposed = false
  let requestId = 0

  function emitTrackChange() {
    options.onTrackChange?.(currentTrackId, customTrack)
  }

  function getSyntheticEngine() {
    if (!audioCtx) throw new Error('AudioContext is not initialized')
    syntheticEngine ??= createBGMEngine(audioCtx)
    syntheticEngine.setVolume(volume)
    return syntheticEngine
  }

  function getFileEngine() {
    if (!audioCtx) throw new Error('AudioContext is not initialized')
    fileEngine ??= createFileBGMEngine(audioCtx)
    fileEngine.setVolume(volume)
    return fileEngine
  }

  function start(ctx: AudioContext) {
    if (disposed) return
    audioCtx = ctx
    shouldPlay = true
    void switchTrack(currentTrackId)
  }

  function stop() {
    shouldPlay = false
    activeEngine?.stop()
  }

  async function switchTrack(trackId: BGMTrackId) {
    const thisRequestId = ++requestId
    if (!audioCtx || disposed) {
      currentTrackId = trackId === 'custom' && !customTrack ? 'synthetic' : trackId
      emitTrackChange()
      return
    }

    const requestedTrack = findBGMTrack(trackId, customTrack)
    const track = requestedTrack ?? BUILT_IN_BGM_TRACKS[0]
    activeEngine?.stop()

    if (track.type === 'synthetic') {
      currentTrackId = 'synthetic'
      activeEngine = getSyntheticEngine()
      activeEngine.setVolume(volume)
      if (shouldPlay) activeEngine.start()
      emitTrackChange()
      return
    }

    options.onLoadingChange?.(true)
    try {
      const nextFileEngine = getFileEngine()
      await nextFileEngine.load(track.source)
      if (disposed || thisRequestId !== requestId) return
      currentTrackId = track.id
      activeEngine = nextFileEngine
      activeEngine.setVolume(volume)
      if (shouldPlay) activeEngine.start()
      emitTrackChange()
    } catch {
      if (disposed || thisRequestId !== requestId) return
      currentTrackId = 'synthetic'
      activeEngine = getSyntheticEngine()
      if (shouldPlay) activeEngine.start()
      emitTrackChange()
      options.onError?.('网络音频加载失败，已切换回合成BGM')
    } finally {
      if (!disposed && thisRequestId === requestId) {
        options.onLoadingChange?.(false)
      }
    }
  }

  function setVolume(v: number) {
    volume = Math.max(0, Math.min(1, v))
    activeEngine?.setVolume(volume)
    syntheticEngine?.setVolume(volume)
    fileEngine?.setVolume(volume)
  }

  async function loadCustomFile(file: File) {
    if (!file.type.startsWith('audio/')) {
      options.onError?.('不支持的音频格式')
      return
    }
    if (file.size > MAX_CUSTOM_AUDIO_BYTES) {
      options.onError?.('文件过大，请选择较小的音频文件')
      return
    }

    const previousTrack = customTrack
    const nextUrl = URL.createObjectURL(file)
    const nextTrack: BGMTrack = {
      id: 'custom',
      name: file.name,
      type: 'file',
      source: nextUrl,
      emoji: '📁',
    }

    customTrack = nextTrack
    emitTrackChange()
    await switchTrack('custom')

    if (currentTrackId !== 'custom') {
      URL.revokeObjectURL(nextUrl)
      customTrack = previousTrack
      emitTrackChange()
      return
    }

    if (previousTrack?.type === 'file' && previousTrack.source.startsWith('blob:')) {
      URL.revokeObjectURL(previousTrack.source)
    }
  }

  function getAvailableTracks() {
    return getAvailableBGMTracks(customTrack)
  }

  function getCurrentTrack() {
    return findBGMTrack(currentTrackId, customTrack) ?? BUILT_IN_BGM_TRACKS[0]
  }

  function dispose() {
    disposed = true
    requestId += 1
    activeEngine?.stop()
    if (customTrack?.type === 'file' && customTrack.source.startsWith('blob:')) {
      URL.revokeObjectURL(customTrack.source)
    }
    customTrack = null
    syntheticEngine = null
    fileEngine = null
    activeEngine = null
    audioCtx = null
  }

  return {
    start,
    stop,
    switchTrack,
    setVolume,
    getAvailableTracks,
    getCurrentTrack,
    getCustomTrack: () => customTrack,
    loadCustomFile,
    dispose,
  }
}
