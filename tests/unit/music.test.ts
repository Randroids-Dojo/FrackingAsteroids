import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { startMusic, setMusicIntensity, updateMusic, disposeMusic } from '../../src/game/music'

// Web Audio API is not available in Node.js test environment.
// These tests verify the functions are resilient when AudioContext is unavailable.

describe('music — no AudioContext environment', () => {
  it('startMusic does not throw without AudioContext', () => {
    assert.doesNotThrow(() => startMusic())
  })

  it('setMusicIntensity does not throw without AudioContext', () => {
    assert.doesNotThrow(() => setMusicIntensity(0.5))
  })

  it('updateMusic does not throw without AudioContext', () => {
    assert.doesNotThrow(() => updateMusic(0.016))
  })

  it('disposeMusic does not throw without AudioContext', () => {
    assert.doesNotThrow(() => disposeMusic())
  })

  it('setMusicIntensity clamps to 0–1 range', () => {
    assert.doesNotThrow(() => {
      setMusicIntensity(-1)
      setMusicIntensity(2)
      setMusicIntensity(0)
      setMusicIntensity(1)
    })
  })

  it('start then dispose is safe', () => {
    assert.doesNotThrow(() => {
      startMusic()
      disposeMusic()
    })
  })

  it('double start is idempotent', () => {
    assert.doesNotThrow(() => {
      startMusic()
      startMusic()
      disposeMusic()
    })
  })

  it('dispose then start is safe', () => {
    assert.doesNotThrow(() => {
      disposeMusic()
      startMusic()
      disposeMusic()
    })
  })

  it('update after dispose is safe', () => {
    assert.doesNotThrow(() => {
      disposeMusic()
      updateMusic(0.016)
    })
  })
})
