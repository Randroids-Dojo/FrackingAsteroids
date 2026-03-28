import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createScreenShake, addTrauma, updateScreenShake } from '../../src/game/screen-shake'

describe('screen-shake', () => {
  it('starts with zero offset and trauma', () => {
    const shake = createScreenShake()
    assert.equal(shake.offsetX, 0)
    assert.equal(shake.offsetY, 0)
    assert.equal(shake.trauma, 0)
  })

  it('addTrauma increases trauma value', () => {
    const shake = createScreenShake()
    addTrauma(shake, 0.5)
    assert.equal(shake.trauma, 0.5)
  })

  it('addTrauma stacks and clamps to 1', () => {
    const shake = createScreenShake()
    addTrauma(shake, 0.6)
    addTrauma(shake, 0.6)
    assert.equal(shake.trauma, 1)
  })

  it('updateScreenShake produces non-zero offsets when trauma > 0', () => {
    const shake = createScreenShake()
    addTrauma(shake, 0.8)
    updateScreenShake(shake, 0.016, 1.5)
    // At least one offset should be non-zero
    assert.ok(shake.offsetX !== 0 || shake.offsetY !== 0)
  })

  it('trauma decays over time', () => {
    const shake = createScreenShake()
    addTrauma(shake, 1.0)
    updateScreenShake(shake, 0.5, 1.0)
    assert.ok(shake.trauma < 1.0)
    assert.ok(shake.trauma >= 0)
  })

  it('offsets return to zero when trauma fully decays', () => {
    const shake = createScreenShake()
    addTrauma(shake, 0.1)
    // Run enough updates to fully decay
    for (let i = 0; i < 100; i++) {
      updateScreenShake(shake, 0.05, i * 0.05)
    }
    assert.equal(shake.offsetX, 0)
    assert.equal(shake.offsetY, 0)
    assert.equal(shake.trauma, 0)
  })

  it('no-op when trauma is zero', () => {
    const shake = createScreenShake()
    updateScreenShake(shake, 0.016, 1.0)
    assert.equal(shake.offsetX, 0)
    assert.equal(shake.offsetY, 0)
  })
})
