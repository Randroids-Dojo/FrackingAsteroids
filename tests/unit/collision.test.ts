import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveShipAsteroidCollision,
  checkProjectileAsteroidCollisions,
} from '../../src/game/collision'
import {
  SHIP_COLLISION_RADIUS,
  ASTEROID_COLLISION_RADIUS,
  COLLISION_PUSH_BUFFER,
} from '../../src/game/collision-constants'
import type { Asteroid } from '../../src/game/types'

function makeShip(x = 0, y = 0) {
  return { x, y, rotation: 0, velocityX: 0, velocityY: 0 }
}

function makeAsteroid(overrides: Partial<Asteroid> = {}): Asteroid {
  return {
    id: 'a1',
    x: 0,
    y: 0,
    velocityX: 0,
    velocityY: 0,
    type: 'common',
    hp: 3,
    maxHp: 3,
    size: 1,
    ...overrides,
  }
}

describe('resolveShipAsteroidCollision', () => {
  it('returns false when ship is far from asteroid', () => {
    const ship = makeShip(100, 100)
    const asteroid = makeAsteroid({ x: 0, y: 0 })
    assert.equal(resolveShipAsteroidCollision(ship, asteroid), false)
  })

  it('returns true and pushes ship out when overlapping', () => {
    const minDist = SHIP_COLLISION_RADIUS + ASTEROID_COLLISION_RADIUS
    const ship = makeShip(minDist - 1, 0)
    const asteroid = makeAsteroid({ x: 0, y: 0 })
    const result = resolveShipAsteroidCollision(ship, asteroid)
    assert.equal(result, true)
    // Ship should be pushed out to at least minDist + buffer
    const dist = Math.sqrt(ship.x ** 2 + ship.y ** 2)
    assert.ok(dist >= minDist + COLLISION_PUSH_BUFFER - 0.001)
  })

  it('cancels velocity toward asteroid', () => {
    const minDist = SHIP_COLLISION_RADIUS + ASTEROID_COLLISION_RADIUS
    const ship = makeShip(minDist - 1, 0)
    ship.velocityX = -50 // moving toward asteroid at origin
    ship.velocityY = 0
    const asteroid = makeAsteroid({ x: 0, y: 0 })
    resolveShipAsteroidCollision(ship, asteroid)
    // Velocity toward asteroid (negative X) should be zeroed
    assert.ok(
      ship.velocityX >= 0,
      `velocityX should not point toward asteroid, got ${ship.velocityX}`,
    )
  })

  it('preserves velocity away from asteroid', () => {
    const minDist = SHIP_COLLISION_RADIUS + ASTEROID_COLLISION_RADIUS
    const ship = makeShip(minDist - 1, 0)
    ship.velocityX = 50 // moving away from asteroid
    ship.velocityY = 20
    const asteroid = makeAsteroid({ x: 0, y: 0 })
    resolveShipAsteroidCollision(ship, asteroid)
    assert.equal(ship.velocityX, 50)
    assert.equal(ship.velocityY, 20)
  })

  it('handles ship exactly on asteroid center', () => {
    const ship = makeShip(0, 0)
    const asteroid = makeAsteroid({ x: 0, y: 0 })
    const result = resolveShipAsteroidCollision(ship, asteroid)
    assert.equal(result, true)
    const dist = Math.sqrt(ship.x ** 2 + ship.y ** 2)
    assert.ok(dist > 0, 'ship should be pushed away')
  })

  it('returns false when ship is exactly at the boundary', () => {
    const minDist = SHIP_COLLISION_RADIUS + ASTEROID_COLLISION_RADIUS
    const ship = makeShip(minDist, 0)
    const asteroid = makeAsteroid({ x: 0, y: 0 })
    assert.equal(resolveShipAsteroidCollision(ship, asteroid), false)
  })

  it('works with diagonal collision', () => {
    const ship = makeShip(5, 5)
    const asteroid = makeAsteroid({ x: 0, y: 0 })
    const result = resolveShipAsteroidCollision(ship, asteroid)
    assert.equal(result, true)
    // Ship should be pushed along the diagonal
    assert.ok(ship.x > 5)
    assert.ok(ship.y > 5)
  })
})

describe('checkProjectileAsteroidCollisions', () => {
  it('returns all projectiles as surviving when no asteroids', () => {
    const projectiles = [
      { id: 'p1', x: 0, y: 0, velocityX: 100, velocityY: 0, damage: 1, tool: 'blaster' as const },
    ]
    const { surviving, hits } = checkProjectileAsteroidCollisions(projectiles, [])
    assert.equal(surviving.length, 1)
    assert.equal(hits.length, 0)
  })

  it('returns all projectiles as surviving when far from asteroids', () => {
    const projectiles = [
      {
        id: 'p1',
        x: 100,
        y: 100,
        velocityX: 100,
        velocityY: 0,
        damage: 1,
        tool: 'blaster' as const,
      },
    ]
    const asteroids = [makeAsteroid({ x: 0, y: 0 })]
    const { surviving, hits } = checkProjectileAsteroidCollisions(projectiles, asteroids)
    assert.equal(surviving.length, 1)
    assert.equal(hits.length, 0)
  })

  it('detects hit when projectile overlaps asteroid', () => {
    const projectiles = [
      { id: 'p1', x: 5, y: 0, velocityX: 100, velocityY: 0, damage: 1, tool: 'blaster' as const },
    ]
    const asteroids = [makeAsteroid({ x: 0, y: 0, hp: 3, maxHp: 3 })]
    const { surviving, hits } = checkProjectileAsteroidCollisions(projectiles, asteroids)
    assert.equal(surviving.length, 0)
    assert.equal(hits.length, 1)
    assert.equal(hits[0].projectileId, 'p1')
    assert.equal(hits[0].asteroidId, 'a1')
  })

  it('reduces asteroid HP on hit', () => {
    const projectiles = [
      { id: 'p1', x: 5, y: 0, velocityX: 100, velocityY: 0, damage: 2, tool: 'blaster' as const },
    ]
    const asteroids = [makeAsteroid({ x: 0, y: 0, hp: 3, maxHp: 3 })]
    checkProjectileAsteroidCollisions(projectiles, asteroids)
    assert.equal(asteroids[0].hp, 1)
  })

  it('does not reduce HP below zero', () => {
    const projectiles = [
      { id: 'p1', x: 5, y: 0, velocityX: 100, velocityY: 0, damage: 10, tool: 'blaster' as const },
    ]
    const asteroids = [makeAsteroid({ x: 0, y: 0, hp: 3, maxHp: 3 })]
    checkProjectileAsteroidCollisions(projectiles, asteroids)
    assert.equal(asteroids[0].hp, 0)
  })

  it('skips dead asteroids', () => {
    const projectiles = [
      { id: 'p1', x: 5, y: 0, velocityX: 100, velocityY: 0, damage: 1, tool: 'blaster' as const },
    ]
    const asteroids = [makeAsteroid({ x: 0, y: 0, hp: 0, maxHp: 3 })]
    const { surviving, hits } = checkProjectileAsteroidCollisions(projectiles, asteroids)
    assert.equal(surviving.length, 1)
    assert.equal(hits.length, 0)
  })

  it('one projectile hits only one asteroid', () => {
    const projectiles = [
      { id: 'p1', x: 0, y: 0, velocityX: 100, velocityY: 0, damage: 1, tool: 'blaster' as const },
    ]
    const asteroids = [
      makeAsteroid({ id: 'a1', x: 0, y: 0, hp: 3 }),
      makeAsteroid({ id: 'a2', x: 0, y: 0, hp: 3 }),
    ]
    const { hits } = checkProjectileAsteroidCollisions(projectiles, asteroids)
    assert.equal(hits.length, 1)
  })

  it('multiple projectiles can hit different asteroids', () => {
    const projectiles = [
      { id: 'p1', x: 0, y: 0, velocityX: 100, velocityY: 0, damage: 1, tool: 'blaster' as const },
      { id: 'p2', x: 50, y: 0, velocityX: 100, velocityY: 0, damage: 1, tool: 'blaster' as const },
    ]
    const asteroids = [
      makeAsteroid({ id: 'a1', x: 0, y: 0, hp: 3 }),
      makeAsteroid({ id: 'a2', x: 50, y: 0, hp: 3 }),
    ]
    const { surviving, hits } = checkProjectileAsteroidCollisions(projectiles, asteroids)
    assert.equal(surviving.length, 0)
    assert.equal(hits.length, 2)
  })

  it('hit contains correct position', () => {
    const projectiles = [
      { id: 'p1', x: 7, y: 3, velocityX: 100, velocityY: 0, damage: 1, tool: 'blaster' as const },
    ]
    const asteroids = [makeAsteroid({ x: 0, y: 0 })]
    const { hits } = checkProjectileAsteroidCollisions(projectiles, asteroids)
    assert.equal(hits[0].x, 7)
    assert.equal(hits[0].y, 3)
  })

  it('hit contains correct damage', () => {
    const projectiles = [
      { id: 'p1', x: 5, y: 0, velocityX: 100, velocityY: 0, damage: 2, tool: 'blaster' as const },
    ]
    const asteroids = [makeAsteroid({ x: 0, y: 0 })]
    const { hits } = checkProjectileAsteroidCollisions(projectiles, asteroids)
    assert.equal(hits[0].damage, 2)
  })

  it('deflects blaster projectile off crystalline asteroid', () => {
    const projectiles = [
      { id: 'p1', x: 5, y: 0, velocityX: 100, velocityY: 0, damage: 2, tool: 'blaster' as const },
    ]
    const asteroids = [makeAsteroid({ x: 0, y: 0, type: 'crystalline', hp: 30, maxHp: 30 })]
    const { surviving, hits } = checkProjectileAsteroidCollisions(projectiles, asteroids)
    assert.equal(surviving.length, 0)
    assert.equal(hits.length, 1)
    assert.equal(hits[0].deflected, true)
    assert.equal(hits[0].damage, 0)
    assert.equal(asteroids[0].hp, 30, 'crystalline HP should be unchanged')
  })

  it('lazer damages crystalline asteroids', () => {
    const projectiles = [
      { id: 'p1', x: 5, y: 0, velocityX: 100, velocityY: 0, damage: 2, tool: 'lazer' as const },
    ]
    const asteroids = [makeAsteroid({ x: 0, y: 0, type: 'crystalline', hp: 30, maxHp: 30 })]
    const { hits } = checkProjectileAsteroidCollisions(projectiles, asteroids)
    assert.equal(hits[0].deflected, undefined)
    assert.equal(hits[0].damage, 3) // 2 * 1.5 = 3 (ceiling)
    assert.equal(asteroids[0].hp, 27)
  })

  it('lazer deals bonus damage to regular asteroids', () => {
    const projectiles = [
      { id: 'p1', x: 5, y: 0, velocityX: 100, velocityY: 0, damage: 2, tool: 'lazer' as const },
    ]
    const asteroids = [makeAsteroid({ x: 0, y: 0, hp: 10, maxHp: 10 })]
    const { hits } = checkProjectileAsteroidCollisions(projectiles, asteroids)
    assert.equal(hits[0].damage, 3) // 2 * 1.5 = 3
    assert.equal(asteroids[0].hp, 7)
  })
})
