'use client'

import { GameCanvas } from '@/components/GameCanvas'
import { HUD } from '@/components/HUD'
import { FeedbackFab } from '@/components/FeedbackFab'
import { useGameState } from '@/hooks/useGameState'

export default function Home() {
  const { paused, scrap, cargo, upgrades, togglePause } = useGameState()

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-space-900">
      <GameCanvas paused={paused} />
      <HUD scrap={scrap} cargo={cargo} upgrades={upgrades} onPause={togglePause} />
      {paused && <FeedbackFab />}
    </main>
  )
}
