import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { advanceTutorial } from '../../src/hooks/useTutorial'
import type { TutorialState, TutorialEvent } from '../../src/hooks/useTutorial'

describe('advanceTutorial', () => {
  const initial: TutorialState = { active: true, step: 'move', frozen: false }

  it('move → shoot on ship-moved', () => {
    const next = advanceTutorial(initial, 'ship-moved')
    assert.deepStrictEqual(next, { active: true, step: 'shoot', frozen: false })
  })

  it('shoot → wait-for-metal on asteroid-hit', () => {
    const state: TutorialState = { active: true, step: 'shoot', frozen: false }
    const next = advanceTutorial(state, 'asteroid-hit')
    assert.deepStrictEqual(next, { active: true, step: 'wait-for-metal', frozen: false })
  })

  it('wait-for-metal → collect on metal-spawned', () => {
    const state: TutorialState = { active: true, step: 'wait-for-metal', frozen: false }
    const next = advanceTutorial(state, 'metal-spawned')
    assert.deepStrictEqual(next, { active: true, step: 'collect', frozen: false })
  })

  it('collect → destroy-enemy on metal-collected', () => {
    const state: TutorialState = { active: true, step: 'collect', frozen: false }
    const next = advanceTutorial(state, 'metal-collected')
    assert.deepStrictEqual(next, { active: true, step: 'destroy-enemy', frozen: false })
  })

  it('destroy-enemy freezes on enemy-nearby', () => {
    const state: TutorialState = { active: true, step: 'destroy-enemy', frozen: false }
    const next = advanceTutorial(state, 'enemy-nearby')
    assert.deepStrictEqual(next, { active: true, step: 'destroy-enemy', frozen: true })
  })

  it('destroy-enemy transitions to collect-scrap on unfreeze', () => {
    const state: TutorialState = { active: true, step: 'destroy-enemy', frozen: true }
    const next = advanceTutorial(state, 'unfreeze')
    assert.deepStrictEqual(next, { active: true, step: 'collect-scrap', frozen: false })
  })

  it('destroy-enemy transitions to collect-scrap on enemy-destroyed', () => {
    const state: TutorialState = { active: true, step: 'destroy-enemy', frozen: false }
    const next = advanceTutorial(state, 'enemy-destroyed')
    assert.deepStrictEqual(next, { active: true, step: 'collect-scrap', frozen: false })
  })

  it('collect-scrap transitions to go-to-station on scrap-collected', () => {
    const state: TutorialState = { active: true, step: 'collect-scrap', frozen: false }
    const next = advanceTutorial(state, 'scrap-collected')
    assert.deepStrictEqual(next, { active: true, step: 'go-to-station', frozen: false })
  })

  it('go-to-station completes on reached-station', () => {
    const state: TutorialState = { active: true, step: 'go-to-station', frozen: false }
    const next = advanceTutorial(state, 'reached-station')
    assert.deepStrictEqual(next, { active: false, step: 'done', frozen: false })
  })

  it('ignores wrong event for current step', () => {
    const state: TutorialState = { active: true, step: 'move', frozen: false }
    const next = advanceTutorial(state, 'asteroid-hit')
    assert.strictEqual(next, state)
  })

  it('ignores events when not active', () => {
    const state: TutorialState = { active: false, step: 'done', frozen: false }
    const next = advanceTutorial(state, 'ship-moved')
    assert.strictEqual(next, state)
  })

  it('ignores enemy-nearby when not active', () => {
    const state: TutorialState = { active: false, step: 'done', frozen: false }
    const next = advanceTutorial(state, 'enemy-nearby')
    assert.strictEqual(next, state)
  })

  it('unfreeze is no-op when destroy-enemy is not frozen', () => {
    const state: TutorialState = { active: true, step: 'destroy-enemy', frozen: false }
    const next = advanceTutorial(state, 'unfreeze')
    assert.strictEqual(next, state)
  })

  it('skip from move', () => {
    const next = advanceTutorial(initial, 'skip')
    assert.deepStrictEqual(next, { active: false, step: 'done', frozen: false })
  })

  it('skip from shoot', () => {
    const state: TutorialState = { active: true, step: 'shoot', frozen: false }
    const next = advanceTutorial(state, 'skip')
    assert.deepStrictEqual(next, { active: false, step: 'done', frozen: false })
  })

  it('skip from wait-for-metal', () => {
    const state: TutorialState = { active: true, step: 'wait-for-metal', frozen: false }
    const next = advanceTutorial(state, 'skip')
    assert.deepStrictEqual(next, { active: false, step: 'done', frozen: false })
  })

  it('skip from collect', () => {
    const state: TutorialState = { active: true, step: 'collect', frozen: false }
    const next = advanceTutorial(state, 'skip')
    assert.deepStrictEqual(next, { active: false, step: 'done', frozen: false })
  })

  it('skip from destroy-enemy (even when frozen)', () => {
    const state: TutorialState = { active: true, step: 'destroy-enemy', frozen: true }
    const next = advanceTutorial(state, 'skip')
    assert.deepStrictEqual(next, { active: false, step: 'done', frozen: false })
  })

  it('skip from collect-scrap', () => {
    const state: TutorialState = { active: true, step: 'collect-scrap', frozen: false }
    const next = advanceTutorial(state, 'skip')
    assert.deepStrictEqual(next, { active: false, step: 'done', frozen: false })
  })

  it('skip from go-to-station', () => {
    const state: TutorialState = { active: true, step: 'go-to-station', frozen: false }
    const next = advanceTutorial(state, 'skip')
    assert.deepStrictEqual(next, { active: false, step: 'done', frozen: false })
  })

  it('returns same reference for no-op transitions', () => {
    const steps: TutorialState['step'][] = [
      'move',
      'shoot',
      'wait-for-metal',
      'collect',
      'destroy-enemy',
      'collect-scrap',
      'go-to-station',
    ]
    const wrongEvents: Record<string, TutorialEvent[]> = {
      move: [
        'asteroid-hit',
        'metal-spawned',
        'metal-collected',
        'enemy-nearby',
        'enemy-destroyed',
        'scrap-collected',
        'reached-station',
        'unfreeze',
      ],
      shoot: [
        'ship-moved',
        'metal-spawned',
        'metal-collected',
        'enemy-nearby',
        'enemy-destroyed',
        'scrap-collected',
        'reached-station',
        'unfreeze',
      ],
      'wait-for-metal': [
        'ship-moved',
        'asteroid-hit',
        'metal-collected',
        'enemy-nearby',
        'enemy-destroyed',
        'scrap-collected',
        'reached-station',
        'unfreeze',
      ],
      collect: [
        'ship-moved',
        'asteroid-hit',
        'metal-spawned',
        'enemy-nearby',
        'enemy-destroyed',
        'scrap-collected',
        'reached-station',
        'unfreeze',
      ],
      'destroy-enemy': [
        'ship-moved',
        'asteroid-hit',
        'metal-spawned',
        'metal-collected',
        'scrap-collected',
        'reached-station',
      ],
      'collect-scrap': [
        'ship-moved',
        'asteroid-hit',
        'metal-spawned',
        'metal-collected',
        'enemy-nearby',
        'enemy-destroyed',
        'reached-station',
        'unfreeze',
      ],
      'go-to-station': [
        'ship-moved',
        'asteroid-hit',
        'metal-spawned',
        'metal-collected',
        'enemy-nearby',
        'enemy-destroyed',
        'scrap-collected',
        'unfreeze',
      ],
    }

    for (const step of steps) {
      const state: TutorialState = { active: true, step, frozen: false }
      for (const event of wrongEvents[step]) {
        const next = advanceTutorial(state, event)
        assert.strictEqual(next, state, `Expected no-op for step=${step}, event=${event}`)
      }
    }
  })

  it('full progression through all steps', () => {
    let state: TutorialState = { active: true, step: 'move', frozen: false }
    state = advanceTutorial(state, 'ship-moved')
    assert.equal(state.step, 'shoot')
    state = advanceTutorial(state, 'asteroid-hit')
    assert.equal(state.step, 'wait-for-metal')
    state = advanceTutorial(state, 'metal-spawned')
    assert.equal(state.step, 'collect')
    state = advanceTutorial(state, 'metal-collected')
    assert.equal(state.step, 'destroy-enemy')
    assert.equal(state.frozen, false)
    state = advanceTutorial(state, 'enemy-nearby')
    assert.equal(state.step, 'destroy-enemy')
    assert.equal(state.frozen, true)
    state = advanceTutorial(state, 'unfreeze')
    assert.equal(state.step, 'collect-scrap')
    assert.equal(state.frozen, false)
    state = advanceTutorial(state, 'scrap-collected')
    assert.equal(state.step, 'go-to-station')
    assert.equal(state.active, true)
    state = advanceTutorial(state, 'reached-station')
    assert.equal(state.step, 'done')
    assert.equal(state.active, false)
    assert.equal(state.frozen, false)
  })
})
