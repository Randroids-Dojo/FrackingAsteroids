import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { nextMiningTool } from '../../src/game/types'

describe('nextMiningTool', () => {
  it('does not switch to the Lazer when it is not owned', () => {
    // Toggling from the blaster is a no-op until the Lazer is purchased -
    // this is what keeps the Lazer unavailable after the intro.
    assert.equal(nextMiningTool('blaster', false), 'blaster')
  })

  it('switches to the Lazer when it is owned', () => {
    assert.equal(nextMiningTool('blaster', true), 'lazer')
  })

  it('always allows switching back to the blaster', () => {
    assert.equal(nextMiningTool('lazer', true), 'blaster')
    assert.equal(nextMiningTool('lazer', false), 'blaster')
  })
})
