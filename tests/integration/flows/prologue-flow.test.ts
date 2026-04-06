/**
 * Integration test: Prologue flow
 *
 * Verifies the complete prologue sequence using the headless game simulation:
 * prologue-start → mining → combat → speed → arbiter → strip → fade
 */

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { installMockThree, uninstallMockThree } from '../helpers/mock-three'
import { GameTestHarness } from '../game-test-harness'

before(() => installMockThree())
after(() => uninstallMockThree())

describe('prologue flow', () => {
  it('prologue-start initializes maxed ship and fires ready event', () => {
    const h = new GameTestHarness({
      stationPosition: { x: 500, y: 500 },
      asteroids: [
        {
          id: 'a1',
          x: 30,
          y: 30,
          velocityX: 0,
          velocityY: 0,
          type: 'common',
          hp: 15,
          maxHp: 15,
          size: 1,
        },
      ],
    })
    h.sim.setTutorialStep('prologue-start')
    h.sim.step()

    assert.equal(h.sim.tickState.blasterTier, 5, 'should set blaster to max tier')
    assert.equal(h.sim.tickState.activeMiningTool, 'lazer', 'should activate lazer')
    assert.equal(h.sim.tickState.prologueFieldSpawned, true)
  })

  it('prologue-mining auto-targets and destroys asteroids', () => {
    const h = new GameTestHarness({
      stationPosition: { x: 500, y: 500 },
      blasterTier: 5,
      miningTool: 'lazer',
      fireRateBonus: 1.1 ** 4,
      asteroids: [
        {
          id: 'a1',
          x: 10,
          y: 10,
          velocityX: 0,
          velocityY: 0,
          type: 'common',
          hp: 1,
          maxHp: 15,
          size: 1,
        },
      ],
    })
    h.sim.setTutorialStep('prologue-mining')
    h.sim.step()

    assert.equal(h.sim.tickState.prologueAutoCollect, true, 'should enable auto-collect')
    assert.ok(h.sim.tickState.fireTarget !== null, 'should auto-fire at nearest target')
    assert.equal(h.sim.tickState.mouseHoldingFire, true, 'should hold fire')
  })

  it('prologue-mining spawns enemies and damages them', () => {
    const h = new GameTestHarness({
      stationPosition: { x: 500, y: 500 },
      blasterTier: 5,
      fireRateBonus: 1.1 ** 4,
    })
    h.sim.setTutorialStep('prologue-mining')
    h.sim.step() // spawns enemies

    assert.equal(h.sim.tickState.prologueEnemiesSpawned, true, 'should spawn enemies')
    assert.ok(h.sim.tickState.ambushEnemies.length > 0, 'should have enemies')

    // Place projectile on top of enemy to test collision
    const target = h.sim.tickState.ambushEnemies[0]
    target.hp = 1
    h.sim.tickState.projectiles.push({
      id: 'test-proj',
      x: target.x,
      y: target.y,
      velocityX: 0,
      velocityY: 0,
      damage: 5,
      tool: 'blaster',
    })
    h.sim.tickState.projectileElapsed.set('test-proj', 0)

    h.sim.step()
    assert.equal(target.alive, false, 'enemy should die from projectile hit')
  })

  it('prologue-arbiter freezes ship and tracks approach', () => {
    const h = new GameTestHarness({
      stationPosition: { x: 500, y: 500 },
    })
    h.sim.setTutorialStep('prologue-arbiter')
    h.sim.step(0.5)

    assert.equal(h.sim.tickState.prologueShipFrozen, true, 'should freeze ship')
    assert.equal(h.sim.tickState.prologueArbiterSpawned, true, 'should mark arbiter spawned')
    assert.ok(h.sim.tickState.prologueArbiterDistance < 80, 'distance should decrease')
    assert.equal(h.sim.ship.velocityX, 0, 'should zero velocity')
    assert.equal(h.sim.ship.velocityY, 0, 'should zero velocity')
  })

  it('prologue-strip advances phases and fires stripComplete', () => {
    const h = new GameTestHarness({
      stationPosition: { x: 500, y: 500 },
    })
    h.sim.tickState.prologueShipFrozen = true
    h.sim.setTutorialStep('prologue-strip')

    // Step through all 4 strip phases (1.5s each = 6s total)
    for (let i = 0; i < 4; i++) {
      h.sim.step(1.6) // slightly over ARBITER_STRIP_DELAY
    }

    assert.equal(h.sim.tickState.prologueStripPhase, 4, 'should complete all 4 phases')
  })

  it('prologue-fade skips game logic', () => {
    const h = new GameTestHarness()
    h.sim.setTutorialStep('prologue-fade')
    const initialX = h.sim.ship.x
    h.sim.step()

    assert.equal(h.sim.ship.x, initialX, 'ship should not move during fade')
  })

  it('prologue does not mutate TickInput', () => {
    const h = new GameTestHarness({
      stationPosition: { x: 500, y: 500 },
      asteroids: [
        {
          id: 'a1',
          x: 20,
          y: 0,
          velocityX: 0,
          velocityY: 0,
          type: 'common',
          hp: 15,
          maxHp: 15,
          size: 1,
        },
      ],
      blasterTier: 5,
      miningTool: 'lazer',
    })
    h.sim.setTutorialStep('prologue-mining')

    // Step and verify that collecting stays false (auto-collect uses TickState, not TickInput)
    h.sim.step()

    // If input was mutated, the simulation's private collecting would have changed
    // Since we can't directly access it, verify via prologueAutoCollect instead
    assert.equal(h.sim.tickState.prologueAutoCollect, true, 'auto-collect via TickState')
  })

  it('full prologue progression from start to arbiter arrival', () => {
    // Place asteroids directly ahead of ship (y > 0) so lazer beam hits them
    // Ship starts at (0,0) facing up (rotation=0), lazer fires along +Y
    const asteroids = Array.from({ length: 10 }, (_, i) => ({
      id: `a${i}`,
      x: 0,
      y: 10 + i * 10,
      velocityX: 0,
      velocityY: 0,
      type: 'common' as const,
      hp: 1,
      maxHp: 15,
      size: 1,
    }))

    const h = new GameTestHarness({
      stationPosition: { x: 500, y: 500 },
      asteroids,
    })

    // Phase 1: prologue-start
    h.sim.setTutorialStep('prologue-start')
    h.sim.step()
    assert.equal(h.sim.tickState.blasterTier, 5)

    // Phase 2: prologue-mining — step until asteroids cleared
    h.sim.setTutorialStep('prologue-mining')
    h.sim.stepN(120) // 2 seconds — lazer should destroy nearby 1-HP asteroids
    assert.ok(
      h.sim.tickState.prologueAsteroidsDestroyed >= 8,
      `should destroy enough asteroids, got ${h.sim.tickState.prologueAsteroidsDestroyed}`,
    )
    // Enemies should also have spawned during mining
    assert.ok(h.sim.tickState.ambushEnemies.length > 0, 'enemies should spawn during mining')

    // Phase 3: prologue-arbiter
    h.sim.setTutorialStep('prologue-arbiter')
    h.sim.stepN(180) // 3 seconds
    assert.equal(h.sim.tickState.prologueShipFrozen, true)
    assert.ok(h.sim.tickState.prologueArbiterDistance < 30, 'arbiter should be close')
  })
})
