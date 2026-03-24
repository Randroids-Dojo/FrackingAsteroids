'use client'

import type { TutorialStep } from '@/hooks/useTutorial'

interface TutorialOverlayProps {
  step: TutorialStep
  onSkip: () => void
}

const isTouchDevice = (): boolean => typeof window !== 'undefined' && 'ontouchstart' in window

const STEPS: { key: 'move' | 'shoot' | 'collect'; desktop: string; mobile: string }[] = [
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
]

function StepDots({ step }: { step: TutorialStep }) {
  const stepIndex = step === 'move' ? 0 : step === 'shoot' ? 1 : 2

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

export function TutorialOverlay({ step, onSkip }: TutorialOverlayProps) {
  if (step === 'done') return null

  const text = getPromptText(step)

  return (
    <div className="absolute inset-0 pointer-events-none" data-testid="tutorial-overlay">
      {/* Bottom-center prompt panel */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-auto max-w-sm px-6 py-4 bg-space-800/90 border border-hud-green/40 rounded-lg font-mono text-center">
        <StepDots step={step} />
        <p className="text-hud-green text-sm md:text-base">{text}</p>
        <button
          onClick={onSkip}
          className="pointer-events-auto mt-3 text-white/40 hover:text-white/70 text-xs transition-colors"
          data-testid="tutorial-skip"
        >
          SKIP
        </button>
      </div>
    </div>
  )
}
