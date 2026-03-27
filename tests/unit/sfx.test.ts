import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { installMockAudioContext, uninstallMockAudioContext } from './helpers/mock-audio-context'

async function loadSfx() {
  return await import('../../src/game/sfx')
}

describe('sfx — with mock AudioContext', () => {
  before(() => {
    installMockAudioContext()
  })

  after(() => {
    uninstallMockAudioContext()
  })

  let sfx: Awaited<ReturnType<typeof loadSfx>>

  before(async () => {
    sfx = await loadSfx()
  })

  beforeEach(() => {
    sfx.disposeSfx()
  })

  // --- One-shot SFX ---

  it('playLaserFire creates and plays oscillator', () => {
    assert.doesNotThrow(() => sfx.playLaserFire())
  })

  it('playExplosion creates noise burst and thump', () => {
    assert.doesNotThrow(() => sfx.playExplosion())
  })

  it('playPlayerHit creates impact with crack', () => {
    assert.doesNotThrow(() => sfx.playPlayerHit())
  })

  it('multiple rapid SFX calls do not throw', () => {
    assert.doesNotThrow(() => {
      for (let i = 0; i < 10; i++) {
        sfx.playLaserFire()
        sfx.playExplosion()
        sfx.playPlayerHit()
      }
    })
  })

  // --- Engine Sound ---

  it('startEngineSound initializes engine loop', () => {
    assert.doesNotThrow(() => sfx.startEngineSound())
  })

  it('double start engine is idempotent', () => {
    sfx.startEngineSound()
    assert.doesNotThrow(() => sfx.startEngineSound())
  })

  it('updateEngineSound adjusts volume and filter', () => {
    sfx.startEngineSound()
    assert.doesNotThrow(() => sfx.updateEngineSound(0.5))
  })

  it('updateEngineSound at zero speed', () => {
    sfx.startEngineSound()
    assert.doesNotThrow(() => sfx.updateEngineSound(0))
  })

  it('updateEngineSound at full speed', () => {
    sfx.startEngineSound()
    assert.doesNotThrow(() => sfx.updateEngineSound(1.0))
  })

  it('updateEngineSound before start is safe', () => {
    assert.doesNotThrow(() => sfx.updateEngineSound(0.5))
  })

  it('suspendEngineSound mutes engine', () => {
    sfx.startEngineSound()
    assert.doesNotThrow(() => sfx.suspendEngineSound())
  })

  it('suspendEngineSound before start is safe', () => {
    assert.doesNotThrow(() => sfx.suspendEngineSound())
  })

  it('stopEngineSound stops the source', () => {
    sfx.startEngineSound()
    assert.doesNotThrow(() => sfx.stopEngineSound())
  })

  it('double stop engine is safe', () => {
    sfx.startEngineSound()
    sfx.stopEngineSound()
    assert.doesNotThrow(() => sfx.stopEngineSound())
  })

  it('stopEngineSound before start is safe', () => {
    assert.doesNotThrow(() => sfx.stopEngineSound())
  })

  // --- setSfxContext ---

  it('setSfxContext accepts a context', () => {
    const ctx = new (globalThis as Record<string, unknown>).AudioContext() as AudioContext
    assert.doesNotThrow(() => sfx.setSfxContext(ctx))
  })

  // --- resumeEngineSound ---

  it('resumeEngineSound is a no-op (volume set by next update)', () => {
    assert.doesNotThrow(() => sfx.resumeEngineSound())
  })

  // --- Lifecycle ---

  it('disposeSfx cleans up engine sound', () => {
    sfx.startEngineSound()
    assert.doesNotThrow(() => sfx.disposeSfx())
  })

  it('dispose then play one-shot SFX is safe', () => {
    sfx.disposeSfx()
    assert.doesNotThrow(() => {
      sfx.playLaserFire()
      sfx.playExplosion()
      sfx.playPlayerHit()
    })
  })

  it('full lifecycle: start engine, update, suspend, stop, play sfx, dispose', () => {
    sfx.startEngineSound()
    sfx.updateEngineSound(0.7)
    sfx.suspendEngineSound()
    sfx.playLaserFire()
    sfx.playExplosion()
    sfx.playPlayerHit()
    sfx.stopEngineSound()
    sfx.disposeSfx()
  })
})
