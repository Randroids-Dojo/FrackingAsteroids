'use client'

import { useState, useCallback, useEffect } from 'react'

export type TutorialStep =
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
    return { active: false, step: 'done', frozen: false }
  }

  switch (state.step) {
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
      if (event === 'unfreeze' && state.frozen)
        return { ...state, step: 'collect-scrap', frozen: false }
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
      setState({ active: true, step: 'move', frozen: false })
    }
  }, [enabled])

  const dispatch = useCallback((event: TutorialEvent) => {
    setState((prev) => {
      const next = advanceTutorial(prev, event)
      if (next === prev) return prev
      return next
    })
  }, [])

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
