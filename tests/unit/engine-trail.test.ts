import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

// Engine trail requires THREE.js — these tests verify export shape and basic behavior.
// They will fail in environments without the 'three' module (same as other Three.js tests).

describe('engine-trail — export shape', () => {
  it('module exports expected functions', async () => {
    const mod = await import('../../src/game/engine-trail')
    assert.equal(typeof mod.createEngineTrail, 'function')
    assert.equal(typeof mod.updateEngineTrail, 'function')
    assert.equal(typeof mod.disposeEngineTrail, 'function')
  })

  it('createEngineTrail returns object with expected shape', async () => {
    const mod = await import('../../src/game/engine-trail')
    const trail = mod.createEngineTrail()
    assert.ok(trail.group)
    assert.ok(Array.isArray(trail.particles))
    assert.equal(typeof trail.emitAccumulator, 'number')
    assert.equal(trail.emitAccumulator, 0)
  })

  it('updateEngineTrail at zero speed does not crash', async () => {
    const mod = await import('../../src/game/engine-trail')
    const trail = mod.createEngineTrail()
    assert.doesNotThrow(() => {
      mod.updateEngineTrail(trail, 0.016, 0, 0, 0, 0)
    })
  })

  it('updateEngineTrail at full speed activates particles', async () => {
    const mod = await import('../../src/game/engine-trail')
    const trail = mod.createEngineTrail()
    for (let i = 0; i < 10; i++) {
      mod.updateEngineTrail(trail, 0.016, 0, 0, 0, 1.0)
    }
    const activeCount = trail.particles.filter((p) => p.active).length
    assert.ok(activeCount > 0, 'Expected some active particles after emitting at full speed')
  })

  it('disposeEngineTrail does not throw', async () => {
    const mod = await import('../../src/game/engine-trail')
    const trail = mod.createEngineTrail()
    assert.doesNotThrow(() => mod.disposeEngineTrail(trail))
  })
})
