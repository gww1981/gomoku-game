import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { Game } from './Game'
import { AudioProvider } from '../audio/AudioContext'

function getCells(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>('.cell'))
}

function renderGame() {
  return render(<AudioProvider><Game /></AudioProvider>)
}

describe('Game dashboard', () => {
  beforeEach(() => {
    vi.stubGlobal('AudioContext', class MockAudioContext {
      createGain() { return { gain: { value: 1, setValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() } }
      createBufferSource() { return { buffer: null, connect: vi.fn(), start: vi.fn() } }
      decodeAudioData = vi.fn(async () => ({ duration: 0.5 }))
      destination = Symbol('destination')
      state: AudioContextState = 'running'
      resume = vi.fn(async () => {})
      close = vi.fn(async () => {})
    })
    vi.spyOn(window, 'fetch').mockResolvedValue({
      arrayBuffer: async () => new ArrayBuffer(0),
    } as Response)
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows the board, mode controls, and status on first render', () => {
    const { container } = renderGame()

    expect(screen.getByRole('heading', { name: '五子棋' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '双人' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'AI 对战' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '简单' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '中等' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '困难' })).toBeDisabled()
    expect(screen.getByText('黑棋回合')).toBeInTheDocument()
    expect(getCells(container)).toHaveLength(225)
  })

  it('switches to AI mode with medium difficulty by default', () => {
    const { container } = renderGame()

    fireEvent.click(screen.getByRole('button', { name: 'AI 对战' }))

    expect(screen.getByRole('button', { name: 'AI 对战' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '中等' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('人机对战 · 中等')).toBeInTheDocument()
    expect(getCells(container)).toHaveLength(225)
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
})
