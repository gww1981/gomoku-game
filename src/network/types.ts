export type ServerEvent =
  | 'game-start'
  | 'opponent-move'
  | 'undo-requested'
  | 'undo-responded'
  | 'opponent-chat'
  | 'opponent-resigned'
  | 'opponent-disconnected'
  | 'opponent-reconnected'
  | 'opponent-timeout'
  | 'opponent-left'

export type ClientEvent =
  | 'create-room'
  | 'join-room'
  | 'move'
  | 'request-undo'
  | 'respond-undo'
  | 'chat'
  | 'resign'
  | 'reconnect'
  | 'leave-room'

export interface OpponentMovePayload {
  row: number
  col: number
  player: 'black' | 'white'
}

export interface UndoRespondedPayload {
  accepted: boolean
}

export interface OpponentChatPayload {
  message: string
}

export interface GameStartPayload {
  blackId: string
  whiteId: string
}

export interface ReconnectResult {
  success: boolean
  moves?: Array<{ row: number; col: number; player: 'black' | 'white' }>
}

export interface JoinRoomResult {
  success: boolean
  role?: 'white'
  error?: string
}
