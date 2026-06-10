'use client'

import { useState, useCallback } from 'react'
import { defaultGameState } from '@/lib/schemas'
import type { Cargo, Travel, Upgrades } from '@/lib/schemas'
import type { MetalVariant } from '@/game/scene'
import { PLAYER_MAX_HP } from '@/game/scene'
import { buyFuelPack, resolveJump } from '@/game/galaxy'
import type { FuelPurchaseResult, JumpResult, SolarSystemId } from '@/game/galaxy'

/** Scrap value per unit of silver ore. */
export const SILVER_SCRAP_VALUE = 5
/** Scrap value per unit of gold ore. */
export const GOLD_SCRAP_VALUE = 15

export interface GameStateHook {
  paused: boolean
  scrap: number
  cargo: Cargo
  travel: Travel
  upgrades: Upgrades
  playerHp: number
  playerMaxHp: number
  togglePause: () => void
  onCollect: (variant: MetalVariant) => void
  onPlayerDamage: (hp: number) => void
  onScrapCollect: (amount: number) => void
  sellMaterials: () => number
  buyUpgrade: (type: keyof Upgrades, cost: number, onPurchased?: (ok: boolean) => void) => void
  spendScrap: (amount: number) => boolean
  jumpToSystem: (targetId: SolarSystemId) => JumpResult
  buyFuel: () => FuelPurchaseResult
}

export function useGameState(): GameStateHook {
  const [paused, setPaused] = useState(false)
  const [cargo, setCargo] = useState(() => defaultGameState().cargo)
  const [scrap, setScrap] = useState(0)
  const [travel, setTravel] = useState(() => defaultGameState().travel)
  const [playerHp, setPlayerHp] = useState(PLAYER_MAX_HP)
  const [upgrades, setUpgrades] = useState(() => defaultGameState().upgrades)

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

  /** Sell all silver and gold for scrap. Returns scrap earned. */
  const sellMaterials = useCallback((): number => {
    let earned = 0
    setCargo((prev) => {
      earned = prev.silver * SILVER_SCRAP_VALUE + prev.gold * GOLD_SCRAP_VALUE
      return { ...prev, silver: 0, gold: 0, fragments: 0 }
    })
    setScrap((prev) => prev + earned)
    return earned
  }, [])

  /**
   * Buy an upgrade. Calls onPurchased(true) if successful, onPurchased(false) if not.
   * Uses callback to avoid synchronous-return-from-setState issues.
   */
  const buyUpgrade = useCallback(
    (type: keyof Upgrades, cost: number, onPurchased?: (ok: boolean) => void): void => {
      setScrap((prevScrap) => {
        if (prevScrap < cost) {
          // Can't afford - schedule callback outside setState
          setTimeout(() => onPurchased?.(false), 0)
          return prevScrap
        }
        // Can afford - also bump the upgrade level
        setUpgrades((prev) => ({
          ...prev,
          [type]: Math.min(prev[type] + 1, 5),
        }))
        setTimeout(() => onPurchased?.(true), 0)
        return prevScrap - cost
      })
    },
    [],
  )

  /** Deduct scrap if affordable. Returns true on success. */
  const spendScrap = useCallback((amount: number): boolean => {
    let success = false
    setScrap((prev) => {
      if (prev >= amount) {
        success = true
        return prev - amount
      }
      return prev
    })
    return success
  }, [])

  const jumpToSystem = useCallback(
    (targetId: SolarSystemId): JumpResult => {
      const result = resolveJump(travel, targetId)
      if (result.ok) setTravel(result.travel)
      return result
    },
    [travel],
  )

  const buyFuel = useCallback((): FuelPurchaseResult => {
    const result = buyFuelPack(travel, scrap)
    if (result.ok) {
      setTravel(result.travel)
      setScrap((prev) => prev - result.scrapSpent)
    }
    return result
  }, [scrap, travel])

  return {
    paused,
    scrap,
    cargo,
    travel,
    upgrades,
    playerHp,
    playerMaxHp: PLAYER_MAX_HP,
    togglePause,
    onCollect,
    onPlayerDamage,
    onScrapCollect,
    sellMaterials,
    buyUpgrade,
    spendScrap,
    jumpToSystem,
    buyFuel,
  }
}
