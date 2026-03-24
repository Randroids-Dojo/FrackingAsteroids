'use client'

import { useEffect } from 'react'
import type { TutorialStep } from '@/hooks/useTutorial'

/** Grace period before dismiss listeners activate, so in-flight inputs don't instantly close. */
const DISMISS_GRACE_MS = 400

interface TutorialOverlayProps {
  step: TutorialStep
  frozen: boolean
  onSkip: () => void
  onDismiss: () => void
}

const isTouchDevice = (): boolean => typeof window !== 'undefined' && 'ontouchstart' in window

const STEPS: {
  key: 'move' | 'shoot' | 'collect' | 'destroy-enemy' | 'collect-scrap'
  desktop: string
  mobile: string
}[] = [
  {
    key: 'move',
    desktop: 'Use WASD or Arrow Keys to move your ship',
    mobile: 'Touch and drag the left side of the screen to move',
  },
  {
    key: 'shoot',
    desktop: 'Click to fire at the asteroid',
    mobile: 'Tap the FIRE button to shoot',
  },
  {
    key: 'collect',
    desktop: 'Hold E or Space near metal chunks to collect them',
    mobile: 'Hold the COLLECT button near metal chunks',
  },
  {
    key: 'destroy-enemy',
    desktop: 'An enemy ship approaches! Shoot it down!',
    mobile: 'An enemy ship approaches! Shoot it down!',
  },
  {
    key: 'collect-scrap',
    desktop: 'Collect the scrap it dropped!',
    mobile: 'Collect the scrap it dropped!',
  },
]

function StepDots({ step }: { step: TutorialStep }) {
  // wait-for-metal is an intermediate state between shoot and collect —
  // show the collect dot as active (index 2) during that phase.
  const lookupKey = step === 'wait-for-metal' ? 'collect' : step
  const foundIndex = STEPS.findIndex((s) => s.key === lookupKey)
  const stepIndex = foundIndex === -1 ? STEPS.length : foundIndex

  return (
    <div className="flex gap-2 justify-center mb-3" aria-label="Tutorial progress">
      {STEPS.map((s, i) => (
        <div
          key={s.key}
          className={`w-2 h-2 rounded-full ${
            i < stepIndex
              ? 'bg-hud-green'
              : i === stepIndex
                ? 'bg-hud-green animate-pulse'
                : 'bg-white/20'
          }`}
        />
      ))}
    </div>
  )
}

function getPromptText(step: TutorialStep): string {
  const touch = isTouchDevice()

  if (step === 'wait-for-metal') return 'Keep shooting the asteroid...'

  const entry = STEPS.find((s) => s.key === step)
  if (!entry) return ''
  return touch ? entry.mobile : entry.desktop
}

export function TutorialOverlay({ step, frozen, onSkip, onDismiss }: TutorialOverlayProps) {
  // When frozen, any key or touch dismisses the overlay after a grace period
  // so in-flight input events don't instantly close it.
  useEffect(() => {
    if (!frozen) return

    const handleDismiss = () => onDismiss()

    const timerId = setTimeout(() => {
      window.addEventListener('keydown', handleDismiss, { once: true })
      window.addEventListener('touchstart', handleDismiss, { once: true })
      window.addEventListener('mousedown', handleDismiss, { once: true })
    }, DISMISS_GRACE_MS)

    return () => {
      clearTimeout(timerId)
      window.removeEventListener('keydown', handleDismiss)
      window.removeEventListener('touchstart', handleDismiss)
      window.removeEventListener('mousedown', handleDismiss)
    }
  }, [frozen, onDismiss])

  if (step === 'done') return null

  // Hide overlay while waiting for enemy to approach; show again when frozen
  if (step === 'destroy-enemy' && !frozen) return null

  const text = getPromptText(step)

  return (
    <div className="absolute inset-0 pointer-events-none" data-testid="tutorial-overlay">
      {/* Bottom-center prompt panel */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-auto max-w-sm px-6 py-4 bg-space-800/90 border border-hud-green/40 rounded-lg font-mono text-center">
        <StepDots step={step} />
        <p className="text-hud-green text-sm md:text-base">{text}</p>
        {frozen && (
          <p className="text-white/50 text-xs mt-2 animate-pulse">Press any key to continue</p>
        )}
        {!frozen && (
          <button
            onClick={onSkip}
            className="pointer-events-auto mt-3 text-white/40 hover:text-white/70 text-xs transition-colors"
            data-testid="tutorial-skip"
          >
            SKIP
          </button>
        )}
      </div>
    </div>
  )
}
