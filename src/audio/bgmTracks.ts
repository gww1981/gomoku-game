import type { BGMTrack, BGMTrackId } from './types'

export const BGM_STORAGE_KEYS = {
  trackId: 'bgm-track-id',
  bgmVolume: 'bgm-volume',
  sfxVolume: 'sfx-volume',
  muted: 'muted',
} as const

export const MAX_CUSTOM_AUDIO_BYTES = 20 * 1024 * 1024

const TRACKS = [
  {
    id: 'synthetic',
    name: '古韵合成',
    type: 'synthetic',
    emoji: '🎼',
  },
  {
    id: 'shanshui',
    name: '山水清音',
    type: 'file',
    source: '/audio/shanshui.mp3',
    emoji: '🏞️',
  },
  {
    id: 'zhulin',
    name: '竹林幽径',
    type: 'file',
    source: '/audio/zhulin.mp3',
    emoji: '🎋',
  },
  {
    id: 'yuexia',
    name: '月下棋声',
    type: 'file',
    source: '/audio/yuexia.mp3',
    emoji: '🌙',
  },
] as const satisfies readonly BGMTrack[]

export const BUILT_IN_BGM_TRACKS: readonly BGMTrack[] = Object.freeze(
  TRACKS.map((track) => Object.freeze({ ...track }))
)

function cloneTrack(track: BGMTrack): BGMTrack {
  return { ...track } as BGMTrack
}

export function getAvailableBGMTracks(customTrack: BGMTrack | null): BGMTrack[] {
  const builtInTracks = BUILT_IN_BGM_TRACKS.map(cloneTrack)
  return customTrack ? [...builtInTracks, cloneTrack(customTrack)] : builtInTracks
}

export function findBGMTrack(trackId: BGMTrackId, customTrack: BGMTrack | null): BGMTrack | null {
  return getAvailableBGMTracks(customTrack).find((track) => track.id === trackId) ?? null
}

export function restoreTrackId(rawTrackId: string | null): BGMTrackId {
  if (
    rawTrackId === 'synthetic' ||
    rawTrackId === 'shanshui' ||
    rawTrackId === 'zhulin' ||
    rawTrackId === 'yuexia'
  ) {
    return rawTrackId
  }
  return 'synthetic'
}

export function restoreNumber(rawValue: string | null, fallback: number): number {
  if (rawValue === null) return fallback
  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, Math.min(1, parsed))
}

export function restoreBoolean(rawValue: string | null, fallback: boolean): boolean {
  if (rawValue === 'true') return true
  if (rawValue === 'false') return false
  return fallback
}
