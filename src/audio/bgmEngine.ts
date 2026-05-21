// src/audio/bgmEngine.ts
// Web Audio API 合成背景音乐 — 五声音阶古风循环旋律

export interface BGMEngine {
  start: () => void
  stop: () => void
  setVolume: (v: number) => void
}

const FADE_SECONDS = 0.5

// C 大调五声音阶频率 (C D E G A)，跨两个八度
const SCALE = [
  261.63, 293.66, 329.63, 392.00, 440.00, // C4 D4 E4 G4 A4
  523.25, 587.33, 659.25, 783.99, 880.00, // C5 D5 E5 G5 A5
]

// 旋律音符序列 (scale index, duration in beats)
const MELODY: [number, number][] = [
  [0, 2], [2, 1], [4, 1], [5, 2], [4, 1], [2, 1],
  [0, 2], [1, 1], [2, 1], [4, 2], [2, 1], [1, 1],
  [0, 1], [2, 1], [4, 1], [5, 1], [7, 2], [5, 1], [4, 1],
  [2, 2], [0, 1], [1, 1], [0, 2],
]

const BEAT_DURATION = 0.4 // 每拍秒数
const LOOP_DURATION = MELODY.reduce((sum, [, dur]) => sum + dur * BEAT_DURATION, 0)

export function createBGMEngine(audioCtx: AudioContext): BGMEngine {
  const masterGain = audioCtx.createGain()
  masterGain.gain.value = 0
  masterGain.connect(audioCtx.destination)

  let loopTimer: number | null = null
  let isPlaying = false
  let targetVolume = 0.5

  function fadeTo(value: number) {
    masterGain.gain.cancelScheduledValues(audioCtx.currentTime)
    masterGain.gain.setValueAtTime(masterGain.gain.value, audioCtx.currentTime)
    masterGain.gain.linearRampToValueAtTime(value, audioCtx.currentTime + FADE_SECONDS)
  }

  function playLoop() {
    if (!isPlaying) return
    const now = audioCtx.currentTime
    let offset = 0

    for (const [noteIdx, beats] of MELODY) {
      const freq = SCALE[noteIdx]
      const dur = beats * BEAT_DURATION

      // 主音色：柔和正弦波
      const osc = audioCtx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = freq

      const env = audioCtx.createGain()
      env.gain.setValueAtTime(0, now + offset)
      env.gain.linearRampToValueAtTime(0.18, now + offset + 0.04)
      env.gain.setValueAtTime(0.18, now + offset + dur * 0.6)
      env.gain.exponentialRampToValueAtTime(0.001, now + offset + dur * 0.95)

      osc.connect(env)
      env.connect(masterGain)
      osc.start(now + offset)
      osc.stop(now + offset + dur)

      // 泛音：轻微高八度点缀
      const osc2 = audioCtx.createOscillator()
      osc2.type = 'sine'
      osc2.frequency.value = freq * 2
      const env2 = audioCtx.createGain()
      env2.gain.setValueAtTime(0, now + offset)
      env2.gain.linearRampToValueAtTime(0.04, now + offset + 0.04)
      env2.gain.exponentialRampToValueAtTime(0.001, now + offset + dur * 0.7)
      osc2.connect(env2)
      env2.connect(masterGain)
      osc2.start(now + offset)
      osc2.stop(now + offset + dur)

      offset += dur
    }

    loopTimer = window.setTimeout(() => playLoop(), LOOP_DURATION * 1000 - 50)
  }

  function start() {
    if (isPlaying) {
      fadeTo(targetVolume)
      return
    }
    isPlaying = true
    masterGain.gain.value = 0
    playLoop()
    fadeTo(targetVolume)
  }

  function stop() {
    if (!isPlaying) return
    fadeTo(0)
    isPlaying = false
    if (loopTimer !== null) {
      clearTimeout(loopTimer)
      loopTimer = null
    }
  }

  function setVolume(v: number) {
    targetVolume = Math.max(0, Math.min(1, v))
    if (isPlaying) {
      fadeTo(targetVolume)
    }
  }

  return { start, stop, setVolume }
}
