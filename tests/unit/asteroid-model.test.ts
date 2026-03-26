import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  createLargeAsteroidModel,
  createAsteroidModel,
  ASTEROID_SIZE_RADIUS,
  ASTEROID_COLORS,
} from '../../src/game/asteroid-model'

describe('createLargeAsteroidModel', () => {
  it('returns a THREE.Group with voxel children', () => {
    const model = createLargeAsteroidModel()
    assert.ok(model.children.length > 0, 'model should have children')
  })
})

describe('createAsteroidModel', () => {
  it('creates a model for each asteroid type', () => {
    const types = ['common', 'dense', 'precious', 'comet'] as const
    for (const type of types) {
      const model = createAsteroidModel(type, 1, 42)
      assert.ok(model.children.length > 0, `${type} model should have children`)
    }
  })

  it('creates different sized models', () => {
    const large = createAsteroidModel('common', 1, 42)
    const medium = createAsteroidModel('common', 2, 42)
    const small = createAsteroidModel('common', 3, 42)

    // Larger asteroids should have more voxels
    assert.ok(
      large.children.length > medium.children.length,
      `Large (${large.children.length}) should have more voxels than medium (${medium.children.length})`,
    )
    assert.ok(
      medium.children.length > small.children.length,
      `Medium (${medium.children.length}) should have more voxels than small (${small.children.length})`,
    )
  })

  it('produces different shapes with different seeds', () => {
    const a = createAsteroidModel('common', 1, 100)
    const b = createAsteroidModel('common', 1, 200)
    // Different seed should produce different rotation at minimum
    assert.notEqual(a.rotation.z, b.rotation.z)
  })

  it('produces identical shapes with same seed', () => {
    const a = createAsteroidModel('common', 1, 42)
    const b = createAsteroidModel('common', 1, 42)
    assert.equal(a.children.length, b.children.length)
    assert.equal(a.rotation.z, b.rotation.z)
  })
})

describe('ASTEROID_SIZE_RADIUS', () => {
  it('has radius for sizes 1-3', () => {
    assert.ok(ASTEROID_SIZE_RADIUS[1] > 0)
    assert.ok(ASTEROID_SIZE_RADIUS[2] > 0)
    assert.ok(ASTEROID_SIZE_RADIUS[3] > 0)
  })

  it('larger sizes have larger radii', () => {
    assert.ok(ASTEROID_SIZE_RADIUS[1] > ASTEROID_SIZE_RADIUS[2])
    assert.ok(ASTEROID_SIZE_RADIUS[2] > ASTEROID_SIZE_RADIUS[3])
  })
})

describe('ASTEROID_COLORS', () => {
  it('exports expected color keys', () => {
    assert.ok(typeof ASTEROID_COLORS.rock === 'number')
    assert.ok(typeof ASTEROID_COLORS.rockDark === 'number')
    assert.ok(typeof ASTEROID_COLORS.rockLight === 'number')
    assert.ok(typeof ASTEROID_COLORS.crystal === 'number')
  })
})
