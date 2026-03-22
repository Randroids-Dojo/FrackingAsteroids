'use client'

import { useRef } from 'react'

interface GameCanvasProps {
  paused: boolean
}

export function GameCanvas({ paused }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={containerRef} id="game-canvas" className="absolute inset-0" data-paused={paused} />
  )
}
