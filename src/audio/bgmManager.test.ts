import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createBGMManager } from './bgmManager'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function createMockAudioContext() {
  class MockAudioContext {
    destination = Symbol('destination')
    currentTime = 1
    createGain = vi.fn(() => ({
      gain: {
        value: 1,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        cancelScheduledValues: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
    }))
    createOscillator = vi.fn(() => ({
      type: 'sine',
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }))
    createBufferSource = vi.fn(() => ({
      buffer: null,
      loop: false,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
    }))
    decodeAudioData = vi.fn(async () => ({ duration: 3 }))
  }

  return MockAudioContext
}

describe('createBGMManager', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    })))
    vi.stubGlobal('URL', {
      createObjectURL: vi
        .fn()
        .mockReturnValueOnce('blob:first-track')
        .mockReturnValueOnce('blob:second-track')
        .mockReturnValue('blob:custom-track'),
      revokeObjectURL: vi.fn(),
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('starts on the synthetic track by default', () => {
    const MockAudioContext = createMockAudioContext()
    const ctx = new MockAudioContext() as unknown as AudioContext
    const manager = createBGMManager()

    manager.start(ctx)

    expect(manager.getCurrentTrack().id).toBe('synthetic')
    expect(ctx.createOscillator).toHaveBeenCalled()
    manager.dispose()
  })

  it('switches to a file track and reports loading state', async () => {
    const MockAudioContext = createMockAudioContext()
    const ctx = new MockAudioContext() as unknown as AudioContext
    const onLoadingChange = vi.fn()
    const manager = createBGMManager({ onLoadingChange })

    manager.start(ctx)
    await manager.switchTrack('shanshui')

    expect(fetch).toHaveBeenCalledWith('/audio/shanshui.mp3')
    expect(ctx.decodeAudioData).toHaveBeenCalled()
    expect(manager.getCurrentTrack().id).toBe('shanshui')
    expect(onLoadingChange).toHaveBeenCalledWith(true)
    expect(onLoadingChange).toHaveBeenLastCalledWith(false)
    manager.dispose()
  })

  it('clears loading when switching back to synthetic during a pending file load', async () => {
    const pendingResponse = deferred<Response>()
    vi.stubGlobal('fetch', vi.fn(() => pendingResponse.promise))
    const MockAudioContext = createMockAudioContext()
    const ctx = new MockAudioContext() as unknown as AudioContext
    const onLoadingChange = vi.fn()
    const manager = createBGMManager({ onLoadingChange })

    manager.start(ctx)
    const pendingSwitch = manager.switchTrack('shanshui')
    await Promise.resolve()
    expect(onLoadingChange).toHaveBeenLastCalledWith(true)

    await manager.switchTrack('synthetic')
    expect(manager.getCurrentTrack().id).toBe('synthetic')
    expect(onLoadingChange).toHaveBeenLastCalledWith(false)

    pendingResponse.resolve({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    } as Response)
    await pendingSwitch
    expect(manager.getCurrentTrack().id).toBe('synthetic')
    expect(onLoadingChange).toHaveBeenLastCalledWith(false)
    manager.dispose()
  })

  it('does not let a stale file load replace the active file engine buffer', async () => {
    const slowResponse = deferred<Response>()
    vi.stubGlobal('fetch', vi.fn((source: string) => {
      if (source.includes('shanshui')) return slowResponse.promise
      return Promise.resolve({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(22),
      })
    }))
    class MockAudioContext {
      destination = Symbol('destination')
      currentTime = 1
      startedBuffers: unknown[] = []
      createGain = vi.fn(() => ({
        gain: {
          value: 1,
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
          cancelScheduledValues: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      }))
      createOscillator = vi.fn(() => ({
        type: 'sine',
        frequency: { value: 0 },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      }))
      createBufferSource = vi.fn(() => {
        const source = {
          buffer: null as unknown,
          loop: false,
          connect: vi.fn(),
          start: vi.fn(() => this.startedBuffers.push(source.buffer)),
          stop: vi.fn(),
          disconnect: vi.fn(),
        }
        return source
      })
      decodeAudioData = vi.fn(async (buffer: ArrayBuffer) => ({ label: buffer.byteLength }))
    }
    const ctx = new MockAudioContext() as unknown as AudioContext & { startedBuffers: unknown[] }
    const manager = createBGMManager()

    manager.start(ctx)
    const slowSwitch = manager.switchTrack('shanshui')
    await Promise.resolve()
    await manager.switchTrack('zhulin')

    slowResponse.resolve({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(11),
    } as Response)
    await slowSwitch

    expect(manager.getCurrentTrack().id).toBe('zhulin')
    manager.stop()
    manager.start(ctx)
    await Promise.resolve()
    await Promise.resolve()
    expect(ctx.startedBuffers.at(-1)).toEqual({ label: 22 })
    manager.dispose()
  })

  it('falls back to synthetic when a network track fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })))
    const MockAudioContext = createMockAudioContext()
    const ctx = new MockAudioContext() as unknown as AudioContext
    const onError = vi.fn()
    const manager = createBGMManager({ onError })

    manager.start(ctx)
    await manager.switchTrack('zhulin')

    expect(manager.getCurrentTrack().id).toBe('synthetic')
    expect(onError).toHaveBeenCalledWith('网络音频加载失败，已切换回合成BGM')
    manager.dispose()
  })

  it('loads a custom audio file and revokes the previous custom object URL', async () => {
    const MockAudioContext = createMockAudioContext()
    const ctx = new MockAudioContext() as unknown as AudioContext
    const manager = createBGMManager()
    const first = new File(['first'], 'first.mp3', { type: 'audio/mpeg' })
    const second = new File(['second'], 'second.mp3', { type: 'audio/mpeg' })

    manager.start(ctx)
    await manager.loadCustomFile(first)
    await manager.loadCustomFile(second)

    expect(URL.createObjectURL).toHaveBeenCalledTimes(2)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:first-track')
    expect(manager.getCurrentTrack().id).toBe('custom')
    expect(manager.getCurrentTrack().name).toBe('second.mp3')
    manager.dispose()
  })

  it('rejects unsupported custom file formats', async () => {
    const MockAudioContext = createMockAudioContext()
    const ctx = new MockAudioContext() as unknown as AudioContext
    const onError = vi.fn()
    const manager = createBGMManager({ onError })
    const file = new File(['text'], 'notes.txt', { type: 'text/plain' })

    manager.start(ctx)
    await manager.loadCustomFile(file)

    expect(onError).toHaveBeenCalledWith('不支持的音频格式')
    expect(manager.getCurrentTrack().id).toBe('synthetic')
    manager.dispose()
  })

  it('rejects custom files larger than 20MB', async () => {
    const MockAudioContext = createMockAudioContext()
    const ctx = new MockAudioContext() as unknown as AudioContext
    const onError = vi.fn()
    const manager = createBGMManager({ onError })
    const largeFile = new File([new ArrayBuffer(20 * 1024 * 1024 + 1)], 'large.mp3', {
      type: 'audio/mpeg',
    })

    manager.start(ctx)
    await manager.loadCustomFile(largeFile)

    expect(onError).toHaveBeenCalledWith('文件过大，请选择较小的音频文件')
    expect(URL.createObjectURL).not.toHaveBeenCalled()
    manager.dispose()
  })

  it('falls back to synthetic when switching to unavailable custom track', async () => {
    const MockAudioContext = createMockAudioContext()
    const ctx = new MockAudioContext() as unknown as AudioContext
    const manager = createBGMManager()

    manager.start(ctx)
    await manager.switchTrack('custom')

    expect(manager.getCurrentTrack().id).toBe('synthetic')
    manager.dispose()
  })
})
