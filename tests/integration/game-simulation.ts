/**
 * Headless game simulation for integration tests.
 *
 * Replicates the game loop orchestration from scene.ts (lines 572-1116)
 * using existing pure functions, without Three.js rendering, audio, or DOM.
 *
 * Must be imported AFTER installMockThree() has been called.
 */

import type { Ship } from '../../src/lib/schemas'
import type { Asteroid, MiningTool, Projectile } from '../../src/game/types'
import type { InputState } from '../../src/game/input'
import type { BlasterState } from '../../src/game/blaster'
import type { MetalChunk } from '../../src/game/metal-chunk'
import type { EnemyShip, EnemyProjectile } from '../../src/game/enemy-ship'
import type { ScrapBox } from '../../src/game/scrap-box'

import { updateShip } from '../../src/game/ship-controller'
import {
  createBlasterState,
  updateBlasterCooldown,
  fireBlaster,
  updateProjectiles,
} from '../../src/game/blaster'
import {
  resolveShipAsteroidCollision,
  checkProjectileAsteroidCollisions,
} from '../../src/game/collision'
import {
  createMetalChunk,
  updateMetalChunk,
  bounceMetalOffShip,
  bounceMetalOffAsteroid,
  attractMetalToShip,
  METAL_SPAWN_CHANCE,
} from '../../src/game/metal-chunk'
import {
  createEnemyShip,
  updateEnemyShip,
  checkProjectileEnemyCollisions,
  checkEnemyProjectilePlayerCollisions,
  updateEnemyProjectile,
  ENEMY_SPAWN_DISTANCE,
  ENEMY_PROJECTILE_DAMAGE,
} from '../../src/game/enemy-ship'
import {
  createScrapBox,
  updateScrapBox,
  attractScrapBoxToShip,
  SCRAP_BOX_VALUE,
} from '../../src/game/scrap-box'
import { HITS_PER_BREAK } from '../../src/game/asteroid-debris'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MetalVariant = 'silver' | 'gold'

export interface SimulationConfig {
  paused?: boolean
  frozen?: boolean
  shipPosition?: { x: number; y: number }
  playerHp?: number
  blasterTier?: number
  miningTool?: MiningTool
  fireRateBonus?: number
  asteroids?: Asteroid[]
  stationPosition?: { x: number; y: number }
  /** Seed for deterministic Math.random — NOT YET IMPLEMENTED */
  seed?: number
}

export interface SimulationEvents {
  shipMoved: number
  asteroidHit: number
  metalSpawned: number
  metalCollected: number
  collected: MetalVariant[]
  playerDamage: number[]
  scrapCollected: number[]
  enemyNearby: number
  enemyDestroyed: number
  nearStation: number
  stationRange: boolean[]
  stationDriveThrough: number
  playerKilled: number
  crystallineDeflect: number
}

function emptyEvents(): SimulationEvents {
  return {
    shipMoved: 0,
    asteroidHit: 0,
    metalSpawned: 0,
    metalCollected: 0,
    collected: [],
    playerDamage: [],
    scrapCollected: [],
    enemyNearby: 0,
    enemyDestroyed: 0,
    nearStation: 0,
    stationRange: [],
    stationDriveThrough: 0,
    playerKilled: 0,
    crystallineDeflect: 0,
  }
}

// ---------------------------------------------------------------------------
// GameSimulation
// ---------------------------------------------------------------------------

const PLAYER_MAX_HP = 100
const STATION_NEAR_DISTANCE = 80
const STATION_ENTER_DISTANCE = 60
const STATION_REPAIR_DISTANCE = 15

export class GameSimulation {
  // --- Public state ---
  ship: Ship
  asteroids: Asteroid[]
  projectiles: Projectile[] = []
  metalChunks: MetalChunk[] = []
  enemy: EnemyShip | null = null
  enemyProjectiles: EnemyProjectile[] = []
  scrapBoxes: ScrapBox[] = []
  playerHp: number
  paused: boolean
  frozen: boolean
  blasterTier: number
  activeMiningTool: MiningTool
  fireRateBonus: number

  // --- Events ---
  events: SimulationEvents = emptyEvents()

  // --- Internal ---
  private blasterState: BlasterState = createBlasterState()
  private projectileElapsed = new Map<string, number>()
  private asteroidHitCounts = new Map<string, number>()
  private inputState: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    joystickAngle: null,
  }
  private fireTarget: { x: number; y: number } | null = null
  private mouseHoldingFire = false
  private holdFirePosition: { x: number; y: number } | null = null
  /** Simulates aimState — where the mouse is pointing (controls ship rotation). */
  private aimPosition: { x: number; y: number } | null = null
  private aimActive = false
  private collecting = false
  private wasPaused = false
  private stationX: number
  private stationY: number
  private nearStationFired = false
  private wasInStationRange = false
  private repairedThisVisit = false
  private firstMetalCollectedTime: number | null = null
  private enemySpawned = false
  private enemyNearbyFired = false
  private elapsedTime = 0

  constructor(config?: SimulationConfig) {
    const pos = config?.shipPosition ?? { x: 0, y: 0 }
    this.ship = { x: pos.x, y: pos.y, rotation: 0, velocityX: 0, velocityY: 0 }
    this.playerHp = config?.playerHp ?? PLAYER_MAX_HP
    this.paused = config?.paused ?? false
    this.frozen = config?.frozen ?? false
    this.blasterTier = config?.blasterTier ?? 1
    this.activeMiningTool = config?.miningTool ?? 'blaster'
    this.fireRateBonus = config?.fireRateBonus ?? 1.0
    this.asteroids = config?.asteroids ?? []
    const station = config?.stationPosition ?? { x: 30, y: 200 }
    this.stationX = station.x
    this.stationY = station.y

    for (const a of this.asteroids) {
      this.asteroidHitCounts.set(a.id, 0)
    }
  }

  // --- Input injection ---

  setInput(input: Partial<InputState>): void {
    Object.assign(this.inputState, input)
  }

  clearInput(): void {
    this.inputState.up = false
    this.inputState.down = false
    this.inputState.left = false
    this.inputState.right = false
    this.inputState.joystickAngle = null
  }

  fireAt(x: number, y: number): void {
    this.fireTarget = { x, y }
  }

  /** Set aim target (mouse cursor position). Controls ship rotation. */
  aimAt(x: number, y: number): void {
    this.aimPosition = { x, y }
    this.aimActive = true
  }

  /** Clear aim target (simulates mouse leaving the canvas). */
  clearAim(): void {
    this.aimActive = false
    this.aimPosition = null
  }

  holdFireAt(x: number, y: number): void {
    this.mouseHoldingFire = true
    this.holdFirePosition = { x, y }
    this.aimAt(x, y) // aiming and firing at the same spot
  }

  releaseFire(): void {
    this.mouseHoldingFire = false
    this.holdFirePosition = null
    this.fireTarget = null
  }

  startCollecting(): void {
    this.collecting = true
  }

  stopCollecting(): void {
    this.collecting = false
  }

  setMiningTool(tool: MiningTool): void {
    this.activeMiningTool = tool
  }

  setBlasterTier(tier: number): void {
    this.blasterTier = tier
  }

  setFireRateBonus(multiplier: number): void {
    this.fireRateBonus = multiplier
  }

  // --- World injection ---

  spawnAsteroid(partial: Partial<Asteroid> & { x: number; y: number }): Asteroid {
    const a: Asteroid = {
      id: partial.id ?? `asteroid-${this.asteroids.length}`,
      x: partial.x,
      y: partial.y,
      velocityX: partial.velocityX ?? 0,
      velocityY: partial.velocityY ?? 0,
      type: partial.type ?? 'common',
      hp: partial.hp ?? 15,
      maxHp: partial.maxHp ?? partial.hp ?? 15,
      size: partial.size ?? 1,
    }
    this.asteroids.push(a)
    this.asteroidHitCounts.set(a.id, 0)
    return a
  }

  spawnEnemy(x: number, y: number): EnemyShip {
    const e = createEnemyShip(x, y)
    this.enemy = e
    this.enemySpawned = true
    return e
  }

  spawnMetal(x: number, y: number, variant?: MetalVariant): MetalChunk {
    const metal = createMetalChunk(x, y, 0, 1)
    if (variant) metal.variant = variant
    this.metalChunks.push(metal)
    return metal
  }

  teleportShip(x: number, y: number): void {
    this.ship.x = x
    this.ship.y = y
    this.ship.velocityX = 0
    this.ship.velocityY = 0
  }

  setPlayerHp(hp: number): void {
    this.playerHp = hp
  }

  clearEvents(): void {
    this.events = emptyEvents()
  }

  // --- Simulation step ---

  step(dt = 1 / 60): void {
    this.elapsedTime += dt

    if (this.paused || this.frozen) {
      this.wasPaused = true
      return
    }

    // --- Resume from pause: clear stale fire AND aim state ---
    // While paused, popup overlays capture mouse events so aimState and
    // mouseHoldingFire can be stale. Clearing aimActive forces the ship to
    // fall back to movement-based rotation until the user moves the mouse.
    if (this.wasPaused) {
      this.mouseHoldingFire = false
      this.fireTarget = null
      this.holdFirePosition = null
      this.aimActive = false
      this.aimPosition = null
      this.wasPaused = false
    }

    // --- Ship update ---
    // Compute aim rotation from mouse aim position (separate from fire target)
    let aimRotation: number | null = null
    if (this.aimActive && this.aimPosition) {
      const dx = this.aimPosition.x - this.ship.x
      const dy = this.aimPosition.y - this.ship.y
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
        aimRotation = Math.atan2(-dx, dy)
      }
    }

    updateShip(this.ship, this.inputState, dt, aimRotation)

    // Ship moved detection
    if (Math.sqrt(this.ship.x ** 2 + this.ship.y ** 2) > 2) {
      this.events.shipMoved++
    }

    // --- Asteroid drift ---
    for (const a of this.asteroids) {
      if (a.velocityX !== 0 || a.velocityY !== 0) {
        a.x += a.velocityX * dt
        a.y += a.velocityY * dt
      }
    }

    // --- Ship-asteroid collision ---
    for (const a of this.asteroids) {
      if (a.hp > 0) {
        resolveShipAsteroidCollision(this.ship, a)
      }
    }

    // --- Blaster ---
    updateBlasterCooldown(this.blasterState, dt)

    // Hold-to-fire: re-set fireTarget each frame while held
    if (this.mouseHoldingFire && this.holdFirePosition) {
      this.fireTarget = { ...this.holdFirePosition }
    }

    // Fire
    if (this.fireTarget) {
      const newProjectiles = fireBlaster(
        this.blasterState,
        this.ship,
        this.fireTarget.x,
        this.fireTarget.y,
        this.blasterTier,
        this.activeMiningTool,
      )
      if (newProjectiles.length > 0 && this.fireRateBonus > 1) {
        this.blasterState.cooldownRemaining /= this.fireRateBonus
      }
      for (const p of newProjectiles) {
        this.projectiles.push(p)
      }
      // One-shot fire: clear unless holding
      if (!this.mouseHoldingFire) {
        this.fireTarget = null
      }
    }

    // Update projectile positions
    this.projectiles = updateProjectiles(this.projectiles, dt, this.projectileElapsed)

    // --- Projectile-asteroid collision ---
    const liveAsteroids = this.asteroids.filter((a) => a.hp > 0)
    if (this.projectiles.length > 0 && liveAsteroids.length > 0) {
      const { surviving, hits } = checkProjectileAsteroidCollisions(this.projectiles, liveAsteroids)

      if (hits.some((h) => !h.deflected)) {
        this.events.asteroidHit++
      }
      if (hits.some((h) => h.deflected)) {
        this.events.crystallineDeflect++
      }

      for (const hit of hits) {
        this.projectileElapsed.delete(hit.projectileId)
        if (hit.deflected) continue

        // Hit counting and metal spawn
        const prevHits = this.asteroidHitCounts.get(hit.asteroidId) ?? 0
        const newHits = prevHits + 1
        this.asteroidHitCounts.set(hit.asteroidId, newHits)

        if (newHits % HITS_PER_BREAK === 0) {
          if (Math.random() < METAL_SPAWN_CHANCE) {
            const hitAsteroid = this.asteroids.find((a) => a.id === hit.asteroidId)
            const ax = hitAsteroid ? hitAsteroid.x : hit.x
            const ay = hitAsteroid ? hitAsteroid.y : hit.y
            const dx = hit.x - ax
            const dy = hit.y - ay
            const d = Math.sqrt(dx * dx + dy * dy)
            const nx = d > 0.01 ? dx / d : Math.random() - 0.5
            const ny = d > 0.01 ? dy / d : Math.random() - 0.5
            const metal = createMetalChunk(hit.x, hit.y, nx, ny)
            this.metalChunks.push(metal)
            this.events.metalSpawned++
          }
        }
      }

      this.projectiles = surviving
    }

    // --- Enemy spawn (after first metal collected) ---
    if (!this.enemySpawned && this.firstMetalCollectedTime !== null) {
      this.enemySpawned = true
      const spawnAngle = Math.random() * Math.PI * 2
      const ex = this.ship.x + Math.cos(spawnAngle) * ENEMY_SPAWN_DISTANCE
      const ey = this.ship.y + Math.sin(spawnAngle) * ENEMY_SPAWN_DISTANCE
      this.enemy = createEnemyShip(ex, ey)
    }

    // --- Update enemy ---
    if (this.enemy && this.enemy.alive) {
      // Enemy nearby detection
      if (!this.enemyNearbyFired) {
        const edx = this.enemy.x - this.ship.x
        const edy = this.enemy.y - this.ship.y
        if (Math.sqrt(edx * edx + edy * edy) <= 60) {
          this.enemyNearbyFired = true
          this.events.enemyNearby++
        }
      }

      const newEnemyProjs = updateEnemyShip(this.enemy, this.ship, dt)
      for (const proj of newEnemyProjs) {
        this.enemyProjectiles.push(proj)
      }

      // Player projectiles hitting enemy
      if (this.projectiles.length > 0) {
        const { surviving, hitProjectileIds } = checkProjectileEnemyCollisions(
          this.projectiles,
          this.enemy,
        )
        for (const hitId of hitProjectileIds) {
          this.projectileElapsed.delete(hitId)
        }
        this.projectiles = surviving

        if (!this.enemy.alive) {
          const box = createScrapBox(this.enemy.x, this.enemy.y)
          this.scrapBoxes.push(box)
          this.enemy = null
          this.events.enemyDestroyed++
        }
      }
    }

    // --- Enemy projectile update ---
    for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
      const alive = updateEnemyProjectile(this.enemyProjectiles[i], dt)
      if (!alive) {
        this.enemyProjectiles.splice(i, 1)
      }
    }

    // --- Enemy projectile → player collision ---
    if (this.enemyProjectiles.length > 0) {
      const hitIds = new Set(checkEnemyProjectilePlayerCollisions(this.enemyProjectiles, this.ship))
      if (hitIds.size > 0) {
        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
          if (!hitIds.has(this.enemyProjectiles[i].id)) continue
          this.enemyProjectiles.splice(i, 1)
          this.playerHp = Math.max(0, this.playerHp - ENEMY_PROJECTILE_DAMAGE)
        }
        this.events.playerDamage.push(this.playerHp)
      }
    }

    // --- Scrap box update & collection ---
    for (let i = this.scrapBoxes.length - 1; i >= 0; i--) {
      updateScrapBox(this.scrapBoxes[i], dt)
      if (this.collecting) {
        const collected = attractScrapBoxToShip(this.scrapBoxes[i], this.ship, dt)
        if (collected) {
          this.scrapBoxes.splice(i, 1)
          this.events.scrapCollected.push(SCRAP_BOX_VALUE)
          continue
        }
      }
    }

    // --- Metal chunk update & collection ---
    for (let i = this.metalChunks.length - 1; i >= 0; i--) {
      const metal = this.metalChunks[i]
      updateMetalChunk(metal, dt)

      if (this.collecting) {
        const collected = attractMetalToShip(metal, this.ship, dt)
        if (collected) {
          const variant = metal.variant
          this.metalChunks.splice(i, 1)
          if (this.firstMetalCollectedTime === null) {
            this.firstMetalCollectedTime = this.elapsedTime
          }
          this.events.collected.push(variant)
          this.events.metalCollected++
          continue
        }
      }

      if (!this.collecting) {
        bounceMetalOffShip(metal, this.ship)
      }
      for (const a of this.asteroids) {
        bounceMetalOffAsteroid(metal, a)
      }
    }

    // --- Station proximity ---
    const sdx = this.stationX - this.ship.x
    const sdy = this.stationY - this.ship.y
    const sDist = Math.sqrt(sdx * sdx + sdy * sdy)

    if (!this.nearStationFired && sDist <= STATION_NEAR_DISTANCE) {
      this.nearStationFired = true
      this.events.nearStation++
    }

    const inStationRange = sDist <= STATION_ENTER_DISTANCE
    if (inStationRange !== this.wasInStationRange) {
      this.wasInStationRange = inStationRange
      this.events.stationRange.push(inStationRange)
      if (!inStationRange) this.repairedThisVisit = false
    }

    if (inStationRange && !this.repairedThisVisit && sDist <= STATION_REPAIR_DISTANCE) {
      this.repairedThisVisit = true
      this.playerHp = PLAYER_MAX_HP
      this.events.stationDriveThrough++
    }
  }

  /** Run N steps of size dt. */
  stepN(n: number, dt = 1 / 60): void {
    for (let i = 0; i < n; i++) {
      this.step(dt)
    }
  }
}
