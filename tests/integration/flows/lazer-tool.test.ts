import { before, after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { installMockThree, uninstallMockThree } from '../helpers/mock-three'

before(() => installMockThree())
after(() => uninstallMockThree())

describe('lazer tool and crystalline asteroids', () => {
  it('blaster projectile deflects off crystalline asteroid', async () => {
    const { GameTestHarness } = await import('../game-test-harness')
    const h = new GameTestHarness({
      miningTool: 'blaster',
      asteroids: [
        {
          id: 'c1',
          x: 10,
          y: 0,
          velocityX: 0,
          velocityY: 0,
          type: 'crystalline',
          hp: 10,
          maxHp: 10,
          size: 3,
        },
      ],
    })

    h.fireAtAsteroid(h.sim.asteroids[0])

    h.assertEventCount('crystallineDeflect', 1)
    h.assertEventCount('asteroidHit', 0)
    h.assertAsteroidHp('c1', 10) // no damage
  })

  it('lazer projectile damages crystalline asteroid', async () => {
    const { GameTestHarness } = await import('../game-test-harness')
    const h = new GameTestHarness({
      miningTool: 'lazer',
      asteroids: [
        {
          id: 'c1',
          x: 10,
          y: 0,
          velocityX: 0,
          velocityY: 0,
          type: 'crystalline',
          hp: 10,
          maxHp: 10,
          size: 3,
        },
      ],
    })

    h.fireAtAsteroid(h.sim.asteroids[0])

    h.assertEventAtLeast('asteroidHit', 1)
    h.assertEventCount('crystallineDeflect', 0)
    assert.ok(h.sim.asteroids[0].hp < 10, 'crystalline should take damage from lazer')
  })

  it('lazer deals bonus damage to regular asteroids', async () => {
    const { GameTestHarness } = await import('../game-test-harness')

    // Fire blaster at a common asteroid
    const h1 = new GameTestHarness({
      miningTool: 'blaster',
      asteroids: [
        {
          id: 'a1',
          x: 10,
          y: 0,
          velocityX: 0,
          velocityY: 0,
          type: 'common',
          hp: 10,
          maxHp: 10,
          size: 3,
        },
      ],
    })
    h1.fireAtAsteroid(h1.sim.asteroids[0])
    const blasterDamage = 10 - h1.sim.asteroids[0].hp

    // Fire lazer at a common asteroid
    const h2 = new GameTestHarness({
      miningTool: 'lazer',
      asteroids: [
        {
          id: 'a1',
          x: 10,
          y: 0,
          velocityX: 0,
          velocityY: 0,
          type: 'common',
          hp: 10,
          maxHp: 10,
          size: 3,
        },
      ],
    })
    h2.fireAtAsteroid(h2.sim.asteroids[0])
    const lazerDamage = 10 - h2.sim.asteroids[0].hp

    assert.ok(
      lazerDamage > blasterDamage,
      `Lazer (${lazerDamage}) should deal more than blaster (${blasterDamage})`,
    )
  })

  it('sustained lazer fires continuously while held and builds heat', async () => {
    const { GameTestHarness } = await import('../game-test-harness')
    const h = new GameTestHarness({
      miningTool: 'lazer',
      asteroids: [
        {
          id: 'c1',
          x: 10,
          y: 0,
          velocityX: 0,
          velocityY: 0,
          type: 'common',
          hp: 30,
          maxHp: 30,
          size: 3,
        },
      ],
    })

    // Hold fire at the asteroid for 1 second (60 frames)
    h.sim.holdFireAt(h.sim.asteroids[0].x, h.sim.asteroids[0].y)
    h.sim.stepN(60)
    h.sim.releaseFire()

    // Should have hit the asteroid multiple times during sustained fire
    h.assertEventAtLeast('asteroidHit', 1)
    assert.ok(h.sim.asteroids[0].hp < 30, 'sustained lazer should deal damage')
  })

  it('lazer overheats after sustained firing and stops', async () => {
    const { GameTestHarness } = await import('../game-test-harness')
    const { LAZER_MAX_HEAT } = await import('../../../src/game/blaster-constants')
    const h = new GameTestHarness({
      miningTool: 'lazer',
      asteroids: [
        {
          id: 'c1',
          x: 10,
          y: 0,
          velocityX: 0,
          velocityY: 0,
          type: 'common',
          hp: 100,
          maxHp: 100,
          size: 3,
        },
      ],
    })

    // Hold fire for longer than LAZER_MAX_HEAT
    h.sim.holdFireAt(h.sim.asteroids[0].x, h.sim.asteroids[0].y)
    const frames = Math.ceil(LAZER_MAX_HEAT * 60) + 30
    h.sim.stepN(frames)

    // Should be overheated now
    assert.equal(
      h.sim.tickState.lazerState.overheated,
      true,
      'lazer should be overheated after sustained firing',
    )
  })

  it('lazer recovers after cooldown', async () => {
    const { GameTestHarness } = await import('../game-test-harness')
    const { LAZER_MAX_HEAT, LAZER_COOLDOWN_TIME } =
      await import('../../../src/game/blaster-constants')
    const h = new GameTestHarness({
      miningTool: 'lazer',
      asteroids: [
        {
          id: 'c1',
          x: 10,
          y: 0,
          velocityX: 0,
          velocityY: 0,
          type: 'common',
          hp: 100,
          maxHp: 100,
          size: 3,
        },
      ],
    })

    // Overheat the lazer
    h.sim.holdFireAt(h.sim.asteroids[0].x, h.sim.asteroids[0].y)
    h.sim.stepN(Math.ceil(LAZER_MAX_HEAT * 60) + 30)
    h.sim.releaseFire()

    assert.equal(h.sim.tickState.lazerState.overheated, true)

    // Wait for cooldown
    h.sim.stepN(Math.ceil(LAZER_COOLDOWN_TIME * 60) + 10)

    assert.equal(
      h.sim.tickState.lazerState.overheated,
      false,
      'lazer should recover after cooldown',
    )
    assert.equal(h.sim.tickState.lazerState.heat, 0, 'heat should reset to 0')
  })

  it('switching tool from blaster to lazer mid-game works', async () => {
    const { GameTestHarness } = await import('../game-test-harness')
    const h = new GameTestHarness({
      miningTool: 'blaster',
      asteroids: [
        {
          id: 'c1',
          x: 10,
          y: 0,
          velocityX: 0,
          velocityY: 0,
          type: 'crystalline',
          hp: 10,
          maxHp: 10,
          size: 3,
        },
      ],
    })

    // First shot: blaster deflects
    h.fireAtAsteroid(h.sim.asteroids[0])
    h.assertEventCount('crystallineDeflect', 1)
    h.assertAsteroidHp('c1', 10)

    // Wait for blaster cooldown to expire (1 second at tier 1)
    h.sim.stepN(90)

    // Switch to lazer
    h.sim.setMiningTool('lazer')
    h.sim.clearEvents()

    // Second shot: lazer damages
    h.fireAtAsteroid(h.sim.asteroids[0])
    h.assertEventCount('crystallineDeflect', 0)
    h.assertEventAtLeast('asteroidHit', 1)
    assert.ok(h.sim.asteroids[0].hp < 10, 'lazer should now damage crystalline')
  })
})
