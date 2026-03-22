"use client";

import { useEffect, useRef } from "react";

interface GameCanvasProps {
  paused: boolean;
}

export function GameCanvas({ paused }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Three.js renderer will be initialized here
    // For now, render a placeholder starfield
    const container = containerRef.current;
    if (!container) return;

    // Placeholder: game engine initialization will go here
    // See src/game/index.ts for the game engine entry point
  }, []);

  return (
    <div
      ref={containerRef}
      id="game-canvas"
      className="absolute inset-0"
      data-paused={paused}
    />
  );
}
