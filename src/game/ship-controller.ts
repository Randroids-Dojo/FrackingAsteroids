import type { Ship } from '@/lib/schemas'
import type { InputState, AimState } from './input'
import { inputToDirection } from './input'
import { SHIP_ACCELERATION, SHIP_MAX_SPEED, SHIP_FRICTION } from './ship-constants'

/**
 * Convert screen-space aim coordinates to a world-space aim angle
 * relative to the ship's position.
 *
 * @param ship - Current ship state
 * @param aim - Screen-space aim state
 * @param screenToWorld - Function that converts screen coords to world coords
 * @returns Rotation angle in radians, or null if aim is not active
 */
export function aimToRotation(
  ship: Ship,
  aim: AimState,
  screenToWorld: (sx: number, sy: number) => { x: number; y: number },
): number | null {
  if (!aim.active) return null

  const world = screenToWorld(aim.screenX, aim.screenY)
  const dx = world.x - ship.x
  const dy = world.y - ship.y

  // Don't update if cursor is basically on top of the ship
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return null

  // Ship model faces +Y; Three.js rotation.z is CCW, so the forward
  // vector after rotation θ is [-sin(θ), cos(θ)].  Solving for θ
  // gives atan2(-dx, dy).
  return Math.atan2(-dx, dy)
}

/**
 * Update ship physics for one frame.
 * Mutates the ship state in place.
 *
 * Ship rotation is decoupled from movement:
 * - If an aim target is provided (mouse cursor), ship faces the aim target
 * - Otherwise, ship faces the movement direction as a fallback
 *
 * @param ship - Current ship state (mutated)
 * @param input - Current keyboard input state
 * @param dt - Delta time in seconds
 * @param aimRotation - Optional aim angle (from aimToRotation). If null, falls back to movement direction.
 */
export function updateShip(
  ship: Ship,
  input: InputState,
  dt: number,
  aimRotation?: number | null,
): void {
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

  // Update rotation: prefer aim target, fall back to input direction
  if (aimRotation != null) {
    ship.rotation = aimRotation
  } else if (dx !== 0 || dy !== 0) {
    ship.rotation = Math.atan2(-dx, dy)
  }
}
