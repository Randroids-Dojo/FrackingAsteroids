'use client'

import { useEffect } from 'react'
import type { TutorialStep } from '@/hooks/useTutorial'

interface TutorialOverlayProps {
  step: TutorialStep
  frozen: boolean
  onSkip: () => void
  onDismiss: () => void
}

const isTouchDevice = (): boolean => typeof window !== 'undefined' && 'ontouchstart' in window

const STEPS: {
  key: 'move' | 'shoot' | 'collect' | 'destroy-enemy'
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
]

function StepDots({ step }: { step: TutorialStep }) {
  const stepIndex = step === 'move' ? 0 : step === 'shoot' ? 1 : step === 'collect' ? 2 : 3

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
  // When frozen, any key or touch dismisses the overlay
  useEffect(() => {
    if (!frozen) return

    const handleKey = () => onDismiss()
    const handleTouch = () => onDismiss()

    window.addEventListener('keydown', handleKey, { once: true })
    window.addEventListener('touchstart', handleTouch, { once: true })
    window.addEventListener('mousedown', handleTouch, { once: true })

    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('touchstart', handleTouch)
      window.removeEventListener('mousedown', handleTouch)
    }
  }, [frozen, onDismiss])

  if (step === 'done') return null

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
