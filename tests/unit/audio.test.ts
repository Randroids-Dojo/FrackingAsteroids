import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  resumeAudio,
  startCollectorHum,
  stopCollectorHum,
  playCollectPling,
  disposeAudio,
} from '../../src/game/audio'

// Web Audio API is not available in Node.js test environment.
// These tests verify the functions are resilient when AudioContext is unavailable.

describe('audio — no AudioContext environment', () => {
  it('resumeAudio does not throw without AudioContext', () => {
    assert.doesNotThrow(() => resumeAudio())
  })

  it('startCollectorHum does not throw without AudioContext', () => {
    assert.doesNotThrow(() => startCollectorHum())
  })

  it('stopCollectorHum does not throw without AudioContext', () => {
    assert.doesNotThrow(() => stopCollectorHum())
  })

  it('playCollectPling does not throw without AudioContext', () => {
    assert.doesNotThrow(() => playCollectPling())
  })

  it('disposeAudio does not throw without AudioContext', () => {
    assert.doesNotThrow(() => disposeAudio())
  })

  it('start then stop collector hum is safe', () => {
    assert.doesNotThrow(() => {
      startCollectorHum()
      stopCollectorHum()
    })
  })

  it('double start is idempotent', () => {
    assert.doesNotThrow(() => {
      startCollectorHum()
      startCollectorHum()
      stopCollectorHum()
    })
  })

  it('double stop is idempotent', () => {
    assert.doesNotThrow(() => {
      stopCollectorHum()
      stopCollectorHum()
    })
  })

  it('dispose then start is safe', () => {
    assert.doesNotThrow(() => {
      disposeAudio()
      startCollectorHum()
      stopCollectorHum()
    })
  })
})
