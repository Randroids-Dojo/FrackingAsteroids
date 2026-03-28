/**
 * Screen shake effect — offsets the camera temporarily on impact.
 * Decays exponentially over time.
 */

export interface ScreenShake {
  offsetX: number
  offsetY: number
  trauma: number
}

/** Decay rate per second — trauma halves roughly every 0.3 seconds. */
const DECAY_RATE = 4.0

/** Maximum pixel offset at trauma = 1. */
const MAX_OFFSET = 4.0

/** Frequency of shake oscillation. */
const SHAKE_FREQUENCY = 25

export function createScreenShake(): ScreenShake {
  return { offsetX: 0, offsetY: 0, trauma: 0 }
}

/** Add trauma (0–1). Multiple hits stack, clamped to 1. */
export function addTrauma(shake: ScreenShake, amount: number): void {
  shake.trauma = Math.min(1, shake.trauma + amount)
}

/** Update shake each frame. Returns current offset to apply to camera. */
export function updateScreenShake(shake: ScreenShake, dt: number, time: number): void {
  if (shake.trauma <= 0.001) {
    shake.offsetX = 0
    shake.offsetY = 0
    shake.trauma = 0
    return
  }

  // Quadratic falloff for perceptual intensity
  const intensity = shake.trauma * shake.trauma

  // Use time-based noise (pseudo-random via sin) for smooth shake
  shake.offsetX = MAX_OFFSET * intensity * Math.sin(time * SHAKE_FREQUENCY)
  shake.offsetY = MAX_OFFSET * intensity * Math.cos(time * SHAKE_FREQUENCY * 1.3)

  // Decay trauma
  shake.trauma = Math.max(0, shake.trauma - DECAY_RATE * dt)
}
