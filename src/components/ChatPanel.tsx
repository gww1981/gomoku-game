import { useState, useCallback, useEffect, useRef } from 'react'
import './ChatPanel.css'

const QUICK_MESSAGES = ['好棋', '请等一下', '幸运的一步', '让我想想', '再来一局', '我要走了']

interface ChatMessage {
  id: number
  from: 'me' | 'opponent'
  text: string
  timestamp: number
}

interface ChatPanelProps {
  sendChat: (message: string) => void
  subscribeChat: (cb: (message: string) => void) => () => void
}

export function ChatPanel({ sendChat, subscribeChat }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [bubble, setBubble] = useState<{ from: 'me' | 'opponent'; text: string } | null>(null)
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageIdCounter = useRef(0)

  const showBubble = useCallback((from: 'me' | 'opponent', text: string) => {
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current)
    setBubble({ from, text })
    bubbleTimer.current = setTimeout(() => setBubble(null), 2500)
  }, [])

  useEffect(() => {
    const unsubscribe = subscribeChat((message: string) => {
      const newMsg: ChatMessage = {
        id: ++messageIdCounter.current,
        from: 'opponent',
        text: message,
        timestamp: Date.now()
      }
      setMessages((prev) => [...prev, newMsg])
      showBubble('opponent', message)
    })
    return () => {
      unsubscribe()
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current)
    }
  }, [subscribeChat, showBubble])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(
    (message: string) => {
      sendChat(message)
      const newMsg: ChatMessage = {
        id: ++messageIdCounter.current,
        from: 'me',
        text: message,
        timestamp: Date.now()
      }
      setMessages((prev) => [...prev, newMsg])
      showBubble('me', message)
    },
    [sendChat, showBubble]
  )

  return (
    <div className="chat-panel">
      <div className="chat-quick-bar">
        {QUICK_MESSAGES.map((msg) => (
          <button
            key={msg}
            type="button"
            className="chat-quick-chip"
            onClick={() => handleSend(msg)}
          >
            {msg}
          </button>
        ))}
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty-hint">发送快捷消息开始聊天</div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`chat-bubble-row ${msg.from}`}>
              <div className={`chat-bubble ${msg.from}`}>
                {msg.text}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {bubble && (
        <div className={`chat-toast ${bubble.from}`}>
          {bubble.text}
        </div>
      )}
    </div>
  )
}
