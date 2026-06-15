import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GameRecordList } from './GameRecordList'

describe('GameRecordList', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('renders the drawer as a dialog with an explicit close button', () => {
    render(
      <GameRecordList
        isOpen
        onClose={vi.fn()}
        onSelectRecord={vi.fn()}
      />
    )

    expect(screen.getByRole('dialog', { name: '📜 历史对局' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '关闭录像列表' })).toBeInTheDocument()
  })

  it('focuses the close button when opened', () => {
    render(
      <GameRecordList
        isOpen
        onClose={vi.fn()}
        onSelectRecord={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: '关闭录像列表' })).toHaveFocus()
  })

  it('calls onClose from the close button', () => {
    const onClose = vi.fn()
    render(
      <GameRecordList
        isOpen
        onClose={onClose}
        onSelectRecord={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '关闭录像列表' }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose from the overlay', () => {
    const onClose = vi.fn()
    const { container } = render(
      <GameRecordList
        isOpen
        onClose={onClose}
        onSelectRecord={vi.fn()}
      />
    )

    const overlay = container.querySelector('.record-list-overlay')
    expect(overlay).not.toBeNull()
    fireEvent.click(overlay as Element)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Escape is pressed inside the dialog', () => {
    const onClose = vi.fn()
    render(
      <GameRecordList
        isOpen
        onClose={onClose}
        onSelectRecord={vi.fn()}
      />
    )

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('keeps Tab focus inside the dialog', () => {
    render(
      <GameRecordList
        isOpen
        onClose={vi.fn()}
        onSelectRecord={vi.fn()}
      />
    )

    const closeButton = screen.getByRole('button', { name: '关闭录像列表' })
    expect(closeButton).toHaveFocus()

    fireEvent.keyDown(closeButton, { key: 'Tab' })

    expect(closeButton).toHaveFocus()
  })

  it('restores focus when the drawer closes', () => {
    const launcher = document.createElement('button')
    launcher.textContent = 'open records'
    document.body.appendChild(launcher)
    launcher.focus()

    const { rerender } = render(
      <GameRecordList
        isOpen
        onClose={vi.fn()}
        onSelectRecord={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: '关闭录像列表' })).toHaveFocus()

    rerender(
      <GameRecordList
        isOpen={false}
        onClose={vi.fn()}
        onSelectRecord={vi.fn()}
      />
    )

    expect(launcher).toHaveFocus()
    launcher.remove()
  })
})
