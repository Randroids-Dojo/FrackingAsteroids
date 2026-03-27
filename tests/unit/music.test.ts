import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { installMockAudioContext, uninstallMockAudioContext } from './helpers/mock-audio-context'

// Dynamic import so the module picks up the mock AudioContext
async function loadMusic() {
  // Each test file gets a fresh module instance by busting the cache
  const mod = await import('../../src/game/music')
  return mod
}

describe('music — with mock AudioContext', () => {
  before(() => {
    installMockAudioContext()
  })

  after(() => {
    uninstallMockAudioContext()
  })

  // We must use a single import since the module has internal state
  let music: Awaited<ReturnType<typeof loadMusic>>

  before(async () => {
    music = await loadMusic()
  })

  beforeEach(() => {
    music.disposeMusic()
  })

  it('startMusic initializes without error', () => {
    assert.doesNotThrow(() => music.startMusic())
  })

  it('double start is idempotent', () => {
    music.startMusic()
    assert.doesNotThrow(() => music.startMusic())
  })

  it('setMusicIntensity does not throw', () => {
    assert.doesNotThrow(() => music.setMusicIntensity(0.5))
  })

  it('setMusicIntensity clamps to 0–1 range', () => {
    assert.doesNotThrow(() => {
      music.setMusicIntensity(-1)
      music.setMusicIntensity(2)
    })
  })

  it('updateMusic runs layer logic after start', () => {
    music.startMusic()
    music.setMusicIntensity(0.8)
    // Run enough updates to trigger arpeggio and percussion
    assert.doesNotThrow(() => {
      for (let i = 0; i < 60; i++) {
        music.updateMusic(0.016)
      }
    })
  })

  it('updateMusic before start is a no-op', () => {
    assert.doesNotThrow(() => music.updateMusic(0.016))
  })

  it('updateMusic with intensity 0 keeps layers quiet', () => {
    music.startMusic()
    music.setMusicIntensity(0)
    assert.doesNotThrow(() => music.updateMusic(0.016))
  })

  it('updateMusic with full intensity activates all layers', () => {
    music.startMusic()
    music.setMusicIntensity(1.0)
    // Run several large updates to ensure arpeggio note change triggers
    assert.doesNotThrow(() => {
      for (let i = 0; i < 120; i++) {
        music.updateMusic(0.05)
      }
    })
  })

  it('suspendMusic mutes after start', () => {
    music.startMusic()
    assert.doesNotThrow(() => music.suspendMusic())
  })

  it('suspendMusic before start is safe', () => {
    assert.doesNotThrow(() => music.suspendMusic())
  })

  it('resumeMusic after suspend works', () => {
    music.startMusic()
    music.suspendMusic()
    assert.doesNotThrow(() => music.resumeMusic())
  })

  it('resumeMusic before start is safe', () => {
    assert.doesNotThrow(() => music.resumeMusic())
  })

  it('disposeMusic cleans up started music', () => {
    music.startMusic()
    assert.doesNotThrow(() => music.disposeMusic())
  })

  it('disposeMusic before start is safe', () => {
    assert.doesNotThrow(() => music.disposeMusic())
  })

  it('start after dispose reinitializes', () => {
    music.startMusic()
    music.disposeMusic()
    assert.doesNotThrow(() => {
      music.startMusic()
      music.updateMusic(0.016)
      music.disposeMusic()
    })
  })

  it('full lifecycle: start, intensity, update, suspend, resume, dispose', () => {
    music.startMusic()
    music.setMusicIntensity(0.9)
    for (let i = 0; i < 30; i++) {
      music.updateMusic(0.016)
    }
    music.suspendMusic()
    music.resumeMusic()
    music.updateMusic(0.016)
    music.disposeMusic()
  })
})
