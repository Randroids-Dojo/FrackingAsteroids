/**
 * Collision detection and resolution for game objects.
 */
import type { Ship } from '@/lib/schemas'
import type { Asteroid, Projectile } from './types'
import { PROJECTILE_RADIUS } from './blaster-constants'
import {
  SHIP_COLLISION_RADIUS,
  ASTEROID_COLLISION_RADIUS,
  COLLISION_PUSH_BUFFER,
} from './collision-constants'

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
  const minDist = SHIP_COLLISION_RADIUS + ASTEROID_COLLISION_RADIUS

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
}

/**
 * Check all projectiles against all asteroids.
 * Returns hits and the surviving projectiles (those that didn't hit anything).
 * Mutates asteroid HP.
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
      if (circlesOverlap(p.x, p.y, PROJECTILE_RADIUS, a.x, a.y, ASTEROID_COLLISION_RADIUS)) {
        a.hp = Math.max(0, a.hp - p.damage)
        hits.push({
          projectileId: p.id,
          asteroidId: a.id,
          damage: p.damage,
          x: p.x,
          y: p.y,
        })
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
