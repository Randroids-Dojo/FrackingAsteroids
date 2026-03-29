/**
 * Shared game tick logic — the single source of truth for game state updates.
 *
 * Both the Three.js renderer (scene.ts) and the headless integration test
 * simulation (GameSimulation) call tick() each frame. This ensures game
 * behavior is identical in production and tests.
 *
 * tick() owns ALL game logic: physics, collisions, firing, collection,
 * enemy AI, station proximity, and pause/unpause transitions.
 * It does NOT touch rendering, audio, or DOM.
 */

import type { Ship } from '@/lib/schemas'
import type { Asteroid, MiningTool, Projectile } from './types'
import type { InputState } from './input'
import type { BlasterState } from './blaster'
import type { MetalChunk } from './metal-chunk'
import type { EnemyShip, EnemyProjectile } from './enemy-ship'
import type { ScrapBox } from './scrap-box'
import type { ProjectileHit } from './collision'
import type { TutorialStep } from '@/hooks/useTutorial'

import { updateShip } from './ship-controller'
import {
  createBlasterState,
  updateBlasterCooldown,
  fireBlaster,
  updateProjectiles,
} from './blaster'
import { resolveShipAsteroidCollision, checkProjectileAsteroidCollisions } from './collision'
import {
  createMetalChunk,
  updateMetalChunk,
  bounceMetalOffShip,
  bounceMetalOffAsteroid,
  attractMetalToShip,
  METAL_SPAWN_CHANCE,
} from './metal-chunk'
import {
  createEnemyShip,
  updateEnemyShip,
  checkProjectileEnemyCollisions,
  checkEnemyProjectilePlayerCollisions,
  updateEnemyProjectile,
  ENEMY_SPAWN_DISTANCE,
  ENEMY_PROJECTILE_DAMAGE,
} from './enemy-ship'
import { createScrapBox, updateScrapBox, attractScrapBoxToShip, SCRAP_BOX_VALUE } from './scrap-box'
import { HITS_PER_BREAK } from './asteroid-debris'

// ---------------------------------------------------------------------------
// Constants (mirrored from scene.ts)
// ---------------------------------------------------------------------------

export const PLAYER_MAX_HP = 100
const ENEMY_NEARBY_DISTANCE = 60
const STATION_NEAR_DISTANCE = 80
const STATION_ENTER_DISTANCE = 60
const STATION_REPAIR_DISTANCE = 15
const AMBUSH_ENEMY_COUNT = 3
const AMBUSH_SPAWN_OFFSET_Y = 70
const AMBUSH_SPAWN_SPREAD_X = 25
const AMBUSH_SHOOT_MIN = 0.3
const AMBUSH_SHOOT_MAX = 0.5
const AMBUSH_PROJECTILE_DAMAGE = 20

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

/** All mutable game state. Owned and mutated by tick(). */
export interface TickState {
  ship: Ship
  asteroids: Asteroid[]
  projectiles: Projectile[]
  metalChunks: MetalChunk[]
  enemy: EnemyShip | null
  enemyProjectiles: EnemyProjectile[]
  scrapBoxes: ScrapBox[]
  playerHp: number

  blasterState: BlasterState
  projectileElapsed: Map<string, number>
  asteroidHitCounts: Map<string, number>
  blasterTier: number
  activeMiningTool: MiningTool
  fireRateBonus: number

  // Fire/aim state — tick() clears these on unpause
  fireTarget: { x: number; y: number } | null
  mouseHoldingFire: boolean
  aimActive: boolean

  /**
   * Countdown (seconds) after unpausing during which aim/fire input is ignored.
   * Prevents synthesized mouse events from touch dismiss (~300ms delay) from
   * leaking into the canvas and locking the ship's rotation.
   */
  inputCooldown: number

  // Internal flags
  wasPaused: boolean
  nearStationFired: boolean
  wasInStationRange: boolean
  repairedThisVisit: boolean
  firstMetalCollectedTime: number | null
  enemySpawned: boolean
  enemyNearbyFired: boolean

  // Ambush
  ambushEnemies: EnemyShip[]
  ambushSpawned: boolean
  playerKilledFired: boolean

  // Station position
  stationX: number
  stationY: number

  elapsedTime: number
}

/** Per-frame inputs — NOT owned by tick(), only read. */
export interface TickInput {
  dt: number
  paused: boolean
  inputState: InputState
  /** World-space aim position (null = no active aim). */
  aimWorldPosition: { x: number; y: number } | null
  collecting: boolean
  tutorialStep: TutorialStep
}

export type MetalVariant = 'silver' | 'gold'

/** Events produced by a single tick, consumed by renderer or test harness. */
export interface TickResult {
  // Projectile lifecycle
  newProjectiles: Projectile[]
  expiredProjectileIds: string[]
  // Asteroid collision details (for VFX positioning)
  asteroidHits: ProjectileHit[]
  // Metal spawned from asteroid hits
  newMetalChunks: MetalChunk[]
  // Collection events
  metalCollected: { id: string; variant: MetalVariant }[]
  scrapCollected: { id: string; value: number }[]
  // Enemy lifecycle
  enemySpawned: EnemyShip | null
  enemyDestroyed: { x: number; y: number } | null
  newEnemyProjectiles: EnemyProjectile[]
  expiredEnemyProjectileIds: string[]
  enemyProjectileHits: { id: string; x: number; y: number; damage: number }[]
  // Ambush
  ambushEnemiesSpawned: EnemyShip[]
  // Callback events (booleans/counts for scene.ts callbacks)
  shipMoved: boolean
  asteroidHit: boolean
  crystallineDeflect: boolean
  metalSpawned: boolean
  metalCollectedEvent: boolean
  enemyNearby: boolean
  nearStation: boolean
  stationRangeChanged: boolean | null // true=entered, false=left, null=no change
  stationRepaired: boolean
  playerDamaged: boolean
  playerKilled: boolean
  enemyDestroyedEvent: boolean
  scrapCollectedEvent: boolean
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export interface TickStateConfig {
  shipPosition?: { x: number; y: number }
  playerHp?: number
  blasterTier?: number
  miningTool?: MiningTool
  fireRateBonus?: number
  asteroids?: Asteroid[]
  stationPosition?: { x: number; y: number }
}

export function createTickState(config?: TickStateConfig): TickState {
  const pos = config?.shipPosition ?? { x: 0, y: 0 }
  const station = config?.stationPosition ?? { x: 30, y: 200 }
  const asteroids = config?.asteroids ?? []
  const hitCounts = new Map<string, number>()
  for (const a of asteroids) {
    hitCounts.set(a.id, 0)
  }

  return {
    ship: { x: pos.x, y: pos.y, rotation: 0, velocityX: 0, velocityY: 0 },
    asteroids,
    projectiles: [],
    metalChunks: [],
    enemy: null,
    enemyProjectiles: [],
    scrapBoxes: [],
    playerHp: config?.playerHp ?? PLAYER_MAX_HP,

    blasterState: createBlasterState(),
    projectileElapsed: new Map(),
    asteroidHitCounts: hitCounts,
    blasterTier: config?.blasterTier ?? 1,
    activeMiningTool: config?.miningTool ?? 'blaster',
    fireRateBonus: config?.fireRateBonus ?? 1.0,

    fireTarget: null,
    mouseHoldingFire: false,
    aimActive: false,
    inputCooldown: 0,

    wasPaused: false,
    nearStationFired: false,
    wasInStationRange: false,
    repairedThisVisit: false,
    firstMetalCollectedTime: null,
    enemySpawned: false,
    enemyNearbyFired: false,

    ambushEnemies: [],
    ambushSpawned: false,
    playerKilledFired: false,

    stationX: station.x,
    stationY: station.y,

    elapsedTime: 0,
  }
}

// ---------------------------------------------------------------------------
// Tick
// ---------------------------------------------------------------------------

function emptyResult(): TickResult {
  return {
    newProjectiles: [],
    expiredProjectileIds: [],
    asteroidHits: [],
    newMetalChunks: [],
    metalCollected: [],
    scrapCollected: [],
    enemySpawned: null,
    enemyDestroyed: null,
    newEnemyProjectiles: [],
    expiredEnemyProjectileIds: [],
    enemyProjectileHits: [],
    ambushEnemiesSpawned: [],
    shipMoved: false,
    asteroidHit: false,
    crystallineDeflect: false,
    metalSpawned: false,
    metalCollectedEvent: false,
    enemyNearby: false,
    nearStation: false,
    stationRangeChanged: null,
    stationRepaired: false,
    playerDamaged: false,
    playerKilled: false,
    enemyDestroyedEvent: false,
    scrapCollectedEvent: false,
  }
}

/**
 * Advance the game state by one frame.
 *
 * This is the SINGLE source of truth for all game logic. Both scene.ts
 * (production) and GameSimulation (tests) call this function.
 */
export function tick(state: TickState, input: TickInput): TickResult {
  const result = emptyResult()
  const { dt } = input

  state.elapsedTime += dt

  // --- Paused: skip entire frame ---
  if (input.paused) {
    state.wasPaused = true
    return result
  }

  // --- Resume from pause: clear stale state and start input cooldown ---
  // While paused, popup overlays capture mouse events so aimState and
  // mouseHoldingFire can be stale. On mobile, dismissing a popup via touch
  // causes the browser to synthesize mousemove/mousedown events ~300ms later.
  // The cooldown window ignores all aim/fire input so these leaked events
  // cannot lock the ship's rotation to the dismiss tap position.
  if (state.wasPaused) {
    state.mouseHoldingFire = false
    state.fireTarget = null
    state.aimActive = false
    state.inputCooldown = 0.5 // 500ms — covers synthesized event delay
    state.wasPaused = false
  }

  // --- Input cooldown: ignore aim/fire input while active ---
  if (state.inputCooldown > 0) {
    state.inputCooldown -= dt
    state.mouseHoldingFire = false
    state.fireTarget = null
    state.aimActive = false
  }

  // --- Ship update ---
  let aimRotation: number | null = null
  if (state.aimActive && input.aimWorldPosition) {
    const adx = input.aimWorldPosition.x - state.ship.x
    const ady = input.aimWorldPosition.y - state.ship.y
    if (Math.abs(adx) > 0.5 || Math.abs(ady) > 0.5) {
      aimRotation = Math.atan2(-adx, ady)
    }
  }
  updateShip(state.ship, input.inputState, dt, aimRotation)

  if (Math.sqrt(state.ship.x ** 2 + state.ship.y ** 2) > 2) {
    result.shipMoved = true
  }

  // --- Asteroid drift ---
  for (const a of state.asteroids) {
    if (a.velocityX !== 0 || a.velocityY !== 0) {
      a.x += a.velocityX * dt
      a.y += a.velocityY * dt
    }
  }

  // --- Ship-asteroid collision ---
  for (const a of state.asteroids) {
    if (a.hp > 0) {
      resolveShipAsteroidCollision(state.ship, a)
    }
  }

  // --- Blaster cooldown ---
  updateBlasterCooldown(state.blasterState, dt)

  // --- Hold-to-fire: re-set fireTarget each frame while held ---
  if (state.mouseHoldingFire && state.aimActive && input.aimWorldPosition) {
    state.fireTarget = { x: input.aimWorldPosition.x, y: input.aimWorldPosition.y }
  }

  // --- Fire ---
  if (state.fireTarget) {
    const newProjectiles = fireBlaster(
      state.blasterState,
      state.ship,
      state.fireTarget.x,
      state.fireTarget.y,
      state.blasterTier,
      state.activeMiningTool,
    )
    if (newProjectiles.length > 0 && state.fireRateBonus > 1) {
      state.blasterState.cooldownRemaining /= state.fireRateBonus
    }
    for (const p of newProjectiles) {
      state.projectiles.push(p)
      result.newProjectiles.push(p)
    }
    state.fireTarget = null
  }

  // --- Projectile update ---
  const prevIds = state.projectiles.map((p) => p.id)
  state.projectiles = updateProjectiles(state.projectiles, dt, state.projectileElapsed)
  const currentIds = new Set(state.projectiles.map((p) => p.id))
  for (const id of prevIds) {
    if (!currentIds.has(id)) {
      result.expiredProjectileIds.push(id)
    }
  }

  // --- Projectile-asteroid collision ---
  const liveAsteroids = state.asteroids.filter((a) => a.hp > 0)
  if (state.projectiles.length > 0 && liveAsteroids.length > 0) {
    const { surviving, hits } = checkProjectileAsteroidCollisions(state.projectiles, liveAsteroids)

    if (hits.some((h) => !h.deflected)) {
      result.asteroidHit = true
    }
    if (hits.some((h) => h.deflected)) {
      result.crystallineDeflect = true
    }

    for (const hit of hits) {
      state.projectileElapsed.delete(hit.projectileId)
      result.asteroidHits.push(hit)

      if (hit.deflected) continue

      const prevHits = state.asteroidHitCounts.get(hit.asteroidId) ?? 0
      const newHits = prevHits + 1
      state.asteroidHitCounts.set(hit.asteroidId, newHits)

      if (newHits % HITS_PER_BREAK === 0) {
        if (Math.random() < METAL_SPAWN_CHANCE) {
          const hitAsteroid = state.asteroids.find((a) => a.id === hit.asteroidId)
          const ax = hitAsteroid ? hitAsteroid.x : hit.x
          const ay = hitAsteroid ? hitAsteroid.y : hit.y
          const ddx = hit.x - ax
          const ddy = hit.y - ay
          const d = Math.sqrt(ddx * ddx + ddy * ddy)
          const nx = d > 0.01 ? ddx / d : Math.random() - 0.5
          const ny = d > 0.01 ? ddy / d : Math.random() - 0.5
          const metal = createMetalChunk(hit.x, hit.y, nx, ny)
          state.metalChunks.push(metal)
          result.newMetalChunks.push(metal)
          result.metalSpawned = true
        }
      }
    }

    state.projectiles = surviving
  }

  // --- Enemy spawn (after first metal collected) ---
  if (!state.enemySpawned && state.firstMetalCollectedTime !== null) {
    state.enemySpawned = true
    const spawnAngle = Math.random() * Math.PI * 2
    const ex = state.ship.x + Math.cos(spawnAngle) * ENEMY_SPAWN_DISTANCE
    const ey = state.ship.y + Math.sin(spawnAngle) * ENEMY_SPAWN_DISTANCE
    state.enemy = createEnemyShip(ex, ey)
    result.enemySpawned = state.enemy
  }

  // --- Update enemy ---
  if (state.enemy && state.enemy.alive) {
    if (!state.enemyNearbyFired) {
      const edx = state.enemy.x - state.ship.x
      const edy = state.enemy.y - state.ship.y
      if (Math.sqrt(edx * edx + edy * edy) <= ENEMY_NEARBY_DISTANCE) {
        state.enemyNearbyFired = true
        result.enemyNearby = true
      }
    }

    const newEnemyProjs = updateEnemyShip(state.enemy, state.ship, dt)
    for (const proj of newEnemyProjs) {
      state.enemyProjectiles.push(proj)
      result.newEnemyProjectiles.push(proj)
    }

    if (state.projectiles.length > 0) {
      const { surviving, hitProjectileIds } = checkProjectileEnemyCollisions(
        state.projectiles,
        state.enemy,
      )
      for (const hitId of hitProjectileIds) {
        state.projectileElapsed.delete(hitId)
        result.expiredProjectileIds.push(hitId)
      }
      state.projectiles = surviving

      if (!state.enemy.alive) {
        const box = createScrapBox(state.enemy.x, state.enemy.y)
        state.scrapBoxes.push(box)
        result.enemyDestroyed = { x: state.enemy.x, y: state.enemy.y }
        result.enemyDestroyedEvent = true
        state.enemy = null
      }
    }
  }

  // --- Enemy projectile update ---
  for (let i = state.enemyProjectiles.length - 1; i >= 0; i--) {
    const alive = updateEnemyProjectile(state.enemyProjectiles[i], dt)
    if (!alive) {
      result.expiredEnemyProjectileIds.push(state.enemyProjectiles[i].id)
      state.enemyProjectiles.splice(i, 1)
    }
  }

  // --- Enemy projectile → player collision ---
  if (state.enemyProjectiles.length > 0) {
    const hitIds = new Set(checkEnemyProjectilePlayerCollisions(state.enemyProjectiles, state.ship))
    if (hitIds.size > 0) {
      for (let i = state.enemyProjectiles.length - 1; i >= 0; i--) {
        const proj = state.enemyProjectiles[i]
        if (!hitIds.has(proj.id)) continue
        const damage =
          proj.mesh.userData['ambush'] === true ? AMBUSH_PROJECTILE_DAMAGE : ENEMY_PROJECTILE_DAMAGE
        state.playerHp = Math.max(0, state.playerHp - damage)
        result.enemyProjectileHits.push({ id: proj.id, x: proj.x, y: proj.y, damage })
        state.enemyProjectiles.splice(i, 1)
      }
      result.playerDamaged = true
    }
  }

  // --- Scrap box update & collection ---
  for (let i = state.scrapBoxes.length - 1; i >= 0; i--) {
    updateScrapBox(state.scrapBoxes[i], dt)
    if (input.collecting) {
      const collected = attractScrapBoxToShip(state.scrapBoxes[i], state.ship, dt)
      if (collected) {
        result.scrapCollected.push({ id: state.scrapBoxes[i].id, value: SCRAP_BOX_VALUE })
        result.scrapCollectedEvent = true
        state.scrapBoxes.splice(i, 1)
        continue
      }
    }
  }

  // --- Metal chunk update & collection ---
  for (let i = state.metalChunks.length - 1; i >= 0; i--) {
    const metal = state.metalChunks[i]
    updateMetalChunk(metal, dt)

    if (input.collecting) {
      const collected = attractMetalToShip(metal, state.ship, dt)
      if (collected) {
        if (state.firstMetalCollectedTime === null) {
          state.firstMetalCollectedTime = state.elapsedTime
        }
        result.metalCollected.push({ id: metal.id, variant: metal.variant })
        result.metalCollectedEvent = true
        state.metalChunks.splice(i, 1)
        continue
      }
    }

    if (!input.collecting) {
      bounceMetalOffShip(metal, state.ship)
    }
    for (const a of state.asteroids) {
      bounceMetalOffAsteroid(metal, a)
    }
  }

  // --- Station proximity ---
  const sdx = state.stationX - state.ship.x
  const sdy = state.stationY - state.ship.y
  const sDist = Math.sqrt(sdx * sdx + sdy * sdy)

  if (!state.nearStationFired && sDist <= STATION_NEAR_DISTANCE) {
    state.nearStationFired = true
    result.nearStation = true
  }

  const inStationRange = sDist <= STATION_ENTER_DISTANCE
  if (inStationRange !== state.wasInStationRange) {
    state.wasInStationRange = inStationRange
    result.stationRangeChanged = inStationRange
    if (!inStationRange) state.repairedThisVisit = false
  }

  if (inStationRange && !state.repairedThisVisit && sDist <= STATION_REPAIR_DISTANCE) {
    state.repairedThisVisit = true
    state.playerHp = PLAYER_MAX_HP
    result.stationRepaired = true
    result.playerDamaged = true // triggers onPlayerDamage callback with restored HP
  }

  // --- Ambush ---
  const tutStep = input.tutorialStep
  if (tutStep === 'ambush' && !state.ambushSpawned && !inStationRange) {
    state.ambushSpawned = true
    for (let i = 0; i < AMBUSH_ENEMY_COUNT; i++) {
      const offsetX = (i - 1) * AMBUSH_SPAWN_SPREAD_X
      const ax = state.ship.x + offsetX
      const ay = state.ship.y + AMBUSH_SPAWN_OFFSET_Y
      const ae = createEnemyShip(ax, ay)
      ae.shootTimer = AMBUSH_SHOOT_MIN
      ae.hp = 100
      ae.maxHp = 100
      state.ambushEnemies.push(ae)
      result.ambushEnemiesSpawned.push(ae)
    }
  }

  if (state.ambushEnemies.length > 0) {
    for (const ae of state.ambushEnemies) {
      if (!ae.alive) continue
      const newProjs = updateEnemyShip(ae, state.ship, dt)
      if (ae.shootTimer > AMBUSH_SHOOT_MAX) {
        ae.shootTimer = AMBUSH_SHOOT_MIN + Math.random() * (AMBUSH_SHOOT_MAX - AMBUSH_SHOOT_MIN)
      }
      for (const proj of newProjs) {
        proj.mesh.userData['ambush'] = true
        state.enemyProjectiles.push(proj)
        result.newEnemyProjectiles.push(proj)
      }
    }
  }

  if (tutStep === 'ambush' && state.playerHp <= 0 && !state.playerKilledFired) {
    state.playerKilledFired = true
    result.playerKilled = true
  }

  return result
}
