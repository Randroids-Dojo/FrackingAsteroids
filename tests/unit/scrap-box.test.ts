import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { installMockThree, uninstallMockThree } from '../integration/helpers/mock-three'

// Must install mock before importing game modules that transitively import 'three'
before(() => installMockThree())
after(() => uninstallMockThree())

function makeShip(x = 0, y = 0) {
  return { x, y, rotation: 0, velocityX: 0, velocityY: 0 }
}

describe('scrap-box', () => {
  describe('createScrapBox', () => {
    it('creates a scrap box at the given position', async () => {
      const { createScrapBox, resetScrapBoxIdCounter } = await import('../../src/game/scrap-box')
      resetScrapBoxIdCounter()
      const box = createScrapBox(10, 20)
      assert.equal(box.x, 10)
      assert.equal(box.y, 20)
      assert.equal(box.mesh.position.x, 10)
      assert.equal(box.mesh.position.y, 20)
    })

    it('assigns sequential IDs', async () => {
      const { createScrapBox, resetScrapBoxIdCounter } = await import('../../src/game/scrap-box')
      resetScrapBoxIdCounter()
      const b1 = createScrapBox(0, 0)
      const b2 = createScrapBox(0, 0)
      assert.equal(b1.id, 'scrap-box-0')
      assert.equal(b2.id, 'scrap-box-1')
    })

    it('creates a mesh group with voxel children', async () => {
      const mod = await import('../../src/game/scrap-box')
      const box = mod.createScrapBox(0, 0)
      assert.ok(box.mesh.children.length > 0, 'should have voxel children')
    })

    it('assigns random drift velocity', async () => {
      const { createScrapBox } = await import('../../src/game/scrap-box')
      const box = createScrapBox(0, 0)
      const speed = Math.sqrt(box.vx ** 2 + box.vy ** 2)
      assert.ok(speed >= 3, `speed should be at least 3, got ${speed}`)
      assert.ok(speed <= 7, `speed should be at most 7, got ${speed}`)
    })

    it('assigns a rotation speed', async () => {
      const { createScrapBox } = await import('../../src/game/scrap-box')
      const box = createScrapBox(0, 0)
      assert.equal(typeof box.rotSpeed, 'number')
    })
  })

  describe('updateScrapBox', () => {
    it('applies friction to velocity', async () => {
      const { createScrapBox, updateScrapBox } = await import('../../src/game/scrap-box')
      const box = createScrapBox(0, 0)
      const vxBefore = box.vx
      updateScrapBox(box, 1 / 60)
      assert.ok(Math.abs(box.vx) < Math.abs(vxBefore), 'velocity should decrease from friction')
    })

    it('moves the box by velocity * dt', async () => {
      const { createScrapBox, updateScrapBox } = await import('../../src/game/scrap-box')
      const box = createScrapBox(0, 0)
      // Force known velocity
      box.vx = 60
      box.vy = 0
      const startX = box.x
      updateScrapBox(box, 1 / 60)
      assert.ok(box.x > startX, 'x should increase')
    })

    it('updates mesh position to match box position', async () => {
      const { createScrapBox, updateScrapBox } = await import('../../src/game/scrap-box')
      const box = createScrapBox(5, 10)
      box.vx = 10
      box.vy = 20
      updateScrapBox(box, 1 / 60)
      assert.equal(box.mesh.position.x, box.x)
      assert.equal(box.mesh.position.y, box.y)
    })

    it('rotates the mesh', async () => {
      const { createScrapBox, updateScrapBox } = await import('../../src/game/scrap-box')
      const box = createScrapBox(0, 0)
      box.rotSpeed = 2
      const rotZBefore = box.mesh.rotation.z
      const rotXBefore = box.mesh.rotation.x
      updateScrapBox(box, 1 / 60)
      assert.notEqual(box.mesh.rotation.z, rotZBefore, 'rotation.z should change')
      assert.notEqual(box.mesh.rotation.x, rotXBefore, 'rotation.x should change')
    })
  })

  describe('attractScrapBoxToShip', () => {
    it('returns false when box is outside collector range', async () => {
      const { createScrapBox, attractScrapBoxToShip } = await import('../../src/game/scrap-box')
      const box = createScrapBox(0, 0)
      box.x = 1000
      box.y = 0
      box.vx = 0
      box.vy = 0
      const ship = makeShip(0, 0)
      assert.equal(attractScrapBoxToShip(box, ship, 1 / 60), false)
    })

    it('does not modify velocity when out of range', async () => {
      const { createScrapBox, attractScrapBoxToShip } = await import('../../src/game/scrap-box')
      const box = createScrapBox(0, 0)
      box.x = 1000
      box.y = 0
      box.vx = 5
      box.vy = 3
      const ship = makeShip(0, 0)
      attractScrapBoxToShip(box, ship, 1 / 60)
      assert.equal(box.vx, 5)
      assert.equal(box.vy, 3)
    })

    it('returns true when box is close enough to collect', async () => {
      const { createScrapBox, attractScrapBoxToShip, SCRAP_BOX_RADIUS } =
        await import('../../src/game/scrap-box')
      const { SHIP_COLLISION_RADIUS } = await import('../../src/game/collision-constants')
      const box = createScrapBox(0, 0)
      const collectDist = SCRAP_BOX_RADIUS + SHIP_COLLISION_RADIUS
      box.x = collectDist - 0.5
      box.y = 0
      box.vx = 0
      box.vy = 0
      const ship = makeShip(0, 0)
      assert.equal(attractScrapBoxToShip(box, ship, 1 / 60), true)
    })

    it('accelerates box toward ship when in range but not close enough', async () => {
      const { createScrapBox, attractScrapBoxToShip } = await import('../../src/game/scrap-box')
      const { COLLECTOR_RANGE } = await import('../../src/game/metal-chunk')
      const box = createScrapBox(0, 0)
      box.x = COLLECTOR_RANGE * 0.5
      box.y = 0
      box.vx = 0
      box.vy = 0
      const ship = makeShip(0, 0)
      const result = attractScrapBoxToShip(box, ship, 1 / 60)
      assert.equal(result, false)
      assert.ok(box.vx < 0, `vx should be negative (toward ship at origin), got ${box.vx}`)
    })

    it('pull is stronger when closer', async () => {
      const { createScrapBox, attractScrapBoxToShip, SCRAP_BOX_RADIUS } =
        await import('../../src/game/scrap-box')
      const { COLLECTOR_RANGE } = await import('../../src/game/metal-chunk')
      const { SHIP_COLLISION_RADIUS } = await import('../../src/game/collision-constants')
      const collectDist = SCRAP_BOX_RADIUS + SHIP_COLLISION_RADIUS
      const nearDist = collectDist + (COLLECTOR_RANGE - collectDist) * 0.3
      const farDist = collectDist + (COLLECTOR_RANGE - collectDist) * 0.8

      const boxFar = createScrapBox(0, 0)
      boxFar.x = farDist
      boxFar.y = 0
      boxFar.vx = 0
      boxFar.vy = 0

      const boxNear = createScrapBox(0, 0)
      boxNear.x = nearDist
      boxNear.y = 0
      boxNear.vx = 0
      boxNear.vy = 0

      const ship = makeShip(0, 0)
      attractScrapBoxToShip(boxFar, ship, 1 / 60)
      attractScrapBoxToShip(boxNear, ship, 1 / 60)
      assert.ok(Math.abs(boxNear.vx) > Math.abs(boxFar.vx), 'closer box should be pulled harder')
    })

    it('clamps speed to 100', async () => {
      const { createScrapBox, attractScrapBoxToShip } = await import('../../src/game/scrap-box')
      const { COLLECTOR_RANGE } = await import('../../src/game/metal-chunk')
      const box = createScrapBox(0, 0)
      // Place box in range with very high velocity
      box.x = COLLECTOR_RANGE * 0.5
      box.y = 0
      box.vx = -200
      box.vy = 0
      const ship = makeShip(0, 0)
      attractScrapBoxToShip(box, ship, 1)
      const speed = Math.sqrt(box.vx ** 2 + box.vy ** 2)
      assert.ok(speed <= 100 + 0.001, `speed should be clamped to 100, got ${speed}`)
    })
  })

  describe('disposeScrapBox', () => {
    it('disposes geometry and material of all mesh children', async () => {
      const { createScrapBox, disposeScrapBox } = await import('../../src/game/scrap-box')
      const box = createScrapBox(0, 0)
      assert.ok(box.mesh.children.length > 0, 'should have children to dispose')
      // Should not throw
      disposeScrapBox(box)
    })
  })

  describe('resetScrapBoxIdCounter', () => {
    it('resets the ID counter so next box starts at 0', async () => {
      const { createScrapBox, resetScrapBoxIdCounter } = await import('../../src/game/scrap-box')
      // Create a couple boxes to increment counter
      createScrapBox(0, 0)
      createScrapBox(0, 0)
      resetScrapBoxIdCounter()
      const box = createScrapBox(0, 0)
      assert.equal(box.id, 'scrap-box-0')
    })
  })

  describe('constants', () => {
    it('SCRAP_BOX_RADIUS is 2.0', async () => {
      const { SCRAP_BOX_RADIUS } = await import('../../src/game/scrap-box')
      assert.equal(SCRAP_BOX_RADIUS, 2.0)
    })

    it('SCRAP_BOX_VALUE is 10', async () => {
      const { SCRAP_BOX_VALUE } = await import('../../src/game/scrap-box')
      assert.equal(SCRAP_BOX_VALUE, 10)
    })
  })
})
