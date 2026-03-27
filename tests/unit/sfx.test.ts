import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  playLaserFire,
  playExplosion,
  playPlayerHit,
  startEngineSound,
  updateEngineSound,
  suspendEngineSound,
  stopEngineSound,
  disposeSfx,
} from '../../src/game/sfx'

// Web Audio API is not available in Node.js test environment.
// These tests verify the functions are resilient when AudioContext is unavailable.

describe('sfx — no AudioContext environment', () => {
  it('playLaserFire does not throw without AudioContext', () => {
    assert.doesNotThrow(() => playLaserFire())
  })

  it('playExplosion does not throw without AudioContext', () => {
    assert.doesNotThrow(() => playExplosion())
  })

  it('playPlayerHit does not throw without AudioContext', () => {
    assert.doesNotThrow(() => playPlayerHit())
  })

  it('startEngineSound does not throw without AudioContext', () => {
    assert.doesNotThrow(() => startEngineSound())
  })

  it('updateEngineSound does not throw without AudioContext', () => {
    assert.doesNotThrow(() => updateEngineSound(0.5))
  })

  it('stopEngineSound does not throw without AudioContext', () => {
    assert.doesNotThrow(() => stopEngineSound())
  })

  it('disposeSfx does not throw without AudioContext', () => {
    assert.doesNotThrow(() => disposeSfx())
  })

  it('start then stop engine sound is safe', () => {
    assert.doesNotThrow(() => {
      startEngineSound()
      stopEngineSound()
    })
  })

  it('double start engine is idempotent', () => {
    assert.doesNotThrow(() => {
      startEngineSound()
      startEngineSound()
      stopEngineSound()
    })
  })

  it('dispose then play is safe', () => {
    assert.doesNotThrow(() => {
      disposeSfx()
      playLaserFire()
      playExplosion()
      playPlayerHit()
    })
  })

  it('suspendEngineSound does not throw without AudioContext', () => {
    assert.doesNotThrow(() => suspendEngineSound())
  })

  it('suspend then stop engine is safe', () => {
    assert.doesNotThrow(() => {
      startEngineSound()
      suspendEngineSound()
      stopEngineSound()
    })
  })
})
