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
})
