/**
 * Headless game simulation for integration tests.
 *
 * Uses the SAME tick() function from src/game/game-tick.ts that scene.ts uses.
 * This ensures game logic is tested identically in production and tests.
 *
 * Must be imported AFTER installMockThree() has been called.
 */

import { tick, createTickState } from '../../src/game/game-tick'
import type {
  TickState,
  TickInput,
  TickResult,
  TickStateConfig,
  MetalVariant,
} from '../../src/game/game-tick'
import type { Asteroid, MiningTool } from '../../src/game/types'
import type { TutorialStep } from '../../src/hooks/useTutorial'
import type { InputState } from '../../src/game/input'
import type { MetalChunk } from '../../src/game/metal-chunk'
import type { EnemyShip } from '../../src/game/enemy-ship'
import { createMetalChunk } from '../../src/game/metal-chunk'
import { createEnemyShip } from '../../src/game/enemy-ship'

// Re-export for harness
export type { MetalVariant, TickResult }

// ---------------------------------------------------------------------------
// Simulation events (accumulated from TickResults across frames)
// ---------------------------------------------------------------------------

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
// Config
// ---------------------------------------------------------------------------

export interface SimulationConfig extends TickStateConfig {
  paused?: boolean
  frozen?: boolean
}

// ---------------------------------------------------------------------------
// GameSimulation
// ---------------------------------------------------------------------------

export class GameSimulation {
  /** The shared game state — same struct that scene.ts uses. */
  readonly tickState: TickState

  /** Accumulated events since last clearEvents(). */
  events: SimulationEvents = emptyEvents()

  // Simulation-level state (not part of game tick)
  paused: boolean
  frozen: boolean

  private inputState: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    joystickAngle: null,
  }
  private aimPosition: { x: number; y: number } | null = null
  private collecting = false

  constructor(config?: SimulationConfig) {
    this.tickState = createTickState(config)
    this.paused = config?.paused ?? false
    this.frozen = config?.frozen ?? false
  }

  // --- Convenience accessors into tickState ---

  get ship() {
    return this.tickState.ship
  }
  get asteroids() {
    return this.tickState.asteroids
  }
  get projectiles() {
    return this.tickState.projectiles
  }
  get metalChunks() {
    return this.tickState.metalChunks
  }
  get enemy() {
    return this.tickState.enemy
  }
  get enemyProjectiles() {
    return this.tickState.enemyProjectiles
  }
  get scrapBoxes() {
    return this.tickState.scrapBoxes
  }
  get playerHp() {
    return this.tickState.playerHp
  }
  get activeMiningTool() {
    return this.tickState.activeMiningTool
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
    this.tickState.fireTarget = { x, y }
  }

  aimAt(x: number, y: number): void {
    this.aimPosition = { x, y }
    this.tickState.aimActive = true
  }

  clearAim(): void {
    this.tickState.aimActive = false
    this.aimPosition = null
  }

  holdFireAt(x: number, y: number): void {
    this.tickState.mouseHoldingFire = true
    this.aimAt(x, y)
  }

  releaseFire(): void {
    this.tickState.mouseHoldingFire = false
    this.tickState.fireTarget = null
  }

  startCollecting(): void {
    this.collecting = true
  }

  stopCollecting(): void {
    this.collecting = false
  }

  setMiningTool(tool: MiningTool): void {
    this.tickState.activeMiningTool = tool
  }

  setBlasterTier(tier: number): void {
    this.tickState.blasterTier = tier
  }

  setFireRateBonus(multiplier: number): void {
    this.tickState.fireRateBonus = multiplier
  }

  // --- World injection ---

  spawnAsteroid(partial: Partial<Asteroid> & { x: number; y: number }): Asteroid {
    const a: Asteroid = {
      id: partial.id ?? `asteroid-${this.tickState.asteroids.length}`,
      x: partial.x,
      y: partial.y,
      velocityX: partial.velocityX ?? 0,
      velocityY: partial.velocityY ?? 0,
      type: partial.type ?? 'common',
      hp: partial.hp ?? 15,
      maxHp: partial.maxHp ?? partial.hp ?? 15,
      size: partial.size ?? 1,
    }
    this.tickState.asteroids.push(a)
    this.tickState.asteroidHitCounts.set(a.id, 0)
    return a
  }

  spawnEnemy(x: number, y: number): EnemyShip {
    const e = createEnemyShip(x, y)
    this.tickState.enemy = e
    this.tickState.enemySpawned = true
    return e
  }

  spawnMetal(x: number, y: number, variant?: MetalVariant): MetalChunk {
    const metal = createMetalChunk(x, y, 0, 1)
    if (variant) metal.variant = variant
    this.tickState.metalChunks.push(metal)
    return metal
  }

  teleportShip(x: number, y: number): void {
    this.tickState.ship.x = x
    this.tickState.ship.y = y
    this.tickState.ship.velocityX = 0
    this.tickState.ship.velocityY = 0
  }

  setPlayerHp(hp: number): void {
    this.tickState.playerHp = hp
  }

  private tutorialStep: TutorialStep = 'done'

  setTutorialStep(step: TutorialStep): void {
    this.tutorialStep = step
  }

  clearEvents(): void {
    this.events = emptyEvents()
  }

  // --- Simulation step (delegates to shared tick()) ---

  step(dt = 1 / 60): void {
    // Sync aim state into tickState before tick (tick may clear it via cooldown)
    this.tickState.aimActive = this.aimPosition !== null
    const aimWorldPosition = this.aimPosition ? { ...this.aimPosition } : null

    const input: TickInput = {
      dt,
      paused: this.paused || this.frozen,
      inputState: this.inputState,
      aimWorldPosition,
      collecting: this.collecting,
      tutorialStep: this.tutorialStep,
    }

    const result = tick(this.tickState, input)

    // Accumulate events from tick result
    this.accumulateEvents(result)
  }

  stepN(n: number, dt = 1 / 60): void {
    for (let i = 0; i < n; i++) {
      this.step(dt)
    }
  }

  private accumulateEvents(r: TickResult): void {
    if (r.shipMoved) this.events.shipMoved++
    if (r.asteroidHit) this.events.asteroidHit++
    if (r.crystallineDeflect) this.events.crystallineDeflect++
    if (r.metalSpawned) this.events.metalSpawned++
    if (r.metalCollectedEvent) this.events.metalCollected++
    for (const mc of r.metalCollected) {
      this.events.collected.push(mc.variant)
    }
    if (r.playerDamaged) this.events.playerDamage.push(this.tickState.playerHp)
    for (const sc of r.scrapCollected) {
      this.events.scrapCollected.push(sc.value)
    }
    if (r.enemyNearby) this.events.enemyNearby++
    if (r.enemyDestroyedEvent) this.events.enemyDestroyed++
    if (r.nearStation) this.events.nearStation++
    if (r.stationRangeChanged !== null) this.events.stationRange.push(r.stationRangeChanged)
    if (r.stationRepaired) this.events.stationDriveThrough++
    if (r.playerKilled) this.events.playerKilled++
  }
}
