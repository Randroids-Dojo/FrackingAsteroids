import type { Ship } from '@/lib/schemas'
import type { InputState } from './input'
import { inputToDirection } from './input'
import { SHIP_ACCELERATION, SHIP_MAX_SPEED, SHIP_FRICTION } from './ship-constants'

/**
 * Update ship physics for one frame.
 * Mutates the ship state in place.
 *
 * @param ship - Current ship state (mutated)
 * @param input - Current keyboard input state
 * @param dt - Delta time in seconds
 */
export function updateShip(ship: Ship, input: InputState, dt: number): void {
  const [dx, dy] = inputToDirection(input)

  // Apply acceleration
  ship.velocityX += dx * SHIP_ACCELERATION * dt
  ship.velocityY += dy * SHIP_ACCELERATION * dt

  // Clamp to max speed
  const speed = Math.sqrt(ship.velocityX ** 2 + ship.velocityY ** 2)
  if (speed > SHIP_MAX_SPEED) {
    const scale = SHIP_MAX_SPEED / speed
    ship.velocityX *= scale
    ship.velocityY *= scale
  }

  // Apply friction (frame-rate independent: raise to dt*60 so behavior
  // is consistent whether running at 30fps or 144fps)
  const friction = Math.pow(SHIP_FRICTION, dt * 60)
  ship.velocityX *= friction
  ship.velocityY *= friction

  // Stop micro-drift
  if (Math.abs(ship.velocityX) < 0.1) ship.velocityX = 0
  if (Math.abs(ship.velocityY) < 0.1) ship.velocityY = 0

  // Update position
  ship.x += ship.velocityX * dt
  ship.y += ship.velocityY * dt

  // Update rotation to face input direction (if pressing a key and moving)
  if (dx !== 0 || dy !== 0) {
    const currentSpeed = Math.sqrt(ship.velocityX ** 2 + ship.velocityY ** 2)
    if (currentSpeed > 1) {
      ship.rotation = Math.atan2(dx, dy)
    }
  }
}
