import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSFXEngine } from './soundEffects'

function createMockAudioContext() {
  const gainNodes: Array<{ gain: { value: number }; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }> = []
  const ctx = {
    createGain: vi.fn(() => {
      const g = {
        gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
        disconnect: vi.fn(),
      }
      gainNodes.push(g)
      return g
    }),
    createOscillator: vi.fn(() => ({
      type: 'sine' as OscillatorType,
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    })),
    destination: Symbol('destination'),
    state: 'running' as AudioContextState,
    resume: vi.fn(async () => {}),
    close: vi.fn(async () => {}),
    currentTime: 0,
    _gainNodes: gainNodes,
  }
  return ctx
}

describe('createSFXEngine', () => {
  let mockCtx: ReturnType<typeof createMockAudioContext>

  beforeEach(() => {
    mockCtx = createMockAudioContext()
  })

  it('playSFX 为 move 创建振荡器节点', () => {
    const engine = createSFXEngine(mockCtx as unknown as AudioContext)
    engine.playSFX('move')

    expect(mockCtx.createOscillator).toHaveBeenCalled()
  })

  it('playSFX 为 win 创建多个振荡器节点', () => {
    const engine = createSFXEngine(mockCtx as unknown as AudioContext)
    engine.playSFX('win')

    // win 有 4 个主音，每个主音也创建 gain env
    expect(mockCtx.createOscillator).toHaveBeenCalled()
    expect(mockCtx.createOscillator.mock.calls.length).toBeGreaterThanOrEqual(4)
  })

  it('playSFX 为 click 创建振荡器节点', () => {
    const engine = createSFXEngine(mockCtx as unknown as AudioContext)
    engine.playSFX('click')

    expect(mockCtx.createOscillator).toHaveBeenCalled()
  })

  it('setVolume 更新 gainNode 的 gain 值', () => {
    const engine = createSFXEngine(mockCtx as unknown as AudioContext)
    engine.setVolume(0.3)

    // setVolume 设置的是 SFX 引擎的 master gain (第一个 createGain 调用)
    expect(mockCtx._gainNodes[0].gain.value).toBe(0.3)
  })

  it('静音时 setVolume(0) 后 playSFX 仍然创建节点但不发声', () => {
    const engine = createSFXEngine(mockCtx as unknown as AudioContext)
    engine.setVolume(0)
    mockCtx.createOscillator.mockClear()

    engine.playSFX('draw')

    expect(mockCtx.createOscillator).toHaveBeenCalled()
    expect(mockCtx._gainNodes[0].gain.value).toBe(0)
  })
})
