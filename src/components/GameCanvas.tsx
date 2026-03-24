'use client'

import { useRef, useEffect, useCallback } from 'react'
import type { GameScene, MetalVariant } from '@/game/scene'
import type { TutorialStep } from '@/hooks/useTutorial'

interface GameCanvasProps {
  paused: boolean
  frozen: boolean
  tutorialStep: TutorialStep
  onCollect?: (variant: MetalVariant) => void
  onShipMoved?: () => void
  onAsteroidHit?: () => void
  onMetalSpawned?: () => void
  onMetalCollected?: () => void
  onPlayerDamage?: (hp: number) => void
  onScrapCollect?: (amount: number) => void
  onEnemyNearby?: () => void
  onEnemyDestroyed?: () => void
  onScrapCollected?: () => void
  onReachedStation?: () => void
}

export function GameCanvas({
  paused,
  frozen,
  tutorialStep,
  onCollect,
  onShipMoved,
  onAsteroidHit,
  onMetalSpawned,
  onMetalCollected,
  onPlayerDamage,
  onScrapCollect,
  onEnemyNearby,
  onEnemyDestroyed,
  onScrapCollected,
  onReachedStation,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<GameScene | null>(null)
  const pausedRef = useRef(paused)
  const frozenRef = useRef(frozen)
  const tutorialStepRef = useRef(tutorialStep)
  const onCollectRef = useRef(onCollect)
  const onShipMovedRef = useRef(onShipMoved)
  const onAsteroidHitRef = useRef(onAsteroidHit)
  const onMetalSpawnedRef = useRef(onMetalSpawned)
  const onMetalCollectedRef = useRef(onMetalCollected)
  const onPlayerDamageRef = useRef(onPlayerDamage)
  const onScrapCollectRef = useRef(onScrapCollect)
  const onEnemyNearbyRef = useRef(onEnemyNearby)
  const onEnemyDestroyedRef = useRef(onEnemyDestroyed)
  const onScrapCollectedRef = useRef(onScrapCollected)
  const onReachedStationRef = useRef(onReachedStation)

  // Keep refs in sync so the game loop can read them without re-renders
  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    frozenRef.current = frozen
  }, [frozen])

  useEffect(() => {
    tutorialStepRef.current = tutorialStep
  }, [tutorialStep])

  useEffect(() => {
    onCollectRef.current = onCollect
  }, [onCollect])

  useEffect(() => {
    onShipMovedRef.current = onShipMoved
  }, [onShipMoved])

  useEffect(() => {
    onAsteroidHitRef.current = onAsteroidHit
  }, [onAsteroidHit])

  useEffect(() => {
    onMetalSpawnedRef.current = onMetalSpawned
  }, [onMetalSpawned])

  useEffect(() => {
    onMetalCollectedRef.current = onMetalCollected
  }, [onMetalCollected])

  useEffect(() => {
    onPlayerDamageRef.current = onPlayerDamage
  }, [onPlayerDamage])

  useEffect(() => {
    onScrapCollectRef.current = onScrapCollect
  }, [onScrapCollect])

  useEffect(() => {
    onEnemyNearbyRef.current = onEnemyNearby
  }, [onEnemyNearby])

  useEffect(() => {
    onEnemyDestroyedRef.current = onEnemyDestroyed
  }, [onEnemyDestroyed])

  useEffect(() => {
    onScrapCollectedRef.current = onScrapCollected
  }, [onScrapCollected])

  useEffect(() => {
    onReachedStationRef.current = onReachedStation
  }, [onReachedStation])

  const getPaused = useCallback(() => pausedRef.current || frozenRef.current, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Dynamic import to avoid SSR issues with Three.js
    let disposed = false
    import('@/game/scene')
      .then(({ createGameScene }) => {
        if (disposed) return
        sceneRef.current = createGameScene(
          el,
          getPaused,
          () => tutorialStepRef.current,
          {
            onCollect: (variant) => onCollectRef.current?.(variant),
            onShipMoved: () => onShipMovedRef.current?.(),
            onAsteroidHit: () => onAsteroidHitRef.current?.(),
            onMetalSpawned: () => onMetalSpawnedRef.current?.(),
            onMetalCollected: () => onMetalCollectedRef.current?.(),
            onPlayerDamage: (hp) => onPlayerDamageRef.current?.(hp),
            onScrapCollect: (amount) => onScrapCollectRef.current?.(amount),
            onEnemyNearby: () => onEnemyNearbyRef.current?.(),
            onEnemyDestroyed: () => onEnemyDestroyedRef.current?.(),
            onScrapCollected: () => onScrapCollectedRef.current?.(),
            onReachedStation: () => onReachedStationRef.current?.(),
          },
        )
      })
      .catch((err: unknown) => {
        console.error('Failed to load game scene:', err)
      })

    return () => {
      disposed = true
      sceneRef.current?.dispose()
      sceneRef.current = null
    }
  }, [getPaused])

  return (
    <div ref={containerRef} id="game-canvas" className="absolute inset-0" data-paused={paused} />
  )
}
