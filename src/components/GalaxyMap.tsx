'use client'

import { useMemo, useState } from 'react'
import type { Travel } from '@/lib/schemas'
import { GALAXY_SYSTEMS, calculateJumpFuelCost, getSolarSystem, resolveJump } from '@/game/galaxy'
import type { JumpResult, SolarSystemId } from '@/game/galaxy'

interface GalaxyMapProps {
  travel: Travel
  onJump: (targetId: SolarSystemId) => JumpResult
  onClose: () => void
}

function jumpMessage(result: JumpResult): string {
  if (result.ok) return `Jumped to ${result.target.name}.`
  if (result.reason === 'same-system') return 'Already in this system.'
  if (result.reason === 'not-enough-fuel') {
    return `Need ${result.cost} fuel for that jump. Refuel at the trade station.`
  }
  return 'Unknown system.'
}

export function GalaxyMap({ travel, onJump, onClose }: GalaxyMapProps) {
  const [message, setMessage] = useState<string | null>(null)
  const currentSystem = getSolarSystem(travel.currentSystem)
  const routePreview = useMemo(
    () =>
      GALAXY_SYSTEMS.map((system) => {
        const result = resolveJump(travel, system.id)
        const cost = calculateJumpFuelCost(travel.currentSystem, system.id)
        return { system, result, cost }
      }),
    [travel],
  )

  const handleJump = (targetId: SolarSystemId) => {
    const result = onJump(targetId)
    setMessage(jumpMessage(result))
    if (result.ok) onClose()
  }

  return (
    <div className="absolute inset-0 z-[70] bg-black/75 pointer-events-auto flex items-center justify-center p-3">
      <section
        className="w-[720px] max-w-full max-h-[92vh] overflow-hidden rounded border border-hud-blue/50 bg-space-900/95 font-mono shadow-2xl"
        aria-label="Galaxy map"
      >
        <div className="flex items-start justify-between gap-3 border-b border-hud-blue/30 px-4 py-3">
          <div>
            <h2 className="text-hud-blue text-lg font-bold tracking-wider">GALAXY MAP</h2>
            <p className="text-xs text-white/60">
              {currentSystem.name} | Fuel {travel.fuel}/{travel.maxFuel}
            </p>
          </div>
          <button
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded border border-white/20 text-white/60 hover:text-white hover:border-white/50"
            aria-label="Close galaxy map"
          >
            X
          </button>
        </div>

        <div className="grid gap-4 p-4 md:grid-cols-[1.15fr_0.85fr]">
          <div className="relative min-h-[320px] overflow-hidden rounded border border-white/10 bg-black/30">
            <div className="absolute inset-4 border border-hud-blue/10" />
            <div className="absolute left-[12%] right-[16%] top-[58%] h-px rotate-[-26deg] bg-hud-blue/20" />
            <div className="absolute left-[36%] right-[34%] top-[33%] h-px rotate-[-34deg] bg-hud-blue/20" />
            <div className="absolute left-[62%] right-[14%] top-[45%] h-px rotate-[55deg] bg-hud-blue/20" />
            {routePreview.map(({ system, result, cost }) => {
              const isCurrent = system.id === travel.currentSystem
              const canJump = result.ok
              return (
                <button
                  key={system.id}
                  onClick={() => handleJump(system.id)}
                  disabled={!canJump}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 flex h-16 w-16 flex-col items-center justify-center rounded-full border text-[10px] font-bold transition-all ${
                    isCurrent
                      ? 'border-hud-green bg-hud-green/20 text-hud-green'
                      : canJump
                        ? 'border-hud-blue bg-hud-blue/20 text-white hover:bg-hud-blue/35'
                        : 'border-white/15 bg-white/5 text-white/30'
                  }`}
                  style={{ left: `${system.mapX}%`, top: `${system.mapY}%` }}
                  aria-label={`${system.name}, fuel cost ${cost}`}
                >
                  <span>{system.name.split(' ')[0]}</span>
                  <span>{isCurrent ? 'HERE' : `${cost}F`}</span>
                </button>
              )
            })}
          </div>

          <div className="flex min-h-[320px] flex-col gap-3">
            <div className="border-b border-white/10 pb-2">
              <div className="text-xs text-white/50">CURRENT SYSTEM</div>
              <div className="text-hud-green font-bold">{currentSystem.name}</div>
              <div className="text-xs text-white/50">{currentSystem.region}</div>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto pr-1">
              {routePreview.map(({ system, result, cost }) => {
                const isCurrent = system.id === travel.currentSystem
                const canJump = result.ok
                return (
                  <button
                    key={system.id}
                    onClick={() => handleJump(system.id)}
                    disabled={!canJump}
                    className={`w-full rounded border p-3 text-left transition-colors ${
                      isCurrent
                        ? 'border-hud-green/50 bg-hud-green/10'
                        : canJump
                          ? 'border-hud-blue/40 bg-hud-blue/10 hover:bg-hud-blue/20'
                          : 'border-white/10 bg-white/5 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-white/90">{system.name}</span>
                      <span className="text-xs text-hud-amber">
                        {isCurrent ? 'HERE' : `${cost} fuel`}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-white/50">
                      {system.danger} risk | {system.resourceFocus}
                    </div>
                  </button>
                )
              })}
            </div>

            {message && (
              <div className="rounded border border-hud-amber/40 bg-hud-amber/10 px-3 py-2 text-xs text-hud-amber">
                {message}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
