'use client'

import { useState, useCallback, useEffect } from 'react'

export type TutorialStep = 'move' | 'shoot' | 'wait-for-metal' | 'collect' | 'done'

export type TutorialEvent =
  | 'ship-moved'
  | 'asteroid-hit'
  | 'metal-spawned'
  | 'metal-collected'
  | 'skip'

export interface TutorialState {
  active: boolean
  step: TutorialStep
}

/** Pure state machine — testable without React */
export function advanceTutorial(state: TutorialState, event: TutorialEvent): TutorialState {
  if (!state.active) return state

  if (event === 'skip') {
    return { active: false, step: 'done' }
  }

  switch (state.step) {
    case 'move':
      if (event === 'ship-moved') return { active: true, step: 'shoot' }
      return state
    case 'shoot':
      if (event === 'asteroid-hit') return { active: true, step: 'wait-for-metal' }
      return state
    case 'wait-for-metal':
      if (event === 'metal-spawned') return { active: true, step: 'collect' }
      return state
    case 'collect':
      if (event === 'metal-collected') return { active: false, step: 'done' }
      return state
    default:
      return state
  }
}

export interface TutorialHook {
  active: boolean
  step: TutorialStep
  onShipMoved: () => void
  onAsteroidHit: () => void
  onMetalSpawned: () => void
  onMetalCollected: () => void
  skip: () => void
}

export function useTutorial(enabled: boolean): TutorialHook {
  const [state, setState] = useState<TutorialState>({
    active: false,
    step: 'done',
  })

  // Activate every time enabled flips to true (fresh new game)
  useEffect(() => {
    if (enabled) {
      setState({ active: true, step: 'move' })
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
  const skip = useCallback(() => dispatch('skip'), [dispatch])

  return {
    active: state.active,
    step: state.step,
    onShipMoved,
    onAsteroidHit,
    onMetalSpawned,
    onMetalCollected,
    skip,
  }
}
