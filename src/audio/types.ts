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

export const CDN_BASE = 'https://cdn.jsdelivr.net/gh/gww1981/gomoku-assets@main/audio'

export const BGM_URL = `${CDN_BASE}/bgm-mountain-stream.mp3`

export const SFX_URLS: Record<SFXName, string> = {
  move: `${CDN_BASE}/sfx-move.mp3`,
  win: `${CDN_BASE}/sfx-win.mp3`,
  draw: `${CDN_BASE}/sfx-draw.mp3`,
  thinking: `${CDN_BASE}/sfx-thinking.mp3`,
  click: `${CDN_BASE}/sfx-click.mp3`,
}
