import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeMeterState,
  FILL_COLOR,
  CHARGING_COLOR,
  BAR_WIDTH,
} from '../../src/game/recharge-meter'
import { FIRE_RATES } from '../../src/game/blaster-constants'

function makeBlaster(cooldownRemaining: number) {
  return { cooldownRemaining }
}

describe('computeMeterState', () => {
  it('returns hidden when cooldown is zero', () => {
    const state = computeMeterState(makeBlaster(0), 1)
    assert.equal(state.visible, false)
    assert.equal(state.progress, 1)
  })

  it('returns hidden when cooldown is negative', () => {
    const state = computeMeterState(makeBlaster(-0.1), 1)
    assert.equal(state.visible, false)
  })

  it('returns visible when on cooldown', () => {
    const cooldownTotal = 1 / FIRE_RATES[0] // tier 1: 1 shot/sec → 1s cooldown
    const state = computeMeterState(makeBlaster(cooldownTotal * 0.5), 1)
    assert.equal(state.visible, true)
    assert.ok(
      Math.abs(state.progress - 0.5) < 0.001,
      `progress should be ~0.5, got ${state.progress}`,
    )
  })

  it('progress is 0 at start of cooldown', () => {
    const cooldownTotal = 1 / FIRE_RATES[0]
    const state = computeMeterState(makeBlaster(cooldownTotal), 1)
    assert.equal(state.visible, true)
    assert.ok(Math.abs(state.progress) < 0.001, `progress should be ~0, got ${state.progress}`)
  })

  it('uses amber color while charging', () => {
    const cooldownTotal = 1 / FIRE_RATES[0]
    const state = computeMeterState(makeBlaster(cooldownTotal * 0.5), 1)
    assert.equal(state.color, CHARGING_COLOR)
  })

  it('uses green color when nearly ready (>=90%)', () => {
    const cooldownTotal = 1 / FIRE_RATES[0]
    const state = computeMeterState(makeBlaster(cooldownTotal * 0.05), 1)
    assert.ok(state.progress >= 0.9, `progress should be >=0.9, got ${state.progress}`)
    assert.equal(state.color, FILL_COLOR)
  })

  it('clamps tier to valid range', () => {
    // Tier 0 should clamp to 1
    const cooldownTotal = 1 / FIRE_RATES[0]
    const state = computeMeterState(makeBlaster(cooldownTotal * 0.5), 0)
    assert.equal(state.visible, true)
    assert.ok(Math.abs(state.progress - 0.5) < 0.001)
  })

  it('handles tier 5 fire rate', () => {
    const cooldownTotal = 1 / FIRE_RATES[4] // tier 5: 5 shots/sec → 0.2s cooldown
    const state = computeMeterState(makeBlaster(cooldownTotal * 0.5), 5)
    assert.equal(state.visible, true)
    assert.ok(Math.abs(state.progress - 0.5) < 0.001)
  })

  it('clamps progress to 0-1 range', () => {
    // Remaining > total (shouldn't happen, but be safe)
    const cooldownTotal = 1 / FIRE_RATES[0]
    const state = computeMeterState(makeBlaster(cooldownTotal * 2), 1)
    assert.equal(state.progress, 0, 'progress should clamp to 0')
  })

  it('exports BAR_WIDTH as a positive number', () => {
    assert.ok(BAR_WIDTH > 0)
  })
})
