import { useReducer, useEffect, useRef, useCallback } from 'react'
import { replayReducer, getInitialReplayState } from './replayEngine'
import type { ReplayAction } from './types'
import type { GameRecord } from '../game/types'

export function useReplay() {
  const [state, dispatch] = useReducer(replayReducer, undefined, getInitialReplayState)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (state.isPlaying) {
      intervalRef.current = setInterval(() => {
        dispatch({ type: 'TICK' } as ReplayAction)
      }, state.speed)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [state.isPlaying, state.speed])

  const loadRecord = useCallback((record: GameRecord) => {
    dispatch({ type: 'LOAD_RECORD', record } as ReplayAction)
  }, [])

  const play = useCallback(() => dispatch({ type: 'PLAY' } as ReplayAction), [])
  const pause = useCallback(() => dispatch({ type: 'PAUSE' } as ReplayAction), [])
  const stepForward = useCallback(() => dispatch({ type: 'STEP_FORWARD' } as ReplayAction), [])
  const stepBackward = useCallback(() => dispatch({ type: 'STEP_BACKWARD' } as ReplayAction), [])
  const jumpToStart = useCallback(() => dispatch({ type: 'JUMP_TO_START' } as ReplayAction), [])
  const jumpToEnd = useCallback(() => dispatch({ type: 'JUMP_TO_END' } as ReplayAction), [])
  const jumpTo = useCallback((index: number) => dispatch({ type: 'JUMP_TO', index } as ReplayAction), [])
  const setSpeed = useCallback((speed: number) => dispatch({ type: 'SET_SPEED', speed } as ReplayAction), [])

  return { state, loadRecord, play, pause, stepForward, stepBackward, jumpToStart, jumpToEnd, jumpTo, setSpeed }
}