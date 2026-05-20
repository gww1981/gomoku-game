// src/components/AudioPanel.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AudioPanel } from './AudioPanel'
import { AudioCtx } from '../audio/AudioContext'
import type { AudioContextValue } from '../audio/types'

const mockAudioValue: AudioContextValue = {
  bgmVolume: 0.5,
  sfxVolume: 0.7,
  muted: false,
  toggleMute: vi.fn(),
  setBGMVolume: vi.fn(),
  setSFXVolume: vi.fn(),
  playSFX: vi.fn(),
  resumeBGM: vi.fn(),
  stopBGM: vi.fn(),
}

function renderPanel(overrides: Partial<AudioContextValue> = {}) {
  const value = { ...mockAudioValue, ...overrides }
  return render(
    <AudioCtx.Provider value={value}>
      <AudioPanel />
    </AudioCtx.Provider>
  )
}

describe('AudioPanel', () => {
  it('默认收起状态只显示图标按钮', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: '音频控制' })).toBeInTheDocument()
    expect(screen.queryByText('背景音乐')).not.toBeInTheDocument()
  })

  it('点击图标按钮展开面板', () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: '音频控制' }))
    expect(screen.getByText('背景音乐')).toBeInTheDocument()
    expect(screen.getByText('音效')).toBeInTheDocument()
  })

  it('静音按钮切换静音状态', () => {
    const toggleMute = vi.fn()
    renderPanel({ toggleMute })
    fireEvent.click(screen.getByRole('button', { name: '音频控制' }))
    fireEvent.click(screen.getByRole('button', { name: '静音' }))
    expect(toggleMute).toHaveBeenCalled()
  })

  it('BGM 音量滑块调用 setBGMVolume', () => {
    const setBGMVolume = vi.fn()
    renderPanel({ setBGMVolume })
    fireEvent.click(screen.getByRole('button', { name: '音频控制' }))
    const slider = screen.getByLabelText('背景音乐音量')
    fireEvent.change(slider, { target: { value: '0.8' } })
    expect(setBGMVolume).toHaveBeenCalledWith(0.8)
  })

  it('SFX 音量滑块调用 setSFXVolume', () => {
    const setSFXVolume = vi.fn()
    renderPanel({ setSFXVolume })
    fireEvent.click(screen.getByRole('button', { name: '音频控制' }))
    const slider = screen.getByLabelText('音效音量')
    fireEvent.change(slider, { target: { value: '0.3' } })
    expect(setSFXVolume).toHaveBeenCalledWith(0.3)
  })

  it('静音状态下静音按钮显示取消静音文本', () => {
    renderPanel({ muted: true })
    fireEvent.click(screen.getByRole('button', { name: '音频控制' }))
    expect(screen.getByRole('button', { name: '取消静音' })).toBeInTheDocument()
  })

  it('点击关闭按钮收起面板', () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: '音频控制' }))
    expect(screen.getByText('背景音乐')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))
    expect(screen.queryByText('背景音乐')).not.toBeInTheDocument()
  })
})
