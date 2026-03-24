'use client'

import { useRef, useEffect, useCallback } from 'react'
import type { GameScene, MetalVariant } from '@/game/scene'

interface GameCanvasProps {
  paused: boolean
  onCollect?: (variant: MetalVariant) => void
  onShipMoved?: () => void
  onAsteroidHit?: () => void
  onMetalSpawned?: () => void
  onMetalCollected?: () => void
}

export function GameCanvas({
  paused,
  onCollect,
  onShipMoved,
  onAsteroidHit,
  onMetalSpawned,
  onMetalCollected,
}: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<GameScene | null>(null)
  const pausedRef = useRef(paused)
  const onCollectRef = useRef(onCollect)
  const onShipMovedRef = useRef(onShipMoved)
  const onAsteroidHitRef = useRef(onAsteroidHit)
  const onMetalSpawnedRef = useRef(onMetalSpawned)
  const onMetalCollectedRef = useRef(onMetalCollected)

  // Keep refs in sync so the game loop can read them without re-renders
  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

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

  const getPaused = useCallback(() => pausedRef.current, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Dynamic import to avoid SSR issues with Three.js
    let disposed = false
    import('@/game/scene')
      .then(({ createGameScene }) => {
        if (disposed) return
        sceneRef.current = createGameScene(el, getPaused, {
          onCollect: (variant) => onCollectRef.current?.(variant),
          onShipMoved: () => onShipMovedRef.current?.(),
          onAsteroidHit: () => onAsteroidHitRef.current?.(),
          onMetalSpawned: () => onMetalSpawnedRef.current?.(),
          onMetalCollected: () => onMetalCollectedRef.current?.(),
        })
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
