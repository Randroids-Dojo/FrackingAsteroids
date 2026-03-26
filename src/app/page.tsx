'use client'

import { useState, useCallback, useRef } from 'react'
import { GameCanvas } from '@/components/GameCanvas'
import type { GameCanvasHandle } from '@/components/GameCanvas'
import { HUD } from '@/components/HUD'
import { FeedbackFab } from '@/components/FeedbackFab'
import { StartScreen } from '@/components/StartScreen'
import { TutorialOverlay } from '@/components/TutorialOverlay'
import { TradeMenu } from '@/components/TradeMenu'
import { ShopFab } from '@/components/ShopFab'
import { useGameState } from '@/hooks/useGameState'
import { useTutorial } from '@/hooks/useTutorial'
import type { Upgrades, SaveSlotId } from '@/lib/schemas'

type Screen = 'start' | 'game'

const ACTIVE_SLOT_KEY = 'fracking-asteroids-active-slot'

export default function Home() {
  const [screen, setScreen] = useState<Screen>('start')
  const [activeSlot, setActiveSlot] = useState<SaveSlotId | null>(null)
  const [isNewGame, setIsNewGame] = useState(false)
  const [tradeMenuOpen, setTradeMenuOpen] = useState(false)
  const [inStationRange, setInStationRange] = useState(false)
  const gameCanvasRef = useRef<GameCanvasHandle>(null)
  const {
    paused,
    scrap,
    cargo,
    upgrades,
    playerHp,
    playerMaxHp,
    togglePause,
    onCollect,
    onPlayerDamage,
    onScrapCollect,
    sellMaterials,
    buyUpgrade,
  } = useGameState()
  const tutorial = useTutorial(isNewGame && screen === 'game')

  const handleNewGame = useCallback((slotId: SaveSlotId) => {
    localStorage.setItem(ACTIVE_SLOT_KEY, slotId)
    setActiveSlot(slotId)
    setIsNewGame(true)
    setScreen('game')
  }, [])

  const handleLoadGame = useCallback((slotId: SaveSlotId) => {
    localStorage.setItem(ACTIVE_SLOT_KEY, slotId)
    setActiveSlot(slotId)
    setIsNewGame(false)
    setScreen('game')
  }, [])

  const handleStationRange = useCallback((inRange: boolean) => {
    setInStationRange(inRange)
    if (!inRange) setTradeMenuOpen(false)
  }, [])

  const handleShopFabClick = useCallback(() => {
    tutorial.onEnteredStation()
    setTradeMenuOpen(true)
  }, [tutorial])

  const handleSell = useCallback(() => {
    sellMaterials()
    tutorial.onSoldMaterials()
  }, [sellMaterials, tutorial])

  const handleBuy = useCallback(
    (type: keyof Upgrades, cost: number) => {
      buyUpgrade(type, cost, (ok) => {
        if (!ok) return
        if (type === 'blaster') {
          gameCanvasRef.current?.setFireRateBonus(1.1)
        }
        if (tutorial.active) {
          tutorial.onBoughtUpgrade()
          setTradeMenuOpen(false)
        }
      })
    },
    [buyUpgrade, tutorial],
  )

  const handleCloseTradeMenu = useCallback(() => {
    setTradeMenuOpen(false)
  }, [])

  const handleStationDriveThrough = useCallback(() => {
    tutorial.onDroveThroughStation()
  }, [tutorial])

  // Freeze ship when the shop FAB is visible during the tutorial approach-station step.
  // Unfreezes when the player clicks the FAB (advancing to trade-sell, which hides the overlay).
  const shopTutorialFreeze =
    inStationRange && !tradeMenuOpen && tutorial.active && tutorial.step === 'approach-station'

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
      <GameCanvas
        ref={gameCanvasRef}
        paused={paused || tradeMenuOpen}
        frozen={tutorial.frozen || shopTutorialFreeze}
        tutorialStep={tutorial.step}
        onCollect={onCollect}
        onShipMoved={tutorial.onShipMoved}
        onAsteroidHit={tutorial.onAsteroidHit}
        onMetalSpawned={tutorial.onMetalSpawned}
        onMetalCollected={tutorial.onMetalCollected}
        onPlayerDamage={onPlayerDamage}
        onScrapCollect={onScrapCollect}
        onEnemyNearby={tutorial.onEnemyNearby}
        onEnemyDestroyed={tutorial.onEnemyDestroyed}
        onScrapCollected={tutorial.onScrapCollected}
        onNearStation={tutorial.onNearStation}
        onStationRange={handleStationRange}
        onStationDriveThrough={handleStationDriveThrough}
      />
      <HUD
        scrap={scrap}
        cargo={cargo}
        upgrades={upgrades}
        playerHp={playerHp}
        playerMaxHp={playerMaxHp}
        onPause={togglePause}
      />
      {tutorial.active && (
        <TutorialOverlay
          step={tutorial.step}
          frozen={tutorial.frozen}
          onSkip={tutorial.skip}
          onDismiss={tutorial.unfreeze}
        />
      )}
      {inStationRange && !tradeMenuOpen && (
        <ShopFab
          highlight={tutorial.active && tutorial.step === 'approach-station'}
          onClick={handleShopFabClick}
        />
      )}
      {tradeMenuOpen && (
        <TradeMenu
          cargo={cargo}
          scrap={scrap}
          upgrades={upgrades}
          tutorialStep={tutorial.step}
          onSell={handleSell}
          onBuy={handleBuy}
          onClose={handleCloseTradeMenu}
        />
      )}
      {paused && <FeedbackFab />}
    </main>
  )
}
