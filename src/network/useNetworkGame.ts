import { useEffect, useCallback, useRef, useState } from 'react'
import { networkManager } from './networkManager'
import type { GameAction, Player } from '../game/types'

function getDefaultServerUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:3001'
  return `http://${window.location.hostname}:3001`
}

export type ConnectionStatus = 'connecting' | 'connected' | 'error'

export function useNetworkGame(dispatch: React.Dispatch<GameAction>) {
  const dispatchRef = useRef(dispatch)
  dispatchRef.current = dispatch
  const myColorRef = useRef<Player | null>(null)
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('connecting')
  const [connectError, setConnectError] = useState<string | null>(null)

  // 仅在 mount 时建立一次连接；dispatch 通过 ref 访问，避免重连
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    networkManager.connect(getDefaultServerUrl())
    networkManager.setHandlers({
      onConnect: () => {
        setConnectionStatus('connected')
        setConnectError(null)
      },
      onDisconnect: () => {
        setConnectionStatus('error')
      },
      onConnectError: (err) => {
        setConnectionStatus('error')
        setConnectError(
          `无法连接到服务器 (${err.message})。请确认后端已启动：在项目根目录运行 \`npm run dev:all\` 或单独运行 \`npm run server\`。`
        )
      },
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
        if (accepted && myColorRef.current) {
          // 对方同意了我的悔棋请求 → 撤回我的最近一手
          dispatchRef.current({ type: 'UNDO', requestedBy: myColorRef.current })
        }
        dispatchRef.current({
          type: 'SET_LAN_STATE',
          lanState: { undoRequested: false },
        })
      },
      // chat 由 ChatPanel 通过 subscribeChat 单独订阅
      onOpponentChat: () => {},
      onOpponentResigned: () => {
        // 对方认输 → 我赢
        if (myColorRef.current) {
          const opponentColor: Player = myColorRef.current === 'black' ? 'white' : 'black'
          dispatchRef.current({ type: 'RESIGN', resignedBy: opponentColor })
        }
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
        // 对方超时 → 判我赢
        if (myColorRef.current) {
          const opponentColor: Player = myColorRef.current === 'black' ? 'white' : 'black'
          dispatchRef.current({ type: 'RESIGN', resignedBy: opponentColor })
        }
      },
      onMoveTimerStart: ({ deadline, currentPlayer }) => {
        dispatchRef.current({
          type: 'SET_LAN_STATE',
          lanState: { moveDeadline: deadline, timerFor: currentPlayer },
        })
      },
      onMoveTimeout: ({ loser }) => {
        dispatchRef.current({ type: 'MOVE_TIMEOUT', loser })
      },
      onGameReset: () => {
        dispatchRef.current({ type: 'RESET' })
      },
      onOpponentLeft: () => {
        dispatchRef.current({
          type: 'SET_LAN_STATE',
          lanState: { opponentConnected: false },
        })
      },
    })
    return () => {
      networkManager.removeHandlers()
      networkManager.disconnect()
    }
  }, [])

  const createRoom = useCallback(async () => {
    const roomId = await networkManager.createRoom()
    myColorRef.current = 'black'
    dispatch({
      type: 'SET_LAN_STATE',
      lanState: {
        myColor: 'black',
        roomId,
        opponentConnected: false,
        undoRequested: false,
        moveDeadline: null,
        timerFor: null,
      },
    })
    return roomId
  }, [dispatch])

  const joinRoom = useCallback(async (roomId: string) => {
    const result = await networkManager.joinRoom(roomId)
    if (result.success) {
      myColorRef.current = 'white'
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

  const sendMove = useCallback((row: number, col: number, player: Player) => {
    networkManager.sendMove(row, col, player)
  }, [])

  const requestUndo = useCallback(() => networkManager.requestUndo(), [])

  const respondUndo = useCallback(
    (accepted: boolean) => {
      networkManager.respondUndo(accepted)
      if (accepted) {
        // 同意悔棋：本地也要撤回到请求方（对方）最近一手之前
        const opponentColor: Player =
          myColorRef.current === 'black' ? 'white' : 'black'
        dispatch({ type: 'UNDO', requestedBy: opponentColor })
      }
      dispatch({
        type: 'SET_LAN_STATE',
        lanState: { undoRequested: false },
      })
    },
    [dispatch]
  )

  const sendChat = useCallback((message: string) => networkManager.sendChat(message), [])

  const subscribeChat = useCallback(
    (cb: (message: string) => void) => networkManager.subscribeChat(cb),
    []
  )

  const resign = useCallback(() => {
    networkManager.resign()
    if (myColorRef.current) {
      dispatch({ type: 'RESIGN', resignedBy: myColorRef.current })
    }
  }, [dispatch])

  const notifyGameOver = useCallback(() => {
    networkManager.notifyGameOver()
  }, [])

  const resetGame = useCallback(() => {
    networkManager.resetGame()
  }, [])

  const leaveRoom = useCallback(() => {
    networkManager.leaveRoom()
    myColorRef.current = null
  }, [])

  return {
    createRoom,
    joinRoom,
    sendMove,
    requestUndo,
    respondUndo,
    sendChat,
    subscribeChat,
    resign,
    notifyGameOver,
    resetGame,
    leaveRoom,
    connectionStatus,
    connectError,
  }
}
