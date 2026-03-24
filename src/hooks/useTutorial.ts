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

const STORAGE_KEY = 'fracking-asteroids-tutorial-done'

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

function markTutorialDone(): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, 'true')
  }
}

function isTutorialDone(): boolean {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  }
  return false
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

  // Activate when enabled becomes true (e.g. after NEW GAME click)
  useEffect(() => {
    if (enabled && !isTutorialDone()) {
      setState({ active: true, step: 'move' })
    }
  }, [enabled])

  const dispatch = useCallback((event: TutorialEvent) => {
    setState((prev) => {
      const next = advanceTutorial(prev, event)
      if (next === prev) return prev
      if (!next.active) markTutorialDone()
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
