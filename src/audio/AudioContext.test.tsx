import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AudioProvider } from './AudioContext'
import { useAudio } from './useAudio'

function createMockAudioContext() {
  return class MockAudioContext {
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
    destination = Symbol('destination')
    state: AudioContextState = 'running'
    resume = vi.fn(async () => {})
    close = vi.fn(async () => {})
    decodeAudioData = vi.fn(async () => ({ duration: 3 }))
    currentTime = 0
  }
}

describe('AudioProvider + useAudio', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    })))
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:custom-track'),
      revokeObjectURL: vi.fn(),
    })
    vi.stubGlobal('AudioContext', createMockAudioContext())
    vi.stubGlobal('AudioWorkletNode', class {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('在 Provider 内 useAudio 返回完整的音频控制方法和默认曲目状态', () => {
    const { result } = renderHook(() => useAudio(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <AudioProvider>{children}</AudioProvider>
      ),
    })

    expect(result.current.bgmVolume).toBe(0.5)
    expect(result.current.sfxVolume).toBe(0.7)
    expect(result.current.muted).toBe(false)
    expect(result.current.currentTrackId).toBe('synthetic')
    expect(result.current.availableTracks.map((track) => track.id)).toEqual([
      'synthetic',
      'shanshui',
      'zhulin',
      'yuexia',
    ])
    expect(result.current.customTrack).toBeNull()
    expect(result.current.isTrackLoading).toBe(false)
    expect(result.current.audioError).toBeNull()
    expect(typeof result.current.switchTrack).toBe('function')
    expect(typeof result.current.loadCustomFile).toBe('function')
    expect(typeof result.current.clearAudioError).toBe('function')
  })

  it('在 Provider 外 useAudio 抛出错误', () => {
    expect(() => renderHook(() => useAudio())).toThrow(
      'useAudio must be used within an AudioProvider'
    )
  })

  it('从 localStorage 恢复音量、静音和内置曲目', () => {
    localStorage.setItem('bgm-volume', '0.3')
    localStorage.setItem('sfx-volume', '0.2')
    localStorage.setItem('muted', 'true')
    localStorage.setItem('bgm-track-id', 'zhulin')

    const { result } = renderHook(() => useAudio(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <AudioProvider>{children}</AudioProvider>
      ),
    })

    expect(result.current.bgmVolume).toBe(0.3)
    expect(result.current.sfxVolume).toBe(0.2)
    expect(result.current.muted).toBe(true)
    expect(result.current.currentTrackId).toBe('zhulin')
  })

  it('localStorage 中的 custom 曲目刷新后回退到 synthetic', () => {
    localStorage.setItem('bgm-track-id', 'custom')

    const { result } = renderHook(() => useAudio(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <AudioProvider>{children}</AudioProvider>
      ),
    })

    expect(result.current.currentTrackId).toBe('synthetic')
  })

  it('toggleMute 切换静音状态并持久化', () => {
    const { result } = renderHook(() => useAudio(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <AudioProvider>{children}</AudioProvider>
      ),
    })

    act(() => result.current.toggleMute())
    expect(result.current.muted).toBe(true)
    expect(localStorage.getItem('muted')).toBe('true')

    act(() => result.current.toggleMute())
    expect(result.current.muted).toBe(false)
  })

  it('setBGMVolume 和 setSFXVolume 更新并持久化音量', () => {
    const { result } = renderHook(() => useAudio(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <AudioProvider>{children}</AudioProvider>
      ),
    })

    act(() => result.current.setBGMVolume(0.8))
    act(() => result.current.setSFXVolume(0.4))

    expect(result.current.bgmVolume).toBe(0.8)
    expect(result.current.sfxVolume).toBe(0.4)
    expect(localStorage.getItem('bgm-volume')).toBe('0.8')
    expect(localStorage.getItem('sfx-volume')).toBe('0.4')
  })

  it('loadCustomFile 添加自定义曲目并切换到 custom', async () => {
    const { result } = renderHook(() => useAudio(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <AudioProvider>{children}</AudioProvider>
      ),
    })
    const file = new File(['audio'], 'local.mp3', { type: 'audio/mpeg' })

    await act(async () => {
      await result.current.loadCustomFile(file)
    })

    expect(result.current.currentTrackId).toBe('custom')
    expect(result.current.customTrack?.name).toBe('local.mp3')
    expect(result.current.availableTracks.map((track) => track.id)).toContain('custom')
    expect(localStorage.getItem('bgm-track-id')).toBe('synthetic')
  })

  it('clearAudioError 清除错误提示', async () => {
    const { result } = renderHook(() => useAudio(), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <AudioProvider>{children}</AudioProvider>
      ),
    })
    const file = new File(['text'], 'notes.txt', { type: 'text/plain' })

    await act(async () => {
      await result.current.loadCustomFile(file)
    })
    expect(result.current.audioError).toBe('不支持的音频格式')

    act(() => result.current.clearAudioError())
    expect(result.current.audioError).toBeNull()
  })
})
