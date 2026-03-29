/**
 * Convenience wrapper around GameSimulation for readable integration tests.
 *
 * Provides high-level actions (fireAndWait, destroyAsteroid, collectAllMetal)
 * and assertion helpers that fail with descriptive messages.
 */

import assert from 'node:assert/strict'
import { GameSimulation } from './game-simulation'
import type { SimulationConfig, SimulationEvents } from './game-simulation'
import type { Asteroid } from '../../src/game/types'

const DEFAULT_MAX_STEPS = 600 // 10 seconds at 60fps

export class GameTestHarness {
  readonly sim: GameSimulation

  constructor(config?: SimulationConfig) {
    this.sim = new GameSimulation(config)
  }

  // --- Convenience actions ---

  /** Fire once at a world position and step until the projectile either hits or expires. */
  fireAndWait(x: number, y: number, maxSteps = DEFAULT_MAX_STEPS): void {
    this.sim.fireAt(x, y)
    this.sim.step()
    const initialCount = this.sim.projectiles.length
    if (initialCount === 0) return

    for (let i = 0; i < maxSteps; i++) {
      this.sim.step()
      if (this.sim.projectiles.length < initialCount) return
    }
  }

  /** Fire at a specific asteroid's current position. */
  fireAtAsteroid(asteroid: Asteroid): void {
    this.fireAndWait(asteroid.x, asteroid.y)
  }

  /** Move ship toward a target for N steps. */
  moveToward(x: number, y: number, steps: number): void {
    for (let i = 0; i < steps; i++) {
      const dx = x - this.sim.ship.x
      const dy = y - this.sim.ship.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 2) break
      this.sim.setInput({
        up: dy > 1,
        down: dy < -1,
        left: dx < -1,
        right: dx > 1,
      })
      this.sim.step()
    }
    this.sim.clearInput()
  }

  /** Step until a predicate is true, or throw after maxSteps. */
  stepUntil(predicate: (sim: GameSimulation) => boolean, maxSteps = DEFAULT_MAX_STEPS): number {
    for (let i = 0; i < maxSteps; i++) {
      this.sim.step()
      if (predicate(this.sim)) return i + 1
    }
    throw new Error(`Condition not met after ${maxSteps} steps`)
  }

  /** Step until a specific asteroid is destroyed. */
  stepUntilAsteroidDestroyed(asteroidId: string, maxSteps = DEFAULT_MAX_STEPS): number {
    return this.stepUntil((sim) => {
      const a = sim.asteroids.find((ast) => ast.id === asteroidId)
      return a !== undefined && a.hp <= 0
    }, maxSteps)
  }

  /** Destroy an asteroid by repeatedly firing at it. Returns total steps taken. */
  destroyAsteroid(asteroid: Asteroid, maxSteps = DEFAULT_MAX_STEPS): number {
    let totalSteps = 0
    while (asteroid.hp > 0 && totalSteps < maxSteps) {
      this.sim.fireAt(asteroid.x, asteroid.y)
      this.sim.step()
      totalSteps++
      // Step until projectile resolves
      for (let i = 0; i < 120 && asteroid.hp > 0; i++) {
        this.sim.step()
        totalSteps++
      }
    }
    if (asteroid.hp > 0) {
      throw new Error(`Failed to destroy asteroid ${asteroid.id} after ${maxSteps} steps`)
    }
    return totalSteps
  }

  /** Start collecting and step until all nearby metal chunks are collected. */
  collectAllMetal(maxSteps = DEFAULT_MAX_STEPS): number {
    this.sim.startCollecting()
    let steps = 0
    while (this.sim.metalChunks.length > 0 && steps < maxSteps) {
      this.sim.step()
      steps++
    }
    this.sim.stopCollecting()
    return steps
  }

  // --- Assertion helpers ---

  assertEventCount(event: keyof SimulationEvents, expected: number): void {
    const val = this.sim.events[event]
    const actual = typeof val === 'number' ? val : Array.isArray(val) ? val.length : 0
    assert.equal(actual, expected, `Expected ${String(event)} count = ${expected}, got ${actual}`)
  }

  assertEventAtLeast(event: keyof SimulationEvents, minimum: number): void {
    const val = this.sim.events[event]
    const actual = typeof val === 'number' ? val : Array.isArray(val) ? val.length : 0
    assert.ok(actual >= minimum, `Expected ${String(event)} >= ${minimum}, got ${actual}`)
  }

  assertHp(expected: number): void {
    assert.equal(this.sim.playerHp, expected, `Expected HP = ${expected}, got ${this.sim.playerHp}`)
  }

  assertAsteroidHp(asteroidId: string, expected: number): void {
    const a = this.sim.asteroids.find((ast) => ast.id === asteroidId)
    assert.ok(a, `Asteroid ${asteroidId} not found`)
    assert.equal(a.hp, expected, `Expected asteroid ${asteroidId} HP = ${expected}, got ${a.hp}`)
  }

  assertAsteroidDestroyed(asteroidId: string): void {
    const a = this.sim.asteroids.find((ast) => ast.id === asteroidId)
    assert.ok(a, `Asteroid ${asteroidId} not found`)
    assert.equal(a.hp, 0, `Expected asteroid ${asteroidId} destroyed, but HP = ${a.hp}`)
  }

  assertShipNear(x: number, y: number, tolerance = 5): void {
    const dx = this.sim.ship.x - x
    const dy = this.sim.ship.y - y
    const dist = Math.sqrt(dx * dx + dy * dy)
    assert.ok(
      dist < tolerance,
      `Ship at (${this.sim.ship.x}, ${this.sim.ship.y}) not near (${x}, ${y}) — dist=${dist.toFixed(1)}`,
    )
  }

  assertMetalCount(expected: number): void {
    assert.equal(
      this.sim.metalChunks.length,
      expected,
      `Expected ${expected} metal chunks, got ${this.sim.metalChunks.length}`,
    )
  }

  assertProjectileCount(expected: number): void {
    assert.equal(
      this.sim.projectiles.length,
      expected,
      `Expected ${expected} projectiles, got ${this.sim.projectiles.length}`,
    )
  }
}
