// src/audio/types.ts

export type SFXName = 'move' | 'win' | 'draw' | 'thinking' | 'click'

export interface AudioState {
  bgmVolume: number
  sfxVolume: number
  muted: boolean
}

export interface AudioControls {
  toggleMute: () => void
  setBGMVolume: (v: number) => void
  setSFXVolume: (v: number) => void
  playSFX: (name: SFXName) => void
  resumeBGM: () => void
  stopBGM: () => void
}

export type AudioContextValue = AudioState & AudioControls
