'use client'

import { useState, useEffect, useCallback } from 'react'
import { SAVE_SLOT_IDS, SaveSlotSummarySchema } from '@/lib/schemas'
import type { SaveSlotId, SaveSlotSummary } from '@/lib/schemas'

const SLOTS_STORAGE_KEY = 'fracking-asteroids-slot-summaries'

interface StartScreenProps {
  onNewGame: (slotId: SaveSlotId) => void
  onLoadGame: (slotId: SaveSlotId) => void
}

function loadSlotSummaries(): Map<SaveSlotId, SaveSlotSummary> {
  if (typeof window === 'undefined') return new Map()
  try {
    const raw = localStorage.getItem(SLOTS_STORAGE_KEY)
    if (!raw) return new Map()
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Map()
    const map = new Map<SaveSlotId, SaveSlotSummary>()
    for (const item of parsed) {
      const result = SaveSlotSummarySchema.safeParse(item)
      if (result.success) {
        map.set(result.data.slotId, result.data)
      }
    }
    return map
  } catch {
    return new Map()
  }
}

export function saveSlotSummary(summary: SaveSlotSummary): void {
  const map = loadSlotSummaries()
  map.set(summary.slotId, summary)
  localStorage.setItem(SLOTS_STORAGE_KEY, JSON.stringify([...map.values()]))
}

export function clearSlotSummary(slotId: SaveSlotId): void {
  const map = loadSlotSummaries()
  map.delete(slotId)
  localStorage.setItem(SLOTS_STORAGE_KEY, JSON.stringify([...map.values()]))
}

type ScreenMode = 'main' | 'new-game' | 'load-game'

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function SlotLabel({ index }: { index: number }) {
  return <span className="text-hud-green font-bold">SLOT {index + 1}</span>
}

export function StartScreen({ onNewGame, onLoadGame }: StartScreenProps) {
  const [mode, setMode] = useState<ScreenMode>('main')
  const [summaries, setSummaries] = useState<Map<SaveSlotId, SaveSlotSummary>>(new Map())
  const [confirmSlot, setConfirmSlot] = useState<SaveSlotId | null>(null)

  useEffect(() => {
    setSummaries(loadSlotSummaries())
  }, [])

  const handleBack = useCallback(() => {
    setMode('main')
    setConfirmSlot(null)
  }, [])

  const handleNewGameSlot = useCallback(
    (slotId: SaveSlotId) => {
      if (summaries.has(slotId)) {
        setConfirmSlot(slotId)
      } else {
        onNewGame(slotId)
      }
    },
    [summaries, onNewGame],
  )

  const handleConfirmOverwrite = useCallback(() => {
    if (confirmSlot) {
      clearSlotSummary(confirmSlot)
      onNewGame(confirmSlot)
    }
  }, [confirmSlot, onNewGame])

  const populatedSlots = SAVE_SLOT_IDS.filter((id) => summaries.has(id))

  return (
    <div className="absolute inset-0 bg-space-900 flex flex-col items-center justify-center z-50">
      {/* Starfield background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 40 }, (_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: `${1 + (i % 3)}px`,
              height: `${1 + (i % 3)}px`,
              top: `${(i * 37) % 100}%`,
              left: `${(i * 53) % 100}%`,
              opacity: 0.2 + (i % 5) * 0.15,
            }}
          />
        ))}
      </div>

      {/* Title */}
      <h1 className="font-mono text-4xl md:text-6xl font-bold text-hud-green mb-2 tracking-widest text-center relative">
        FRACKING
        <br />
        ASTEROIDS
      </h1>
      <p className="font-mono text-sm md:text-base text-hud-amber/70 mb-12 relative">
        Blast. Collect. Scrap. Upgrade.
      </p>

      {/* Main Menu */}
      {mode === 'main' && (
        <div className="flex flex-col gap-4 relative">
          <button
            onClick={() => setMode('new-game')}
            className="px-8 py-4 bg-space-800/80 border border-hud-green/50 rounded text-hud-green font-mono text-lg hover:bg-space-700/80 hover:border-hud-green active:scale-95 transition-all min-w-[220px]"
          >
            NEW GAME
          </button>
          <button
            onClick={() => setMode('load-game')}
            disabled={populatedSlots.length === 0}
            className="px-8 py-4 bg-space-800/80 border border-hud-blue/50 rounded text-hud-blue font-mono text-lg hover:bg-space-700/80 hover:border-hud-blue active:scale-95 transition-all min-w-[220px] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-space-800/80 disabled:hover:border-hud-blue/50"
          >
            LOAD GAME
          </button>
        </div>
      )}

      {/* New Game Slot Picker */}
      {mode === 'new-game' && !confirmSlot && (
        <div className="flex flex-col gap-3 relative w-full max-w-sm px-4">
          <p className="font-mono text-sm text-white/60 text-center mb-2">Select a save slot</p>
          {SAVE_SLOT_IDS.map((slotId, i) => {
            const summary = summaries.get(slotId)
            return (
              <button
                key={slotId}
                onClick={() => handleNewGameSlot(slotId)}
                className="px-6 py-3 bg-space-800/80 border border-hud-green/30 rounded font-mono text-sm hover:bg-space-700/80 hover:border-hud-green/60 active:scale-[0.98] transition-all text-left"
              >
                <SlotLabel index={i} />
                {summary ? (
                  <span className="text-white/50 ml-3">{formatDate(summary.timestamp)}</span>
                ) : (
                  <span className="text-white/30 ml-3">Empty</span>
                )}
              </button>
            )
          })}
          <button
            onClick={handleBack}
            className="mt-2 px-6 py-2 text-white/40 font-mono text-sm hover:text-white/70 transition-colors"
          >
            BACK
          </button>
        </div>
      )}

      {/* Confirm Overwrite */}
      {mode === 'new-game' && confirmSlot && (
        <div className="flex flex-col gap-4 items-center relative">
          <p className="font-mono text-sm text-hud-red text-center">
            This slot has saved data.
            <br />
            Start a new game and overwrite it?
          </p>
          <div className="flex gap-4">
            <button
              onClick={handleConfirmOverwrite}
              className="px-6 py-3 bg-space-800/80 border border-hud-red/50 rounded text-hud-red font-mono text-sm hover:bg-space-700/80 hover:border-hud-red active:scale-95 transition-all"
            >
              OVERWRITE
            </button>
            <button
              onClick={() => setConfirmSlot(null)}
              className="px-6 py-3 bg-space-800/80 border border-white/20 rounded text-white/60 font-mono text-sm hover:bg-space-700/80 hover:text-white/80 active:scale-95 transition-all"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}

      {/* Load Game Slot Picker */}
      {mode === 'load-game' && (
        <div className="flex flex-col gap-3 relative w-full max-w-sm px-4">
          <p className="font-mono text-sm text-white/60 text-center mb-2">Select a save to load</p>
          {SAVE_SLOT_IDS.map((slotId, i) => {
            const summary = summaries.get(slotId)
            const isEmpty = !summary
            return (
              <button
                key={slotId}
                onClick={() => !isEmpty && onLoadGame(slotId)}
                disabled={isEmpty}
                className="px-6 py-3 bg-space-800/80 border border-hud-blue/30 rounded font-mono text-sm hover:bg-space-700/80 hover:border-hud-blue/60 active:scale-[0.98] transition-all text-left disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-space-800/80 disabled:hover:border-hud-blue/30"
              >
                <SlotLabel index={i} />
                {summary ? (
                  <span className="text-white/50 ml-3">{formatDate(summary.timestamp)}</span>
                ) : (
                  <span className="text-white/30 ml-3">Empty</span>
                )}
              </button>
            )
          })}
          <button
            onClick={handleBack}
            className="mt-2 px-6 py-2 text-white/40 font-mono text-sm hover:text-white/70 transition-colors"
          >
            BACK
          </button>
        </div>
      )}
    </div>
  )
}
