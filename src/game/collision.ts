/**
 * Collision detection and resolution for game objects.
 */
import type { Ship } from '@/lib/schemas'
import type { Asteroid, Projectile } from './types'
import { PROJECTILE_RADIUS, LAZER_DAMAGE_MULTIPLIER } from './blaster-constants'
import {
  SHIP_COLLISION_RADIUS,
  ASTEROID_COLLISION_RADIUS,
  COLLISION_PUSH_BUFFER,
} from './collision-constants'
import { ASTEROID_SIZE_RADIUS } from './asteroid-model'

/**
 * Check if two circles overlap.
 */
function circlesOverlap(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number,
): boolean {
  const dx = x2 - x1
  const dy = y2 - y1
  const distSq = dx * dx + dy * dy
  const radiiSum = r1 + r2
  return distSq < radiiSum * radiiSum
}

/**
 * Resolve ship-asteroid collision by pushing the ship out of the asteroid.
 * Mutates the ship position and zeroes velocity toward the asteroid.
 */
export function resolveShipAsteroidCollision(ship: Ship, asteroid: Asteroid): boolean {
  const dx = ship.x - asteroid.x
  const dy = ship.y - asteroid.y
  const distSq = dx * dx + dy * dy
  const asteroidRadius = ASTEROID_SIZE_RADIUS[asteroid.size] ?? ASTEROID_COLLISION_RADIUS
  const minDist = SHIP_COLLISION_RADIUS + asteroidRadius

  if (distSq >= minDist * minDist) return false

  const dist = Math.sqrt(distSq)

  // If ship is exactly on asteroid center, push in an arbitrary direction
  if (dist < 0.001) {
    ship.x = asteroid.x + minDist + COLLISION_PUSH_BUFFER
    ship.velocityX = 0
    ship.velocityY = 0
    return true
  }

  // Normalize direction from asteroid to ship
  const nx = dx / dist
  const ny = dy / dist

  // Push ship out to the edge + buffer
  const pushDist = minDist + COLLISION_PUSH_BUFFER - dist
  ship.x += nx * pushDist
  ship.y += ny * pushDist

  // Cancel velocity component toward the asteroid
  const velDot = ship.velocityX * nx + ship.velocityY * ny
  if (velDot < 0) {
    ship.velocityX -= velDot * nx
    ship.velocityY -= velDot * ny
  }

  return true
}

export interface ProjectileHit {
  projectileId: string
  asteroidId: string
  damage: number
  x: number
  y: number
  /** True when a blaster projectile bounced off a crystalline asteroid. */
  deflected?: boolean
}

/**
 * Check all projectiles against all asteroids.
 * Returns hits and the surviving projectiles (those that didn't hit anything).
 * Mutates asteroid HP. Blaster projectiles deflect off crystalline asteroids
 * (no damage dealt, hit still reported with `deflected: true`).
 * Lazer projectiles deal bonus damage to all asteroid types.
 */
export function checkProjectileAsteroidCollisions(
  projectiles: Projectile[],
  asteroids: Asteroid[],
): { surviving: Projectile[]; hits: ProjectileHit[] } {
  const hits: ProjectileHit[] = []
  const surviving: Projectile[] = []

  for (const p of projectiles) {
    let hitSomething = false
    for (const a of asteroids) {
      if (a.hp <= 0) continue
      const aRadius = ASTEROID_SIZE_RADIUS[a.size] ?? ASTEROID_COLLISION_RADIUS
      if (circlesOverlap(p.x, p.y, PROJECTILE_RADIUS, a.x, a.y, aRadius)) {
        if (a.type === 'crystalline' && p.tool !== 'lazer') {
          // Blaster can't damage crystalline — deflect
          hits.push({
            projectileId: p.id,
            asteroidId: a.id,
            damage: 0,
            x: p.x,
            y: p.y,
            deflected: true,
          })
        } else {
          const effectiveDamage =
            p.tool === 'lazer' ? Math.ceil(p.damage * LAZER_DAMAGE_MULTIPLIER) : p.damage
          a.hp = Math.max(0, a.hp - effectiveDamage)
          hits.push({
            projectileId: p.id,
            asteroidId: a.id,
            damage: effectiveDamage,
            x: p.x,
            y: p.y,
          })
        }
        hitSomething = true
        break // one projectile hits one asteroid
      }
    }
    if (!hitSomething) {
      surviving.push(p)
    }
  }

  return { surviving, hits }
}

export interface BeamHit {
  asteroidId: string
  damage: number
  x: number
  y: number
  deflected?: boolean
}

/**
 * Closest distance from a point (cx, cy) to a line segment (ax, ay)→(bx, by).
 */
function pointToSegmentDistSq(
  cx: number,
  cy: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const abx = bx - ax
  const aby = by - ay
  const lenSq = abx * abx + aby * aby
  if (lenSq < 0.0001) {
    const dx = cx - ax
    const dy = cy - ay
    return dx * dx + dy * dy
  }
  let t = ((cx - ax) * abx + (cy - ay) * aby) / lenSq
  t = Math.max(0, Math.min(1, t))
  const px = ax + t * abx
  const py = ay + t * aby
  const dx = cx - px
  const dy = cy - py
  return dx * dx + dy * dy
}

/**
 * Check a beam (line segment) against all live asteroids.
 * Returns all asteroid hits along the beam and the hit point of the nearest one
 * (used for beam endpoint rendering).
 */
export function checkBeamAsteroidCollisions(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  damage: number,
  asteroids: Asteroid[],
): { hits: BeamHit[]; beamEndX: number; beamEndY: number } {
  const hits: BeamHit[] = []
  let nearestT = 1.0
  const dx = endX - startX
  const dy = endY - startY

  for (const a of asteroids) {
    if (a.hp <= 0) continue
    const aRadius = ASTEROID_SIZE_RADIUS[a.size] ?? ASTEROID_COLLISION_RADIUS
    const distSq = pointToSegmentDistSq(a.x, a.y, startX, startY, endX, endY)
    if (distSq < aRadius * aRadius) {
      // Beam is always lazer — damages all asteroid types including crystalline
      const effectiveDamage = Math.ceil(damage * LAZER_DAMAGE_MULTIPLIER)
      a.hp = Math.max(0, a.hp - effectiveDamage)
      hits.push({ asteroidId: a.id, damage: effectiveDamage, x: a.x, y: a.y })
      // Find parameter t along the beam where it enters the asteroid
      const lenSq = dx * dx + dy * dy
      if (lenSq > 0.0001) {
        const t = ((a.x - startX) * dx + (a.y - startY) * dy) / lenSq
        if (t < nearestT) nearestT = Math.max(0, t)
      }
    }
  }

  return {
    hits,
    beamEndX: startX + dx * nearestT,
    beamEndY: startY + dy * nearestT,
  }
}
