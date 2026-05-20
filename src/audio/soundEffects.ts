// src/audio/soundEffects.ts
// Web Audio API 合成音效引擎 — 无外部音频文件依赖

import type { SFXName } from './types'

export interface SFXEngine {
  playSFX: (name: SFXName) => void
  setVolume: (v: number) => void
}

function playTone(
  ctx: AudioContext,
  gainNode: GainNode,
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  startDelay = 0,
) {
  const osc = ctx.createOscillator()
  osc.type = type
  osc.frequency.value = freq
  const env = ctx.createGain()
  env.gain.setValueAtTime(0, ctx.currentTime + startDelay)
  env.gain.linearRampToValueAtTime(0.3, ctx.currentTime + startDelay + 0.01)
  env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + duration)
  osc.connect(env)
  env.connect(gainNode)
  osc.start(ctx.currentTime + startDelay)
  osc.stop(ctx.currentTime + startDelay + duration)
}

function playMove(ctx: AudioContext, gainNode: GainNode) {
  playTone(ctx, gainNode, 800, 0.08, 'sine')
}

function playClick(ctx: AudioContext, gainNode: GainNode) {
  playTone(ctx, gainNode, 1000, 0.05, 'sine')
}

function playWin(ctx: AudioContext, gainNode: GainNode) {
  const notes = [523, 659, 784, 1047]
  notes.forEach((freq, i) => {
    playTone(ctx, gainNode, freq, 0.3, 'sine', i * 0.12)
  })
}

function playDraw(ctx: AudioContext, gainNode: GainNode) {
  playTone(ctx, gainNode, 440, 0.4, 'triangle')
  playTone(ctx, gainNode, 440, 0.4, 'triangle', 0.25)
}

function playThinking(ctx: AudioContext, gainNode: GainNode) {
  playTone(ctx, gainNode, 600, 0.15, 'triangle')
  playTone(ctx, gainNode, 500, 0.15, 'triangle', 0.1)
}

const sfxPlayers: Record<SFXName, (ctx: AudioContext, gain: GainNode) => void> = {
  move: playMove,
  click: playClick,
  win: playWin,
  draw: playDraw,
  thinking: playThinking,
}

export function createSFXEngine(audioCtx: AudioContext): SFXEngine {
  const gainNode = audioCtx.createGain()
  gainNode.connect(audioCtx.destination)

  function playSFX(name: SFXName) {
    const player = sfxPlayers[name]
    if (player) player(audioCtx, gainNode)
  }

  function setVolume(v: number) {
    gainNode.gain.value = v
  }

  return { playSFX, setVolume }
}
