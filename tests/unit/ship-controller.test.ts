import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { updateShip, aimToRotation } from '../../src/game/ship-controller'
import { createInputState } from '../../src/game/input'
import type { AimState } from '../../src/game/input'
import { SHIP_MAX_SPEED } from '../../src/game/ship-constants'

function makeShip() {
  return { x: 0, y: 0, rotation: 0, velocityX: 0, velocityY: 0 }
}

describe('updateShip', () => {
  it('does not move with no input', () => {
    const ship = makeShip()
    const input = createInputState()
    updateShip(ship, input, 1 / 60)
    assert.equal(ship.x, 0)
    assert.equal(ship.y, 0)
  })

  it('accelerates upward when up is pressed', () => {
    const ship = makeShip()
    const input = createInputState()
    input.up = true
    updateShip(ship, input, 1 / 60)
    assert.ok(ship.velocityY > 0, 'velocityY should be positive')
    assert.ok(ship.y > 0, 'y should increase')
  })

  it('accelerates downward when down is pressed', () => {
    const ship = makeShip()
    const input = createInputState()
    input.down = true
    updateShip(ship, input, 1 / 60)
    assert.ok(ship.velocityY < 0, 'velocityY should be negative')
  })

  it('accelerates left when left is pressed', () => {
    const ship = makeShip()
    const input = createInputState()
    input.left = true
    updateShip(ship, input, 1 / 60)
    assert.ok(ship.velocityX < 0, 'velocityX should be negative')
  })

  it('accelerates right when right is pressed', () => {
    const ship = makeShip()
    const input = createInputState()
    input.right = true
    updateShip(ship, input, 1 / 60)
    assert.ok(ship.velocityX > 0, 'velocityX should be positive')
  })

  it('respects max speed', () => {
    const ship = makeShip()
    ship.velocityY = SHIP_MAX_SPEED * 2
    const input = createInputState()
    input.up = true
    updateShip(ship, input, 1 / 60)
    const speed = Math.sqrt(ship.velocityX ** 2 + ship.velocityY ** 2)
    assert.ok(speed <= SHIP_MAX_SPEED + 0.01, `speed ${speed} should be <= ${SHIP_MAX_SPEED}`)
  })

  it('applies friction when no input', () => {
    const ship = makeShip()
    ship.velocityX = 100
    ship.velocityY = 100
    const input = createInputState()
    updateShip(ship, input, 1 / 60)
    assert.ok(ship.velocityX < 100, 'velocityX should decrease')
    assert.ok(ship.velocityY < 100, 'velocityY should decrease')
  })

  it('stops micro-drift below threshold', () => {
    const ship = makeShip()
    ship.velocityX = 0.05
    ship.velocityY = 0.05
    const input = createInputState()
    updateShip(ship, input, 1 / 60)
    assert.equal(ship.velocityX, 0)
    assert.equal(ship.velocityY, 0)
  })

  it('rotates immediately on first frame of input (no speed needed)', () => {
    const ship = makeShip()
    const input = createInputState()
    input.right = true
    // Single frame — ship has zero speed but should still rotate
    updateShip(ship, input, 1 / 60)
    assert.ok(
      Math.abs(ship.rotation - Math.atan2(-1, 0)) < 0.001,
      'should face right on first frame',
    )
  })

  it('falls back to movement direction when no aim rotation', () => {
    const ship = makeShip()
    const input = createInputState()
    input.right = true
    // Multiple frames to build up speed
    for (let i = 0; i < 10; i++) {
      updateShip(ship, input, 1 / 60)
    }
    // Ship faces +Y at rotation=0; rotation.z is CCW in Three.js.
    // Moving right (dx=1) → atan2(-1, 0) = -PI/2 (CW 90°) → faces right
    assert.ok(Math.abs(ship.rotation - Math.atan2(-1, 0)) < 0.001, 'should face right')
  })

  it('faces up-left when moving up-left (not up-right)', () => {
    const ship = makeShip()
    const input = createInputState()
    input.up = true
    input.left = true
    for (let i = 0; i < 10; i++) {
      updateShip(ship, input, 1 / 60)
    }
    // dx=-0.707, dy=0.707 → atan2(0.707, 0.707) = PI/4 (CCW 45° → faces up-left)
    const expected = Math.atan2(1, 1) // PI/4
    assert.ok(
      Math.abs(ship.rotation - expected) < 0.001,
      `rotation ${ship.rotation} should be ~PI/4`,
    )
    assert.ok(ship.rotation > 0, 'rotation should be positive (CCW) for up-left')
  })

  it('uses aim rotation when provided', () => {
    const ship = makeShip()
    const input = createInputState()
    input.right = true
    const aimAngle = 1.234
    for (let i = 0; i < 10; i++) {
      updateShip(ship, input, 1 / 60, aimAngle)
    }
    assert.equal(ship.rotation, aimAngle, 'should face aim direction, not movement direction')
  })

  it('falls back to movement direction when aimRotation is null', () => {
    const ship = makeShip()
    const input = createInputState()
    input.up = true
    for (let i = 0; i < 10; i++) {
      updateShip(ship, input, 1 / 60, null)
    }
    // atan2(0, 1) = 0 — facing up
    assert.ok(Math.abs(ship.rotation) < 0.001, 'should face up (rotation ~0)')
  })

  it('falls back to movement direction when aimRotation is undefined', () => {
    const ship = makeShip()
    const input = createInputState()
    input.up = true
    for (let i = 0; i < 10; i++) {
      updateShip(ship, input, 1 / 60, undefined)
    }
    assert.ok(Math.abs(ship.rotation) < 0.001, 'should face up (rotation ~0)')
  })
})

describe('aimToRotation', () => {
  const identityScreenToWorld = (sx: number, sy: number) => ({ x: sx, y: -sy })

  it('returns null when aim is not active', () => {
    const ship = makeShip()
    const aim: AimState = { active: false, screenX: 100, screenY: 100 }
    const result = aimToRotation(ship, aim, identityScreenToWorld)
    assert.equal(result, null)
  })

  it('returns angle toward aim target', () => {
    const ship = makeShip()
    // Aim to the right (screen x=100, y=0 → world x=100, y=0)
    const aim: AimState = { active: true, screenX: 100, screenY: 0 }
    const result = aimToRotation(ship, aim, identityScreenToWorld)
    assert.ok(result !== null, 'result should not be null')
    // dx=100, dy=0 → atan2(-100, 0) = -PI/2 (CW 90° → faces right)
    const angle: number = result
    assert.ok(Math.abs(angle - -Math.PI / 2) < 0.001)
  })

  it('returns null when cursor is on top of ship', () => {
    const ship = makeShip()
    const aim: AimState = { active: true, screenX: 0.1, screenY: -0.1 }
    const result = aimToRotation(ship, aim, identityScreenToWorld)
    assert.equal(result, null)
  })

  it('accounts for ship position', () => {
    const ship = makeShip()
    ship.x = 50
    ship.y = 50
    // Aim at world (100, -100) relative to ship at (50, 50)
    // dx = 100-50=50, dy = -100-50=-150 → atan2(-50, -150)
    const aim: AimState = { active: true, screenX: 100, screenY: 100 }
    const result = aimToRotation(ship, aim, identityScreenToWorld)
    assert.ok(result !== null, 'result should not be null')
    const expected = Math.atan2(-50, -150)
    const angle: number = result
    assert.ok(Math.abs(angle - expected) < 0.001)
  })
})
