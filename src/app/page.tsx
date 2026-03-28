'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { GameCanvas } from '@/components/GameCanvas'
import type { GameCanvasHandle } from '@/components/GameCanvas'
import { HUD } from '@/components/HUD'
import { FeedbackFab } from '@/components/FeedbackFab'
import { SoundFab } from '@/components/SoundFab'
import { StartScreen } from '@/components/StartScreen'
import { TutorialOverlay } from '@/components/TutorialOverlay'
import { TradeMenu } from '@/components/TradeMenu'
import { ShopFab } from '@/components/ShopFab'
import { useGameState } from '@/hooks/useGameState'
import { useGamePersistence } from '@/hooks/useGamePersistence'
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
  const { save } = useGamePersistence(activeSlot)
  const tutorial = useTutorial(isNewGame && screen === 'game')

  // --- Auto-save on state changes triggered by game events ---
  const [saveSeq, setSaveSeq] = useState(0)

  /** Request a save after the current state updates have been applied. */
  const requestSave = useCallback(() => {
    setSaveSeq((n) => n + 1)
  }, [])

  // Persist the snapshot whenever saveSeq increments (driven by game events).
  // Skip the initial render (saveSeq === 0).
  useEffect(() => {
    if (saveSeq === 0) return
    void save({
      ship: { x: 0, y: 0, rotation: 0, velocityX: 0, velocityY: 0 },
      upgrades,
      cargo: { ...cargo, scrap },
      hp: playerHp,
      timestamp: Date.now(),
    })
  }, [saveSeq]) // eslint-disable-line react-hooks/exhaustive-deps -- save reads latest state at trigger time

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

  const handleCollect = useCallback(
    (variant: 'silver' | 'gold') => {
      onCollect(variant)
      requestSave()
    },
    [onCollect, requestSave],
  )

  const handleScrapCollect = useCallback(
    (amount: number) => {
      onScrapCollect(amount)
      requestSave()
    },
    [onScrapCollect, requestSave],
  )

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
    requestSave()
  }, [sellMaterials, tutorial, requestSave])

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
        requestSave()
      })
    },
    [buyUpgrade, tutorial, requestSave],
  )

  const handleCloseTradeMenu = useCallback(() => {
    setTradeMenuOpen(false)
  }, [])

  const handleStationDriveThrough = useCallback(() => {
    tutorial.onDroveThroughStation()
    requestSave()
  }, [tutorial, requestSave])

  const handlePlayerKilled = useCallback(() => {
    tutorial.onPlayerKilled()
  }, [tutorial])

  // --- Ambush fade-to-black and respawn sequence ---
  const [ambushFade, setAmbushFade] = useState<
    'none' | 'fading-in' | 'black' | 'loaded' | 'fading-out'
  >('none')

  // Stable ref for the completion callback so the effect doesn't re-trigger
  const ambushCompleteRef = useRef(tutorial.onAmbushComplete)
  useEffect(() => {
    ambushCompleteRef.current = tutorial.onAmbushComplete
  }, [tutorial.onAmbushComplete])

  const tutorialStep = tutorial.step
  useEffect(() => {
    if (tutorialStep !== 'ambush-fade') return
    const timers: ReturnType<typeof setTimeout>[] = []
    // Start fade to black
    setAmbushFade('fading-in')

    // After fade-in completes (1.5s), hold black with "You Died"
    timers.push(
      setTimeout(() => {
        setAmbushFade('black')
        gameCanvasRef.current?.resetShipToStation()

        // After a hold (1.5s), switch to "Loading last save" text
        timers.push(
          setTimeout(() => {
            setAmbushFade('loaded')

            // Hold "Loading last save" on black (2s), then fade out
            timers.push(
              setTimeout(() => {
                setAmbushFade('fading-out')

                timers.push(
                  setTimeout(() => {
                    setAmbushFade('none')
                    ambushCompleteRef.current()
                  }, 1500),
                )
              }, 2000),
            )
          }, 1500),
        )
      }, 1500),
    )

    return () => timers.forEach(clearTimeout)
  }, [tutorialStep])

  // Freeze ship when the shop FAB is visible during the tutorial approach-station step.
  // Unfreezes when the player clicks the FAB (advancing to trade-sell, which hides the overlay).
  const shopTutorialFreeze =
    inStationRange && !tradeMenuOpen && tutorial.active && tutorial.step === 'approach-station'

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
        onCollect={handleCollect}
        onShipMoved={tutorial.onShipMoved}
        onAsteroidHit={tutorial.onAsteroidHit}
        onMetalSpawned={tutorial.onMetalSpawned}
        onMetalCollected={tutorial.onMetalCollected}
        onPlayerDamage={onPlayerDamage}
        onScrapCollect={handleScrapCollect}
        onEnemyNearby={tutorial.onEnemyNearby}
        onEnemyDestroyed={tutorial.onEnemyDestroyed}
        onScrapCollected={tutorial.onScrapCollected}
        onNearStation={tutorial.onNearStation}
        onStationRange={handleStationRange}
        onStationDriveThrough={handleStationDriveThrough}
        onPlayerKilled={handlePlayerKilled}
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
      {paused && (
        <div className="absolute inset-0 z-[40] bg-black/60 pointer-events-none" aria-hidden />
      )}
      {paused && <FeedbackFab />}
      {paused && <SoundFab />}
      {ambushFade !== 'none' && (
        <div
          className="absolute inset-0 bg-black z-50 flex items-center justify-center"
          style={
            ambushFade === 'fading-in'
              ? { animation: 'fadeIn 1.5s ease-in forwards' }
              : ambushFade === 'fading-out'
                ? { animation: 'fadeOut 1.5s ease-out forwards' }
                : undefined
          }
          data-testid="ambush-fade"
        >
          {(ambushFade === 'fading-in' || ambushFade === 'black') && (
            <p className="font-mono text-2xl sm:text-4xl tracking-widest text-hud-red/90 animate-pulse">
              You Died
            </p>
          )}
          {(ambushFade === 'loaded' || ambushFade === 'fading-out') && (
            <p className="font-mono text-lg sm:text-2xl tracking-widest text-hud-green/90 animate-pulse">
              Loading last save
            </p>
          )}
        </div>
      )}
    </main>
  )
}
