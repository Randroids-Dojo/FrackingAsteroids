import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  createCollectorVfx,
  updateCollectorVfx,
  disposeCollectorVfx,
} from '../../src/game/collector-vfx'

describe('createCollectorVfx', () => {
  it('returns a VFX object with group, particles, ring, and elapsed', () => {
    const vfx = createCollectorVfx()
    assert.ok(vfx.group)
    assert.ok(Array.isArray(vfx.particles))
    assert.ok(vfx.particles.length > 0)
    assert.ok(vfx.ring)
    assert.ok(vfx.ringMaterial)
    assert.equal(vfx.elapsed, 0)
    disposeCollectorVfx(vfx)
  })

  it('starts invisible', () => {
    const vfx = createCollectorVfx()
    assert.equal(vfx.group.visible, false)
    disposeCollectorVfx(vfx)
  })

  it('particles have valid initial state', () => {
    const vfx = createCollectorVfx()
    for (const p of vfx.particles) {
      assert.ok(p.radius > 0, 'particle radius should be positive')
      assert.ok(p.speed > 0, 'particle speed should be positive')
      assert.ok(p.startRadius > 0, 'startRadius should be positive')
    }
    disposeCollectorVfx(vfx)
  })
})

describe('updateCollectorVfx', () => {
  it('sets group visible when active', () => {
    const vfx = createCollectorVfx()
    updateCollectorVfx(vfx, 1 / 60, true, 10, 20)
    assert.equal(vfx.group.visible, true)
    disposeCollectorVfx(vfx)
  })

  it('hides group when inactive', () => {
    const vfx = createCollectorVfx()
    updateCollectorVfx(vfx, 1 / 60, true, 0, 0)
    assert.equal(vfx.group.visible, true)
    updateCollectorVfx(vfx, 1 / 60, false, 0, 0)
    assert.equal(vfx.group.visible, false)
    disposeCollectorVfx(vfx)
  })

  it('positions group at ship coordinates', () => {
    const vfx = createCollectorVfx()
    updateCollectorVfx(vfx, 1 / 60, true, 42, 99)
    assert.equal(vfx.group.position.x, 42)
    assert.equal(vfx.group.position.y, 99)
    disposeCollectorVfx(vfx)
  })

  it('advances elapsed time when active', () => {
    const vfx = createCollectorVfx()
    updateCollectorVfx(vfx, 0.5, true, 0, 0)
    assert.ok(vfx.elapsed > 0)
    disposeCollectorVfx(vfx)
  })

  it('resets elapsed when inactive', () => {
    const vfx = createCollectorVfx()
    updateCollectorVfx(vfx, 0.5, true, 0, 0)
    updateCollectorVfx(vfx, 0.1, false, 0, 0)
    assert.equal(vfx.elapsed, 0)
    disposeCollectorVfx(vfx)
  })

  it('particles shrink radius over time', () => {
    const vfx = createCollectorVfx()
    const initialRadii = vfx.particles.map((p) => p.radius)
    updateCollectorVfx(vfx, 1 / 60, true, 0, 0)
    for (let i = 0; i < vfx.particles.length; i++) {
      assert.ok(vfx.particles[i].radius < initialRadii[i], `particle ${i} should have shrunk`)
    }
    disposeCollectorVfx(vfx)
  })

  it('respawns particles that reach center', () => {
    const vfx = createCollectorVfx()
    // Force a particle very close to center
    vfx.particles[0].radius = 0.5
    const startR = vfx.particles[0].startRadius
    updateCollectorVfx(vfx, 1 / 60, true, 0, 0)
    // Should have respawned back to startRadius
    assert.equal(vfx.particles[0].radius, startR)
    disposeCollectorVfx(vfx)
  })
})

describe('disposeCollectorVfx', () => {
  it('runs without error', () => {
    const vfx = createCollectorVfx()
    assert.doesNotThrow(() => disposeCollectorVfx(vfx))
  })
})
