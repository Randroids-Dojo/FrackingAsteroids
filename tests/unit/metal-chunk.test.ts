import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  bounceMetalOffShip,
  bounceMetalOffAsteroid,
  attractMetalToShip,
  METAL_CHUNK_RADIUS,
  METAL_SPAWN_CHANCE,
  COLLECTOR_PULL_SPEED,
  COLLECTOR_RANGE,
  resetMetalChunkIdCounter,
} from '../../src/game/metal-chunk'
import {
  SHIP_COLLISION_RADIUS,
  ASTEROID_COLLISION_RADIUS,
} from '../../src/game/collision-constants'
import type { Asteroid } from '../../src/game/types'

function makeShip(x = 0, y = 0) {
  return { x, y, rotation: 0, velocityX: 0, velocityY: 0 }
}

function makeAsteroid(overrides: Partial<Asteroid> = {}): Asteroid {
  return {
    id: 'a1',
    x: 0,
    y: 0,
    velocityX: 0,
    velocityY: 0,
    type: 'common',
    hp: 3,
    maxHp: 3,
    size: 1,
    ...overrides,
  }
}

// Minimal metal chunk for testing (no Three.js mesh needed for pure logic)
function makeMetalChunk(x: number, y: number, vx = 0, vy = 0) {
  return {
    id: 'metal-test',
    mesh: {} as never, // not used in bounce logic
    x,
    y,
    vx,
    vy,
    rotSpeed: 1,
    variant: 'silver' as const,
  }
}

describe('bounceMetalOffShip', () => {
  beforeEach(() => {
    resetMetalChunkIdCounter()
  })

  it('returns false when metal is far from ship', () => {
    const chunk = makeMetalChunk(100, 100)
    const ship = makeShip(0, 0)
    assert.equal(bounceMetalOffShip(chunk, ship), false)
  })

  it('returns true and bounces when overlapping', () => {
    const minDist = METAL_CHUNK_RADIUS + SHIP_COLLISION_RADIUS
    const chunk = makeMetalChunk(minDist - 0.5, 0, -10, 0)
    const ship = makeShip(0, 0)
    const result = bounceMetalOffShip(chunk, ship)
    assert.equal(result, true)
    // Velocity should now point away from ship (positive X)
    assert.ok(chunk.vx > 0, `vx should be positive after bounce, got ${chunk.vx}`)
  })

  it('pushes metal out of ship on overlap', () => {
    const minDist = METAL_CHUNK_RADIUS + SHIP_COLLISION_RADIUS
    const chunk = makeMetalChunk(minDist - 1, 0)
    const ship = makeShip(0, 0)
    bounceMetalOffShip(chunk, ship)
    const dist = Math.sqrt(chunk.x ** 2 + chunk.y ** 2)
    assert.ok(dist >= minDist, `should be pushed out to ${minDist}, got ${dist}`)
  })

  it('adds ship velocity kick on bounce', () => {
    const minDist = METAL_CHUNK_RADIUS + SHIP_COLLISION_RADIUS
    const chunk = makeMetalChunk(minDist - 0.5, 0, 0, 0)
    const ship = makeShip(0, 0)
    ship.velocityX = 100
    bounceMetalOffShip(chunk, ship)
    assert.ok(chunk.vx > 0, 'should get a kick from ship velocity')
  })

  it('does not bounce when velocity is already pointing away', () => {
    const minDist = METAL_CHUNK_RADIUS + SHIP_COLLISION_RADIUS
    // Metal is to the right of ship, moving right (away) — should still push out but not reflect
    const chunk = makeMetalChunk(minDist - 0.5, 0, 10, 0)
    const ship = makeShip(0, 0)
    bounceMetalOffShip(chunk, ship)
    assert.ok(chunk.vx > 0, 'should still move right')
  })

  it('handles zero-distance edge case', () => {
    const chunk = makeMetalChunk(0, 0)
    const ship = makeShip(0, 0)
    const result = bounceMetalOffShip(chunk, ship)
    assert.equal(result, true)
    const dist = Math.sqrt(chunk.x ** 2 + chunk.y ** 2)
    assert.ok(dist > 0, 'should be pushed to non-zero position')
  })
})

describe('bounceMetalOffAsteroid', () => {
  it('returns false when metal is far from asteroid', () => {
    const chunk = makeMetalChunk(100, 100)
    const asteroid = makeAsteroid({ x: 0, y: 0 })
    assert.equal(bounceMetalOffAsteroid(chunk, asteroid), false)
  })

  it('returns true and bounces when overlapping', () => {
    const minDist = METAL_CHUNK_RADIUS + ASTEROID_COLLISION_RADIUS
    const chunk = makeMetalChunk(minDist - 0.5, 0, -10, 0)
    const asteroid = makeAsteroid({ x: 0, y: 0 })
    const result = bounceMetalOffAsteroid(chunk, asteroid)
    assert.equal(result, true)
    assert.ok(chunk.vx > 0, `vx should be positive after bounce, got ${chunk.vx}`)
  })

  it('skips dead asteroids', () => {
    const minDist = METAL_CHUNK_RADIUS + ASTEROID_COLLISION_RADIUS
    const chunk = makeMetalChunk(minDist - 0.5, 0, -10, 0)
    const asteroid = makeAsteroid({ x: 0, y: 0, hp: 0 })
    assert.equal(bounceMetalOffAsteroid(chunk, asteroid), false)
  })

  it('pushes metal out of asteroid on overlap', () => {
    const minDist = METAL_CHUNK_RADIUS + ASTEROID_COLLISION_RADIUS
    const chunk = makeMetalChunk(minDist - 2, 0)
    const asteroid = makeAsteroid({ x: 0, y: 0 })
    bounceMetalOffAsteroid(chunk, asteroid)
    const dist = Math.sqrt(chunk.x ** 2 + chunk.y ** 2)
    assert.ok(dist >= minDist, `should be pushed out to ${minDist}, got ${dist}`)
  })

  it('handles diagonal bounce', () => {
    const chunk = makeMetalChunk(3, 3, -10, -10)
    const asteroid = makeAsteroid({ x: 0, y: 0 })
    bounceMetalOffAsteroid(chunk, asteroid)
    // Should bounce outward diagonally
    assert.ok(chunk.vx > 0 || chunk.vy > 0, 'should bounce away from asteroid')
  })
})

describe('attractMetalToShip', () => {
  it('returns false when metal is out of range', () => {
    const chunk = makeMetalChunk(COLLECTOR_RANGE + 10, 0)
    const ship = makeShip(0, 0)
    assert.equal(attractMetalToShip(chunk, ship, 1 / 60), false)
  })

  it('returns true when metal is close enough to collect', () => {
    const minDist = METAL_CHUNK_RADIUS + SHIP_COLLISION_RADIUS
    const chunk = makeMetalChunk(minDist - 0.5, 0)
    const ship = makeShip(0, 0)
    assert.equal(attractMetalToShip(chunk, ship, 1 / 60), true)
  })

  it('pulls metal toward ship when in range', () => {
    const chunk = makeMetalChunk(COLLECTOR_RANGE * 0.5, 0, 0, 0)
    const ship = makeShip(0, 0)
    attractMetalToShip(chunk, ship, 1 / 60)
    // Should have negative vx (pulled toward ship at origin)
    assert.ok(chunk.vx < 0, `vx should be negative (toward ship), got ${chunk.vx}`)
  })

  it('pull is stronger when closer', () => {
    const chunkFar = makeMetalChunk(COLLECTOR_RANGE * 0.8, 0, 0, 0)
    const chunkNear = makeMetalChunk(COLLECTOR_RANGE * 0.3, 0, 0, 0)
    const ship = makeShip(0, 0)
    attractMetalToShip(chunkFar, ship, 1 / 60)
    attractMetalToShip(chunkNear, ship, 1 / 60)
    assert.ok(
      Math.abs(chunkNear.vx) > Math.abs(chunkFar.vx),
      'closer chunk should be pulled harder',
    )
  })

  it('does not modify velocity when out of range', () => {
    const chunk = makeMetalChunk(COLLECTOR_RANGE + 10, 0, 5, 3)
    const ship = makeShip(0, 0)
    attractMetalToShip(chunk, ship, 1 / 60)
    assert.equal(chunk.vx, 5)
    assert.equal(chunk.vy, 3)
  })
})

describe('metal chunk constants', () => {
  it('METAL_CHUNK_RADIUS is positive', () => {
    assert.ok(METAL_CHUNK_RADIUS > 0)
  })

  it('METAL_SPAWN_CHANCE is between 0 and 1', () => {
    assert.ok(METAL_SPAWN_CHANCE > 0)
    assert.ok(METAL_SPAWN_CHANCE <= 1)
  })

  it('COLLECTOR_PULL_SPEED is positive', () => {
    assert.ok(COLLECTOR_PULL_SPEED > 0)
  })

  it('COLLECTOR_RANGE is positive', () => {
    assert.ok(COLLECTOR_RANGE > 0)
  })
})
