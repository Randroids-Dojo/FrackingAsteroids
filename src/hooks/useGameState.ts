'use client'

import { useState, useCallback } from 'react'
import { defaultGameState } from '@/lib/schemas'
import type { Cargo, Upgrades } from '@/lib/schemas'
import type { MetalVariant } from '@/game/scene'

export interface GameStateHook {
  paused: boolean
  scrap: number
  cargo: Cargo
  upgrades: Upgrades
  togglePause: () => void
  onCollect: (variant: MetalVariant) => void
}

export function useGameState(): GameStateHook {
  const [paused, setPaused] = useState(false)
  const [cargo, setCargo] = useState(() => defaultGameState().cargo)
  const [state] = useState(() => defaultGameState())

  const togglePause = useCallback(() => {
    setPaused((p) => !p)
  }, [])

  const onCollect = useCallback((variant: MetalVariant) => {
    setCargo((prev) => ({
      ...prev,
      fragments: prev.fragments + 1,
      silver: prev.silver + (variant === 'silver' ? 1 : 0),
      gold: prev.gold + (variant === 'gold' ? 1 : 0),
    }))
  }, [])

  return {
    paused,
    scrap: state.cargo.scrap,
    cargo,
    upgrades: state.upgrades,
    togglePause,
    onCollect,
  }
}
