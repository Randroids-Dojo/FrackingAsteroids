import * as THREE from 'three'
import type { Ship } from '@/lib/schemas'
import { VOXEL_SIZE } from './ship-constants'
import { SHIP_COLLISION_RADIUS } from './collision-constants'
import { PROJECTILE_RADIUS } from './blaster-constants'
import type { Projectile } from './types'

// ---------------------------------------------------------------------------
// Enemy ship constants
// ---------------------------------------------------------------------------

/** Collision radius for the enemy ship. */
export const ENEMY_COLLISION_RADIUS = 3

/** Enemy HP — takes 3 hits to destroy. */
export const ENEMY_MAX_HP = 3

/** Enemy movement speed (units/sec). */
const ENEMY_SPEED = 30

/** How often the enemy changes direction (seconds). */
const ENEMY_DIRECTION_CHANGE_INTERVAL = 2.0

/** How often the enemy shoots (average seconds between shots). */
const ENEMY_SHOOT_INTERVAL = 3

/** Minimum interval between enemy shots. */
const ENEMY_SHOOT_MIN_INTERVAL = 1.5

/** Enemy projectile speed (units/sec). */
const ENEMY_PROJECTILE_SPEED = 120

/** Enemy projectile damage — very low for tutorial. */
export const ENEMY_PROJECTILE_DAMAGE = 5

/** Enemy projectile lifetime (seconds). */
const ENEMY_PROJECTILE_LIFETIME = 2.0

/** Enemy projectile collision radius. */
const ENEMY_PROJECTILE_RADIUS = 0.8

/** Orbit distance — enemy tries to stay roughly this far from player. */
const ORBIT_DISTANCE = 30

/** Colors for the enemy ship. */
const ENEMY_COLORS = {
  hull: 0xaa3333,
  cockpit: 0xff2200,
  engine: 0xff8800,
  wingTip: 0xff4444,
} as const

/** Colors for enemy projectiles — red energy. */
const ENEMY_PROJECTILE_COLORS = {
  core: 0xff3333,
  glow: 0xff6666,
} as const

// ---------------------------------------------------------------------------
// Shipwreck debris constants
// ---------------------------------------------------------------------------

/** Number of shipwreck debris particles on destruction. */
const WRECK_PARTICLE_COUNT = 16

/** How long wreck debris lasts (seconds). */
const WRECK_DURATION = 1.2

/** Speed wreck debris flies outward (units/sec). */
const WRECK_SPEED = 50

/** Wreck debris colors — mix of hull and fire. */
const WRECK_COLORS = [0xaa3333, 0xff6600, 0x884422, 0xff4444, 0x663322] as const

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EnemyShip {
  mesh: THREE.Group
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  hp: number
  maxHp: number
  alive: boolean
  /** Time until next direction change. */
  dirTimer: number
  /** Time until next shot. */
  shootTimer: number
  /** Current target movement angle. */
  moveAngle: number
}

export interface EnemyProjectile {
  id: string
  mesh: THREE.Group
  x: number
  y: number
  vx: number
  vy: number
  elapsed: number
}

export interface ShipwreckDebris {
  group: THREE.Group
  particles: { mesh: THREE.Mesh; vx: number; vy: number; rotSpeed: number }[]
  elapsed: number
}

// ---------------------------------------------------------------------------
// Enemy ship model
// ---------------------------------------------------------------------------

let nextEnemyProjectileId = 0

function addVoxel(group: THREE.Group, x: number, y: number, z: number, color: number): void {
  const geo = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE)
  const mat = new THREE.MeshStandardMaterial({ color, flatShading: true })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x * VOXEL_SIZE, y * VOXEL_SIZE, z * VOXEL_SIZE)
  group.add(mesh)
}

/**
 * Build a voxel enemy ship — similar shape to player but red-themed and
 * slightly more angular/aggressive looking.
 */
function createEnemyShipModel(): THREE.Group {
  const group = new THREE.Group()
  const { hull, cockpit, engine, wingTip } = ENEMY_COLORS

  // Main body — narrower, more aggressive
  for (let row = -2; row <= 3; row++) {
    addVoxel(group, 0, row, 0, hull)
    if (row >= -1 && row <= 2) {
      addVoxel(group, -1, row, 0, hull)
      addVoxel(group, 1, row, 0, hull)
    }
  }

  // Cockpit — red glow
  addVoxel(group, 0, 4, 0.5, cockpit)

  // Wings — swept back, sharper
  for (let w = 2; w <= 4; w++) {
    const row = -w + 1
    addVoxel(group, -w, row, 0, hull)
    addVoxel(group, w, row, 0, hull)
  }

  // Wing tips — red accent
  addVoxel(group, -4, -3, 0, wingTip)
  addVoxel(group, 4, -3, 0, wingTip)

  // Engine glow
  addVoxel(group, -1, -3, -0.3, engine)
  addVoxel(group, 0, -3, -0.3, engine)
  addVoxel(group, 1, -3, -0.3, engine)

  return group
}

// ---------------------------------------------------------------------------
// Enemy projectile model
// ---------------------------------------------------------------------------

function createEnemyProjectileModel(): THREE.Group {
  const group = new THREE.Group()
  const coreGeo = new THREE.BoxGeometry(0.8, 1.6, 0.8)
  const coreMat = new THREE.MeshStandardMaterial({
    color: ENEMY_PROJECTILE_COLORS.core,
    emissive: ENEMY_PROJECTILE_COLORS.core,
    emissiveIntensity: 0.8,
    flatShading: true,
  })
  const core = new THREE.Mesh(coreGeo, coreMat)
  group.add(core)

  const glowGeo = new THREE.BoxGeometry(1.2, 0.8, 0.6)
  const glowMat = new THREE.MeshStandardMaterial({
    color: ENEMY_PROJECTILE_COLORS.glow,
    emissive: ENEMY_PROJECTILE_COLORS.glow,
    emissiveIntensity: 0.5,
    transparent: true,
    opacity: 0.6,
    flatShading: true,
  })
  const glow = new THREE.Mesh(glowGeo, glowMat)
  group.add(glow)

  return group
}

// ---------------------------------------------------------------------------
// Factory functions
// ---------------------------------------------------------------------------

/**
 * Create an enemy ship at the given position.
 */
export function createEnemyShip(x: number, y: number): EnemyShip {
  const mesh = createEnemyShipModel()
  mesh.position.set(x, y, 0)

  return {
    mesh,
    x,
    y,
    vx: 0,
    vy: 0,
    rotation: 0,
    hp: ENEMY_MAX_HP,
    maxHp: ENEMY_MAX_HP,
    alive: true,
    dirTimer: 0,
    shootTimer: ENEMY_SHOOT_INTERVAL * 0.5, // first shot comes quicker
    moveAngle: Math.random() * Math.PI * 2,
  }
}

// ---------------------------------------------------------------------------
// AI update
// ---------------------------------------------------------------------------

/**
 * Update enemy ship AI — orbits the player and sporadically shoots.
 * Returns new projectiles spawned this frame (if any).
 */
export function updateEnemyShip(enemy: EnemyShip, player: Ship, dt: number): EnemyProjectile[] {
  if (!enemy.alive) return []

  const newProjectiles: EnemyProjectile[] = []

  // --- Direction change timer ---
  enemy.dirTimer -= dt
  if (enemy.dirTimer <= 0) {
    enemy.dirTimer = ENEMY_DIRECTION_CHANGE_INTERVAL * (0.7 + Math.random() * 0.6)

    // Pick new movement direction — bias toward orbiting the player
    const dx = player.x - enemy.x
    const dy = player.y - enemy.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < ORBIT_DISTANCE * 0.6) {
      // Too close — move away
      enemy.moveAngle = Math.atan2(-dy, -dx) + (Math.random() - 0.5) * 1.5
    } else if (dist > ORBIT_DISTANCE * 1.4) {
      // Too far — move toward
      enemy.moveAngle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.0
    } else {
      // In orbit range — circle around
      const toPlayer = Math.atan2(dy, dx)
      const tangent = toPlayer + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2)
      enemy.moveAngle = tangent + (Math.random() - 0.5) * 0.8
    }
  }

  // --- Move ---
  enemy.vx = Math.cos(enemy.moveAngle) * ENEMY_SPEED
  enemy.vy = Math.sin(enemy.moveAngle) * ENEMY_SPEED
  enemy.x += enemy.vx * dt
  enemy.y += enemy.vy * dt

  // --- Face toward player ---
  const toPlayerDx = player.x - enemy.x
  const toPlayerDy = player.y - enemy.y
  const toPlayerDist = Math.sqrt(toPlayerDx * toPlayerDx + toPlayerDy * toPlayerDy)
  enemy.rotation = Math.atan2(toPlayerDy, toPlayerDx) - Math.PI / 2

  // --- Shoot timer ---
  enemy.shootTimer -= dt
  if (enemy.shootTimer <= 0) {
    enemy.shootTimer =
      ENEMY_SHOOT_MIN_INTERVAL + Math.random() * (ENEMY_SHOOT_INTERVAL - ENEMY_SHOOT_MIN_INTERVAL)

    // Fire toward player (reuse direction from facing calc)
    if (toPlayerDist > 0.1) {
      const nx = toPlayerDx / toPlayerDist
      const ny = toPlayerDy / toPlayerDist
      const proj = createEnemyProjectile(
        enemy.x + nx * 4, // spawn slightly ahead
        enemy.y + ny * 4,
        nx * ENEMY_PROJECTILE_SPEED,
        ny * ENEMY_PROJECTILE_SPEED,
      )
      newProjectiles.push(proj)
    }
  }

  // --- Sync mesh ---
  enemy.mesh.position.set(enemy.x, enemy.y, 0)
  enemy.mesh.rotation.z = enemy.rotation

  return newProjectiles
}

function createEnemyProjectile(x: number, y: number, vx: number, vy: number): EnemyProjectile {
  const mesh = createEnemyProjectileModel()
  mesh.position.set(x, y, 0)
  const angle = Math.atan2(vy, vx)
  mesh.rotation.z = angle - Math.PI / 2

  return {
    id: `enemy-proj-${nextEnemyProjectileId++}`,
    mesh,
    x,
    y,
    vx,
    vy,
    elapsed: 0,
  }
}

// ---------------------------------------------------------------------------
// Enemy projectile update
// ---------------------------------------------------------------------------

/**
 * Update enemy projectile position. Returns false when expired.
 */
export function updateEnemyProjectile(proj: EnemyProjectile, dt: number): boolean {
  proj.elapsed += dt
  if (proj.elapsed >= ENEMY_PROJECTILE_LIFETIME) return false

  proj.x += proj.vx * dt
  proj.y += proj.vy * dt
  proj.mesh.position.set(proj.x, proj.y, 0)

  return true
}

/**
 * Dispose an enemy projectile mesh.
 */
export function disposeEnemyProjectile(proj: EnemyProjectile): void {
  for (const child of proj.mesh.children) {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose()
      if (child.material instanceof THREE.Material) {
        child.material.dispose()
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Collision: player projectiles hitting enemy
// ---------------------------------------------------------------------------

/**
 * Check if any player projectiles hit the enemy ship.
 * Returns IDs of projectiles that hit, and mutates enemy HP.
 */
export function checkProjectileEnemyCollisions(
  projectiles: Projectile[],
  enemy: EnemyShip,
): { surviving: Projectile[]; hitProjectileIds: string[] } {
  if (!enemy.alive || enemy.hp <= 0) return { surviving: projectiles, hitProjectileIds: [] }

  const surviving: Projectile[] = []
  const hitProjectileIds: string[] = []

  for (const p of projectiles) {
    if (!enemy.alive) {
      surviving.push(p)
      continue
    }

    const dx = p.x - enemy.x
    const dy = p.y - enemy.y
    const distSq = dx * dx + dy * dy
    const minDist = PROJECTILE_RADIUS + ENEMY_COLLISION_RADIUS

    if (distSq < minDist * minDist) {
      enemy.hp = Math.max(0, enemy.hp - p.damage)
      hitProjectileIds.push(p.id)
      if (enemy.hp <= 0) {
        enemy.alive = false
      }
    } else {
      surviving.push(p)
    }
  }

  return { surviving, hitProjectileIds }
}

// ---------------------------------------------------------------------------
// Collision: enemy projectiles hitting player
// ---------------------------------------------------------------------------

/**
 * Check if any enemy projectiles hit the player ship.
 * Returns IDs of projectiles that hit.
 */
export function checkEnemyProjectilePlayerCollisions(
  projectiles: EnemyProjectile[],
  player: Ship,
): string[] {
  const hitIds: string[] = []

  for (const p of projectiles) {
    const dx = p.x - player.x
    const dy = p.y - player.y
    const distSq = dx * dx + dy * dy
    const minDist = ENEMY_PROJECTILE_RADIUS + SHIP_COLLISION_RADIUS

    if (distSq < minDist * minDist) {
      hitIds.push(p.id)
    }
  }

  return hitIds
}

// ---------------------------------------------------------------------------
// Shipwreck debris (explosion effect on enemy death)
// ---------------------------------------------------------------------------

/**
 * Create a shipwreck debris explosion at the enemy position.
 * Bigger and more dramatic than regular projectile explosions.
 */
export function createShipwreckDebris(x: number, y: number): ShipwreckDebris {
  const group = new THREE.Group()
  group.position.set(x, y, 0)

  const particles: ShipwreckDebris['particles'] = []

  for (let i = 0; i < WRECK_PARTICLE_COUNT; i++) {
    const angle = (i / WRECK_PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.6
    const speed = WRECK_SPEED * (0.4 + Math.random() * 0.6)
    const color = WRECK_COLORS[i % WRECK_COLORS.length]

    // Vary particle sizes for interesting debris
    const size = 0.6 + Math.random() * 0.8
    const geo = new THREE.BoxGeometry(size, size, size)
    const mat = new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
      emissive: color,
      emissiveIntensity: 0.6,
    })
    const mesh = new THREE.Mesh(geo, mat)
    group.add(mesh)

    particles.push({
      mesh,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotSpeed: (Math.random() - 0.5) * 10,
    })
  }

  return { group, particles, elapsed: 0 }
}

/**
 * Update shipwreck debris animation. Returns true if still active.
 */
export function updateShipwreckDebris(debris: ShipwreckDebris, dt: number): boolean {
  debris.elapsed += dt
  if (debris.elapsed >= WRECK_DURATION) return false

  const progress = debris.elapsed / WRECK_DURATION

  for (const p of debris.particles) {
    p.mesh.position.x += p.vx * dt
    p.mesh.position.y += p.vy * dt
    p.mesh.rotation.z += p.rotSpeed * dt
    p.mesh.rotation.x += p.rotSpeed * 0.7 * dt

    // Shrink and fade out
    const scale = 1 - progress
    p.mesh.scale.setScalar(scale)

    // Reduce emissive as it fades
    const mat = p.mesh.material as THREE.MeshStandardMaterial
    mat.emissiveIntensity = 0.6 * (1 - progress)
  }

  return true
}

/**
 * Dispose shipwreck debris.
 */
export function disposeShipwreckDebris(debris: ShipwreckDebris): void {
  for (const p of debris.particles) {
    p.mesh.geometry.dispose()
    if (p.mesh.material instanceof THREE.Material) {
      p.mesh.material.dispose()
    }
  }
}

// ---------------------------------------------------------------------------
// Dispose enemy ship
// ---------------------------------------------------------------------------

export function disposeEnemyShip(enemy: EnemyShip): void {
  enemy.mesh.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose()
      if (child.material instanceof THREE.Material) {
        child.material.dispose()
      }
    }
  })
}

/** Reset enemy projectile ID counter (for testing). */
export function resetEnemyProjectileIdCounter(): void {
  nextEnemyProjectileId = 0
}
