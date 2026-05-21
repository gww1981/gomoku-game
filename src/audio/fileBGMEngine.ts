import type { BGMEngine } from './bgmEngine'

const FADE_SECONDS = 0.5

export interface FileBGMEngine extends BGMEngine {
  load: (source: string) => Promise<void>
}

export function createFileBGMEngine(audioCtx: AudioContext): FileBGMEngine {
  const masterGain = audioCtx.createGain()
  masterGain.gain.value = 0
  masterGain.connect(audioCtx.destination)

  let sourceNode: AudioBufferSourceNode | null = null
  let audioBuffer: AudioBuffer | null = null
  let audioElement: HTMLAudioElement | null = null
  let targetVolume = 0.5
  let isPlaying = false

  function fadeTo(value: number) {
    masterGain.gain.cancelScheduledValues(audioCtx.currentTime)
    masterGain.gain.setValueAtTime(masterGain.gain.value, audioCtx.currentTime)
    masterGain.gain.linearRampToValueAtTime(value, audioCtx.currentTime + FADE_SECONDS)
  }

  function stopSource() {
    if (!sourceNode) return
    const node = sourceNode
    sourceNode = null
    try {
      node.stop(audioCtx.currentTime + FADE_SECONDS)
    } catch {
      // Already stopped.
    }
    window.setTimeout(() => node.disconnect(), FADE_SECONDS * 1000)
  }

  async function load(source: string) {
    if (source.startsWith('http://') || source.startsWith('https://')) {
      audioBuffer = null
      const nextAudio = new Audio(source)
      nextAudio.loop = true
      nextAudio.preload = 'auto'
      nextAudio.volume = targetVolume
      await new Promise<void>((resolve, reject) => {
        nextAudio.addEventListener('canplaythrough', () => resolve(), { once: true })
        nextAudio.addEventListener('error', () => reject(new Error('Failed to load BGM file')), { once: true })
        nextAudio.load()
      })
      audioElement = nextAudio
      return
    }

    audioElement = null
    const response = await fetch(source)
    if (!response.ok) {
      throw new Error('Failed to load BGM file')
    }
    const arrayBuffer = await response.arrayBuffer()
    audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
  }

  function start() {
    if (audioElement) {
      if (isPlaying) return
      audioElement.volume = targetVolume
      void audioElement.play()
      isPlaying = true
      return
    }

    if (!audioBuffer || isPlaying) return
    const nextSource = audioCtx.createBufferSource()
    nextSource.buffer = audioBuffer
    nextSource.loop = true
    nextSource.connect(masterGain)
    nextSource.start()
    sourceNode = nextSource
    isPlaying = true
    masterGain.gain.value = 0
    fadeTo(targetVolume)
  }

  function stop() {
    if (!isPlaying) return
    if (audioElement) {
      audioElement.pause()
      isPlaying = false
      return
    }

    fadeTo(0)
    stopSource()
    isPlaying = false
  }

  function setVolume(v: number) {
    targetVolume = Math.max(0, Math.min(1, v))
    if (audioElement) {
      audioElement.volume = targetVolume
    }
    if (isPlaying) {
      fadeTo(targetVolume)
    }
  }

  return { load, start, stop, setVolume }
}
