'use client'

import { useState, useCallback } from 'react'
import { defaultGameState } from '@/lib/schemas'
import type { Cargo, Upgrades } from '@/lib/schemas'

export interface GameStateHook {
  paused: boolean
  scrap: number
  cargo: Cargo
  upgrades: Upgrades
  togglePause: () => void
}

export function useGameState(): GameStateHook {
  const [paused, setPaused] = useState(false)
  const [state] = useState(() => defaultGameState())

  const togglePause = useCallback(() => {
    setPaused((p) => !p)
  }, [])

  return {
    paused,
    scrap: state.cargo.scrap,
    cargo: state.cargo,
    upgrades: state.upgrades,
    togglePause,
  }
}
