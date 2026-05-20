// src/audio/types.ts

export type SFXName = 'move' | 'win' | 'draw' | 'thinking' | 'click'

export interface BGMTrack {
  id: string
  name: string
  type: 'synthetic' | 'file'
  source?: string
  emoji: string
}

export interface AudioState {
  bgmVolume: number
  sfxVolume: number
  muted: boolean
  currentTrackId: string
  customTrack: BGMTrack | null
  isTrackLoading: boolean
}

export interface AudioControls {
  toggleMute: () => void
  setBGMVolume: (v: number) => void
  setSFXVolume: (v: number) => void
  playSFX: (name: SFXName) => void
  resumeBGM: () => void
  stopBGM: () => void
  switchTrack: (trackId: string) => void
  loadCustomFile: (file: File) => void
}

export type AudioContextValue = AudioState & AudioControls
