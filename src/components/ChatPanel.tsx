import { useState, useCallback, useEffect, useRef } from 'react'
import { networkManager } from '../network/networkManager'
import './ChatPanel.css'

const QUICK_MESSAGES = ['好棋', '请等一下', '幸运的一步', '让我想想', '再来一局', '我要走了']

interface ChatMessage {
  from: 'me' | 'opponent'
  text: string
}

export function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [bubble, setBubble] = useState<{ from: 'me' | 'opponent'; text: string } | null>(null)
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showBubble = useCallback((from: 'me' | 'opponent', text: string) => {
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current)
    setBubble({ from, text })
    bubbleTimer.current = setTimeout(() => setBubble(null), 3000)
  }, [])

  useEffect(() => {
    const unsubscribe = networkManager.subscribeChat((message: string) => {
      setMessages((prev) => [...prev, { from: 'opponent', text: message }])
      showBubble('opponent', message)
    })
    return () => {
      unsubscribe()
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current)
    }
  }, [showBubble])

  const handleSend = useCallback(
    (message: string) => {
      networkManager.sendChat(message)
      setMessages((prev) => [...prev, { from: 'me', text: message }])
      showBubble('me', message)
    },
    [showBubble]
  )

  return (
    <div className="chat-panel">
      <div className="chat-quick-messages">
        {QUICK_MESSAGES.map((msg) => (
          <button
            key={msg}
            type="button"
            className="chat-quick-btn"
            onClick={() => handleSend(msg)}
          >
            {msg}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="chat-history-toggle"
        onClick={() => setShowHistory(!showHistory)}
      >
        💬 {showHistory ? '隐藏' : '聊天'} ({messages.length})
      </button>
      {showHistory && (
        <div className="chat-history">
          {messages.length === 0 ? (
            <div className="chat-empty">暂无聊天记录</div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.from}`}>
                <span className={msg.from === 'me' ? 'chat-label-me' : 'chat-label-opp'}>
                  {msg.from === 'me' ? '我' : '对方'}:
                </span>{' '}
                {msg.text}
              </div>
            ))
          )}
        </div>
      )}
      {bubble && <div className={`chat-bubble ${bubble.from}`}>{bubble.text}</div>}
    </div>
  )
}
