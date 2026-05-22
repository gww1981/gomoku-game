import { useState, useCallback } from 'react'
import './Lobby.css'

interface LobbyProps {
  onCreateRoom: () => Promise<string>
  onJoinRoom: (roomId: string) => Promise<{ success: boolean; error?: string }>
  connectionStatus?: 'connecting' | 'connected' | 'error'
  connectError?: string | null
}

export function Lobby({
  onCreateRoom,
  onJoinRoom,
  connectionStatus = 'connected',
  connectError = null,
}: LobbyProps) {
  const [view, setView] = useState<'select' | 'creating' | 'joining'>('select')
  const [roomId, setRoomId] = useState('')
  const [createdRoomId, setCreatedRoomId] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joining, setJoining] = useState(false)

  const handleCreate = useCallback(async () => {
    setView('creating')
    setJoinError('')
    try {
      const id = await onCreateRoom()
      setCreatedRoomId(id)
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : '创建失败，请检查服务端是否启动')
      setView('select')
    }
  }, [onCreateRoom])

  const handleCopyRoomId = useCallback(() => {
    navigator.clipboard.writeText(createdRoomId)
  }, [createdRoomId])

  const handleJoin = useCallback(async () => {
    setJoinError('')
    setJoining(true)
    try {
      const result = await onJoinRoom(roomId.toUpperCase())
      if (!result.success) {
        setJoinError(result.error || '加入失败')
      }
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : '加入失败，请检查服务端是否启动')
    } finally {
      setJoining(false)
    }
  }, [roomId, onJoinRoom])

  if (view === 'creating') {
    return (
      <div className="lobby-container">
        <div className="lobby-card create-card">
          <h3>创建房间</h3>
          <p className="lobby-role">你是黑方（先手）</p>
          {createdRoomId ? (
            <div className="lobby-waiting">
              <p className="lobby-hint">房间号</p>
              <div className="lobby-room-id">{createdRoomId}</div>
              <button type="button" className="lobby-copy-btn" onClick={handleCopyRoomId}>
                复制房间号
              </button>
              <p className="lobby-waiting-text">⏳ 等待对手加入...</p>
            </div>
          ) : (
            <p className="lobby-hint">创建中...</p>
          )}
        </div>
      </div>
    )
  }

  if (view === 'joining') {
    return (
      <div className="lobby-container">
        <div className="lobby-card join-card">
          <h3>加入房间</h3>
          <p className="lobby-role">你是白方</p>
          <input
            className="lobby-input"
            type="text"
            maxLength={6}
            placeholder="A3F7K2"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            autoFocus
          />
          {joinError && <p className="lobby-error">{joinError}</p>}
          <button
            type="button"
            className="lobby-join-btn"
            onClick={handleJoin}
            disabled={roomId.length !== 6 || joining}
          >
            {joining ? '加入中...' : '加入房间'}
          </button>
          <button
            type="button"
            className="lobby-back-btn"
            onClick={() => setView('select')}
          >
            返回
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="lobby-container">
      {connectionStatus === 'connecting' && (
        <p className="lobby-hint">⏳ 正在连接服务器...</p>
      )}
      {connectionStatus === 'error' && connectError && (
        <div className="lobby-error" role="alert">
          ⚠️ {connectError}
        </div>
      )}
      <div className="lobby-options">
        <div
          className={`lobby-card${connectionStatus !== 'connected' ? ' disabled' : ''}`}
          onClick={connectionStatus === 'connected' ? handleCreate : undefined}
        >
          <h3>创建房间</h3>
          <p className="lobby-role">你是黑方（先手）</p>
          <button
            type="button"
            className="lobby-action-btn"
            disabled={connectionStatus !== 'connected'}
          >
            创建
          </button>
        </div>
        <div
          className={`lobby-card${connectionStatus !== 'connected' ? ' disabled' : ''}`}
          onClick={
            connectionStatus === 'connected' ? () => setView('joining') : undefined
          }
        >
          <h3>加入房间</h3>
          <p className="lobby-role">你是白方</p>
          <button
            type="button"
            className="lobby-action-btn"
            disabled={connectionStatus !== 'connected'}
          >
            加入
          </button>
        </div>
      </div>
      {joinError && <p className="lobby-error">{joinError}</p>}
    </div>
  )
}
