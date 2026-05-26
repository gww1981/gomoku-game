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
  | 'move-timer-start'
  | 'move-timeout'
  | 'game-reset'

export type ClientEvent =
  | 'create-room'
  | 'join-room'
  | 'move'
  | 'request-undo'
  | 'respond-undo'
  | 'chat'
  | 'resign'
  | 'reconnect'
  | 'game-over'
  | 'reset-game'

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

export interface MoveTimerStartPayload {
  deadline: number
  currentPlayer: 'black' | 'white'
}

export interface MoveTimeoutPayload {
  loser: 'black' | 'white'
}
