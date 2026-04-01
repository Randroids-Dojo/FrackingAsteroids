import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { advanceTutorial } from '../../src/hooks/useTutorial'
import type { TutorialState, TutorialEvent } from '../../src/hooks/useTutorial'

describe('advanceTutorial', () => {
  const initial: TutorialState = { active: true, step: 'prologue-start', frozen: false }

  // --- Prologue transitions ---

  it('prologue-start → prologue-mining on prologue-ready', () => {
    const next = advanceTutorial(initial, 'prologue-ready')
    assert.deepStrictEqual(next, { active: true, step: 'prologue-mining', frozen: false })
  })

  it('prologue-mining → prologue-combat on asteroids-cleared', () => {
    const state: TutorialState = { active: true, step: 'prologue-mining', frozen: false }
    const next = advanceTutorial(state, 'asteroids-cleared')
    assert.deepStrictEqual(next, { active: true, step: 'prologue-combat', frozen: false })
  })

  it('prologue-combat → prologue-speed on fleet-destroyed', () => {
    const state: TutorialState = { active: true, step: 'prologue-combat', frozen: false }
    const next = advanceTutorial(state, 'fleet-destroyed')
    assert.deepStrictEqual(next, { active: true, step: 'prologue-speed', frozen: false })
  })

  it('prologue-speed → prologue-arbiter on speed-reached', () => {
    const state: TutorialState = { active: true, step: 'prologue-speed', frozen: false }
    const next = advanceTutorial(state, 'speed-reached')
    assert.deepStrictEqual(next, { active: true, step: 'prologue-arbiter', frozen: false })
  })

  it('prologue-arbiter → prologue-strip on arbiter-arrived', () => {
    const state: TutorialState = { active: true, step: 'prologue-arbiter', frozen: false }
    const next = advanceTutorial(state, 'arbiter-arrived')
    assert.deepStrictEqual(next, { active: true, step: 'prologue-strip', frozen: false })
  })

  it('prologue-strip → prologue-fade on strip-complete', () => {
    const state: TutorialState = { active: true, step: 'prologue-strip', frozen: false }
    const next = advanceTutorial(state, 'strip-complete')
    assert.deepStrictEqual(next, { active: true, step: 'prologue-fade', frozen: false })
  })

  it('prologue-fade → move on prologue-respawn-complete', () => {
    const state: TutorialState = { active: true, step: 'prologue-fade', frozen: false }
    const next = advanceTutorial(state, 'prologue-respawn-complete')
    assert.deepStrictEqual(next, { active: true, step: 'move', frozen: false })
  })

  // --- Tutorial transitions ---

  it('move → shoot on ship-moved', () => {
    const state: TutorialState = { active: true, step: 'move', frozen: false }
    const next = advanceTutorial(state, 'ship-moved')
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

  it('destroy-enemy unfreezes but stays on same step', () => {
    const state: TutorialState = { active: true, step: 'destroy-enemy', frozen: true }
    const next = advanceTutorial(state, 'unfreeze')
    assert.deepStrictEqual(next, { active: true, step: 'destroy-enemy', frozen: false })
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

  it('drive-through completes tutorial on drove-through-station', () => {
    const state: TutorialState = { active: true, step: 'drive-through', frozen: false }
    const next = advanceTutorial(state, 'drove-through-station')
    assert.deepStrictEqual(next, { active: false, step: 'done', frozen: false })
  })

  // --- Skip behavior ---

  it('skip from prologue jumps to move (tutorial start)', () => {
    const state: TutorialState = { active: true, step: 'prologue-mining', frozen: false }
    const next = advanceTutorial(state, 'skip')
    assert.deepStrictEqual(next, { active: true, step: 'move', frozen: false })
  })

  it('skip from prologue-arbiter jumps to move', () => {
    const state: TutorialState = { active: true, step: 'prologue-arbiter', frozen: false }
    const next = advanceTutorial(state, 'skip')
    assert.deepStrictEqual(next, { active: true, step: 'move', frozen: false })
  })

  it('skip from tutorial move completes', () => {
    const state: TutorialState = { active: true, step: 'move', frozen: false }
    const next = advanceTutorial(state, 'skip')
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

  // --- Edge cases ---

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

  it('returns same reference for no-op transitions', () => {
    const steps: TutorialState['step'][] = [
      'prologue-start',
      'prologue-mining',
      'prologue-combat',
      'prologue-speed',
      'prologue-arbiter',
      'prologue-strip',
      'prologue-fade',
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
    ]
    const wrongEvents: Record<string, TutorialEvent[]> = {
      'prologue-start': [
        'asteroids-cleared',
        'fleet-destroyed',
        'speed-reached',
        'arbiter-arrived',
        'strip-complete',
        'prologue-respawn-complete',
        'ship-moved',
      ],
      'prologue-mining': [
        'prologue-ready',
        'fleet-destroyed',
        'speed-reached',
        'arbiter-arrived',
        'strip-complete',
        'prologue-respawn-complete',
        'ship-moved',
      ],
      'prologue-combat': [
        'prologue-ready',
        'asteroids-cleared',
        'speed-reached',
        'arbiter-arrived',
        'strip-complete',
        'prologue-respawn-complete',
        'ship-moved',
      ],
      'prologue-speed': [
        'prologue-ready',
        'asteroids-cleared',
        'fleet-destroyed',
        'arbiter-arrived',
        'strip-complete',
        'prologue-respawn-complete',
        'ship-moved',
      ],
      'prologue-arbiter': [
        'prologue-ready',
        'asteroids-cleared',
        'fleet-destroyed',
        'speed-reached',
        'strip-complete',
        'prologue-respawn-complete',
        'ship-moved',
      ],
      'prologue-strip': [
        'prologue-ready',
        'asteroids-cleared',
        'fleet-destroyed',
        'speed-reached',
        'arbiter-arrived',
        'prologue-respawn-complete',
        'ship-moved',
      ],
      'prologue-fade': [
        'prologue-ready',
        'asteroids-cleared',
        'fleet-destroyed',
        'speed-reached',
        'arbiter-arrived',
        'strip-complete',
        'ship-moved',
      ],
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

  it('full progression through prologue and tutorial', () => {
    // Prologue
    let state: TutorialState = { active: true, step: 'prologue-start', frozen: false }
    state = advanceTutorial(state, 'prologue-ready')
    assert.equal(state.step, 'prologue-mining')
    state = advanceTutorial(state, 'asteroids-cleared')
    assert.equal(state.step, 'prologue-combat')
    state = advanceTutorial(state, 'fleet-destroyed')
    assert.equal(state.step, 'prologue-speed')
    state = advanceTutorial(state, 'speed-reached')
    assert.equal(state.step, 'prologue-arbiter')
    state = advanceTutorial(state, 'arbiter-arrived')
    assert.equal(state.step, 'prologue-strip')
    state = advanceTutorial(state, 'strip-complete')
    assert.equal(state.step, 'prologue-fade')
    state = advanceTutorial(state, 'prologue-respawn-complete')
    assert.equal(state.step, 'move')
    assert.equal(state.active, true)

    // Tutorial
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
    assert.equal(state.step, 'destroy-enemy')
    assert.equal(state.frozen, false)
    state = advanceTutorial(state, 'enemy-destroyed')
    assert.equal(state.step, 'collect-scrap')
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
    assert.equal(state.step, 'done')
    assert.equal(state.active, false)
    assert.equal(state.frozen, false)
  })
})
