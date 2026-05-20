import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSFXEngine } from './soundEffects'
import { SFX_URLS } from './types'
import type { SFXName } from './types'

function createMockAudioContext() {
  const gainNode = {
    gain: { value: 1, setValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }
  const bufferSource = {
    buffer: null as AudioBuffer | null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    addEventListener: vi.fn(),
  }
  const ctx = {
    createGain: vi.fn(() => gainNode),
    createBufferSource: vi.fn(() => bufferSource),
    decodeAudioData: vi.fn(async () => ({ duration: 0.5 })),
    destination: Symbol('destination'),
    state: 'running' as AudioContextState,
    resume: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
    _gainNode: gainNode,
    _bufferSource: bufferSource,
  }
  return ctx
}

describe('createSFXEngine', () => {
  let mockCtx: ReturnType<typeof createMockAudioContext>

  beforeEach(() => {
    mockCtx = createMockAudioContext()
    vi.spyOn(window, 'fetch').mockResolvedValue({
      arrayBuffer: async () => new ArrayBuffer(0),
    } as Response)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('preload 从 CDN URL 加载所有音效到缓存', async () => {
    const engine = createSFXEngine(mockCtx as unknown as AudioContext)
    await engine.preload()

    const sfxNames = Object.keys(SFX_URLS) as SFXName[]
    expect(mockCtx.decodeAudioData).toHaveBeenCalledTimes(sfxNames.length)
  })

  it('playSFX 创建 source 并连接 gainNode 播放', async () => {
    const engine = createSFXEngine(mockCtx as unknown as AudioContext)
    await engine.preload()
    mockCtx._bufferSource.connect.mockClear()

    engine.playSFX('move')

    expect(mockCtx.createBufferSource).toHaveBeenCalled()
    expect(mockCtx._bufferSource.connect).toHaveBeenCalledWith(mockCtx._gainNode)
    expect(mockCtx._bufferSource.start).toHaveBeenCalled()
  })

  it('setVolume 更新 gainNode 的 gain 值', () => {
    const engine = createSFXEngine(mockCtx as unknown as AudioContext)

    engine.setVolume(0.3)

    expect(mockCtx._gainNode.gain.value).toBe(0.3)
  })

  it('mute 时 playSFX 仍然调用但不发出声音', async () => {
    const engine = createSFXEngine(mockCtx as unknown as AudioContext)
    await engine.preload()
    engine.setVolume(0)
    mockCtx._bufferSource.start.mockClear()

    engine.playSFX('click')

    expect(mockCtx._bufferSource.start).toHaveBeenCalled()
    expect(mockCtx._gainNode.gain.value).toBe(0)
  })
})
