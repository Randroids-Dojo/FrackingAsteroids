'use client'

import { useRef, useCallback } from 'react'
import type { GameState } from '@/lib/schemas'

const AUTOSAVE_INTERVAL = 30_000
const STORAGE_KEY = 'fracking-asteroids-game-id'

export function getGameId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY)
}

export function getOrCreateGameId(): string {
  const existing = getGameId()
  if (existing) return existing
  const id = `game-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  localStorage.setItem(STORAGE_KEY, id)
  return id
}

export function resetGameId(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

export function useGamePersistence(gameId: string | null) {
  const _lastSave = useRef<number>(0)
  void _lastSave
  void AUTOSAVE_INTERVAL

  const save = useCallback(
    async (state: GameState) => {
      if (!gameId) return
      try {
        await fetch(`/api/game/${gameId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state),
        })
      } catch {
        // silently ignore save failures
      }
    },
    [gameId],
  )

  const load = useCallback(async (): Promise<GameState | null> => {
    if (!gameId) return null
    try {
      const res = await fetch(`/api/game/${gameId}`)
      if (!res.ok) return null
      return (await res.json()) as GameState
    } catch {
      return null
    }
  }, [gameId])

  return { save, load }
}
