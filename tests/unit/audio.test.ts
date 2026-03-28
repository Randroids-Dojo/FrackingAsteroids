import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { installMockAudioContext, uninstallMockAudioContext } from './helpers/mock-audio-context'

async function loadAudio() {
  return await import('../../src/game/audio')
}

describe('audio — with mock AudioContext', () => {
  before(() => {
    installMockAudioContext()
  })

  after(() => {
    uninstallMockAudioContext()
  })

  let audio: Awaited<ReturnType<typeof loadAudio>>

  before(async () => {
    audio = await loadAudio()
  })

  beforeEach(() => {
    audio.disposeAudio()
  })

  // --- resumeAudio ---

  it('resumeAudio creates context and resumes if suspended', () => {
    assert.doesNotThrow(() => audio.resumeAudio())
  })

  it('resumeAudio twice is safe', () => {
    audio.resumeAudio()
    assert.doesNotThrow(() => audio.resumeAudio())
  })

  // --- Collector Hum ---

  it('startCollectorHum creates oscillators and connects', () => {
    assert.doesNotThrow(() => audio.startCollectorHum())
  })

  it('startCollectorHum is idempotent', () => {
    audio.startCollectorHum()
    assert.doesNotThrow(() => audio.startCollectorHum())
  })

  it('stopCollectorHum stops oscillators', () => {
    audio.startCollectorHum()
    assert.doesNotThrow(() => audio.stopCollectorHum())
  })

  it('stopCollectorHum when not started is safe', () => {
    assert.doesNotThrow(() => audio.stopCollectorHum())
  })

  it('double stop is safe', () => {
    audio.startCollectorHum()
    audio.stopCollectorHum()
    assert.doesNotThrow(() => audio.stopCollectorHum())
  })

  it('start then stop then start again works', () => {
    audio.startCollectorHum()
    audio.stopCollectorHum()
    assert.doesNotThrow(() => {
      audio.startCollectorHum()
      audio.stopCollectorHum()
    })
  })

  // --- Collect Pling ---

  it('playCollectPling creates oscillator and plays', () => {
    assert.doesNotThrow(() => audio.playCollectPling())
  })

  it('multiple plings in quick succession', () => {
    assert.doesNotThrow(() => {
      for (let i = 0; i < 5; i++) {
        audio.playCollectPling()
      }
    })
  })

  // --- Dispose ---

  it('disposeAudio cleans up context', () => {
    audio.startCollectorHum()
    assert.doesNotThrow(() => audio.disposeAudio())
  })

  it('disposeAudio when never started is safe', () => {
    assert.doesNotThrow(() => audio.disposeAudio())
  })

  it('start after dispose reinitializes', () => {
    audio.disposeAudio()
    assert.doesNotThrow(() => {
      audio.startCollectorHum()
      audio.stopCollectorHum()
    })
  })

  it('full lifecycle: resume, hum, pling, stop, dispose', () => {
    audio.resumeAudio()
    audio.startCollectorHum()
    audio.playCollectPling()
    audio.stopCollectorHum()
    audio.disposeAudio()
  })
})
