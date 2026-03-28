import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('background-effects — export shape and basic behavior', () => {
  it('module exports all expected functions', async () => {
    const mod = await import('../../src/game/background-effects')
    assert.equal(typeof mod.createTwinkleStars, 'function')
    assert.equal(typeof mod.updateTwinkleStars, 'function')
    assert.equal(typeof mod.disposeTwinkleStars, 'function')
    assert.equal(typeof mod.createNebulaSystem, 'function')
    assert.equal(typeof mod.updateNebulaSystem, 'function')
    assert.equal(typeof mod.disposeNebulaSystem, 'function')
    assert.equal(typeof mod.createBlackHole, 'function')
    assert.equal(typeof mod.updateBlackHole, 'function')
    assert.equal(typeof mod.disposeBlackHole, 'function')
  })

  it('createTwinkleStars returns expected shape', async () => {
    const mod = await import('../../src/game/background-effects')
    const stars = mod.createTwinkleStars()
    assert.ok(stars.points)
    assert.ok(stars.geometry)
    assert.ok(stars.baseBrightness instanceof Float32Array)
    assert.ok(stars.phases instanceof Float32Array)
    assert.ok(stars.speeds instanceof Float32Array)
  })

  it('updateTwinkleStars does not throw', async () => {
    const mod = await import('../../src/game/background-effects')
    const stars = mod.createTwinkleStars()
    assert.doesNotThrow(() => mod.updateTwinkleStars(stars, 1.0, 10, 20))
  })

  it('disposeTwinkleStars does not throw', async () => {
    const mod = await import('../../src/game/background-effects')
    const stars = mod.createTwinkleStars()
    assert.doesNotThrow(() => mod.disposeTwinkleStars(stars))
  })

  it('createNebulaSystem returns expected shape', async () => {
    const mod = await import('../../src/game/background-effects')
    const system = mod.createNebulaSystem()
    assert.ok(system.group)
    assert.ok(Array.isArray(system.swirls))
    assert.equal(system.swirls.length, 5)
  })

  it('updateNebulaSystem does not throw', async () => {
    const mod = await import('../../src/game/background-effects')
    const system = mod.createNebulaSystem()
    assert.doesNotThrow(() => mod.updateNebulaSystem(system, 1.0, 10, 20))
  })

  it('disposeNebulaSystem does not throw', async () => {
    const mod = await import('../../src/game/background-effects')
    const system = mod.createNebulaSystem()
    assert.doesNotThrow(() => mod.disposeNebulaSystem(system))
  })

  it('createBlackHole returns expected shape', async () => {
    const mod = await import('../../src/game/background-effects')
    const hole = mod.createBlackHole(100, 200)
    assert.ok(hole.group)
    assert.ok(Array.isArray(hole.ringMeshes))
    assert.equal(hole.ringMeshes.length, 4)
    assert.ok(hole.coreMesh)
    assert.equal(hole.x, 100)
    assert.equal(hole.y, 200)
  })

  it('updateBlackHole does not throw', async () => {
    const mod = await import('../../src/game/background-effects')
    const hole = mod.createBlackHole(100, 200)
    assert.doesNotThrow(() => mod.updateBlackHole(hole, 1.0, 10, 20))
  })

  it('disposeBlackHole does not throw', async () => {
    const mod = await import('../../src/game/background-effects')
    const hole = mod.createBlackHole(100, 200)
    assert.doesNotThrow(() => mod.disposeBlackHole(hole))
  })
})
