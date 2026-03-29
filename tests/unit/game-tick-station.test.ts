import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { installMockThree, uninstallMockThree } from '../integration/helpers/mock-three'

// Must install mock before importing game modules that transitively import 'three'
before(() => installMockThree())
after(() => uninstallMockThree())

describe('game-tick station proximity tutorial catch-up', () => {
  it('fires nearStation when tutorial is go-to-station and player is already near', async () => {
    const { tick, createTickState } = await import('../../src/game/game-tick')
    const { createInputState } = await import('../../src/game/input')

    const state = createTickState({
      shipPosition: { x: 30, y: 200 },
      stationPosition: { x: 30, y: 200 },
    })
    // Simulate that nearStationFired was already set (player arrived earlier)
    state.nearStationFired = true

    const result = tick(state, {
      dt: 1 / 60,
      paused: false,
      inputState: createInputState(),
      aimWorldPosition: null,
      collecting: false,
      tutorialStep: 'go-to-station',
    })
    assert.strictEqual(result.nearStation, true, 'should fire nearStation for tutorial catch-up')
  })

  it('does not fire nearStation catch-up when tutorial step is not go-to-station', async () => {
    const { tick, createTickState } = await import('../../src/game/game-tick')
    const { createInputState } = await import('../../src/game/input')

    const state = createTickState({
      shipPosition: { x: 30, y: 200 },
      stationPosition: { x: 30, y: 200 },
    })
    state.nearStationFired = true

    const result = tick(state, {
      dt: 1 / 60,
      paused: false,
      inputState: createInputState(),
      aimWorldPosition: null,
      collecting: false,
      tutorialStep: 'collect-scrap',
    })
    assert.strictEqual(result.nearStation, false, 'should not fire nearStation for wrong step')
  })

  it('does not fire nearStation catch-up when player is far from station', async () => {
    const { tick, createTickState } = await import('../../src/game/game-tick')
    const { createInputState } = await import('../../src/game/input')

    const state = createTickState({
      shipPosition: { x: 0, y: 0 },
      stationPosition: { x: 30, y: 200 },
    })
    state.nearStationFired = true

    const result = tick(state, {
      dt: 1 / 60,
      paused: false,
      inputState: createInputState(),
      aimWorldPosition: null,
      collecting: false,
      tutorialStep: 'go-to-station',
    })
    assert.strictEqual(result.nearStation, false, 'should not fire nearStation when far away')
  })
})
