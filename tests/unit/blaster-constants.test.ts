import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  BASE_PROJECTILE_SPEED,
  SPEED_MULTIPLIERS,
  FIRE_RATES,
  DAMAGE_PER_TIER,
  PROJECTILE_LIFETIME,
  PROJECTILE_RADIUS,
  DUAL_SPREAD_ANGLE,
  TRIPLE_SPREAD_ANGLE,
  PROJECTILE_COLOR,
  PROJECTILE_CORE_COLOR,
  clampTier,
} from '../../src/game/blaster-constants'

describe('blaster constants', () => {
  it('BASE_PROJECTILE_SPEED is 200', () => {
    assert.equal(BASE_PROJECTILE_SPEED, 200)
  })

  it('has 5 tiers of speed multipliers', () => {
    assert.equal(SPEED_MULTIPLIERS.length, 5)
    assert.equal(SPEED_MULTIPLIERS[0], 1)
    assert.equal(SPEED_MULTIPLIERS[4], 2)
  })

  it('speed multipliers increase with tier', () => {
    for (let i = 1; i < SPEED_MULTIPLIERS.length; i++) {
      assert.ok(SPEED_MULTIPLIERS[i] > SPEED_MULTIPLIERS[i - 1])
    }
  })

  it('has 5 tiers of fire rates', () => {
    assert.equal(FIRE_RATES.length, 5)
    assert.equal(FIRE_RATES[0], 1)
    assert.equal(FIRE_RATES[4], 5)
  })

  it('fire rates increase with tier', () => {
    for (let i = 1; i < FIRE_RATES.length; i++) {
      assert.ok(FIRE_RATES[i] > FIRE_RATES[i - 1])
    }
  })

  it('has 5 tiers of damage', () => {
    assert.equal(DAMAGE_PER_TIER.length, 5)
    assert.equal(DAMAGE_PER_TIER[0], 1)
    assert.equal(DAMAGE_PER_TIER[4], 3)
  })

  it('damage never decreases with tier', () => {
    for (let i = 1; i < DAMAGE_PER_TIER.length; i++) {
      assert.ok(DAMAGE_PER_TIER[i] >= DAMAGE_PER_TIER[i - 1])
    }
  })

  it('PROJECTILE_LIFETIME is positive', () => {
    assert.ok(PROJECTILE_LIFETIME > 0)
  })

  it('PROJECTILE_RADIUS is positive', () => {
    assert.ok(PROJECTILE_RADIUS > 0)
  })

  it('spread angles are positive and reasonable', () => {
    assert.ok(DUAL_SPREAD_ANGLE > 0)
    assert.ok(DUAL_SPREAD_ANGLE < Math.PI / 4)
    assert.ok(TRIPLE_SPREAD_ANGLE > 0)
    assert.ok(TRIPLE_SPREAD_ANGLE < Math.PI / 4)
  })

  it('colors are valid hex values', () => {
    assert.equal(PROJECTILE_COLOR, 0xffaa00)
    assert.equal(PROJECTILE_CORE_COLOR, 0xffdd44)
  })
})

describe('clampTier', () => {
  it('passes through valid tiers unchanged', () => {
    for (let t = 1; t <= 5; t++) {
      assert.equal(clampTier(t), t)
    }
  })

  it('clamps values below 1 to 1', () => {
    assert.equal(clampTier(0), 1)
    assert.equal(clampTier(-5), 1)
  })

  it('clamps values above 5 to 5', () => {
    assert.equal(clampTier(6), 5)
    assert.equal(clampTier(100), 5)
  })

  it('rounds fractional tiers', () => {
    assert.equal(clampTier(2.3), 2)
    assert.equal(clampTier(2.7), 3)
    assert.equal(clampTier(4.5), 5)
  })
})
