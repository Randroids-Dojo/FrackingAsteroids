import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  SHIP_COLLISION_RADIUS,
  ASTEROID_COLLISION_RADIUS,
  COLLISION_PUSH_BUFFER,
} from '../../src/game/collision-constants'

describe('collision constants', () => {
  it('SHIP_COLLISION_RADIUS is positive', () => {
    assert.ok(SHIP_COLLISION_RADIUS > 0)
  })

  it('ASTEROID_COLLISION_RADIUS is positive', () => {
    assert.ok(ASTEROID_COLLISION_RADIUS > 0)
  })

  it('ASTEROID_COLLISION_RADIUS is larger than SHIP_COLLISION_RADIUS', () => {
    assert.ok(ASTEROID_COLLISION_RADIUS > SHIP_COLLISION_RADIUS)
  })

  it('COLLISION_PUSH_BUFFER is positive', () => {
    assert.ok(COLLISION_PUSH_BUFFER > 0)
  })
})
