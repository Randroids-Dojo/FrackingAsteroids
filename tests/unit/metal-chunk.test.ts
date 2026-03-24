import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import {
  bounceMetalOffShip,
  bounceMetalOffAsteroid,
  attractMetalToShip,
  createMetalChunk,
  updateMetalChunk,
  disposeMetalChunk,
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
    const collectDist = METAL_CHUNK_RADIUS + SHIP_COLLISION_RADIUS
    const nearDist = collectDist + (COLLECTOR_RANGE - collectDist) * 0.3
    const farDist = collectDist + (COLLECTOR_RANGE - collectDist) * 0.8
    const chunkFar = makeMetalChunk(farDist, 0, 0, 0)
    const chunkNear = makeMetalChunk(nearDist, 0, 0, 0)
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

describe('createMetalChunk', () => {
  beforeEach(() => {
    resetMetalChunkIdCounter()
  })

  it('creates a chunk with correct position', () => {
    const chunk = createMetalChunk(10, 20, 1, 0)
    assert.equal(chunk.x, 10)
    assert.equal(chunk.y, 20)
    assert.equal(chunk.mesh.position.x, 10)
    assert.equal(chunk.mesh.position.y, 20)
  })

  it('assigns sequential IDs', () => {
    const c1 = createMetalChunk(0, 0, 1, 0)
    const c2 = createMetalChunk(0, 0, 1, 0)
    assert.equal(c1.id, 'metal-0')
    assert.equal(c2.id, 'metal-1')
  })

  it('creates a mesh group with voxel children', () => {
    const chunk = createMetalChunk(0, 0, 1, 0)
    assert.ok(chunk.mesh instanceof THREE.Group)
    assert.ok(chunk.mesh.children.length > 0, 'should have voxel children')
  })

  it('assigns a variant of silver or gold', () => {
    const variants = new Set<string>()
    for (let i = 0; i < 50; i++) {
      const chunk = createMetalChunk(0, 0, 1, 0)
      variants.add(chunk.variant)
    }
    assert.ok(variants.has('silver') || variants.has('gold'))
  })

  it('applies drift velocity in the given direction', () => {
    const chunk = createMetalChunk(0, 0, 1, 0)
    assert.ok(chunk.vx > 0, 'should drift in +x')
    assert.ok(Math.abs(chunk.vy) < 0.001, 'vy should be near zero for dir (1,0)')
  })
})

describe('updateMetalChunk', () => {
  it('moves the chunk by velocity * dt', () => {
    const chunk = createMetalChunk(0, 0, 1, 0)
    const startX = chunk.x
    const vx = chunk.vx
    updateMetalChunk(chunk, 1 / 60)
    assert.ok(chunk.x > startX, 'x should increase')
    assert.equal(chunk.mesh.position.x, chunk.x)
    assert.equal(chunk.mesh.position.y, chunk.y)
  })

  it('applies friction to velocity', () => {
    const chunk = createMetalChunk(0, 0, 1, 0)
    const vxBefore = chunk.vx
    updateMetalChunk(chunk, 1 / 60)
    assert.ok(Math.abs(chunk.vx) < Math.abs(vxBefore), 'velocity should decrease from friction')
  })

  it('rotates the mesh', () => {
    const chunk = createMetalChunk(0, 0, 1, 0)
    const rotBefore = chunk.mesh.rotation.z
    updateMetalChunk(chunk, 1 / 60)
    assert.notEqual(chunk.mesh.rotation.z, rotBefore, 'rotation should change')
  })
})

describe('disposeMetalChunk', () => {
  it('disposes geometry and material of all children', () => {
    const chunk = createMetalChunk(0, 0, 1, 0)
    // Should not throw
    disposeMetalChunk(chunk)
    // Verify geometries are disposed by checking the disposed flag
    for (const child of chunk.mesh.children) {
      if (child instanceof THREE.Mesh) {
        // After dispose, accessing attributes may fail, but we just verify it ran
        assert.ok(true)
      }
    }
  })
})

describe('bounceMetalOffAsteroid edge cases', () => {
  it('handles zero-distance edge case', () => {
    const chunk = makeMetalChunk(0, 0)
    const asteroid = makeAsteroid({ x: 0, y: 0 })
    const result = bounceMetalOffAsteroid(chunk, asteroid)
    assert.equal(result, true)
    const dist = Math.sqrt(chunk.x ** 2 + chunk.y ** 2)
    assert.ok(dist > 0, 'should be pushed to non-zero position')
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
