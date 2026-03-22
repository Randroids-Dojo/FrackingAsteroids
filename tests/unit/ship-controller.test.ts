import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { updateShip } from '../../src/game/ship-controller'
import { createInputState } from '../../src/game/input'
import { SHIP_MAX_SPEED, SHIP_ACCELERATION, SHIP_FRICTION } from '../../src/game/ship-constants'

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

  it('updates rotation when moving', () => {
    const ship = makeShip()
    const input = createInputState()
    input.right = true
    // Multiple frames to build up speed
    for (let i = 0; i < 10; i++) {
      updateShip(ship, input, 1 / 60)
    }
    // atan2(1, 0) = PI/2 — facing right
    assert.ok(Math.abs(ship.rotation - Math.atan2(1, 0)) < 0.001, 'should face right')
  })

  it('exports SHIP_ACCELERATION as a positive number', () => {
    assert.ok(SHIP_ACCELERATION > 0)
  })

  it('exports SHIP_MAX_SPEED as a positive number', () => {
    assert.ok(SHIP_MAX_SPEED > 0)
  })

  it('exports SHIP_FRICTION between 0 and 1', () => {
    assert.ok(SHIP_FRICTION > 0 && SHIP_FRICTION < 1)
  })
})
