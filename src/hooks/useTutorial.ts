'use client'

import { useState, useCallback, useEffect } from 'react'

export type TutorialStep =
  | 'prologue-start'
  | 'prologue-mining'
  | 'prologue-combat'
  | 'prologue-speed'
  | 'prologue-arbiter'
  | 'prologue-strip'
  | 'prologue-fade'
  | 'move'
  | 'shoot'
  | 'wait-for-metal'
  | 'collect'
  | 'destroy-enemy'
  | 'collect-scrap'
  | 'go-to-station'
  | 'approach-station'
  | 'trade-sell'
  | 'trade-buy'
  | 'drive-through'
  | 'done'

export type TutorialEvent =
  | 'prologue-ready'
  | 'asteroids-cleared'
  | 'fleet-destroyed'
  | 'speed-reached'
  | 'arbiter-arrived'
  | 'strip-complete'
  | 'prologue-respawn-complete'
  | 'ship-moved'
  | 'asteroid-hit'
  | 'metal-spawned'
  | 'metal-collected'
  | 'enemy-nearby'
  | 'enemy-destroyed'
  | 'scrap-collected'
  | 'near-station'
  | 'entered-station'
  | 'sold-materials'
  | 'bought-upgrade'
  | 'drove-through-station'
  | 'unfreeze'
  | 'skip'

export interface TutorialState {
  active: boolean
  step: TutorialStep
  frozen: boolean
}

/** Pure state machine — testable without React */
export function advanceTutorial(state: TutorialState, event: TutorialEvent): TutorialState {
  if (!state.active) return state

  if (event === 'skip') {
    // During prologue, skip to tutorial start; during tutorial, skip to done
    if (state.step.startsWith('prologue-')) {
      return { active: true, step: 'move', frozen: false }
    }
    return { active: false, step: 'done', frozen: false }
  }

  switch (state.step) {
    // --- Prologue steps ---
    case 'prologue-start':
      if (event === 'prologue-ready') return { ...state, step: 'prologue-mining' }
      return state
    case 'prologue-mining':
      if (event === 'asteroids-cleared') return { ...state, step: 'prologue-combat' }
      return state
    case 'prologue-combat':
      if (event === 'fleet-destroyed') return { ...state, step: 'prologue-speed' }
      return state
    case 'prologue-speed':
      if (event === 'speed-reached') return { ...state, step: 'prologue-arbiter' }
      return state
    case 'prologue-arbiter':
      if (event === 'arbiter-arrived') return { ...state, step: 'prologue-strip' }
      return state
    case 'prologue-strip':
      if (event === 'strip-complete') return { ...state, step: 'prologue-fade' }
      return state
    case 'prologue-fade':
      if (event === 'prologue-respawn-complete') return { ...state, step: 'move', frozen: false }
      return state

    // --- Tutorial steps ---
    case 'move':
      if (event === 'ship-moved') return { ...state, step: 'shoot' }
      return state
    case 'shoot':
      if (event === 'asteroid-hit') return { ...state, step: 'wait-for-metal' }
      return state
    case 'wait-for-metal':
      if (event === 'metal-spawned') return { ...state, step: 'collect' }
      return state
    case 'collect':
      if (event === 'metal-collected') return { ...state, step: 'destroy-enemy' }
      return state
    case 'destroy-enemy':
      if (event === 'enemy-nearby' && !state.frozen) return { ...state, frozen: true }
      if (event === 'unfreeze' && state.frozen) return { ...state, frozen: false }
      if (event === 'enemy-destroyed') return { ...state, step: 'collect-scrap' }
      return state
    case 'collect-scrap':
      if (event === 'scrap-collected') return { ...state, step: 'go-to-station' }
      return state
    case 'go-to-station':
      if (event === 'near-station') return { ...state, step: 'approach-station' }
      return state
    case 'approach-station':
      if (event === 'entered-station') return { ...state, step: 'trade-sell' }
      return state
    case 'trade-sell':
      if (event === 'sold-materials') return { ...state, step: 'trade-buy' }
      return state
    case 'trade-buy':
      if (event === 'bought-upgrade') return { ...state, step: 'drive-through' }
      return state
    case 'drive-through':
      if (event === 'drove-through-station') return { active: false, step: 'done', frozen: false }
      return state
    default:
      return state
  }
}

export interface TutorialHook {
  active: boolean
  step: TutorialStep
  frozen: boolean
  // Prologue callbacks
  onPrologueReady: () => void
  onAsteroidsCleared: () => void
  onFleetDestroyed: () => void
  onSpeedReached: () => void
  onArbiterArrived: () => void
  onStripComplete: () => void
  onPrologueRespawnComplete: () => void
  // Tutorial callbacks
  onShipMoved: () => void
  onAsteroidHit: () => void
  onMetalSpawned: () => void
  onMetalCollected: () => void
  onEnemyNearby: () => void
  onEnemyDestroyed: () => void
  onScrapCollected: () => void
  onNearStation: () => void
  onEnteredStation: () => void
  onSoldMaterials: () => void
  onBoughtUpgrade: () => void
  onDroveThroughStation: () => void
  unfreeze: () => void
  skip: () => void
}

export function useTutorial(enabled: boolean): TutorialHook {
  const [state, setState] = useState<TutorialState>({
    active: false,
    step: 'done',
    frozen: false,
  })

  // Activate every time enabled flips to true (fresh new game)
  useEffect(() => {
    if (enabled) {
      setState({ active: true, step: 'prologue-start', frozen: false })
    }
  }, [enabled])

  const dispatch = useCallback((event: TutorialEvent) => {
    setState((prev) => {
      const next = advanceTutorial(prev, event)
      if (next === prev) return prev
      return next
    })
  }, [])

  // Prologue callbacks
  const onPrologueReady = useCallback(() => dispatch('prologue-ready'), [dispatch])
  const onAsteroidsCleared = useCallback(() => dispatch('asteroids-cleared'), [dispatch])
  const onFleetDestroyed = useCallback(() => dispatch('fleet-destroyed'), [dispatch])
  const onSpeedReached = useCallback(() => dispatch('speed-reached'), [dispatch])
  const onArbiterArrived = useCallback(() => dispatch('arbiter-arrived'), [dispatch])
  const onStripComplete = useCallback(() => dispatch('strip-complete'), [dispatch])
  const onPrologueRespawnComplete = useCallback(
    () => dispatch('prologue-respawn-complete'),
    [dispatch],
  )

  // Tutorial callbacks
  const onShipMoved = useCallback(() => dispatch('ship-moved'), [dispatch])
  const onAsteroidHit = useCallback(() => dispatch('asteroid-hit'), [dispatch])
  const onMetalSpawned = useCallback(() => dispatch('metal-spawned'), [dispatch])
  const onMetalCollected = useCallback(() => dispatch('metal-collected'), [dispatch])
  const onEnemyNearby = useCallback(() => dispatch('enemy-nearby'), [dispatch])
  const onEnemyDestroyed = useCallback(() => dispatch('enemy-destroyed'), [dispatch])
  const onScrapCollected = useCallback(() => dispatch('scrap-collected'), [dispatch])
  const onNearStation = useCallback(() => dispatch('near-station'), [dispatch])
  const onEnteredStation = useCallback(() => dispatch('entered-station'), [dispatch])
  const onSoldMaterials = useCallback(() => dispatch('sold-materials'), [dispatch])
  const onBoughtUpgrade = useCallback(() => dispatch('bought-upgrade'), [dispatch])
  const onDroveThroughStation = useCallback(() => dispatch('drove-through-station'), [dispatch])
  const unfreeze = useCallback(() => dispatch('unfreeze'), [dispatch])
  const skip = useCallback(() => dispatch('skip'), [dispatch])

  return {
    active: state.active,
    step: state.step,
    frozen: state.frozen,
    onPrologueReady,
    onAsteroidsCleared,
    onFleetDestroyed,
    onSpeedReached,
    onArbiterArrived,
    onStripComplete,
    onPrologueRespawnComplete,
    onShipMoved,
    onAsteroidHit,
    onMetalSpawned,
    onMetalCollected,
    onEnemyNearby,
    onEnemyDestroyed,
    onScrapCollected,
    onNearStation,
    onEnteredStation,
    onSoldMaterials,
    onBoughtUpgrade,
    onDroveThroughStation,
    unfreeze,
    skip,
  }
}
