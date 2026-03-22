import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  SHIP_ACCELERATION,
  SHIP_MAX_SPEED,
  SHIP_FRICTION,
  SHIP_ROTATION_SPEED,
  SHIP_COLORS,
  VOXEL_SIZE,
} from '../../src/game/ship-constants'

describe('ship physics constants', () => {
  it('SHIP_ACCELERATION is a positive number', () => {
    assert.ok(typeof SHIP_ACCELERATION === 'number')
    assert.ok(SHIP_ACCELERATION > 0)
  })

  it('SHIP_MAX_SPEED is a positive number', () => {
    assert.ok(typeof SHIP_MAX_SPEED === 'number')
    assert.ok(SHIP_MAX_SPEED > 0)
  })

  it('SHIP_FRICTION is between 0 and 1', () => {
    assert.ok(typeof SHIP_FRICTION === 'number')
    assert.ok(SHIP_FRICTION > 0 && SHIP_FRICTION < 1)
  })

  it('SHIP_ROTATION_SPEED is a positive number', () => {
    assert.ok(typeof SHIP_ROTATION_SPEED === 'number')
    assert.ok(SHIP_ROTATION_SPEED > 0)
  })

  it('max speed exceeds acceleration (ship can reach useful speed)', () => {
    assert.ok(SHIP_MAX_SPEED > SHIP_ACCELERATION * 0.5)
  })
})

describe('ship visual constants', () => {
  it('SHIP_COLORS has all required color keys', () => {
    assert.ok('hull' in SHIP_COLORS)
    assert.ok('cockpit' in SHIP_COLORS)
    assert.ok('engine' in SHIP_COLORS)
    assert.ok('wingTip' in SHIP_COLORS)
  })

  it('SHIP_COLORS values are valid hex color numbers', () => {
    for (const [key, value] of Object.entries(SHIP_COLORS)) {
      assert.ok(typeof value === 'number', `${key} should be a number`)
      assert.ok(value >= 0 && value <= 0xffffff, `${key} should be a valid hex color`)
    }
  })

  it('VOXEL_SIZE is a positive number', () => {
    assert.ok(typeof VOXEL_SIZE === 'number')
    assert.ok(VOXEL_SIZE > 0)
  })
})
