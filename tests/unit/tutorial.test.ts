import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { advanceTutorial } from '../../src/hooks/useTutorial'
import type { TutorialState, TutorialEvent } from '../../src/hooks/useTutorial'

describe('advanceTutorial', () => {
  const initial: TutorialState = { active: true, step: 'move' }

  it('move → shoot on ship-moved', () => {
    const next = advanceTutorial(initial, 'ship-moved')
    assert.deepStrictEqual(next, { active: true, step: 'shoot' })
  })

  it('shoot → wait-for-metal on asteroid-hit', () => {
    const state: TutorialState = { active: true, step: 'shoot' }
    const next = advanceTutorial(state, 'asteroid-hit')
    assert.deepStrictEqual(next, { active: true, step: 'wait-for-metal' })
  })

  it('wait-for-metal → collect on metal-spawned', () => {
    const state: TutorialState = { active: true, step: 'wait-for-metal' }
    const next = advanceTutorial(state, 'metal-spawned')
    assert.deepStrictEqual(next, { active: true, step: 'collect' })
  })

  it('collect → done on metal-collected', () => {
    const state: TutorialState = { active: true, step: 'collect' }
    const next = advanceTutorial(state, 'metal-collected')
    assert.deepStrictEqual(next, { active: false, step: 'done' })
  })

  it('ignores wrong event for current step', () => {
    const state: TutorialState = { active: true, step: 'move' }
    const next = advanceTutorial(state, 'asteroid-hit')
    assert.strictEqual(next, state)
  })

  it('ignores events when not active', () => {
    const state: TutorialState = { active: false, step: 'done' }
    const next = advanceTutorial(state, 'ship-moved')
    assert.strictEqual(next, state)
  })

  it('skip from move', () => {
    const next = advanceTutorial(initial, 'skip')
    assert.deepStrictEqual(next, { active: false, step: 'done' })
  })

  it('skip from shoot', () => {
    const state: TutorialState = { active: true, step: 'shoot' }
    const next = advanceTutorial(state, 'skip')
    assert.deepStrictEqual(next, { active: false, step: 'done' })
  })

  it('skip from wait-for-metal', () => {
    const state: TutorialState = { active: true, step: 'wait-for-metal' }
    const next = advanceTutorial(state, 'skip')
    assert.deepStrictEqual(next, { active: false, step: 'done' })
  })

  it('skip from collect', () => {
    const state: TutorialState = { active: true, step: 'collect' }
    const next = advanceTutorial(state, 'skip')
    assert.deepStrictEqual(next, { active: false, step: 'done' })
  })

  it('returns same reference for no-op transitions', () => {
    const steps: TutorialState['step'][] = ['move', 'shoot', 'wait-for-metal', 'collect']
    const wrongEvents: Record<string, TutorialEvent[]> = {
      move: ['asteroid-hit', 'metal-spawned', 'metal-collected'],
      shoot: ['ship-moved', 'metal-spawned', 'metal-collected'],
      'wait-for-metal': ['ship-moved', 'asteroid-hit', 'metal-collected'],
      collect: ['ship-moved', 'asteroid-hit', 'metal-spawned'],
    }

    for (const step of steps) {
      const state: TutorialState = { active: true, step }
      for (const event of wrongEvents[step]) {
        const next = advanceTutorial(state, event)
        assert.strictEqual(next, state, `Expected no-op for step=${step}, event=${event}`)
      }
    }
  })

  it('full progression through all steps', () => {
    let state: TutorialState = { active: true, step: 'move' }
    state = advanceTutorial(state, 'ship-moved')
    assert.equal(state.step, 'shoot')
    state = advanceTutorial(state, 'asteroid-hit')
    assert.equal(state.step, 'wait-for-metal')
    state = advanceTutorial(state, 'metal-spawned')
    assert.equal(state.step, 'collect')
    state = advanceTutorial(state, 'metal-collected')
    assert.equal(state.step, 'done')
    assert.equal(state.active, false)
  })
})
