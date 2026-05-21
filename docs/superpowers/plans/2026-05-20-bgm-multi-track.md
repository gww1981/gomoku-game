# BGM 多曲目系统实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为五子棋游戏添加多曲目背景音乐选择功能，支持3首内置古风音乐 + 现有合成BGM + 本地文件上传。

**Architecture:** 统一 BGMManager 管理合成引擎和文件播放引擎，对外接口一致。扩展现有 AudioPanel 增加曲目选择列表，AudioProvider 接入 BGMManager，localStorage 持久化用户偏好。

**Tech Stack:** React 19, TypeScript 6, Web Audio API, Vite 8, Vitest 4

---

## File Structure

### 新建文件
| File | Responsibility |
|------|---------------|
| `src/audio/bgmTracks.ts` | 曲目定义（BGMTrack 接口 + 内置曲目列表） |
| `src/audio/bgmManager.ts` | 统一 BGMManager，管理合成/文件引擎切换、淡入淡出 |
| `src/audio/bgmManager.test.ts` | BGMManager 单元测试 |
| `src/audio/storage.ts` | localStorage 读写工具 |
| `src/audio/storage.test.ts` | storage 工具测试 |
| `public/audio/.gitkeep` | 音频资源目录占位（实际 mp3 后续添加） |

### 修改文件
| File | Changes |
|------|---------|
| `src/audio/types.ts` | 扩展 AudioState + AudioControls 接口 |
| `src/audio/AudioContext.tsx` | 接入 BGMManager，新增 switchTrack/loadCustomFile，localStorage 持久化 |
| `src/audio/AudioContext.test.tsx` | 扩展测试覆盖新接口 |
| `src/components/AudioPanel.tsx` | 新增曲目选择列表 UI + 本地文件选择 |
| `src/components/AudioPanel.css` | 新增曲目列表样式 |
| `src/components/AudioPanel.test.tsx` | 扩展测试覆盖曲目切换 |

---

## Task 1: 扩展类型定义 + 曲目数据

**Files:**
- Modify: `src/audio/types.ts`
- Create: `src/audio/bgmTracks.ts`

- [ ] **Step 1: 扩展 AudioState 和 AudioControls 接口**

修改 `src/audio/types.ts`，新增字段：

```typescript
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
```

- [ ] **Step 2: 创建曲目定义**

创建 `src/audio/bgmTracks.ts`：

```typescript
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
```

- [ ] **Step 3: 运行测试确认编译通过**

Run: `npx vitest run src/audio/types.ts --reporter=verbose 2>&1 || echo "types.ts is not a test file, skipping"`

- [ ] **Step 4: Commit**

```bash
git add src/audio/types.ts src/audio/bgmTracks.ts
git commit -m "feat(audio): 扩展 BGMTrack 类型和内置曲目定义"
```

---

## Task 2: localStorage 工具

**Files:**
- Create: `src/audio/storage.ts`
- Create: `src/audio/storage.test.ts`

- [ ] **Step 1: 写 storage 的失败测试**

创建 `src/audio/storage.test.ts`：

```typescript
// src/audio/storage.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadAudioSettings, saveAudioSettings, clearAudioSettings } from './storage'

describe('audio storage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('loadAudioSettings 在空 localStorage 时返回默认值', () => {
    const result = loadAudioSettings()
    expect(result).toEqual({
      bgmVolume: 0.5,
      sfxVolume: 0.7,
      muted: false,
      currentTrackId: 'synthetic',
    })
  })

  it('loadAudioSettings 从 localStorage 恢复已保存的值', () => {
    localStorage.setItem('gomoku-bgm-volume', '0.8')
    localStorage.setItem('gomoku-sfx-volume', '0.3')
    localStorage.setItem('gomoku-muted', 'true')
    localStorage.setItem('gomoku-track-id', 'shanshui')

    const result = loadAudioSettings()
    expect(result).toEqual({
      bgmVolume: 0.8,
      sfxVolume: 0.3,
      muted: true,
      currentTrackId: 'shanshui',
    })
  })

  it('saveAudioSettings 将值写入 localStorage', () => {
    saveAudioSettings({
      bgmVolume: 0.6,
      sfxVolume: 0.9,
      muted: true,
      currentTrackId: 'zhulin',
    })

    expect(localStorage.getItem('gomoku-bgm-volume')).toBe('0.6')
    expect(localStorage.getItem('gomoku-sfx-volume')).toBe('0.9')
    expect(localStorage.getItem('gomoku-muted')).toBe('true')
    expect(localStorage.getItem('gomoku-track-id')).toBe('zhulin')
  })

  it('clearAudioSettings 清除所有音频设置', () => {
    saveAudioSettings({
      bgmVolume: 0.6,
      sfxVolume: 0.9,
      muted: true,
      currentTrackId: 'zhulin',
    })
    clearAudioSettings()
    expect(loadAudioSettings()).toEqual({
      bgmVolume: 0.5,
      sfxVolume: 0.7,
      muted: false,
      currentTrackId: 'synthetic',
    })
  })

  it('loadAudioSettings 处理无效 localStorage 值', () => {
    localStorage.setItem('gomoku-bgm-volume', 'not-a-number')
    localStorage.setItem('gomoku-muted', 'not-a-boolean')

    const result = loadAudioSettings()
    expect(result.bgmVolume).toBe(0.5)
    expect(result.muted).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/audio/storage.test.ts --reporter=verbose`
Expected: FAIL — `Cannot find module './storage'`

- [ ] **Step 3: 实现 storage**

创建 `src/audio/storage.ts`：

```typescript
// src/audio/storage.ts

interface AudioSettings {
  bgmVolume: number
  sfxVolume: number
  muted: boolean
  currentTrackId: string
}

const KEYS = {
  bgmVolume: 'gomoku-bgm-volume',
  sfxVolume: 'gomoku-sfx-volume',
  muted: 'gomoku-muted',
  trackId: 'gomoku-track-id',
} as const

const DEFAULTS: AudioSettings = {
  bgmVolume: 0.5,
  sfxVolume: 0.7,
  muted: false,
  currentTrackId: 'synthetic',
}

function readNumber(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    const n = Number(raw)
    return Number.isFinite(n) ? n : fallback
  } catch {
    return fallback
  }
}

function readBoolean(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return raw === 'true'
  } catch {
    return fallback
  }
}

function readString(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

export function loadAudioSettings(): AudioSettings {
  return {
    bgmVolume: readNumber(KEYS.bgmVolume, DEFAULTS.bgmVolume),
    sfxVolume: readNumber(KEYS.sfxVolume, DEFAULTS.sfxVolume),
    muted: readBoolean(KEYS.muted, DEFAULTS.muted),
    currentTrackId: readString(KEYS.trackId, DEFAULTS.currentTrackId),
  }
}

export function saveAudioSettings(settings: AudioSettings): void {
  try {
    localStorage.setItem(KEYS.bgmVolume, String(settings.bgmVolume))
    localStorage.setItem(KEYS.sfxVolume, String(settings.sfxVolume))
    localStorage.setItem(KEYS.muted, String(settings.muted))
    localStorage.setItem(KEYS.trackId, settings.currentTrackId)
  } catch {
    // localStorage quota exceeded or unavailable — silently ignore
  }
}

export function clearAudioSettings(): void {
  try {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k))
  } catch {
    // silently ignore
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/audio/storage.test.ts --reporter=verbose`
Expected: 5 passed

- [ ] **Step 5: Commit**

```bash
git add src/audio/storage.ts src/audio/storage.test.ts
git commit -m "feat(audio): 添加 localStorage 音频设置持久化工具"
```

---

## Task 3: BGMManager 统一管理器

**Files:**
- Create: `src/audio/bgmManager.ts`
- Create: `src/audio/bgmManager.test.ts`

- [ ] **Step 1: 写 BGMManager 的失败测试**

创建 `src/audio/bgmManager.test.ts`：

```typescript
// src/audio/bgmManager.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createBGMManager } from './bgmManager'
import type { BGMTrack } from './types'

function createMockAudioContext() {
  const gainNodes: Array<{ gain: { value: number }; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }> = []
  const oscNodes: Array<{ type: string; frequency: { value: number }; connect: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }> = []
  const buffers: Array<{ getChannelData: ReturnType<typeof vi.fn>; numberOfChannels: number; duration: number }> = []

  const ctx = {
    createGain: vi.fn(() => {
      const g = {
        gain: {
          value: 1,
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
          cancelScheduledValues: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      }
      gainNodes.push(g)
      return g
    }),
    createOscillator: vi.fn(() => {
      const o = {
        type: 'sine' as OscillatorType,
        frequency: { value: 0 },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      }
      oscNodes.push(o)
      return o
    }),
    createBufferSource: vi.fn(() => ({
      buffer: null as AudioBuffer | null,
      loop: false,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
    decodeAudioData: vi.fn(async () => {
      const buf = {
        getChannelData: vi.fn(() => new Float32Array(100)),
        numberOfChannels: 2,
        duration: 30,
      }
      buffers.push(buf)
      return buf
    }),
    destination: Symbol('destination'),
    state: 'running' as AudioContextState,
    resume: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
    currentTime: 0,
    _gainNodes: gainNodes,
    _oscNodes: oscNodes,
    _buffers: buffers,
  }
  return ctx
}

// Mock fetch for file loading
const mockFetch = vi.fn()

describe('createBGMManager', () => {
  let mockCtx: ReturnType<typeof createMockAudioContext>

  beforeEach(() => {
    mockCtx = createMockAudioContext()
    vi.stubGlobal('fetch', mockFetch)
    vi.stubGlobal('AudioContext', class {
      createGain = mockCtx.createGain
      createOscillator = mockCtx.createOscillator
      createBufferSource = mockCtx.createBufferSource
      decodeAudioData = mockCtx.decodeAudioData
      destination = mockCtx.destination
      state = mockCtx.state
      resume = mockCtx.resume
      close = mockCtx.close
      currentTime = 0
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('getAvailableTracks 返回4首内置曲目', () => {
    const manager = createBGMManager()
    const tracks = manager.getAvailableTracks()
    expect(tracks).toHaveLength(4)
    expect(tracks.map(t => t.id)).toEqual(['synthetic', 'shanshui', 'zhulin', 'yuexia'])
  })

  it('getCurrentTrack 默认返回 synthetic', () => {
    const manager = createBGMManager()
    expect(manager.getCurrentTrack().id).toBe('synthetic')
  })

  it('switchTrack 切换到指定曲目', () => {
    const manager = createBGMManager()
    manager.switchTrack('shanshui')
    expect(manager.getCurrentTrack().id).toBe('shanshui')
  })

  it('switchTrack 到 custom 使用自定义曲目', () => {
    const manager = createBGMManager()
    const customTrack: BGMTrack = { id: 'custom', name: '我的音乐', type: 'file', source: 'blob:http://...', emoji: '🎵' }
    manager.setCustomTrack(customTrack)
    manager.switchTrack('custom')
    expect(manager.getCurrentTrack().id).toBe('custom')
    expect(manager.getCurrentTrack().name).toBe('我的音乐')
  })

  it('switchTrack 无效 ID 保持当前曲目不变', () => {
    const manager = createBGMManager()
    manager.switchTrack('nonexistent')
    expect(manager.getCurrentTrack().id).toBe('synthetic')
  })

  it('setVolume 设置音量', () => {
    const manager = createBGMManager()
    manager.setVolume(0.8)
    // 不抛异常即通过，音量值通过引擎内部验证
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/audio/bgmManager.test.ts --reporter=verbose`
Expected: FAIL — `Cannot find module './bgmManager'`

- [ ] **Step 3: 实现 BGMManager**

创建 `src/audio/bgmManager.ts`：

```typescript
// src/audio/bgmManager.ts
import type { BGMTrack } from './types'
import { BUILTIN_TRACKS } from './bgmTracks'

export interface BGMManager {
  start: () => void
  stop: () => void
  switchTrack: (trackId: string) => void
  setVolume: (v: number) => void
  getAvailableTracks: () => BGMTrack[]
  getCurrentTrack: () => BGMTrack
  setCustomTrack: (track: BGMTrack) => void
}

export function createBGMManager(): BGMManager {
  let audioCtx: AudioContext | null = null
  let currentTrack: BGMTrack = BUILTIN_TRACKS[0]
  let customTrack: BGMTrack | null = null
  let masterGain: GainNode | null = null
  let volume = 0.5
  let isPlaying = false

  // Synthetic engine state
  let loopTimer: number | null = null

  // File engine state
  let fileBufferSource: AudioBufferSourceNode | null = null
  let fileBuffer: AudioBuffer | null = null

  const SCALE = [
    261.63, 293.66, 329.63, 392.00, 440.00,
    523.25, 587.33, 659.25, 783.99, 880.00,
  ]
  const MELODY: [number, number][] = [
    [0, 2], [2, 1], [4, 1], [5, 2], [4, 1], [2, 1],
    [0, 2], [1, 1], [2, 1], [4, 2], [2, 1], [1, 1],
    [0, 1], [2, 1], [4, 1], [5, 1], [7, 2], [5, 1], [4, 1],
    [2, 2], [0, 1], [1, 1], [0, 2],
  ]
  const BEAT_DURATION = 0.4
  const LOOP_DURATION = MELODY.reduce((sum, [, dur]) => sum + dur * BEAT_DURATION, 0)
  const FADE_DURATION = 0.5

  function ensureContext(ctx: AudioContext) {
    if (!audioCtx) {
      audioCtx = ctx
      masterGain = ctx.createGain()
      masterGain.gain.value = volume
      masterGain.connect(ctx.destination)
    }
  }

  function stopSynthetic() {
    if (loopTimer !== null) {
      clearTimeout(loopTimer)
      loopTimer = null
    }
  }

  function stopFile() {
    if (fileBufferSource) {
      try {
        // Fade out
        if (masterGain) {
          masterGain.gain.setValueAtTime(masterGain.gain.value, audioCtx!.currentTime)
          masterGain.gain.linearRampToValueAtTime(0, audioCtx!.currentTime + FADE_DURATION)
        }
        setTimeout(() => {
          try { fileBufferSource?.stop() } catch { /* already stopped */ }
          fileBufferSource = null
        }, FADE_DURATION * 1000)
      } catch {
        fileBufferSource = null
      }
    }
  }

  function playSynthetic() {
    if (!audioCtx || !masterGain || !isPlaying) return
    const now = audioCtx.currentTime
    let offset = 0

    for (const [noteIdx, beats] of MELODY) {
      const freq = SCALE[noteIdx]
      const dur = beats * BEAT_DURATION

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

    loopTimer = window.setTimeout(() => playSynthetic(), LOOP_DURATION * 1000 - 50)
  }

  async function loadAndPlayFile(source: string) {
    if (!audioCtx || !masterGain) return
    try {
      const response = await fetch(source)
      const arrayBuffer = await response.arrayBuffer()
      fileBuffer = await audioCtx.decodeAudioData(arrayBuffer)
      playFileBuffer()
    } catch {
      // File load failed — do nothing, stay on current state
    }
  }

  function playFileBuffer() {
    if (!audioCtx || !masterGain || !fileBuffer || !isPlaying) return
    fileBufferSource = audioCtx.createBufferSource()
    fileBufferSource.buffer = fileBuffer
    fileBufferSource.loop = true
    fileBufferSource.connect(masterGain)

    // Fade in
    masterGain.gain.setValueAtTime(0, audioCtx.currentTime)
    masterGain.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + FADE_DURATION)

    fileBufferSource.start()
  }

  function startCurrentTrack() {
    if (!audioCtx) return
    if (currentTrack.type === 'synthetic') {
      playSynthetic()
    } else if (currentTrack.source) {
      loadAndPlayFile(currentTrack.source)
    }
  }

  return {
    start() {
      isPlaying = true
      startCurrentTrack()
    },

    stop() {
      isPlaying = false
      stopSynthetic()
      stopFile()
    },

    switchTrack(trackId: string) {
      const allTracks = customTrack
        ? [...BUILTIN_TRACKS, customTrack]
        : BUILTIN_TRACKS
      const target = allTracks.find(t => t.id === trackId)
      if (!target) return
      if (target.id === currentTrack.id) return

      // Stop old
      stopSynthetic()
      stopFile()

      currentTrack = target

      // Start new if was playing
      if (isPlaying && audioCtx) {
        startCurrentTrack()
      }
    },

    setVolume(v: number) {
      volume = v
      if (masterGain) {
        masterGain.gain.value = v
      }
    },

    getAvailableTracks() {
      return customTrack
        ? [...BUILTIN_TRACKS, customTrack]
        : BUILTIN_TRACKS
    },

    getCurrentTrack() {
      return currentTrack
    },

    setCustomTrack(track: BGMTrack) {
      customTrack = track
    },
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/audio/bgmManager.test.ts --reporter=verbose`
Expected: 6 passed

- [ ] **Step 5: Commit**

```bash
git add src/audio/bgmManager.ts src/audio/bgmManager.test.ts
git commit -m "feat(audio): 添加 BGMManager 统一管理器"
```

---

## Task 4: AudioProvider 接入 BGMManager

**Files:**
- Modify: `src/audio/AudioContext.tsx`
- Modify: `src/audio/AudioContext.test.tsx`

- [ ] **Step 1: 扩展 AudioProvider**

修改 `src/audio/AudioContext.tsx`：

```typescript
// src/audio/AudioContext.tsx
import { createContext, useState, useRef, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'
import { createSFXEngine } from './soundEffects'
import { createBGMManager } from './bgmManager'
import type { AudioContextValue, SFXName, BGMTrack } from './types'
import { loadAudioSettings, saveAudioSettings } from './storage'

// eslint-disable-next-line react-refresh/only-export-components
export const AudioCtx = createContext<AudioContextValue | null>(null)

export function AudioProvider({ children }: { children: ReactNode }) {
  const savedSettings = loadAudioSettings()
  const [bgmVolume, setBGMVolumeState] = useState(savedSettings.bgmVolume)
  const [sfxVolume, setSFXVolumeState] = useState(savedSettings.sfxVolume)
  const [muted, setMuted] = useState(savedSettings.muted)
  const [currentTrackId, setCurrentTrackId] = useState(savedSettings.currentTrackId)
  const [customTrack, setCustomTrack] = useState<BGMTrack | null>(null)
  const [isTrackLoading, setIsTrackLoading] = useState(false)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const sfxEngineRef = useRef<ReturnType<typeof createSFXEngine> | null>(null)
  const bgmManagerRef = useRef<ReturnType<typeof createBGMManager> | null>(null)
  const initializedRef = useRef(false)
  const mutedRef = useRef(savedSettings.muted)
  const sfxVolumeRef = useRef(savedSettings.sfxVolume)
  const bgmVolumeRef = useRef(savedSettings.bgmVolume)

  const initAudio = useCallback(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    sfxEngineRef.current = createSFXEngine(ctx)
    sfxEngineRef.current.setVolume(sfxVolumeRef.current)
    bgmManagerRef.current = createBGMManager()
    bgmManagerRef.current.setVolume(bgmVolumeRef.current)
    // Restore saved track
    if (savedSettings.currentTrackId !== 'synthetic') {
      bgmManagerRef.current.switchTrack(savedSettings.currentTrackId)
    }
  }, [])

  useEffect(() => {
    initAudio()

    const handleFirstInteraction = () => {
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume().catch(() => {})
      }
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('keydown', handleFirstInteraction)
    }

    document.addEventListener('click', handleFirstInteraction)
    document.addEventListener('keydown', handleFirstInteraction)

    return () => {
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('keydown', handleFirstInteraction)
    }
  }, [initAudio])

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev
      mutedRef.current = next
      if (next) {
        bgmManagerRef.current?.stop()
        sfxEngineRef.current?.setVolume(0)
      } else {
        bgmManagerRef.current?.start()
        sfxEngineRef.current?.setVolume(sfxVolumeRef.current)
      }
      return next
    })
  }, [])

  const setBGMVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v))
    setBGMVolumeState(clamped)
    bgmVolumeRef.current = clamped
    bgmManagerRef.current?.setVolume(clamped)
    saveAudioSettings({
      bgmVolume: clamped,
      sfxVolume: sfxVolumeRef.current,
      muted: mutedRef.current,
      currentTrackId,
    })
  }, [currentTrackId])

  const setSFXVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v))
    setSFXVolumeState(clamped)
    sfxVolumeRef.current = clamped
    if (!mutedRef.current) {
      sfxEngineRef.current?.setVolume(clamped)
    }
    saveAudioSettings({
      bgmVolume: bgmVolumeRef.current,
      sfxVolume: clamped,
      muted: mutedRef.current,
      currentTrackId,
    })
  }, [currentTrackId])

  const playSFX = useCallback((name: SFXName) => {
    if (mutedRef.current) return
    sfxEngineRef.current?.playSFX(name)
  }, [])

  const resumeBGM = useCallback(() => {
    if (mutedRef.current) return
    bgmManagerRef.current?.start()
  }, [])

  const stopBGM = useCallback(() => {
    bgmManagerRef.current?.stop()
  }, [])

  const switchTrack = useCallback((trackId: string) => {
    setCurrentTrackId(trackId)
    bgmManagerRef.current?.switchTrack(trackId)
    saveAudioSettings({
      bgmVolume: bgmVolumeRef.current,
      sfxVolume: sfxVolumeRef.current,
      muted: mutedRef.current,
      currentTrackId: trackId,
    })
    // If currently playing, restart with new track
    if (!mutedRef.current) {
      bgmManagerRef.current?.stop()
      bgmManagerRef.current?.start()
    }
  }, [])

  const loadCustomFile = useCallback((file: File) => {
    if (!audioCtxRef.current) return

    const MAX_SIZE = 20 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      alert('文件过大，请选择小于 20MB 的音频文件')
      return
    }

    setIsTrackLoading(true)
    const objectUrl = URL.createObjectURL(file)
    const track: BGMTrack = {
      id: 'custom',
      name: file.name.replace(/\.[^.]+$/, ''),
      type: 'file',
      source: objectUrl,
      emoji: '🎵',
    }
    setCustomTrack(track)
    bgmManagerRef.current?.setCustomTrack(track)

    // Switch to custom track
    setCurrentTrackId('custom')
    bgmManagerRef.current?.switchTrack('custom')
    saveAudioSettings({
      bgmVolume: bgmVolumeRef.current,
      sfxVolume: sfxVolumeRef.current,
      muted: mutedRef.current,
      currentTrackId: 'custom',
    })

    if (!mutedRef.current) {
      bgmManagerRef.current?.stop()
      bgmManagerRef.current?.start()
    }
    setIsTrackLoading(false)
  }, [])

  useEffect(() => {
    mutedRef.current = muted
    sfxVolumeRef.current = sfxVolume
    bgmVolumeRef.current = bgmVolume
  }, [muted, sfxVolume, bgmVolume])

  useEffect(() => {
    return () => {
      bgmManagerRef.current?.stop()
      audioCtxRef.current?.close().catch(() => {})
      audioCtxRef.current = null
      sfxEngineRef.current = null
      bgmManagerRef.current = null
      initializedRef.current = false
    }
  }, [])

  const value: AudioContextValue = {
    bgmVolume,
    sfxVolume,
    muted,
    currentTrackId,
    customTrack,
    isTrackLoading,
    toggleMute,
    setBGMVolume,
    setSFXVolume,
    playSFX,
    resumeBGM,
    stopBGM,
    switchTrack,
    loadCustomFile,
  }

  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>
}
```

- [ ] **Step 2: 更新 AudioContext 测试**

修改 `src/audio/AudioContext.test.tsx`，在现有测试中补充新字段验证：

```typescript
// 在现有测试的 expect(result.current) 检查中添加：
expect(result.current.currentTrackId).toBe('synthetic')
expect(result.current.customTrack).toBeNull()
expect(result.current.isTrackLoading).toBe(false)
expect(typeof result.current.switchTrack).toBe('function')
expect(typeof result.current.loadCustomFile).toBe('function')
```

新增测试：

```typescript
it('switchTrack 更新 currentTrackId', () => {
  const { result } = renderHook(() => useAudio(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <AudioProvider>{children}</AudioProvider>
    ),
  })
  act(() => result.current.switchTrack('shanshui'))
  expect(result.current.currentTrackId).toBe('shanshui')
})

it('switchTrack 无效 ID 保持 currentTrackId 不变', () => {
  const { result } = renderHook(() => useAudio(), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <AudioProvider>{children}</AudioProvider>
    ),
  })
  act(() => result.current.switchTrack('nonexistent'))
  expect(result.current.currentTrackId).toBe('synthetic')
})
```

- [ ] **Step 3: 运行全部测试确认通过**

Run: `npx vitest run --reporter=verbose`
Expected: 全部通过

- [ ] **Step 4: Commit**

```bash
git add src/audio/AudioContext.tsx src/audio/AudioContext.test.tsx
git commit -m "feat(audio): AudioProvider 接入 BGMManager + localStorage 持久化"
```

---

## Task 5: AudioPanel 曲目选择 UI

**Files:**
- Modify: `src/components/AudioPanel.tsx`
- Modify: `src/components/AudioPanel.css`

- [ ] **Step 1: 扩展 AudioPanel 组件**

修改 `src/components/AudioPanel.tsx`：

```tsx
// src/components/AudioPanel.tsx
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAudio } from '../audio/useAudio'
import { BUILTIN_TRACKS } from '../audio/bgmTracks'
import './AudioPanel.css'

export function AudioPanel() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    bgmVolume, sfxVolume, muted, currentTrackId, isTrackLoading,
    toggleMute, setBGMVolume, setSFXVolume, switchTrack, loadCustomFile,
  } = useAudio()

  const handleClose = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      loadCustomFile(file)
    }
    e.target.value = ''
  }, [loadCustomFile])

  return (
    <div className="audio-panel-float" ref={panelRef}>
      <button
        type="button"
        className={`audio-toggle-btn${muted ? ' muted' : ''}`}
        aria-label="音频控制"
        onClick={() => setOpen((o) => !o)}
      >
        {muted ? '🔇' : '🎵'}
      </button>

      {open && (
        <div className="audio-panel-body">
          <div className="audio-panel-header">
            <span>音频控制</span>
            <button
              type="button"
              className="audio-close-btn"
              aria-label="关闭"
              onClick={handleClose}
            >
              ✕
            </button>
          </div>

          <div className="audio-slider-group">
            <div className="audio-slider-label">
              <span>背景音乐</span>
              <span className="audio-slider-value">{Math.round(bgmVolume * 100)}%</span>
            </div>
            <input
              type="range"
              className={`audio-slider${muted ? ' muted-slider' : ''}`}
              aria-label="背景音乐音量"
              min={0}
              max={1}
              step={0.01}
              value={bgmVolume}
              onChange={(e) => setBGMVolume(Number(e.target.value))}
            />
          </div>

          <div className="audio-slider-group">
            <div className="audio-slider-label">
              <span>音效</span>
              <span className="audio-slider-value">{Math.round(sfxVolume * 100)}%</span>
            </div>
            <input
              type="range"
              className={`audio-slider${muted ? ' muted-slider' : ''}`}
              aria-label="音效音量"
              min={0}
              max={1}
              step={0.01}
              value={sfxVolume}
              onChange={(e) => setSFXVolume(Number(e.target.value))}
            />
          </div>

          <div className="audio-track-section">
            <div className="audio-track-label">选择曲目</div>
            <div className="audio-track-list">
              {BUILTIN_TRACKS.map((track) => (
                <button
                  key={track.id}
                  type="button"
                  className={`audio-track-item${currentTrackId === track.id ? ' active' : ''}`}
                  disabled={isTrackLoading}
                  onClick={() => switchTrack(track.id)}
                >
                  <span className="audio-track-emoji">{track.emoji}</span>
                  <span className="audio-track-name">{track.name}</span>
                </button>
              ))}
              <button
                type="button"
                className="audio-track-item audio-track-custom"
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="audio-track-emoji">📁</span>
                <span className="audio-track-name">选择本地文件...</span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              aria-label="选择本地音频文件"
            />
          </div>

          <button
            type="button"
            className={`audio-mute-btn${muted ? ' is-muted' : ''}`}
            aria-label={muted ? '取消静音' : '静音'}
            onClick={toggleMute}
          >
            {muted ? '🔇 取消静音' : '🔊 静音'}
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 添加曲目列表样式**

在 `src/components/AudioPanel.css` 末尾追加：

```css
/* BGM Track Selector */
.audio-track-section {
  margin-bottom: 12px;
}

.audio-track-label {
  color: var(--text-secondary);
  font-size: 0.82rem;
  margin-bottom: 6px;
}

.audio-track-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.audio-track-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border: none;
  border-radius: 4px;
  background: rgba(42, 27, 18, 0.6);
  color: var(--text-secondary);
  font-size: 0.82rem;
  cursor: pointer;
  text-align: left;
  transition:
    background 120ms ease,
    color 120ms ease;
}

.audio-track-item:hover {
  background: rgba(52, 34, 23, 0.88);
  color: var(--text-primary);
}

.audio-track-item.active {
  background: var(--accent-gold);
  color: #1a1410;
  font-weight: 600;
}

.audio-track-item:disabled {
  opacity: 0.5;
  pointer-events: none;
}

.audio-track-custom {
  border: 1px dashed rgba(90, 79, 63, 0.6);
}

.audio-track-emoji {
  font-size: 1rem;
  flex-shrink: 0;
}

.audio-track-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

- [ ] **Step 3: 运行测试确认编译通过**

Run: `npx vitest run --reporter=verbose`
Expected: 全部通过

- [ ] **Step 4: Commit**

```bash
git add src/components/AudioPanel.tsx src/components/AudioPanel.css
git commit -m "feat(ui): AudioPanel 新增曲目选择列表和本地文件选择"
```

---

## Task 6: AudioPanel 曲目测试

**Files:**
- Modify: `src/components/AudioPanel.test.tsx`

- [ ] **Step 1: 扩展 AudioPanel 测试**

修改 `src/components/AudioPanel.test.tsx`，更新 mockAudioValue 并添加新测试：

```typescript
// 更新 mockAudioValue，添加新字段和方法
const mockAudioValue: AudioContextValue = {
  bgmVolume: 0.5,
  sfxVolume: 0.7,
  muted: false,
  currentTrackId: 'synthetic',
  customTrack: null,
  isTrackLoading: false,
  toggleMute: vi.fn(),
  setBGMVolume: vi.fn(),
  setSFXVolume: vi.fn(),
  playSFX: vi.fn(),
  resumeBGM: vi.fn(),
  stopBGM: vi.fn(),
  switchTrack: vi.fn(),
  loadCustomFile: vi.fn(),
}
```

新增测试用例：

```typescript
it('展开面板显示曲目选择列表', () => {
  renderPanel()
  fireEvent.click(screen.getByRole('button', { name: '音频控制' }))
  expect(screen.getByText('选择曲目')).toBeInTheDocument()
  expect(screen.getByText('古韵合成')).toBeInTheDocument()
  expect(screen.getByText('山水清音')).toBeInTheDocument()
  expect(screen.getByText('竹林幽径')).toBeInTheDocument()
  expect(screen.getByText('月下棋声')).toBeInTheDocument()
  expect(screen.getByText('选择本地文件...')).toBeInTheDocument()
})

it('点击曲目调用 switchTrack', () => {
  const switchTrack = vi.fn()
  renderPanel({ switchTrack })
  fireEvent.click(screen.getByRole('button', { name: '音频控制' }))
  fireEvent.click(screen.getByText('山水清音'))
  expect(switchTrack).toHaveBeenCalledWith('shanshui')
})

it('当前曲目显示 active 样式', () => {
  renderPanel({ currentTrackId: 'zhulin' })
  fireEvent.click(screen.getByRole('button', { name: '音频控制' }))
  const items = screen.getAllByRole('button')
  const zhulinItem = items.find(el => el.textContent?.includes('竹林幽径'))
  expect(zhulinItem).toHaveClass('active')
})

it('点击本地文件按钮触发文件选择器', () => {
  renderPanel()
  fireEvent.click(screen.getByRole('button', { name: '音频控制' }))
  const fileInput = screen.getByLabelText('选择本地音频文件')
  const clickSpy = vi.spyOn(fileInput, 'click')
  fireEvent.click(screen.getByText('选择本地文件...'))
  expect(clickSpy).toHaveBeenCalled()
  clickSpy.mockRestore()
})
```

- [ ] **Step 2: 运行测试确认通过**

Run: `npx vitest run src/components/AudioPanel.test.tsx --reporter=verbose`
Expected: 全部通过

- [ ] **Step 3: 运行全量测试确认无回归**

Run: `npx vitest run --reporter=verbose`
Expected: 全部通过

- [ ] **Step 4: 创建音频资源目录**

```bash
mkdir -p public/audio
touch public/audio/.gitkeep
git add public/audio/.gitkeep
```

- [ ] **Step 5: Commit**

```bash
git add src/components/AudioPanel.test.tsx public/audio/.gitkeep
git commit -m "test(audio): 扩展 AudioPanel 曲目切换测试覆盖"
```

---

## Task 7: 最终验证

- [ ] **Step 1: 运行完整测试套件**

Run: `npx vitest run --reporter=verbose`
Expected: 全部通过，0 failures

- [ ] **Step 2: 构建项目确认无编译错误**

Run: `npx vite build 2>&1`
Expected: 构建成功

- [ ] **Step 3: 检查 git 状态确认无遗漏文件**

Run: `git status`
Expected: clean working tree
