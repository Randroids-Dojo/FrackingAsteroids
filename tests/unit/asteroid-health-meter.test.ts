import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { computeHealthMeterState } from '../../src/game/asteroid-health-meter'

describe('computeHealthMeterState', () => {
  it('returns hidden when at full health', () => {
    const state = computeHealthMeterState(3, 3)
    assert.equal(state.visible, false)
    assert.equal(state.progress, 1)
  })

  it('returns visible when damaged', () => {
    const state = computeHealthMeterState(2, 3)
    assert.equal(state.visible, true)
    assert.ok(state.progress > 0 && state.progress < 1)
  })

  it('progress reflects remaining HP fraction', () => {
    const state = computeHealthMeterState(1, 4)
    assert.ok(Math.abs(state.progress - 0.25) < 0.001)
  })

  it('progress is 0 when HP is 0', () => {
    const state = computeHealthMeterState(0, 3)
    assert.equal(state.visible, true)
    assert.equal(state.progress, 0)
  })

  it('uses green color when above 50% HP', () => {
    const state = computeHealthMeterState(3, 5)
    assert.equal(state.color, 0x00ff88)
  })

  it('uses amber color when at 50% HP or below', () => {
    const state = computeHealthMeterState(2, 5)
    assert.equal(state.color, 0xffaa00)
  })

  it('uses red color when at 25% or below', () => {
    const state = computeHealthMeterState(1, 5)
    assert.equal(state.color, 0xff4444)
  })

  it('handles maxHp of 0 gracefully', () => {
    const state = computeHealthMeterState(0, 0)
    assert.equal(state.visible, false)
    assert.equal(state.progress, 0)
  })

  it('clamps progress to 0-1 range when hp exceeds maxHp', () => {
    const state = computeHealthMeterState(10, 3)
    assert.equal(state.progress, 1)
    assert.equal(state.visible, false)
  })

  it('clamps negative HP to 0 progress', () => {
    const state = computeHealthMeterState(-1, 3)
    assert.equal(state.progress, 0)
    assert.equal(state.visible, true)
  })
})
