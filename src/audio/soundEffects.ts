import { SFX_URLS } from './types'
import type { SFXName } from './types'

export interface SFXEngine {
  preload: () => Promise<void>
  playSFX: (name: SFXName) => void
  setVolume: (v: number) => void
}

export function createSFXEngine(audioCtx: AudioContext): SFXEngine {
  const bufferCache = new Map<SFXName, AudioBuffer>()
  const gainNode = audioCtx.createGain()
  gainNode.connect(audioCtx.destination)

  async function preload() {
    const entries = Object.entries(SFX_URLS) as [SFXName, string][]
    const promises = entries.map(async ([name, url]) => {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
      bufferCache.set(name, audioBuffer)
    })
    await Promise.all(promises)
  }

  function playSFX(name: SFXName) {
    const buffer = bufferCache.get(name)
    if (!buffer) return

    const source = audioCtx.createBufferSource()
    source.buffer = buffer
    source.connect(gainNode)
    source.start()
  }

  function setVolume(v: number) {
    gainNode.gain.value = v
  }

  return { preload, playSFX, setVolume }
}
