'use client'

import { useState, useCallback } from 'react'
import { GameCanvas } from '@/components/GameCanvas'
import { HUD } from '@/components/HUD'
import { FeedbackFab } from '@/components/FeedbackFab'
import { StartScreen } from '@/components/StartScreen'
import { useGameState } from '@/hooks/useGameState'
import type { SaveSlotId } from '@/lib/schemas'

type Screen = 'start' | 'game'

const ACTIVE_SLOT_KEY = 'fracking-asteroids-active-slot'

export default function Home() {
  const [screen, setScreen] = useState<Screen>('start')
  const [activeSlot, setActiveSlot] = useState<SaveSlotId | null>(null)
  const { paused, scrap, cargo, upgrades, togglePause } = useGameState()

  const handleNewGame = useCallback((slotId: SaveSlotId) => {
    localStorage.setItem(ACTIVE_SLOT_KEY, slotId)
    setActiveSlot(slotId)
    setScreen('game')
  }, [])

  const handleLoadGame = useCallback((slotId: SaveSlotId) => {
    localStorage.setItem(ACTIVE_SLOT_KEY, slotId)
    setActiveSlot(slotId)
    setScreen('game')
  }, [])

  void activeSlot

  if (screen === 'start') {
    return (
      <main className="relative w-screen h-dvh overflow-hidden bg-space-900">
        <StartScreen onNewGame={handleNewGame} onLoadGame={handleLoadGame} />
      </main>
    )
  }

  return (
    <main className="relative w-screen h-dvh overflow-hidden bg-space-900">
      <GameCanvas paused={paused} />
      <HUD scrap={scrap} cargo={cargo} upgrades={upgrades} onPause={togglePause} />
      {paused && <FeedbackFab />}
    </main>
  )
}
