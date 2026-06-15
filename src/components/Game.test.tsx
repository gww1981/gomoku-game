import { act, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { Game } from './Game'
import { AudioProvider } from '../audio/AudioContext'

function getCells(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>('.cell'))
}

function renderGame() {
  return render(
    <StrictMode>
      <AudioProvider><Game /></AudioProvider>
    </StrictMode>
  )
}

function mockGainNode() {
  return {
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
}

function mockOscNode() {
  return {
    type: 'sine' as OscillatorType,
    frequency: { value: 0 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  }
}

describe('Game dashboard', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('AudioContext', class MockAudioContext {
      createGain = vi.fn(() => mockGainNode())
      createOscillator = vi.fn(() => mockOscNode())
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
      currentTime = 0
      resume = vi.fn(async () => {})
      close = vi.fn(async () => {})
      decodeAudioData = vi.fn(async () => ({ duration: 3 }))
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('shows the board, mode controls, and status on first render', () => {
    const { container } = renderGame()

    expect(screen.getByRole('heading', { name: '五子棋' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '双人' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'AI 对战' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('button', { name: '简单' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '中等' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '困难' })).not.toBeInTheDocument()
    expect(screen.getByText('黑棋回合')).toBeInTheDocument()
    expect(getCells(container)).toHaveLength(225)
  })

  it('switches to AI mode with medium difficulty by default', () => {
    const { container } = renderGame()

    fireEvent.click(screen.getByRole('button', { name: 'AI 对战' }))

    expect(screen.getByRole('button', { name: 'AI 对战' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '简单' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '中等' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '困难' })).toBeInTheDocument()
    expect(screen.getByText('人机对战 · 中等')).toBeInTheDocument()
    expect(getCells(container)).toHaveLength(225)
  })

  it('hides the audio control while the replay list drawer is open', () => {
    renderGame()

    expect(screen.getByRole('button', { name: '音频控制' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '录像列表' }))

    expect(screen.queryByRole('button', { name: '音频控制' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '关闭录像列表' }))

    expect(screen.getByRole('button', { name: '音频控制' })).toBeInTheDocument()
  })

  it('lets the player choose hard difficulty after choosing AI mode', () => {
    renderGame()

    fireEvent.click(screen.getByRole('button', { name: 'AI 对战' }))
    fireEvent.click(screen.getByRole('button', { name: '困难' }))

    expect(screen.getByRole('button', { name: '困难' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('人机对战 · 困难')).toBeInTheDocument()
  })

  it('resets the board when the player changes mode', () => {
    const { container } = renderGame()
    const cells = getCells(container)

    fireEvent.click(cells[0])
    expect(cells[0]).toHaveAttribute('data-piece', 'black')

    fireEvent.click(screen.getByRole('button', { name: 'AI 对战' }))
    const resetCells = getCells(container)

    expect(screen.getByText('人机对战 · 中等')).toBeInTheDocument()
    expect(resetCells[0]).toHaveAttribute('data-piece', '')
  })

  it('lets the AI place a white piece after the thinking delay', () => {
    vi.useFakeTimers()

    try {
      const { container } = renderGame()

      fireEvent.click(screen.getByRole('button', { name: 'AI 对战' }))
      fireEvent.click(getCells(container)[0])

      expect(screen.getByText(/AI 正在思考/)).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(400)
      })

      expect(container.querySelectorAll('.cell[data-piece="white"]')).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('places a black piece when an empty cell is activated with Enter', () => {
    const { container } = renderGame()
    const firstCell = getCells(container)[0]

    firstCell.focus()
    fireEvent.keyDown(firstCell, { key: 'Enter', code: 'Enter' })

    expect(firstCell).toHaveAttribute('data-piece', 'black')
  })

  it('saves one replay record when a game ends', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    const { container } = renderGame()
    const cells = getCells(container)

    fireEvent.click(cells[0])
    fireEvent.click(cells[15])
    fireEvent.click(cells[1])
    fireEvent.click(cells[16])
    fireEvent.click(cells[2])
    fireEvent.click(cells[17])
    fireEvent.click(cells[3])
    fireEvent.click(cells[18])
    fireEvent.click(cells[4])

    const replayWrites = setItemSpy.mock.calls.filter(([key]) => key === 'gomoku-game-records')
    expect(replayWrites).toHaveLength(1)
  })

  it('exits replay mode and resets board when switching mode during replay', () => {
    const { container } = renderGame()
    const cells = getCells(container)

    // Play a game to completion (black wins with 5 in a row)
    fireEvent.click(cells[0])   // black
    fireEvent.click(cells[15])  // white
    fireEvent.click(cells[1])   // black
    fireEvent.click(cells[16])  // white
    fireEvent.click(cells[2])   // black
    fireEvent.click(cells[17])  // white
    fireEvent.click(cells[3])   // black
    fireEvent.click(cells[18])  // white
    fireEvent.click(cells[4])   // black wins

    // Game ended -> should auto-enter replay mode
    expect(screen.getByText('退出回放')).toBeInTheDocument()

    // Switch to double mode
    fireEvent.click(screen.getByRole('button', { name: '双人' }))

    // Should exit replay mode, show normal UI
    expect(screen.queryByText('退出回放')).not.toBeInTheDocument()
    expect(screen.getByText('黑棋回合')).toBeInTheDocument()

    // Board should be reset
    const resetCells = getCells(container)
    expect(resetCells[0]).toHaveAttribute('data-piece', '')
  })
})
