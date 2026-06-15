import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AudioPanel } from './AudioPanel'
import { AudioCtx } from '../audio/AudioContext'
import type { AudioContextValue } from '../audio/types'

const labels = {
  control: '\u97f3\u9891\u63a7\u5236',
  close: '\u5173\u95ed',
  bgm: '\u80cc\u666f\u97f3\u4e50',
  bgmVolume: '\u80cc\u666f\u97f3\u4e50\u97f3\u91cf',
  sfx: '\u97f3\u6548',
  sfxVolume: '\u97f3\u6548\u97f3\u91cf',
  trackTitle: '\u9009\u62e9\u66f2\u76ee',
  synthetic: '\u53e4\u97f5\u5408\u6210',
  preset1: '\u5b81\u9759\u68ee\u6797',
  preset2: '\u53e4\u5178\u65f6\u5149',
  preset3: '\u4e1c\u65b9\u7985\u610f',
  preset4: '\u66ae\u5149\u4e4b\u57ce',
  preset5: '\u590f\u65e5\u5348\u540e',
  file: '\u9009\u62e9\u672c\u5730\u6587\u4ef6',
  fileInput: '\u9009\u62e9\u672c\u5730\u97f3\u9891\u6587\u4ef6',
  muted: '\u53d6\u6d88\u9759\u97f3',
  mute: '\u9759\u97f3',
  loading: '\u52a0\u8f7d\u4e2d',
  closeError: '\u5173\u95ed\u97f3\u9891\u9519\u8bef\u63d0\u793a',
}

const mockAudioValue: AudioContextValue = {
  bgmVolume: 0.5,
  sfxVolume: 0.7,
  muted: false,
  currentTrackId: 'synthetic',
  availableTracks: [
    { id: 'synthetic', name: labels.synthetic, type: 'synthetic', emoji: '\ud83c\udfbc' },
    { id: 'preset-1', name: labels.preset1, type: 'file', source: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', emoji: '\ud83c\udf32' },
    { id: 'preset-2', name: labels.preset2, type: 'file', source: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', emoji: '\ud83c\udfbb' },
    { id: 'preset-3', name: labels.preset3, type: 'file', source: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', emoji: '\ud83c\udfef' },
    { id: 'preset-4', name: labels.preset4, type: 'file', source: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', emoji: '\ud83c\udf06' },
    { id: 'preset-5', name: labels.preset5, type: 'file', source: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', emoji: '\u2600\ufe0f' },
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

function renderPanel(overrides: Partial<AudioContextValue> = {}, props: { hidden?: boolean } = {}) {
  const value = { ...mockAudioValue, ...overrides }
  return render(
    <AudioCtx.Provider value={value}>
      <AudioPanel {...props} />
    </AudioCtx.Provider>
  )
}

describe('AudioPanel', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('defaults to a collapsed icon button', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: labels.control })).toBeInTheDocument()
    expect(screen.queryByText(labels.bgm)).not.toBeInTheDocument()
  })

  it('does not render while hidden', () => {
    renderPanel({}, { hidden: true })
    expect(screen.queryByRole('button', { name: labels.control })).not.toBeInTheDocument()
  })

  it('closes the panel when hidden before showing it again', () => {
    const { rerender } = renderPanel()

    fireEvent.click(screen.getByRole('button', { name: labels.control }))
    expect(screen.getByText(labels.bgm)).toBeInTheDocument()

    rerender(
      <AudioCtx.Provider value={mockAudioValue}>
        <AudioPanel hidden />
      </AudioCtx.Provider>
    )
    expect(screen.queryByRole('button', { name: labels.control })).not.toBeInTheDocument()

    rerender(
      <AudioCtx.Provider value={mockAudioValue}>
        <AudioPanel />
      </AudioCtx.Provider>
    )
    expect(screen.getByRole('button', { name: labels.control })).toBeInTheDocument()
    expect(screen.queryByText(labels.bgm)).not.toBeInTheDocument()
  })

  it('opens when clicking the icon button', () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: labels.control }))
    expect(screen.getByText(labels.bgm)).toBeInTheDocument()
    expect(screen.getByText(labels.sfx)).toBeInTheDocument()
  })

  it('calls toggleMute from the mute button', () => {
    const toggleMute = vi.fn()
    renderPanel({ toggleMute })
    fireEvent.click(screen.getByRole('button', { name: labels.control }))
    fireEvent.click(screen.getByRole('button', { name: labels.mute }))
    expect(toggleMute).toHaveBeenCalled()
  })

  it('calls setBGMVolume from the BGM slider', () => {
    const setBGMVolume = vi.fn()
    renderPanel({ setBGMVolume })
    fireEvent.click(screen.getByRole('button', { name: labels.control }))
    fireEvent.change(screen.getByLabelText(labels.bgmVolume), { target: { value: '0.8' } })
    expect(setBGMVolume).toHaveBeenCalledWith(0.8)
  })

  it('calls setSFXVolume from the SFX slider', () => {
    const setSFXVolume = vi.fn()
    renderPanel({ setSFXVolume })
    fireEvent.click(screen.getByRole('button', { name: labels.control }))
    fireEvent.change(screen.getByLabelText(labels.sfxVolume), { target: { value: '0.3' } })
    expect(setSFXVolume).toHaveBeenCalledWith(0.3)
  })

  it('shows unmute text when muted', () => {
    renderPanel({ muted: true })
    fireEvent.click(screen.getByRole('button', { name: labels.control }))
    expect(screen.getByRole('button', { name: labels.muted })).toBeInTheDocument()
  })

  it('closes the panel from the close button', () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: labels.control }))
    expect(screen.getByText(labels.bgm)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: labels.close }))
    expect(screen.queryByText(labels.bgm)).not.toBeInTheDocument()
  })

  it('shows built-in SoundHelix preset tracks', () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: labels.control }))
    expect(screen.getByText(labels.trackTitle)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: labels.synthetic })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: labels.preset1 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: labels.preset2 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: labels.preset3 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: labels.preset4 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: labels.preset5 })).toBeInTheDocument()
  })

  it('calls switchTrack when clicking a track', () => {
    const switchTrack = vi.fn(async () => {})
    renderPanel({ switchTrack })
    fireEvent.click(screen.getByRole('button', { name: labels.control }))
    fireEvent.click(screen.getByRole('button', { name: labels.preset1 }))
    expect(switchTrack).toHaveBeenCalledWith('preset-1')
  })

  it('marks the current track as active', () => {
    renderPanel({ currentTrackId: 'preset-3' })
    fireEvent.click(screen.getByRole('button', { name: labels.control }))
    expect(screen.getByRole('button', { name: labels.preset3 })).toHaveClass('is-active')
  })

  it('calls loadCustomFile when choosing a local file', () => {
    const loadCustomFile = vi.fn(async () => {})
    renderPanel({ loadCustomFile })
    fireEvent.click(screen.getByRole('button', { name: labels.control }))
    const file = new File(['audio'], 'local.mp3', { type: 'audio/mpeg' })
    fireEvent.change(screen.getByLabelText(labels.fileInput), { target: { files: [file] } })
    expect(loadCustomFile).toHaveBeenCalledWith(file)
  })

  it('opens the hidden file input from the file button', () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click')
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: labels.control }))
    expect(screen.getByLabelText(labels.fileInput)).toHaveAttribute('accept', 'audio/*')
    fireEvent.click(screen.getByRole('button', { name: new RegExp(labels.file) }))
    expect(clickSpy).toHaveBeenCalled()
  })

  it('disables track buttons while loading', () => {
    renderPanel({ isTrackLoading: true })
    fireEvent.click(screen.getByRole('button', { name: labels.control }))
    expect(screen.getByText(labels.loading)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: labels.preset1 })).toBeDisabled()
  })

  it('shows and closes audio errors', () => {
    const clearAudioError = vi.fn()
    renderPanel({
      audioError: '\u7f51\u7edc\u97f3\u9891\u52a0\u8f7d\u5931\u8d25\uff0c\u5df2\u5207\u6362\u56de\u5408\u6210BGM',
      clearAudioError,
    })
    fireEvent.click(screen.getByRole('button', { name: labels.control }))
    expect(screen.getByText('\u7f51\u7edc\u97f3\u9891\u52a0\u8f7d\u5931\u8d25\uff0c\u5df2\u5207\u6362\u56de\u5408\u6210BGM')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: labels.closeError }))
    expect(clearAudioError).toHaveBeenCalled()
  })
})
