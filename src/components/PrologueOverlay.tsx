'use client'

import { useCallback, useEffect, useState } from 'react'
import type { TutorialStep } from '@/hooks/useTutorial'
import { ARBITER_DIALOGUE } from '@/game/prologue-config'

interface PrologueOverlayProps {
  step: TutorialStep
  onSkip: () => void
}

/** Auto-fading text that appears then disappears. */
function FadingText({ text, color = 'text-hud-green' }: { text: string; color?: string }) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2500)
    return () => clearTimeout(timer)
  }, [])

  if (!visible) return null

  return (
    <p
      className={`font-mono text-sm sm:text-base ${color} animate-pulse transition-opacity duration-500`}
    >
      {text}
    </p>
  )
}

/** Typewriter-style Arbiter dialogue. */
function ArbiterDialogue() {
  const [lineIndex, setLineIndex] = useState(0)

  useEffect(() => {
    if (lineIndex >= ARBITER_DIALOGUE.length) return
    const timer = setTimeout(() => setLineIndex((i) => i + 1), 2000)
    return () => clearTimeout(timer)
  }, [lineIndex])

  return (
    <div className="flex flex-col items-center gap-3">
      {ARBITER_DIALOGUE.slice(0, lineIndex + 1).map((line, i) => (
        <p
          key={i}
          className={`font-mono text-sm sm:text-lg tracking-wide ${
            i === lineIndex ? 'text-hud-red animate-pulse' : 'text-hud-red/60'
          }`}
        >
          &quot;{line}&quot;
        </p>
      ))}
    </div>
  )
}

export function PrologueOverlay({ step, onSkip }: PrologueOverlayProps) {
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    setConfirming(false)
  }, [step])

  const handleSkipClick = useCallback(() => {
    if (confirming) {
      onSkip()
    } else {
      setConfirming(true)
    }
  }, [confirming, onSkip])

  const handleCancelSkip = useCallback(() => {
    setConfirming(false)
  }, [])

  // Only show during prologue steps
  if (!step.startsWith('prologue-')) return null

  // Steps that show persistent text in a panel
  const showPanel =
    step === 'prologue-start' || step === 'prologue-arbiter' || step === 'prologue-strip'

  return (
    <div className="absolute inset-0 pointer-events-none" data-testid="prologue-overlay">
      {/* Persistent content panel (start, arbiter dialogue, strip) */}
      {showPanel && (
        <div className="absolute top-24 sm:top-28 left-1/2 -translate-x-1/2 w-auto max-w-[80vw] sm:max-w-md px-4 sm:px-6 py-3 sm:py-4 bg-space-800/80 border border-hud-green/30 rounded-lg font-mono text-center">
          {step === 'prologue-start' && (
            <p className="text-hud-green text-sm sm:text-base animate-pulse">
              Systems online. Autopilot engaged.
            </p>
          )}

          {step === 'prologue-arbiter' && (
            <div className="space-y-4">
              <p className="text-white/60 text-xs uppercase tracking-widest animate-pulse">
                Signal detected
              </p>
              <ArbiterDialogue />
            </div>
          )}

          {step === 'prologue-strip' && (
            <p className="text-hud-red text-sm sm:text-base animate-pulse">Systems failing...</p>
          )}
        </div>
      )}

      {/* Fading text (mining, combat, speed) — no background panel */}
      {step === 'prologue-mining' && (
        <div className="absolute top-24 sm:top-28 left-1/2 -translate-x-1/2 font-mono text-center">
          <FadingText text="LAZER engaged." />
        </div>
      )}
      {step === 'prologue-combat' && (
        <div className="absolute top-24 sm:top-28 left-1/2 -translate-x-1/2 font-mono text-center">
          <FadingText text="Hostiles detected." color="text-hud-red" />
        </div>
      )}
      {step === 'prologue-speed' && (
        <div className="absolute top-24 sm:top-28 left-1/2 -translate-x-1/2 font-mono text-center">
          <FadingText text="Full throttle." />
        </div>
      )}

      {/* Autopilot indicator during autonomous phases */}
      {(step === 'prologue-mining' || step === 'prologue-combat' || step === 'prologue-speed') && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 font-mono">
          <p className="text-hud-green/50 text-xs uppercase tracking-[0.3em]">Autopilot</p>
        </div>
      )}

      {/* Skip button — always visible during prologue */}
      <div className="absolute bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2">
        {!confirming && (
          <button
            onClick={handleSkipClick}
            className="pointer-events-auto text-white/30 hover:text-white/60 text-xs font-mono transition-colors"
            data-testid="prologue-skip"
          >
            SKIP INTRO
          </button>
        )}
        {confirming && (
          <div
            className="flex flex-col items-center gap-2 pointer-events-auto"
            data-testid="prologue-skip-confirm"
          >
            <p className="text-white/50 text-xs font-mono">Skip the intro?</p>
            <div className="flex gap-3">
              <button
                onClick={handleSkipClick}
                className="px-3 py-1 text-hud-red text-xs font-mono border border-hud-red/40 rounded hover:bg-hud-red/20 transition-colors"
                data-testid="prologue-skip-yes"
              >
                YES
              </button>
              <button
                onClick={handleCancelSkip}
                className="px-3 py-1 text-white/50 text-xs font-mono border border-white/20 rounded hover:bg-white/10 transition-colors"
                data-testid="prologue-skip-no"
              >
                NO
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
