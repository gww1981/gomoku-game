import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, test, expect, vi, afterEach } from 'vitest'
import { Lobby } from './Lobby'

async function renderInCreatingView() {
  const onCreateRoom = vi.fn().mockResolvedValue('ABC123')
  const onJoinRoom = vi.fn()
  const utils = render(
    <Lobby onCreateRoom={onCreateRoom} onJoinRoom={onJoinRoom} connectionStatus="connected" />
  )
  await act(async () => {
    fireEvent.click(screen.getByText('创建'))
    await Promise.resolve()
  })
  return utils
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('Lobby - 复制房间号反馈', () => {
  test('复制成功后按钮文字变为「已复制」', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    await renderInCreatingView()

    const copyBtn = screen.getByRole('button', { name: /复制房间号/ })

    await act(async () => {
      fireEvent.click(copyBtn)
      await Promise.resolve()
    })

    expect(writeText).toHaveBeenCalledWith('ABC123')
    expect(screen.getByRole('button', { name: /已复制/ })).toBeInTheDocument()
  })

  test('2 秒后按钮文字恢复为「复制房间号」', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    await renderInCreatingView()

    const copyBtn = screen.getByRole('button', { name: /复制房间号/ })

    await act(async () => {
      fireEvent.click(copyBtn)
      await Promise.resolve()
    })

    expect(screen.getByRole('button', { name: /已复制/ })).toBeInTheDocument()

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(screen.getByRole('button', { name: /复制房间号/ })).toBeInTheDocument()
  })

  test('复制失败时按钮文字变为「复制失败」', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('permission denied'))
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    await renderInCreatingView()

    const copyBtn = screen.getByRole('button', { name: /复制房间号/ })

    await act(async () => {
      fireEvent.click(copyBtn)
      // 两个 microtask：一次让 reject 进入 catch，一次让 setState 应用
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.getByRole('button', { name: /复制失败/ })).toBeInTheDocument()
  })
})
