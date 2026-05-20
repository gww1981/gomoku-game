// src/audio/AudioContext.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AudioProvider } from './AudioContext'
import { useAudio } from './useAudio'

function createMockAudioContext() {
  return class MockAudioContext {
    createGain = vi.fn(() => ({
      gain: { value: 1, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
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
    destination = Symbol('destination')
    state: AudioContextState = 'running'
    resume = vi.fn(async () => {})
    close = vi.fn(async () => {})
    currentTime = 0
  }
}

describe('AudioProvider + useAudio', () => {
  beforeEach(() => {
    vi.stubGlobal('AudioContext', createMockAudioContext())
    vi.stubGlobal('AudioWorkletNode', class {})
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
})
