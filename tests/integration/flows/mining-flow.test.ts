import { before, after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { installMockThree, uninstallMockThree } from '../helpers/mock-three'

// Install mock BEFORE any game module imports
before(() => installMockThree())
after(() => uninstallMockThree())

describe('mining flow', () => {
  it('fires a projectile that travels toward the target', async () => {
    const { GameTestHarness } = await import('../game-test-harness')
    const h = new GameTestHarness({
      asteroids: [
        {
          id: 'a1',
          x: 50,
          y: 0,
          velocityX: 0,
          velocityY: 0,
          type: 'common',
          hp: 3,
          maxHp: 3,
          size: 3,
        },
      ],
    })

    h.sim.fireAt(50, 0)
    h.sim.step()

    assert.ok(h.sim.projectiles.length > 0, 'should have spawned a projectile')
    assert.equal(h.sim.projectiles[0].tool, 'blaster')
  })

  it('projectile damages asteroid on hit', async () => {
    const { GameTestHarness } = await import('../game-test-harness')
    const h = new GameTestHarness({
      asteroids: [
        {
          id: 'a1',
          x: 10,
          y: 0,
          velocityX: 0,
          velocityY: 0,
          type: 'common',
          hp: 3,
          maxHp: 3,
          size: 3,
        },
      ],
    })

    h.fireAtAsteroid(h.sim.asteroids[0])
    h.assertEventAtLeast('asteroidHit', 1)
    assert.ok(h.sim.asteroids[0].hp < 3, 'asteroid should have taken damage')
  })

  it('destroys asteroid by repeated firing', async () => {
    const { GameTestHarness } = await import('../game-test-harness')
    const h = new GameTestHarness({
      asteroids: [
        {
          id: 'a1',
          x: 10,
          y: 0,
          velocityX: 0,
          velocityY: 0,
          type: 'common',
          hp: 3,
          maxHp: 3,
          size: 3,
        },
      ],
    })

    h.destroyAsteroid(h.sim.asteroids[0])
    h.assertAsteroidDestroyed('a1')
  })

  it('collecting metal near ship picks it up', async () => {
    const { GameTestHarness } = await import('../game-test-harness')
    const h = new GameTestHarness()

    // Spawn metal right next to the ship
    h.sim.spawnMetal(3, 0, 'silver')
    assert.equal(h.sim.metalChunks.length, 1)

    h.sim.startCollecting()
    h.sim.stepN(120)
    h.sim.stopCollecting()

    h.assertEventAtLeast('metalCollected', 1)
    assert.ok(h.sim.events.collected.includes('silver'), 'should have collected silver')
  })

  it('ship-asteroid collision pushes ship away', async () => {
    const { GameTestHarness } = await import('../game-test-harness')
    const h = new GameTestHarness({
      shipPosition: { x: 0, y: 0 },
      asteroids: [
        {
          id: 'a1',
          x: 5,
          y: 0,
          velocityX: 0,
          velocityY: 0,
          type: 'common',
          hp: 10,
          maxHp: 10,
          size: 1,
        },
      ],
    })

    // Move ship toward asteroid
    h.sim.setInput({ right: true })
    h.sim.stepN(30)
    h.sim.clearInput()

    // Ship should not overlap asteroid — it should have been pushed
    const dx = h.sim.ship.x - h.sim.asteroids[0].x
    const dy = h.sim.ship.y - h.sim.asteroids[0].y
    const dist = Math.sqrt(dx * dx + dy * dy)
    assert.ok(dist >= 5, `Ship should not overlap asteroid, dist=${dist.toFixed(2)}`)
  })
})
