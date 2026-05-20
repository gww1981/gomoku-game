import { useContext } from 'react'
import { AudioCtx } from './AudioContext'

export function useAudio() {
  const context = useContext(AudioCtx)
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider')
  }
  return context
}
