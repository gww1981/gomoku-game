// src/audio/types.ts

export type SFXName = 'move' | 'win' | 'draw' | 'thinking' | 'click'

export type PresetBGMTrackId = 'preset-1' | 'preset-2' | 'preset-3' | 'preset-4' | 'preset-5'
export type BGMTrackId = 'synthetic' | PresetBGMTrackId | 'custom'

interface BaseBGMTrack {
  id: BGMTrackId
  name: string
  emoji: string
}

export interface SyntheticBGMTrack extends BaseBGMTrack {
  id: 'synthetic'
  type: 'synthetic'
}

export interface FileBGMTrack extends BaseBGMTrack {
  id: Exclude<BGMTrackId, 'synthetic'>
  type: 'file'
  source: string
}

export type BGMTrack = SyntheticBGMTrack | FileBGMTrack

export type AudioErrorMessage =
  | '网络音频加载失败，已切换回合成BGM'
  | '不支持的音频格式'
  | '文件过大，请选择较小的音频文件'
  | null

export interface AudioState {
  bgmVolume: number
  sfxVolume: number
  muted: boolean
  currentTrackId: BGMTrackId
  availableTracks: BGMTrack[]
  customTrack: BGMTrack | null
  isTrackLoading: boolean
  audioError: AudioErrorMessage
}

export interface AudioControls {
  toggleMute: () => void
  setBGMVolume: (v: number) => void
  setSFXVolume: (v: number) => void
  playSFX: (name: SFXName) => void
  resumeBGM: () => void
  stopBGM: () => void
  switchTrack: (trackId: BGMTrackId) => Promise<void>
  loadCustomFile: (file: File) => Promise<void>
  clearAudioError: () => void
}

export type AudioContextValue = AudioState & AudioControls
