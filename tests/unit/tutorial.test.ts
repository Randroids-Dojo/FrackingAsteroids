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

  it('go-to-station → approach-station on near-station', () => {
    const state: TutorialState = { active: true, step: 'go-to-station', frozen: false }
    const next = advanceTutorial(state, 'near-station')
    assert.deepStrictEqual(next, { active: true, step: 'approach-station', frozen: false })
  })

  it('approach-station → trade-sell on entered-station', () => {
    const state: TutorialState = { active: true, step: 'approach-station', frozen: false }
    const next = advanceTutorial(state, 'entered-station')
    assert.deepStrictEqual(next, { active: true, step: 'trade-sell', frozen: false })
  })

  it('trade-sell → trade-buy on sold-materials', () => {
    const state: TutorialState = { active: true, step: 'trade-sell', frozen: false }
    const next = advanceTutorial(state, 'sold-materials')
    assert.deepStrictEqual(next, { active: true, step: 'trade-buy', frozen: false })
  })

  it('trade-buy → drive-through on bought-upgrade', () => {
    const state: TutorialState = { active: true, step: 'trade-buy', frozen: false }
    const next = advanceTutorial(state, 'bought-upgrade')
    assert.deepStrictEqual(next, { active: true, step: 'drive-through', frozen: false })
  })

  it('drive-through transitions to ambush on drove-through-station', () => {
    const state: TutorialState = { active: true, step: 'drive-through', frozen: false }
    const next = advanceTutorial(state, 'drove-through-station')
    assert.deepStrictEqual(next, { active: true, step: 'ambush', frozen: false })
  })

  it('ambush transitions to ambush-fade on player-killed', () => {
    const state: TutorialState = { active: true, step: 'ambush', frozen: false }
    const next = advanceTutorial(state, 'player-killed')
    assert.deepStrictEqual(next, { active: true, step: 'ambush-fade', frozen: true })
  })

  it('ambush-fade completes on ambush-complete', () => {
    const state: TutorialState = { active: true, step: 'ambush-fade', frozen: true }
    const next = advanceTutorial(state, 'ambush-complete')
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

  it('skip from approach-station', () => {
    const state: TutorialState = { active: true, step: 'approach-station', frozen: false }
    const next = advanceTutorial(state, 'skip')
    assert.deepStrictEqual(next, { active: false, step: 'done', frozen: false })
  })

  it('skip from trade-sell', () => {
    const state: TutorialState = { active: true, step: 'trade-sell', frozen: false }
    const next = advanceTutorial(state, 'skip')
    assert.deepStrictEqual(next, { active: false, step: 'done', frozen: false })
  })

  it('skip from trade-buy', () => {
    const state: TutorialState = { active: true, step: 'trade-buy', frozen: false }
    const next = advanceTutorial(state, 'skip')
    assert.deepStrictEqual(next, { active: false, step: 'done', frozen: false })
  })

  it('skip from drive-through', () => {
    const state: TutorialState = { active: true, step: 'drive-through', frozen: false }
    const next = advanceTutorial(state, 'skip')
    assert.deepStrictEqual(next, { active: false, step: 'done', frozen: false })
  })

  it('skip from ambush', () => {
    const state: TutorialState = { active: true, step: 'ambush', frozen: false }
    const next = advanceTutorial(state, 'skip')
    assert.deepStrictEqual(next, { active: false, step: 'done', frozen: false })
  })

  it('skip from ambush-fade', () => {
    const state: TutorialState = { active: true, step: 'ambush-fade', frozen: true }
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
      'approach-station',
      'trade-sell',
      'trade-buy',
      'drive-through',
      'ambush',
      'ambush-fade',
    ]
    const wrongEvents: Record<string, TutorialEvent[]> = {
      move: [
        'asteroid-hit',
        'metal-spawned',
        'metal-collected',
        'enemy-nearby',
        'enemy-destroyed',
        'scrap-collected',
        'near-station',
        'entered-station',
        'sold-materials',
        'bought-upgrade',
        'drove-through-station',
        'player-killed',
        'ambush-complete',
        'unfreeze',
      ],
      shoot: [
        'ship-moved',
        'metal-spawned',
        'metal-collected',
        'enemy-nearby',
        'enemy-destroyed',
        'scrap-collected',
        'near-station',
        'entered-station',
        'sold-materials',
        'bought-upgrade',
        'drove-through-station',
        'player-killed',
        'ambush-complete',
        'unfreeze',
      ],
      'wait-for-metal': [
        'ship-moved',
        'asteroid-hit',
        'metal-collected',
        'enemy-nearby',
        'enemy-destroyed',
        'scrap-collected',
        'near-station',
        'entered-station',
        'sold-materials',
        'bought-upgrade',
        'drove-through-station',
        'player-killed',
        'ambush-complete',
        'unfreeze',
      ],
      collect: [
        'ship-moved',
        'asteroid-hit',
        'metal-spawned',
        'enemy-nearby',
        'enemy-destroyed',
        'scrap-collected',
        'near-station',
        'entered-station',
        'sold-materials',
        'bought-upgrade',
        'drove-through-station',
        'player-killed',
        'ambush-complete',
        'unfreeze',
      ],
      'destroy-enemy': [
        'ship-moved',
        'asteroid-hit',
        'metal-spawned',
        'metal-collected',
        'scrap-collected',
        'near-station',
        'entered-station',
        'sold-materials',
        'bought-upgrade',
        'drove-through-station',
        'player-killed',
        'ambush-complete',
      ],
      'collect-scrap': [
        'ship-moved',
        'asteroid-hit',
        'metal-spawned',
        'metal-collected',
        'enemy-nearby',
        'enemy-destroyed',
        'near-station',
        'entered-station',
        'sold-materials',
        'bought-upgrade',
        'drove-through-station',
        'player-killed',
        'ambush-complete',
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
        'entered-station',
        'sold-materials',
        'bought-upgrade',
        'drove-through-station',
        'player-killed',
        'ambush-complete',
        'unfreeze',
      ],
      'approach-station': [
        'ship-moved',
        'asteroid-hit',
        'metal-spawned',
        'metal-collected',
        'enemy-nearby',
        'enemy-destroyed',
        'scrap-collected',
        'near-station',
        'sold-materials',
        'bought-upgrade',
        'drove-through-station',
        'player-killed',
        'ambush-complete',
        'unfreeze',
      ],
      'trade-sell': [
        'ship-moved',
        'asteroid-hit',
        'metal-spawned',
        'metal-collected',
        'enemy-nearby',
        'enemy-destroyed',
        'scrap-collected',
        'near-station',
        'entered-station',
        'bought-upgrade',
        'drove-through-station',
        'player-killed',
        'ambush-complete',
        'unfreeze',
      ],
      'trade-buy': [
        'ship-moved',
        'asteroid-hit',
        'metal-spawned',
        'metal-collected',
        'enemy-nearby',
        'enemy-destroyed',
        'scrap-collected',
        'near-station',
        'entered-station',
        'sold-materials',
        'drove-through-station',
        'player-killed',
        'ambush-complete',
        'unfreeze',
      ],
      'drive-through': [
        'ship-moved',
        'asteroid-hit',
        'metal-spawned',
        'metal-collected',
        'enemy-nearby',
        'enemy-destroyed',
        'scrap-collected',
        'near-station',
        'entered-station',
        'sold-materials',
        'bought-upgrade',
        'player-killed',
        'ambush-complete',
        'unfreeze',
      ],
      ambush: [
        'ship-moved',
        'asteroid-hit',
        'metal-spawned',
        'metal-collected',
        'enemy-nearby',
        'enemy-destroyed',
        'scrap-collected',
        'near-station',
        'entered-station',
        'sold-materials',
        'bought-upgrade',
        'drove-through-station',
        'ambush-complete',
        'unfreeze',
      ],
      'ambush-fade': [
        'ship-moved',
        'asteroid-hit',
        'metal-spawned',
        'metal-collected',
        'enemy-nearby',
        'enemy-destroyed',
        'scrap-collected',
        'near-station',
        'entered-station',
        'sold-materials',
        'bought-upgrade',
        'drove-through-station',
        'player-killed',
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
    state = advanceTutorial(state, 'near-station')
    assert.equal(state.step, 'approach-station')
    state = advanceTutorial(state, 'entered-station')
    assert.equal(state.step, 'trade-sell')
    state = advanceTutorial(state, 'sold-materials')
    assert.equal(state.step, 'trade-buy')
    state = advanceTutorial(state, 'bought-upgrade')
    assert.equal(state.step, 'drive-through')
    state = advanceTutorial(state, 'drove-through-station')
    assert.equal(state.step, 'ambush')
    assert.equal(state.active, true)
    state = advanceTutorial(state, 'player-killed')
    assert.equal(state.step, 'ambush-fade')
    assert.equal(state.frozen, true)
    state = advanceTutorial(state, 'ambush-complete')
    assert.equal(state.step, 'done')
    assert.equal(state.active, false)
    assert.equal(state.frozen, false)
  })
})
