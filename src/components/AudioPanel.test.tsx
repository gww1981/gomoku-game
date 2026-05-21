// src/components/AudioPanel.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AudioPanel } from './AudioPanel'
import { AudioCtx } from '../audio/AudioContext'
import type { AudioContextValue } from '../audio/types'

const mockAudioValue: AudioContextValue = {
  bgmVolume: 0.5,
  sfxVolume: 0.7,
  muted: false,
  currentTrackId: 'synthetic',
  availableTracks: [
    { id: 'synthetic', name: '古韵合成', type: 'synthetic', emoji: '🎼' },
    { id: 'shanshui', name: '山水清音', type: 'file', source: '/audio/shanshui.mp3', emoji: '🏞️' },
    { id: 'zhulin', name: '竹林幽径', type: 'file', source: '/audio/zhulin.mp3', emoji: '🎋' },
    { id: 'yuexia', name: '月下棋声', type: 'file', source: '/audio/yuexia.mp3', emoji: '🌙' },
  ],
  customTrack: null,
  isTrackLoading: false,
  audioError: null,
  toggleMute: vi.fn(),
  setBGMVolume: vi.fn(),
  setSFXVolume: vi.fn(),
  playSFX: vi.fn(),
  resumeBGM: vi.fn(),
  stopBGM: vi.fn(),
  switchTrack: vi.fn(async () => {}),
  loadCustomFile: vi.fn(async () => {}),
  clearAudioError: vi.fn(),
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
  afterEach(() => {
    vi.restoreAllMocks()
  })

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

  it('展开后显示内置曲目列表', () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: '音频控制' }))
    expect(screen.getByText('选择曲目')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '古韵合成' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '山水清音' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '竹林幽径' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '月下棋声' })).toBeInTheDocument()
  })

  it('点击曲目调用 switchTrack', () => {
    const switchTrack = vi.fn(async () => {})
    renderPanel({ switchTrack })
    fireEvent.click(screen.getByRole('button', { name: '音频控制' }))
    fireEvent.click(screen.getByRole('button', { name: '山水清音' }))
    expect(switchTrack).toHaveBeenCalledWith('shanshui')
  })

  it('当前曲目按钮有选中状态', () => {
    renderPanel({ currentTrackId: 'zhulin' })
    fireEvent.click(screen.getByRole('button', { name: '音频控制' }))
    expect(screen.getByRole('button', { name: '竹林幽径' })).toHaveClass('is-active')
  })

  it('点击选择本地文件后调用 loadCustomFile', () => {
    const loadCustomFile = vi.fn(async () => {})
    renderPanel({ loadCustomFile })
    fireEvent.click(screen.getByRole('button', { name: '音频控制' }))
    const input = screen.getByLabelText('选择本地音频文件')
    const file = new File(['audio'], 'local.mp3', { type: 'audio/mpeg' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(loadCustomFile).toHaveBeenCalledWith(file)
  })

  it('文件按钮触发隐藏文件输入并限制音频类型', () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click')
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: '音频控制' }))
    const input = screen.getByLabelText('选择本地音频文件')

    expect(input).toHaveAttribute('accept', 'audio/*')
    fireEvent.click(screen.getByRole('button', { name: /选择本地文件/ }))
    expect(clickSpy).toHaveBeenCalled()
  })

  it('加载中时显示曲目加载提示', () => {
    renderPanel({ isTrackLoading: true })
    fireEvent.click(screen.getByRole('button', { name: '音频控制' }))
    expect(screen.getByText('加载中')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '山水清音' })).toBeDisabled()
  })

  it('显示音频错误并允许关闭', () => {
    const clearAudioError = vi.fn()
    renderPanel({
      audioError: '网络音频加载失败，已切换回合成BGM',
      clearAudioError,
    })
    fireEvent.click(screen.getByRole('button', { name: '音频控制' }))
    expect(screen.getByText('网络音频加载失败，已切换回合成BGM')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '关闭音频错误提示' }))
    expect(clearAudioError).toHaveBeenCalled()
  })
})
