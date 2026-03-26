'use client'

import { useRef, useCallback } from 'react'
import type { GameState } from '@/lib/schemas'
import type { SaveSlotId } from '@/lib/schemas'
import { saveSlotSummary } from '@/components/StartScreen'

const AUTOSAVE_INTERVAL = 30_000
const ACTIVE_SLOT_KEY = 'fracking-asteroids-active-slot'

export function getActiveSlot(): SaveSlotId | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACTIVE_SLOT_KEY) as SaveSlotId | null
}

export function setActiveSlot(slotId: SaveSlotId): void {
  localStorage.setItem(ACTIVE_SLOT_KEY, slotId)
}

export function clearActiveSlot(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ACTIVE_SLOT_KEY)
}

export function useGamePersistence(slotId: SaveSlotId | null) {
  const _lastSave = useRef<number>(0)
  void _lastSave
  void AUTOSAVE_INTERVAL

  const save = useCallback(
    async (state: GameState) => {
      if (!slotId) return
      try {
        await fetch(`/api/game/${slotId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(state),
        })
        saveSlotSummary({
          slotId,
          timestamp: state.timestamp,
        })
      } catch {
        // silently ignore save failures
      }
    },
    [slotId],
  )

  const load = useCallback(async (): Promise<GameState | null> => {
    if (!slotId) return null
    try {
      const res = await fetch(`/api/game/${slotId}`)
      if (!res.ok) return null
      return (await res.json()) as GameState
    } catch {
      return null
    }
  }, [slotId])

  return { save, load }
}
