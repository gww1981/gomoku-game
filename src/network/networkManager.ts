import { io, Socket } from 'socket.io-client'
import type {
  OpponentMovePayload,
  UndoRespondedPayload,
  OpponentChatPayload,
  GameStartPayload,
  ReconnectResult,
  JoinRoomResult,
} from './types'

export type NetworkEventHandlers = {
  onGameStart: (payload: GameStartPayload) => void
  onOpponentMove: (payload: OpponentMovePayload) => void
  onUndoRequested: () => void
  onUndoResponded: (payload: UndoRespondedPayload) => void
  onOpponentChat: (payload: OpponentChatPayload) => void
  onOpponentResigned: () => void
  onOpponentDisconnected: () => void
  onOpponentReconnected: () => void
  onOpponentTimeout: () => void
  onConnect: () => void
  onDisconnect: (reason: string) => void
  onConnectError: (error: Error) => void
}

export class NetworkManager {
  private socket: Socket | null = null
  private roomId: string | null = null
  private chatListeners: Set<(message: string) => void> = new Set()
  private lifecycleHandlers: {
    onConnect?: () => void
    onDisconnect?: (reason: string) => void
    onConnectError?: (error: Error) => void
  } = {}

  connect(serverUrl: string): void {
    if (this.socket) {
      this.socket.disconnect()
    }
    this.socket = io(serverUrl, {
      autoConnect: true,
      reconnection: false,
      transports: ['websocket'],
    })
    this.socket.on('connect', () => this.lifecycleHandlers.onConnect?.())
    this.socket.on('disconnect', (reason: string) =>
      this.lifecycleHandlers.onDisconnect?.(reason)
    )
    this.socket.on('connect_error', (error: Error) =>
      this.lifecycleHandlers.onConnectError?.(error)
    )
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.roomId = null
    this.chatListeners.clear()
    this.lifecycleHandlers = {}
  }

  setHandlers(handlers: NetworkEventHandlers): void {
    this.removeHandlers()
    this.lifecycleHandlers = {
      onConnect: handlers.onConnect,
      onDisconnect: handlers.onDisconnect,
      onConnectError: handlers.onConnectError,
    }
    if (!this.socket) return

    this.socket.on('game-start', handlers.onGameStart)
    this.socket.on('opponent-move', handlers.onOpponentMove)
    this.socket.on('undo-requested', handlers.onUndoRequested)
    this.socket.on('undo-responded', handlers.onUndoResponded)
    this.socket.on('opponent-chat', (payload: OpponentChatPayload) => {
      handlers.onOpponentChat(payload)
      this.chatListeners.forEach((cb) => cb(payload.message))
    })
    this.socket.on('opponent-resigned', handlers.onOpponentResigned)
    this.socket.on('opponent-disconnected', handlers.onOpponentDisconnected)
    this.socket.on('opponent-reconnected', handlers.onOpponentReconnected)
    this.socket.on('opponent-timeout', handlers.onOpponentTimeout)
  }

  removeHandlers(): void {
    if (!this.socket) return
    this.socket.off('game-start')
    this.socket.off('opponent-move')
    this.socket.off('undo-requested')
    this.socket.off('undo-responded')
    this.socket.off('opponent-chat')
    this.socket.off('opponent-resigned')
    this.socket.off('opponent-disconnected')
    this.socket.off('opponent-reconnected')
    this.socket.off('opponent-timeout')
  }

  subscribeChat(cb: (message: string) => void): () => void {
    this.chatListeners.add(cb)
    return () => this.chatListeners.delete(cb)
  }

  async createRoom(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error('未连接'))
      if (!this.socket.connected) return reject(new Error('未连接到服务器'))
      this.socket.emit('create-room', (response: { roomId: string }) => {
        this.roomId = response.roomId
        resolve(response.roomId)
      })
    })
  }

  async joinRoom(roomId: string): Promise<JoinRoomResult> {
    return new Promise((resolve, reject) => {
      if (!this.socket) return reject(new Error('未连接'))
      if (!this.socket.connected) return reject(new Error('未连接到服务器'))
      this.socket.emit('join-room', { roomId }, (response: JoinRoomResult) => {
        if (response.success) this.roomId = roomId
        resolve(response)
      })
    })
  }

  sendMove(row: number, col: number, player: 'black' | 'white'): void {
    if (!this.socket || !this.roomId) return
    this.socket.emit('move', { roomId: this.roomId, row, col, player })
  }

  requestUndo(): void {
    if (!this.socket || !this.roomId) return
    this.socket.emit('request-undo', { roomId: this.roomId })
  }

  respondUndo(accepted: boolean): void {
    if (!this.socket || !this.roomId) return
    this.socket.emit('respond-undo', { roomId: this.roomId, accepted })
  }

  sendChat(message: string): void {
    if (!this.socket || !this.roomId) return
    this.socket.emit('chat', { roomId: this.roomId, message })
  }

  resign(): void {
    if (!this.socket || !this.roomId) return
    this.socket.emit('resign', { roomId: this.roomId })
  }

  async reconnect(oldSocketId: string): Promise<ReconnectResult> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.roomId) return reject(new Error('未连接'))
      this.socket.emit(
        'reconnect',
        { roomId: this.roomId, oldSocketId },
        (response: ReconnectResult) => {
          resolve(response)
        }
      )
    })
  }

  getRoomId(): string | null {
    return this.roomId
  }

  getSocketId(): string | null {
    return this.socket?.id ?? null
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  clearRoom(): void {
    this.roomId = null
  }
}

export const networkManager = new NetworkManager()
