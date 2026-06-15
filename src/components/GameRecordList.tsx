import { useState, useEffect, useRef } from 'react'
import type { GameRecord } from '../game/types'
import { loadGameRecords, deleteGameRecord, clearGameRecords } from '../replay/storage'
import './GameRecordList.css'

interface GameRecordListProps {
  isOpen: boolean
  onClose: () => void
  onSelectRecord: (record: GameRecord) => void
}

function formatTimeAgo(createdAt: string): string {
  const diff = Date.now() - new Date(createdAt).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  return `${days}天前`
}

function getResultBadge(winner: 'black' | 'white' | 'draw' | null) {
  if (winner === 'black') return { label: '⚫ 黑方胜', className: 'badge-black' }
  if (winner === 'white') return { label: '⚪ 白方胜', className: 'badge-white' }
  return { label: '🤝 平局', className: 'badge-draw' }
}

export function GameRecordList({ isOpen, onClose, onSelectRecord }: GameRecordListProps) {
  const [records, setRecords] = useState<GameRecord[]>([])
  const drawerRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) setRecords(loadGameRecords())
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    previousFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    closeButtonRef.current?.focus()

    return () => {
      previousFocusRef.current?.focus()
    }
  }, [isOpen])

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteGameRecord(id)
    setRecords(records => records.filter(r => r.id !== id))
  }

  const handleClear = () => {
    clearGameRecords()
    setRecords([])
  }

  const handleDrawerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }

    if (e.key !== 'Tab') return

    const focusableElements = drawerRef.current?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
    )
    const focusable = Array.from(focusableElements ?? []).filter((element) => {
      return element.offsetParent !== null || element === document.activeElement
    })

    if (focusable.length === 0) {
      e.preventDefault()
      return
    }

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
      return
    }

    if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="record-list-overlay" onClick={onClose} />
      <div
        className="record-list-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-list-title"
        onKeyDown={handleDrawerKeyDown}
      >
        <div className="record-list-header">
          <h3 id="record-list-title">📜 历史对局</h3>
          <div className="record-list-header-actions">
            {records.length > 0 && (
              <button className="record-list-clear" onClick={handleClear}>清空</button>
            )}
            <button
              ref={closeButtonRef}
              type="button"
              className="record-list-close"
              aria-label="关闭录像列表"
              onClick={onClose}
            >
              <span aria-hidden="true">×</span>
              <span className="record-list-close-text">关闭录像列表</span>
            </button>
          </div>
        </div>

        <div className="record-list-body">
          {records.length === 0 ? (
            <div className="record-list-empty">
              <p>暂无录像记录</p>
              <p className="record-list-empty-hint">完成对局后会保存到这里</p>
            </div>
          ) : (
            <div className="record-list-items">
              {records.map(record => {
                const badge = getResultBadge(record.result.winner)
                const modeLabel = record.gameMode === 'pvp' ? 'PvP' : `AI·${record.aiDifficulty}`
                return (
                  <div
                    key={record.id}
                    className="record-item"
                    onClick={() => onSelectRecord(record)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && onSelectRecord(record)}
                  >
                    <div className="record-item-top">
                      <span className={`record-badge ${badge.className}`}>{badge.label}</span>
                      <span className="record-time">{formatTimeAgo(record.createdAt)}</span>
                    </div>
                    <div className="record-item-meta">
                      {modeLabel} · {record.moves.length}手 · {new Date(record.createdAt).toLocaleDateString()}
                    </div>
                    <button
                      className="record-delete-btn"
                      onClick={e => handleDelete(e, record.id)}
                      aria-label="删除此录像"
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
