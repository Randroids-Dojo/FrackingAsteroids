import { before, after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { installMockThree, uninstallMockThree } from '../helpers/mock-three'

before(() => installMockThree())
after(() => uninstallMockThree())

describe('pause/resume and fire state', () => {
  it('clears stale mouseHoldingFire on unpause to prevent rotation lock', async () => {
    const { GameTestHarness } = await import('../game-test-harness')
    const h = new GameTestHarness()

    // Player holds fire aimed far away (no asteroid to hit)
    h.sim.holdFireAt(0, 200)
    h.sim.step()
    assert.ok(h.sim.projectiles.length > 0, 'should have fired a projectile')

    // Popup freezes the game (like the lazer tutorial popup)
    h.sim.paused = true
    h.sim.stepN(5) // paused frames

    // Player clicks to dismiss popup — mouseup never reached canvas
    // so holdFireAt is still "active" from before pause.
    // The game unpauses:
    h.sim.paused = false

    // Wait for cooldown to expire and any in-flight projectiles to despawn
    h.sim.stepN(120)
    const projCountAfterSettle = h.sim.projectiles.length

    // Step more frames — if mouseHoldingFire was cleared, no new projectiles appear
    h.sim.stepN(60)
    assert.equal(
      h.sim.projectiles.length,
      projCountAfterSettle,
      'no new projectiles should be fired from stale hold-fire state after unpause',
    )
  })

  it('game does not advance while paused', async () => {
    const { GameTestHarness } = await import('../game-test-harness')
    const h = new GameTestHarness({
      shipPosition: { x: 0, y: 0 },
    })

    h.sim.setInput({ up: true })
    h.sim.paused = true
    h.sim.stepN(60)

    h.assertShipNear(0, 0, 0.1) // should not have moved
  })

  it('game does not advance while frozen', async () => {
    const { GameTestHarness } = await import('../game-test-harness')
    const h = new GameTestHarness({
      shipPosition: { x: 0, y: 0 },
    })

    h.sim.setInput({ up: true })
    h.sim.frozen = true
    h.sim.stepN(60)

    h.assertShipNear(0, 0, 0.1)
  })

  it('clears stale aimState on unpause so ship rotation is not locked', async () => {
    const { GameTestHarness } = await import('../game-test-harness')
    const h = new GameTestHarness({
      shipPosition: { x: 0, y: 0 },
    })

    // Player aims right (ship faces right)
    h.sim.aimAt(100, 0)
    h.sim.stepN(5)
    const rotationBeforePause = h.sim.ship.rotation

    // Popup pauses the game (e.g. lazer tutorial)
    h.sim.paused = true
    h.sim.stepN(5)

    // Player clicks empty space to dismiss — aimState still has stale coords
    // Game unpauses:
    h.sim.paused = false

    // Player moves up (without moving the mouse, so no new aimAt call)
    h.sim.setInput({ up: true })
    h.sim.stepN(30)

    // Ship rotation should follow movement direction (up), NOT the stale aim (right).
    // aimState.active should have been cleared on unpause.
    // atan2(-dx, dy) for movement up: atan2(0, 1) = 0
    const rotationAfterResume = h.sim.ship.rotation
    assert.notEqual(
      rotationAfterResume,
      rotationBeforePause,
      `Ship rotation should not be locked to pre-pause aim (rotation=${rotationBeforePause.toFixed(3)})`,
    )
  })

  it('game resumes normally after unpausing', async () => {
    const { GameTestHarness } = await import('../game-test-harness')
    const h = new GameTestHarness({
      shipPosition: { x: 0, y: 0 },
    })

    // Pause, try to move
    h.sim.paused = true
    h.sim.setInput({ up: true })
    h.sim.stepN(30)
    h.assertShipNear(0, 0, 0.1)

    // Unpause, ship should start moving
    h.sim.paused = false
    h.sim.stepN(30)

    assert.ok(h.sim.ship.y > 1, `Ship should have moved up, y=${h.sim.ship.y.toFixed(2)}`)
  })
})
