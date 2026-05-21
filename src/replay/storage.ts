import type { GameRecord } from '../game/types'

const STORAGE_KEY = 'gomoku-game-records'
const MAX_RECORDS = 50

export function loadGameRecords(): GameRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const records = JSON.parse(raw)
    if (!Array.isArray(records)) return []
    return records as GameRecord[]
  } catch {
    return []
  }
}

export function saveGameRecord(record: GameRecord): void {
  const records = loadGameRecords()
  records.unshift(record)
  if (records.length > MAX_RECORDS) {
    records.splice(MAX_RECORDS)
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

export function deleteGameRecord(id: string): void {
  const records = loadGameRecords()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.filter(r => r.id !== id)))
}

export function clearGameRecords(): void {
  localStorage.removeItem(STORAGE_KEY)
}