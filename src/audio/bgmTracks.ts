// src/audio/bgmTracks.ts
import type { BGMTrack } from './types'

export const BUILTIN_TRACKS: BGMTrack[] = [
  { id: 'synthetic', name: '古韵合成', type: 'synthetic', emoji: '🎼' },
  { id: 'shanshui', name: '山水清音', type: 'file', source: '/audio/shanshui.mp3', emoji: '🍵' },
  { id: 'zhulin', name: '竹林幽径', type: 'file', source: '/audio/zhulin.mp3', emoji: '🎋' },
  { id: 'yuexia', name: '月下棋声', type: 'file', source: '/audio/yuexia.mp3', emoji: '🌙' },
]

export function getTrackById(id: string, customTrack: BGMTrack | null): BGMTrack | undefined {
  if (id === 'custom' && customTrack) return customTrack
  return BUILTIN_TRACKS.find(t => t.id === id)
}
