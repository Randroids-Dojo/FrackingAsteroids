import * as THREE from 'three'
import type { Ship } from '@/lib/schemas'
import type { Asteroid } from './types'
import { SHIP_COLLISION_RADIUS, ASTEROID_COLLISION_RADIUS } from './collision-constants'
import { ASTEROID_SIZE_RADIUS } from './asteroid-model'

/** Collision radius for metal chunks. */
export const METAL_CHUNK_RADIUS = 1.5

/** Size of each metal chunk voxel. */
const METAL_VOXEL = 1.4

/** Slow drift speed for metal chunks (units/sec). */
const METAL_DRIFT_SPEED = 12

/** Tumble speed (radians/sec). */
const METAL_TUMBLE_SPEED = 3

/** Friction applied each frame (higher = less friction). */
const METAL_FRICTION = 0.995

/** Bounce restitution — fraction of velocity preserved on bounce. */
const METAL_RESTITUTION = 0.7

/** Chance (0–1) that a debris break-off spawns a metal chunk. */
export const METAL_SPAWN_CHANCE = 0.7

/** Metal colors — silver and gold. */
const METAL_COLORS = {
  silver: 0xc0c0c0,
  silverLight: 0xe8e8e8,
  gold: 0xffd700,
  goldDark: 0xdaa520,
} as const

let nextMetalId = 0

export interface MetalChunk {
  id: string
  mesh: THREE.Group
  x: number
  y: number
  vx: number
  vy: number
  rotSpeed: number
  variant: 'silver' | 'gold'
}

/**
 * Create a shiny metal chunk at the given position, drifting outward.
 */
export function createMetalChunk(x: number, y: number, dirX: number, dirY: number): MetalChunk {
  const variant = Math.random() < 0.5 ? 'silver' : 'gold'
  const group = new THREE.Group()

  const primary = variant === 'silver' ? METAL_COLORS.silver : METAL_COLORS.gold
  const accent = variant === 'silver' ? METAL_COLORS.silverLight : METAL_COLORS.goldDark

  // 2x2 voxel nugget with a highlight
  const voxels: [number, number, number, number][] = [
    [0, 0, 0, primary],
    [1, 0, 0, primary],
    [0, 1, 0, accent],
    [1, 1, 0, primary],
    [0, 0, 1, accent],
  ]

  for (const [vx, vy, vz, color] of voxels) {
    const geo = new THREE.BoxGeometry(METAL_VOXEL, METAL_VOXEL, METAL_VOXEL)
    const mat = new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
      metalness: 0.8,
      roughness: 0.2,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set((vx - 0.5) * METAL_VOXEL, (vy - 0.5) * METAL_VOXEL, (vz - 0.5) * METAL_VOXEL)
    group.add(mesh)
  }

  group.position.set(x, y, 0)

  const speed = METAL_DRIFT_SPEED * (0.6 + Math.random() * 0.8)

  return {
    id: `metal-${nextMetalId++}`,
    mesh: group,
    x,
    y,
    vx: dirX * speed,
    vy: dirY * speed,
    rotSpeed: (Math.random() - 0.5) * METAL_TUMBLE_SPEED * 2,
    variant,
  }
}

/** Reset metal chunk ID counter (for testing). */
export function resetMetalChunkIdCounter(): void {
  nextMetalId = 0
}

/**
 * Update a metal chunk's position and rotation.
 */
export function updateMetalChunk(chunk: MetalChunk, dt: number): void {
  chunk.vx *= Math.pow(METAL_FRICTION, dt * 60)
  chunk.vy *= Math.pow(METAL_FRICTION, dt * 60)

  chunk.x += chunk.vx * dt
  chunk.y += chunk.vy * dt

  chunk.mesh.position.set(chunk.x, chunk.y, 0)
  chunk.mesh.rotation.z += chunk.rotSpeed * dt
  chunk.mesh.rotation.x += chunk.rotSpeed * 0.5 * dt
}

/**
 * Bounce a metal chunk off the ship if overlapping.
 * Mutates chunk velocity. Returns true if a bounce occurred.
 */
export function bounceMetalOffShip(chunk: MetalChunk, ship: Ship): boolean {
  const dx = chunk.x - ship.x
  const dy = chunk.y - ship.y
  const distSq = dx * dx + dy * dy
  const minDist = METAL_CHUNK_RADIUS + SHIP_COLLISION_RADIUS

  if (distSq >= minDist * minDist) return false

  const dist = Math.sqrt(distSq)
  if (dist < 0.001) {
    chunk.x = ship.x + minDist + 0.5
    chunk.vx = METAL_DRIFT_SPEED
    chunk.vy = 0
    return true
  }

  const nx = dx / dist
  const ny = dy / dist

  // Push out
  const overlap = minDist - dist
  chunk.x += nx * (overlap + 0.2)
  chunk.y += ny * (overlap + 0.2)

  // Reflect velocity along collision normal
  const velDot = chunk.vx * nx + chunk.vy * ny
  if (velDot < 0) {
    chunk.vx -= 2 * velDot * nx
    chunk.vy -= 2 * velDot * ny
    chunk.vx *= METAL_RESTITUTION
    chunk.vy *= METAL_RESTITUTION
  }

  // Add a kick from ship velocity
  chunk.vx += ship.velocityX * 0.3
  chunk.vy += ship.velocityY * 0.3

  return true
}

/**
 * Bounce a metal chunk off an asteroid if overlapping.
 * Mutates chunk velocity. Returns true if a bounce occurred.
 */
export function bounceMetalOffAsteroid(chunk: MetalChunk, asteroid: Asteroid): boolean {
  if (asteroid.hp <= 0) return false

  const dx = chunk.x - asteroid.x
  const dy = chunk.y - asteroid.y
  const distSq = dx * dx + dy * dy
  const asteroidRadius = ASTEROID_SIZE_RADIUS[asteroid.size] ?? ASTEROID_COLLISION_RADIUS
  const minDist = METAL_CHUNK_RADIUS + asteroidRadius

  if (distSq >= minDist * minDist) return false

  const dist = Math.sqrt(distSq)
  if (dist < 0.001) {
    chunk.x = asteroid.x + minDist + 0.5
    chunk.vx = METAL_DRIFT_SPEED
    chunk.vy = 0
    return true
  }

  const nx = dx / dist
  const ny = dy / dist

  // Push out
  const overlap = minDist - dist
  chunk.x += nx * (overlap + 0.2)
  chunk.y += ny * (overlap + 0.2)

  // Reflect velocity
  const velDot = chunk.vx * nx + chunk.vy * ny
  if (velDot < 0) {
    chunk.vx -= 2 * velDot * nx
    chunk.vy -= 2 * velDot * ny
    chunk.vx *= METAL_RESTITUTION
    chunk.vy *= METAL_RESTITUTION
  }

  return true
}

/** Collector pull speed (units/sec). */
export const COLLECTOR_PULL_SPEED = 60

/** Collector range in world units (tier 1 — small radius). */
export const COLLECTOR_RANGE = 12

/**
 * Pull a metal chunk toward the ship when the collector is active.
 * Returns true if the chunk is close enough to be collected (absorbed).
 */
export function attractMetalToShip(chunk: MetalChunk, ship: Ship, dt: number): boolean {
  const dx = ship.x - chunk.x
  const dy = ship.y - chunk.y
  const distSq = dx * dx + dy * dy
  const range = COLLECTOR_RANGE

  if (distSq > range * range) return false

  const dist = Math.sqrt(distSq)
  const collectDist = METAL_CHUNK_RADIUS + SHIP_COLLISION_RADIUS

  if (dist < collectDist) return true

  // Pull toward ship — stronger as chunk gets closer
  const strength = 1 - dist / range
  const pull = COLLECTOR_PULL_SPEED * strength * dt
  const nx = dx / dist
  const ny = dy / dist
  chunk.vx += nx * pull
  chunk.vy += ny * pull

  return false
}

/**
 * Dispose all geometries and materials in a metal chunk.
 */
export function disposeMetalChunk(chunk: MetalChunk): void {
  for (const child of chunk.mesh.children) {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose()
      if (child.material instanceof THREE.Material) {
        child.material.dispose()
      }
    }
  }
}
