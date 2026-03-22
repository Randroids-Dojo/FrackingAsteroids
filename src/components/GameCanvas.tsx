'use client'

import { useRef, useEffect, useCallback } from 'react'
import type { GameScene } from '@/game/scene'

interface GameCanvasProps {
  paused: boolean
}

export function GameCanvas({ paused }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<GameScene | null>(null)
  const pausedRef = useRef(paused)

  // Keep pausedRef in sync so the game loop can read it without re-renders
  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  const getPaused = useCallback(() => pausedRef.current, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Dynamic import to avoid SSR issues with Three.js
    let disposed = false
    import('@/game/scene')
      .then(({ createGameScene }) => {
        if (disposed) return
        sceneRef.current = createGameScene(el, getPaused)
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
