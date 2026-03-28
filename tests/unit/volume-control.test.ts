import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  getSfxVolume,
  setSfxVolume,
  getMusicVolume,
  setMusicVolume,
} from '../../src/game/volume-control'

describe('volume-control', () => {
  beforeEach(() => {
    setSfxVolume(0.7)
    setMusicVolume(0.5)
  })

  it('default SFX volume is 0.7', () => {
    assert.equal(getSfxVolume(), 0.7)
  })

  it('default music volume is 0.5', () => {
    assert.equal(getMusicVolume(), 0.5)
  })

  it('setSfxVolume updates the value', () => {
    setSfxVolume(0.3)
    assert.equal(getSfxVolume(), 0.3)
  })

  it('setMusicVolume updates the value', () => {
    setMusicVolume(0.8)
    assert.equal(getMusicVolume(), 0.8)
  })

  it('setSfxVolume clamps to 0', () => {
    setSfxVolume(-0.5)
    assert.equal(getSfxVolume(), 0)
  })

  it('setSfxVolume clamps to 1', () => {
    setSfxVolume(1.5)
    assert.equal(getSfxVolume(), 1)
  })

  it('setMusicVolume clamps to 0', () => {
    setMusicVolume(-1)
    assert.equal(getMusicVolume(), 0)
  })

  it('setMusicVolume clamps to 1', () => {
    setMusicVolume(2)
    assert.equal(getMusicVolume(), 1)
  })

  it('setSfxVolume to 0 mutes SFX', () => {
    setSfxVolume(0)
    assert.equal(getSfxVolume(), 0)
  })

  it('setMusicVolume to 0 mutes music', () => {
    setMusicVolume(0)
    assert.equal(getMusicVolume(), 0)
  })
})
