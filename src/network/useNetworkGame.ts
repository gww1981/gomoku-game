import { useEffect, useCallback, useRef } from 'react'
import { networkManager } from './networkManager'
import type { GameAction } from '../game/types'

const DEFAULT_SERVER_URL = (() => {
  const hostname = window.location.hostname
  return `http://${hostname}:3001`
})()

export function useNetworkGame(dispatch: React.Dispatch<GameAction>) {
  const dispatchRef = useRef(dispatch)
  dispatchRef.current = dispatch

  useEffect(() => {
    networkManager.connect(DEFAULT_SERVER_URL)
    networkManager.setHandlers({
      onGameStart: () => {
        dispatchRef.current({
          type: 'SET_LAN_STATE',
          lanState: { opponentConnected: true },
        })
      },
      onOpponentMove: ({ row, col }) => {
        dispatchRef.current({ type: 'OPPONENT_MOVE', row, col })
      },
      onUndoRequested: () => {
        dispatchRef.current({ type: 'OPPONENT_UNDO_REQUEST' })
      },
      onUndoResponded: ({ accepted }) => {
        if (accepted) {
          dispatchRef.current({ type: 'UNDO' })
        }
        dispatchRef.current({
          type: 'SET_LAN_STATE',
          lanState: { undoRequested: false },
        })
      },
      onOpponentChat: () => {},
      onOpponentResigned: () => {
        dispatchRef.current({ type: 'OPPONENT_LEFT' })
      },
      onOpponentDisconnected: () => {
        dispatchRef.current({
          type: 'SET_LAN_STATE',
          lanState: { opponentConnected: false },
        })
      },
      onOpponentReconnected: () => {
        dispatchRef.current({
          type: 'SET_LAN_STATE',
          lanState: { opponentConnected: true },
        })
      },
      onOpponentTimeout: () => {
        dispatchRef.current({ type: 'OPPONENT_LEFT' })
      },
    })
    return () => {
      networkManager.removeHandlers()
      networkManager.disconnect()
    }
  }, [])

  const createRoom = useCallback(async () => {
    const roomId = await networkManager.createRoom()
    dispatch({
      type: 'SET_LAN_STATE',
      lanState: {
        myColor: 'black',
        roomId,
        opponentConnected: false,
        undoRequested: false,
      },
    })
    return roomId
  }, [dispatch])

  const joinRoom = useCallback(async (roomId: string) => {
    const result = await networkManager.joinRoom(roomId)
    if (result.success) {
      dispatch({
        type: 'SET_LAN_STATE',
        lanState: {
          myColor: 'white',
          roomId,
          opponentConnected: true,
          undoRequested: false,
        },
      })
    }
    return result
  }, [dispatch])

  const sendMove = useCallback((row: number, col: number, player: 'black' | 'white') => {
    networkManager.sendMove(row, col, player)
  }, [])

  const requestUndo = useCallback(() => networkManager.requestUndo(), [])

  const respondUndo = useCallback((accepted: boolean) => {
    networkManager.respondUndo(accepted)
    dispatch({
      type: 'SET_LAN_STATE',
      lanState: { undoRequested: false },
    })
  }, [dispatch])

  const sendChat = useCallback((message: string) => networkManager.sendChat(message), [])
  const resign = useCallback(() => networkManager.resign(), [])

  return { createRoom, joinRoom, sendMove, requestUndo, respondUndo, sendChat, resign }
}
