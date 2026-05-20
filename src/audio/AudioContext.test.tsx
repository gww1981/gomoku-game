// src/audio/AudioContext.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AudioProvider } from './AudioContext'
import { useAudio } from './useAudio'

function createMockAudioElement() {
  const audio = {
    play: vi.fn(async () => {}),
    pause: vi.fn(),
    volume: 0.5,
    muted: false,
    loop: false,
    src: '',
  } as unknown as HTMLAudioElement
  return audio
}

describe('AudioProvider + useAudio', () => {
  let mockAudio: HTMLAudioElement
  let originalCreateElement: typeof document.createElement

  beforeEach(() => {
    mockAudio = createMockAudioElement()
    originalCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'audio') return mockAudio
      return originalCreateElement(tag)
    })
    // jsdom 没有 AudioContext，用类 mock 使 new 调用生效
    class MockAudioContext {
      createGain = vi.fn(() => ({
        gain: { value: 1 },
        connect: vi.fn(),
        disconnect: vi.fn(),
      }))
      createBufferSource = vi.fn(() => ({
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(),
      }))
      decodeAudioData = vi.fn(async () => ({ duration: 0.5 }))
      destination = Symbol('destination')
      state: AudioContextState = 'running'
      resume = vi.fn(async () => {})
      close = vi.fn(async () => {})
    }
    vi.stubGlobal('AudioContext', MockAudioContext)
    vi.spyOn(window, 'fetch').mockResolvedValue({
      arrayBuffer: async () => new ArrayBuffer(0),
    } as Response)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('在 Provider 内 useAudio 返回完整的音频控制方法', () => {
    const { result } = renderHook(() => useAudio(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <AudioProvider>{children}</AudioProvider>
      ),
    })

    expect(result.current.bgmVolume).toBe(0.5)
    expect(result.current.sfxVolume).toBe(0.7)
    expect(result.current.muted).toBe(false)
    expect(typeof result.current.toggleMute).toBe('function')
    expect(typeof result.current.setBGMVolume).toBe('function')
    expect(typeof result.current.setSFXVolume).toBe('function')
    expect(typeof result.current.playSFX).toBe('function')
    expect(typeof result.current.resumeBGM).toBe('function')
    expect(typeof result.current.stopBGM).toBe('function')
  })

  it('在 Provider 外 useAudio 抛出错误', () => {
    expect(() => renderHook(() => useAudio())).toThrow(
      'useAudio must be used within an AudioProvider'
    )
  })

  it('toggleMute 切换静音状态', () => {
    const { result } = renderHook(() => useAudio(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <AudioProvider>{children}</AudioProvider>
      ),
    })

    act(() => result.current.toggleMute())
    expect(result.current.muted).toBe(true)

    act(() => result.current.toggleMute())
    expect(result.current.muted).toBe(false)
  })

  it('setBGMVolume 更新 BGM 音量', () => {
    const { result } = renderHook(() => useAudio(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <AudioProvider>{children}</AudioProvider>
      ),
    })

    act(() => result.current.setBGMVolume(0.8))
    expect(result.current.bgmVolume).toBe(0.8)
  })

  it('setSFXVolume 更新 SFX 音量', () => {
    const { result } = renderHook(() => useAudio(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <AudioProvider>{children}</AudioProvider>
      ),
    })

    act(() => result.current.setSFXVolume(0.4))
    expect(result.current.sfxVolume).toBe(0.4)
  })

  it('静音时 BGM 暂停，取消静音时恢复', () => {
    const { result } = renderHook(() => useAudio(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <AudioProvider>{children}</AudioProvider>
      ),
    })

    act(() => result.current.toggleMute())
    expect(mockAudio.pause).toHaveBeenCalled()

    act(() => result.current.toggleMute())
    expect(mockAudio.play).toHaveBeenCalled()
  })
})
