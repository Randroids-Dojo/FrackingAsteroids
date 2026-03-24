'use client'

import { useState, useCallback, useMemo } from 'react'
import { defaultGameState } from '@/lib/schemas'
import type { Cargo, Upgrades } from '@/lib/schemas'
import type { MetalVariant } from '@/game/scene'
import { PLAYER_MAX_HP } from '@/game/scene'

export interface GameStateHook {
  paused: boolean
  scrap: number
  cargo: Cargo
  upgrades: Upgrades
  playerHp: number
  playerMaxHp: number
  togglePause: () => void
  onCollect: (variant: MetalVariant) => void
  onPlayerDamage: (hp: number) => void
  onScrapCollect: (amount: number) => void
}

export function useGameState(): GameStateHook {
  const [paused, setPaused] = useState(false)
  const [cargo, setCargo] = useState(() => defaultGameState().cargo)
  const [scrap, setScrap] = useState(0)
  const [playerHp, setPlayerHp] = useState(PLAYER_MAX_HP)
  const upgrades = useMemo(() => defaultGameState().upgrades, [])

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

  const onPlayerDamage = useCallback((hp: number) => {
    setPlayerHp(hp)
  }, [])

  const onScrapCollect = useCallback((amount: number) => {
    setScrap((prev) => prev + amount)
  }, [])

  return {
    paused,
    scrap,
    cargo,
    upgrades,
    playerHp,
    playerMaxHp: PLAYER_MAX_HP,
    togglePause,
    onCollect,
    onPlayerDamage,
    onScrapCollect,
  }
}
