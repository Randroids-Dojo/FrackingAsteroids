import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { spawnAsteroidField } from '../../src/game/asteroid-spawner'

describe('spawnAsteroidField', () => {
  it('spawns 40 asteroids by default', () => {
    const asteroids = spawnAsteroidField(30, 350, 42)
    assert.equal(asteroids.length, 40)
  })

  it('assigns unique ids', () => {
    const asteroids = spawnAsteroidField(30, 350, 42)
    const ids = new Set(asteroids.map((a) => a.id))
    assert.equal(ids.size, asteroids.length)
  })

  it('produces deterministic results with same seed', () => {
    const a1 = spawnAsteroidField(30, 350, 123)
    const a2 = spawnAsteroidField(30, 350, 123)
    assert.deepStrictEqual(a1, a2)
  })

  it('produces different results with different seeds', () => {
    const a1 = spawnAsteroidField(30, 350, 100)
    const a2 = spawnAsteroidField(30, 350, 200)
    const samePositions = a1.every((a, i) => a.x === a2[i].x && a.y === a2[i].y)
    assert.equal(samePositions, false)
  })

  it('places asteroids at least 80 units from station', () => {
    const stationX = 30
    const stationY = 350
    const asteroids = spawnAsteroidField(stationX, stationY, 42)
    for (const a of asteroids) {
      const dx = a.x - stationX
      const dy = a.y - stationY
      const dist = Math.sqrt(dx * dx + dy * dy)
      assert.ok(dist >= 79, `Asteroid ${a.id} too close to station: ${dist}`)
    }
  })

  it('maintains minimum spacing between asteroids', () => {
    const asteroids = spawnAsteroidField(30, 350, 42)
    for (let i = 0; i < asteroids.length; i++) {
      for (let j = i + 1; j < asteroids.length; j++) {
        const dx = asteroids[i].x - asteroids[j].x
        const dy = asteroids[i].y - asteroids[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        assert.ok(dist >= 19, `Asteroids ${i} and ${j} too close: ${dist}`)
      }
    }
  })

  it('spawns valid asteroid types', () => {
    const validTypes = new Set(['common', 'dense', 'precious', 'comet', 'crystalline'])
    const asteroids = spawnAsteroidField(30, 350, 42)
    for (const a of asteroids) {
      assert.ok(validTypes.has(a.type), `Invalid type: ${a.type}`)
    }
  })

  it('spawns valid sizes (1-3)', () => {
    const asteroids = spawnAsteroidField(30, 350, 42)
    for (const a of asteroids) {
      assert.ok(a.size >= 1 && a.size <= 3, `Invalid size: ${a.size}`)
    }
  })

  it('sets HP based on type and size', () => {
    const asteroids = spawnAsteroidField(30, 350, 42)
    for (const a of asteroids) {
      assert.ok(a.hp > 0, `Asteroid ${a.id} has no HP`)
      assert.equal(a.hp, a.maxHp, `Asteroid ${a.id} HP does not match maxHp`)
    }
  })

  it('assigns drift velocities within bounds', () => {
    const asteroids = spawnAsteroidField(30, 350, 42)
    for (const a of asteroids) {
      const speed = Math.sqrt(a.velocityX ** 2 + a.velocityY ** 2)
      assert.ok(speed <= 3.01, `Asteroid ${a.id} drifts too fast: ${speed}`)
    }
  })

  it('spawns a mix of types', () => {
    const asteroids = spawnAsteroidField(30, 350, 42)
    const types = new Set(asteroids.map((a) => a.type))
    assert.ok(types.size >= 2, `Only ${types.size} type(s) spawned, expected variety`)
  })

  it('spawns a mix of sizes', () => {
    const asteroids = spawnAsteroidField(30, 350, 42)
    const sizes = new Set(asteroids.map((a) => a.size))
    assert.ok(sizes.size >= 2, `Only ${sizes.size} size(s) spawned, expected variety`)
  })
})
