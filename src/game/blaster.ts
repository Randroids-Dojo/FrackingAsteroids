import type { Ship } from '@/lib/schemas'
import type { Projectile } from './types'
import {
  BASE_PROJECTILE_SPEED,
  SPEED_MULTIPLIERS,
  FIRE_RATES,
  DAMAGE_PER_TIER,
  PROJECTILE_LIFETIME,
  DUAL_SPREAD_ANGLE,
  TRIPLE_SPREAD_ANGLE,
} from './blaster-constants'

let nextProjectileId = 0

/** Reset the projectile ID counter (for testing). */
export function resetProjectileIdCounter(): void {
  nextProjectileId = 0
}

function generateProjectileId(): string {
  return `proj-${nextProjectileId++}`
}

export interface BlasterState {
  cooldownRemaining: number
}

export function createBlasterState(): BlasterState {
  return { cooldownRemaining: 0 }
}

/**
 * Update blaster cooldown. Call once per frame.
 */
export function updateBlasterCooldown(blaster: BlasterState, dt: number): void {
  blaster.cooldownRemaining = Math.max(0, blaster.cooldownRemaining - dt)
}

/**
 * Attempt to fire the mining laser toward a world-space target.
 * Returns an array of new projectiles (empty if on cooldown).
 *
 * @param blaster - Blaster cooldown state (mutated)
 * @param ship - Current ship state
 * @param targetX - World-space X of the aim target
 * @param targetY - World-space Y of the aim target
 * @param tier - Current blaster upgrade tier (1–5)
 */
export function fireBlaster(
  blaster: BlasterState,
  ship: Ship,
  targetX: number,
  targetY: number,
  tier: number,
): Projectile[] {
  if (blaster.cooldownRemaining > 0) return []

  const clampedTier = Math.max(1, Math.min(5, Math.round(tier)))
  const tierIndex = clampedTier - 1

  const fireRate = FIRE_RATES[tierIndex]
  blaster.cooldownRemaining = 1 / fireRate

  const speed = BASE_PROJECTILE_SPEED * SPEED_MULTIPLIERS[tierIndex]
  const damage = DAMAGE_PER_TIER[tierIndex]

  // Direction from ship to target
  const dx = targetX - ship.x
  const dy = targetY - ship.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  // If target is on top of ship, fire forward (ship faces +Y at rotation=0)
  let baseAngle: number
  if (dist < 0.5) {
    baseAngle = ship.rotation + Math.PI / 2
  } else {
    baseAngle = Math.atan2(dy, dx)
  }

  const projectiles: Projectile[] = []

  if (clampedTier >= 5) {
    // Triple spread: center + two offset bolts
    for (const offset of [-TRIPLE_SPREAD_ANGLE, 0, TRIPLE_SPREAD_ANGLE]) {
      const angle = baseAngle + offset
      projectiles.push(makeProjectile(ship.x, ship.y, angle, speed, damage))
    }
  } else if (clampedTier >= 4) {
    // Dual spread: two offset bolts
    for (const offset of [-DUAL_SPREAD_ANGLE, DUAL_SPREAD_ANGLE]) {
      const angle = baseAngle + offset
      projectiles.push(makeProjectile(ship.x, ship.y, angle, speed, damage))
    }
  } else {
    // Single bolt
    projectiles.push(makeProjectile(ship.x, ship.y, baseAngle, speed, damage))
  }

  return projectiles
}

function makeProjectile(
  x: number,
  y: number,
  angle: number,
  speed: number,
  damage: number,
): Projectile {
  return {
    id: generateProjectileId(),
    x,
    y,
    velocityX: Math.cos(angle) * speed,
    velocityY: Math.sin(angle) * speed,
    damage,
  }
}

/**
 * Update all projectile positions and remove expired ones.
 * Returns the surviving projectiles array.
 *
 * @param projectiles - Current projectile list
 * @param dt - Delta time in seconds
 * @param elapsed - Map of projectile ID to elapsed lifetime (mutated)
 */
export function updateProjectiles(
  projectiles: Projectile[],
  dt: number,
  elapsed: Map<string, number>,
): Projectile[] {
  const surviving: Projectile[] = []

  for (const p of projectiles) {
    p.x += p.velocityX * dt
    p.y += p.velocityY * dt

    const age = (elapsed.get(p.id) ?? 0) + dt
    elapsed.set(p.id, age)

    if (age < PROJECTILE_LIFETIME) {
      surviving.push(p)
    } else {
      elapsed.delete(p.id)
    }
  }

  return surviving
}
