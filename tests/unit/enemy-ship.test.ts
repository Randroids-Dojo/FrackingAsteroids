import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { installMockThree, uninstallMockThree } from '../integration/helpers/mock-three'

before(() => installMockThree())
after(() => uninstallMockThree())

function makeShip(x = 0, y = 0) {
  return { x, y, rotation: 0, velocityX: 0, velocityY: 0 }
}

describe('enemy-ship', () => {
  // ---------------------------------------------------------------------------
  // createEnemyShip
  // ---------------------------------------------------------------------------
  describe('createEnemyShip', () => {
    it('creates an enemy at the given position', async () => {
      const { createEnemyShip } = await import('../../src/game/enemy-ship')
      const enemy = createEnemyShip(100, 0)
      assert.equal(enemy.x, 100)
      assert.equal(enemy.y, 0)
      assert.equal(enemy.alive, true)
      assert.equal(enemy.maxHp, 3)
      assert.equal(enemy.hp, Math.ceil(3 / 2))
      assert.equal(enemy.vx, 0)
      assert.equal(enemy.vy, 0)
      assert.equal(enemy.rotation, 0)
      assert.equal(enemy.idling, false)
    })

    it('sets mesh position to the spawn coordinates', async () => {
      const { createEnemyShip } = await import('../../src/game/enemy-ship')
      const enemy = createEnemyShip(50, -30)
      assert.equal(enemy.mesh.position.x, 50)
      assert.equal(enemy.mesh.position.y, -30)
    })

    it('picks a cardinal angle based on spawn position', async () => {
      const { createEnemyShip } = await import('../../src/game/enemy-ship')
      // Spawning at +X should pick cardinal 0 (3 o'clock)
      const enemy = createEnemyShip(120, 0)
      assert.equal(enemy.targetCardinal, 0)
    })

    it('initializes strafe direction as +1 or -1', async () => {
      const { createEnemyShip } = await import('../../src/game/enemy-ship')
      const enemy = createEnemyShip(0, 120)
      assert.ok(enemy.strafeDir === 1 || enemy.strafeDir === -1)
    })

    it('creates mesh with voxel children', async () => {
      const { createEnemyShip } = await import('../../src/game/enemy-ship')
      const enemy = createEnemyShip(0, 0)
      assert.ok(enemy.mesh.children.length > 0, 'should have voxel children')
    })
  })

  // ---------------------------------------------------------------------------
  // updateEnemyShip
  // ---------------------------------------------------------------------------
  describe('updateEnemyShip', () => {
    it('returns empty array when enemy is not alive', async () => {
      const { createEnemyShip, updateEnemyShip } = await import('../../src/game/enemy-ship')
      const enemy = createEnemyShip(100, 0)
      enemy.alive = false
      const result = updateEnemyShip(enemy, makeShip(), 1 / 60)
      assert.deepEqual(result, [])
    })

    it('moves enemy when far away from player', async () => {
      const { createEnemyShip, updateEnemyShip } = await import('../../src/game/enemy-ship')
      const enemy = createEnemyShip(200, 0)
      enemy.shootTimer = 100 // prevent shooting
      const startX = enemy.x
      const startY = enemy.y
      const player = makeShip(0, 0)

      // Step several frames so the enemy starts moving
      for (let i = 0; i < 60; i++) {
        updateEnemyShip(enemy, player, 1 / 60)
      }

      // Enemy should have moved from its starting position
      const moved = Math.abs(enemy.x - startX) > 1 || Math.abs(enemy.y - startY) > 1
      assert.ok(
        moved,
        `enemy should have moved, x: ${startX}->${enemy.x}, y: ${startY}->${enemy.y}`,
      )
    })

    it('pushes enemy away when too close to player', async () => {
      const { createEnemyShip, updateEnemyShip } = await import('../../src/game/enemy-ship')
      // Place enemy very close to player (inside 70% of orbit distance)
      const enemy = createEnemyShip(10, 0)
      enemy.heading = Math.PI // facing away
      enemy.shootTimer = 100
      const player = makeShip(0, 0)

      for (let i = 0; i < 60; i++) {
        updateEnemyShip(enemy, player, 1 / 60)
      }

      const dist = Math.sqrt(enemy.x ** 2 + enemy.y ** 2)
      assert.ok(dist > 10, `enemy should move away from player, dist=${dist}`)
    })

    it('fires projectiles when shootTimer expires', async () => {
      const { createEnemyShip, updateEnemyShip } = await import('../../src/game/enemy-ship')
      const enemy = createEnemyShip(50, 0)
      enemy.shootTimer = 0.01 // about to expire
      const player = makeShip(0, 0)

      const result = updateEnemyShip(enemy, player, 0.02)
      assert.ok(result.length > 0, 'should have fired a projectile')
      assert.ok(result[0].id.startsWith('enemy-proj-'))
      assert.ok(result[0].vx !== 0 || result[0].vy !== 0, 'projectile should have velocity')
    })

    it('projectile fires toward the player', async () => {
      const { createEnemyShip, updateEnemyShip } = await import('../../src/game/enemy-ship')
      const enemy = createEnemyShip(50, 0)
      enemy.shootTimer = 0.01
      const player = makeShip(0, 0)

      const result = updateEnemyShip(enemy, player, 0.02)
      assert.ok(result.length > 0)
      // Player is to the left, so vx should be negative
      assert.ok(result[0].vx < 0, `projectile should head toward player, vx=${result[0].vx}`)
    })

    it('changes strafe direction when strafeTimer expires', async () => {
      const { createEnemyShip, updateEnemyShip } = await import('../../src/game/enemy-ship')
      const enemy = createEnemyShip(50, 0)
      enemy.shootTimer = 100
      const originalDir = enemy.strafeDir
      enemy.strafeTimer = 0.01

      updateEnemyShip(enemy, makeShip(), 0.02)
      assert.equal(enemy.strafeDir, -originalDir, 'strafe direction should flip')
      assert.ok(enemy.strafeTimer > 0, 'strafeTimer should be reset')
    })

    it('toggles idle state when idleTimer expires', async () => {
      const { createEnemyShip, updateEnemyShip } = await import('../../src/game/enemy-ship')
      const enemy = createEnemyShip(50, 0)
      enemy.shootTimer = 100
      enemy.strafeTimer = 100
      enemy.idling = false
      enemy.idleTimer = 0.01

      updateEnemyShip(enemy, makeShip(), 0.02)
      assert.equal(enemy.idling, true, 'should transition to idling')
      assert.ok(enemy.idleTimer > 0, 'idleTimer should be reset')
    })

    it('toggles from idle back to active when idleTimer expires again', async () => {
      const { createEnemyShip, updateEnemyShip } = await import('../../src/game/enemy-ship')
      const enemy = createEnemyShip(50, 0)
      enemy.shootTimer = 100
      enemy.strafeTimer = 100
      enemy.idling = true
      enemy.idleTimer = 0.01

      updateEnemyShip(enemy, makeShip(), 0.02)
      assert.equal(enemy.idling, false, 'should transition back to active')
    })

    it('updates mesh position and rotation each frame', async () => {
      const { createEnemyShip, updateEnemyShip } = await import('../../src/game/enemy-ship')
      const enemy = createEnemyShip(60, 0)
      enemy.shootTimer = 100

      updateEnemyShip(enemy, makeShip(0, 0), 1 / 60)

      assert.equal(enemy.mesh.position.x, enemy.x)
      assert.equal(enemy.mesh.position.y, enemy.y)
      assert.equal(enemy.mesh.rotation.z, enemy.rotation)
    })

    it('stops movement when effectively idle in sweet spot near cardinal', async () => {
      const { createEnemyShip, updateEnemyShip, ORBIT_DISTANCE } =
        await import('../../src/game/enemy-ship')
      // Place enemy exactly at orbit distance at cardinal 0 (right of player)
      const enemy = createEnemyShip(ORBIT_DISTANCE, 0)
      enemy.targetCardinal = 0
      enemy.idling = true
      enemy.idleTimer = 100 // keep idling
      enemy.shootTimer = 100
      enemy.strafeTimer = 100

      updateEnemyShip(enemy, makeShip(0, 0), 1 / 60)

      // When effectively idle, speed should be 0 so vx/vy should be 0
      assert.ok(Math.abs(enemy.vx) === 0, `vx should be 0, got ${enemy.vx}`)
      assert.ok(Math.abs(enemy.vy) === 0, `vy should be 0, got ${enemy.vy}`)
    })

    it('steers heading smoothly toward desired angle', async () => {
      const { createEnemyShip, updateEnemyShip } = await import('../../src/game/enemy-ship')
      // Place enemy far from orbit distance so there is a strong radial pull
      const enemy = createEnemyShip(200, 50)
      enemy.heading = -Math.PI / 2 // facing down, away from target
      enemy.shootTimer = 100

      const startHeading = enemy.heading
      for (let i = 0; i < 60; i++) {
        updateEnemyShip(enemy, makeShip(0, 0), 1 / 60)
      }

      // Heading should have changed from the initial value
      assert.notEqual(enemy.heading, startHeading, 'heading should have changed')
    })

    it('handles sweet-spot radial weight calculation', async () => {
      const { createEnemyShip, updateEnemyShip, ORBIT_DISTANCE } =
        await import('../../src/game/enemy-ship')
      // Place at exactly orbit distance (sweet spot)
      const enemy = createEnemyShip(ORBIT_DISTANCE, 0)
      enemy.shootTimer = 100
      enemy.strafeTimer = 100

      // Should not throw and should update normally
      updateEnemyShip(enemy, makeShip(0, 0), 1 / 60)
      assert.ok(true, 'should handle sweet-spot distance')
    })
  })

  // ---------------------------------------------------------------------------
  // updateEnemyProjectile
  // ---------------------------------------------------------------------------
  describe('updateEnemyProjectile', () => {
    it('moves projectile by velocity * dt', async () => {
      const { createEnemyShip, updateEnemyShip, updateEnemyProjectile } =
        await import('../../src/game/enemy-ship')
      // Create a projectile by forcing a shot
      const enemy = createEnemyShip(50, 0)
      enemy.shootTimer = 0.001
      const projs = updateEnemyShip(enemy, makeShip(0, 0), 0.01)
      assert.ok(projs.length > 0)

      const proj = projs[0]
      const startX = proj.x
      const startY = proj.y

      const alive = updateEnemyProjectile(proj, 0.1)
      assert.equal(alive, true)
      assert.ok(Math.abs(proj.x - (startX + proj.vx * 0.1)) < 0.001)
      assert.ok(Math.abs(proj.y - (startY + proj.vy * 0.1)) < 0.001)
    })

    it('syncs mesh position with projectile position', async () => {
      const { createEnemyShip, updateEnemyShip, updateEnemyProjectile } =
        await import('../../src/game/enemy-ship')
      const enemy = createEnemyShip(50, 0)
      enemy.shootTimer = 0.001
      const projs = updateEnemyShip(enemy, makeShip(0, 0), 0.01)
      const proj = projs[0]

      updateEnemyProjectile(proj, 0.1)
      assert.equal(proj.mesh.position.x, proj.x)
      assert.equal(proj.mesh.position.y, proj.y)
    })

    it('returns false when elapsed >= 2s (lifetime)', async () => {
      const { createEnemyShip, updateEnemyShip, updateEnemyProjectile } =
        await import('../../src/game/enemy-ship')
      const enemy = createEnemyShip(50, 0)
      enemy.shootTimer = 0.001
      const projs = updateEnemyShip(enemy, makeShip(0, 0), 0.01)
      const proj = projs[0]

      proj.elapsed = 1.99
      const alive = updateEnemyProjectile(proj, 0.02)
      assert.equal(alive, false)
    })
  })

  // ---------------------------------------------------------------------------
  // disposeEnemyProjectile
  // ---------------------------------------------------------------------------
  describe('disposeEnemyProjectile', () => {
    it('disposes mesh children geometry and material', async () => {
      const { createEnemyShip, updateEnemyShip, disposeEnemyProjectile } =
        await import('../../src/game/enemy-ship')
      const enemy = createEnemyShip(50, 0)
      enemy.shootTimer = 0.001
      const projs = updateEnemyShip(enemy, makeShip(0, 0), 0.01)
      const proj = projs[0]

      // Should not throw
      disposeEnemyProjectile(proj)
      assert.ok(true, 'disposeEnemyProjectile should complete without error')
    })
  })

  // ---------------------------------------------------------------------------
  // checkProjectileEnemyCollisions
  // ---------------------------------------------------------------------------
  describe('checkProjectileEnemyCollisions', () => {
    function makeProjectile(x: number, y: number, damage = 1) {
      return {
        id: `proj-${Math.random()}`,
        x,
        y,
        velocityX: 0,
        velocityY: 0,
        damage,
        tool: 'blaster' as const,
      }
    }

    it('returns all projectiles when enemy is not alive', async () => {
      const { createEnemyShip, checkProjectileEnemyCollisions } =
        await import('../../src/game/enemy-ship')
      const enemy = createEnemyShip(0, 0)
      enemy.alive = false
      const projs = [makeProjectile(0, 0)]
      const result = checkProjectileEnemyCollisions(projs, enemy)
      assert.equal(result.surviving.length, 1)
      assert.equal(result.hitProjectileIds.length, 0)
    })

    it('returns all projectiles when enemy hp is 0', async () => {
      const { createEnemyShip, checkProjectileEnemyCollisions } =
        await import('../../src/game/enemy-ship')
      const enemy = createEnemyShip(0, 0)
      enemy.hp = 0
      const projs = [makeProjectile(0, 0)]
      const result = checkProjectileEnemyCollisions(projs, enemy)
      assert.equal(result.surviving.length, 1)
      assert.equal(result.hitProjectileIds.length, 0)
    })

    it('detects a hit when projectile is within collision radius', async () => {
      const { createEnemyShip, checkProjectileEnemyCollisions } =
        await import('../../src/game/enemy-ship')
      const enemy = createEnemyShip(10, 10)
      const hpBefore = enemy.hp
      // Place projectile right on top of enemy
      const projs = [makeProjectile(10, 10, 1)]
      const result = checkProjectileEnemyCollisions(projs, enemy)
      assert.equal(result.hitProjectileIds.length, 1)
      assert.equal(result.surviving.length, 0)
      assert.equal(enemy.hp, hpBefore - 1)
    })

    it('does not detect a hit when projectile is far away', async () => {
      const { createEnemyShip, checkProjectileEnemyCollisions } =
        await import('../../src/game/enemy-ship')
      const enemy = createEnemyShip(10, 10)
      const hpBefore = enemy.hp
      // Place projectile far from enemy
      const projs = [makeProjectile(100, 100)]
      const result = checkProjectileEnemyCollisions(projs, enemy)
      assert.equal(result.hitProjectileIds.length, 0)
      assert.equal(result.surviving.length, 1)
      assert.equal(enemy.hp, hpBefore)
    })

    it('kills enemy when hp reaches 0', async () => {
      const { createEnemyShip, checkProjectileEnemyCollisions } =
        await import('../../src/game/enemy-ship')
      const enemy = createEnemyShip(10, 10)
      enemy.hp = 1
      const projs = [makeProjectile(10, 10, 5)]
      const result = checkProjectileEnemyCollisions(projs, enemy)
      assert.equal(enemy.hp, 0)
      assert.equal(enemy.alive, false)
      assert.equal(result.hitProjectileIds.length, 1)
    })

    it('surviving projectiles pass through after enemy dies mid-loop', async () => {
      const { createEnemyShip, checkProjectileEnemyCollisions } =
        await import('../../src/game/enemy-ship')
      const enemy = createEnemyShip(10, 10)
      enemy.hp = 1
      // First projectile kills, second should survive
      const projs = [makeProjectile(10, 10, 5), makeProjectile(10, 10, 5)]
      const result = checkProjectileEnemyCollisions(projs, enemy)
      assert.equal(result.hitProjectileIds.length, 1)
      assert.equal(result.surviving.length, 1)
    })
  })

  // ---------------------------------------------------------------------------
  // checkEnemyProjectilePlayerCollisions
  // ---------------------------------------------------------------------------
  describe('checkEnemyProjectilePlayerCollisions', () => {
    function makeEnemyProj(x: number, y: number) {
      return {
        id: `ep-${Math.random()}`,
        mesh: { position: { x, y, z: 0 }, rotation: { z: 0 }, children: [] } as never,
        x,
        y,
        vx: 0,
        vy: 0,
        elapsed: 0,
      }
    }

    it('detects a hit when enemy projectile overlaps player', async () => {
      const { checkEnemyProjectilePlayerCollisions } = await import('../../src/game/enemy-ship')
      const player = makeShip(10, 10)
      const projs = [makeEnemyProj(10, 10)]
      const hits = checkEnemyProjectilePlayerCollisions(projs, player)
      assert.equal(hits.length, 1)
    })

    it('does not detect a hit when projectile is far from player', async () => {
      const { checkEnemyProjectilePlayerCollisions } = await import('../../src/game/enemy-ship')
      const player = makeShip(10, 10)
      const projs = [makeEnemyProj(100, 100)]
      const hits = checkEnemyProjectilePlayerCollisions(projs, player)
      assert.equal(hits.length, 0)
    })

    it('returns multiple hit IDs when several projectiles collide', async () => {
      const { checkEnemyProjectilePlayerCollisions } = await import('../../src/game/enemy-ship')
      const player = makeShip(0, 0)
      const projs = [makeEnemyProj(0, 0), makeEnemyProj(0.5, 0), makeEnemyProj(100, 100)]
      const hits = checkEnemyProjectilePlayerCollisions(projs, player)
      assert.equal(hits.length, 2)
    })
  })

  // ---------------------------------------------------------------------------
  // createShipwreckDebris
  // ---------------------------------------------------------------------------
  describe('createShipwreckDebris', () => {
    it('creates debris at the given position', async () => {
      const { createShipwreckDebris } = await import('../../src/game/enemy-ship')
      const debris = createShipwreckDebris(25, 35)
      assert.equal(debris.group.position.x, 25)
      assert.equal(debris.group.position.y, 35)
      assert.equal(debris.elapsed, 0)
    })

    it('creates 16 particles', async () => {
      const { createShipwreckDebris } = await import('../../src/game/enemy-ship')
      const debris = createShipwreckDebris(0, 0)
      assert.equal(debris.particles.length, 16)
    })

    it('particles have velocity and rotation speed', async () => {
      const { createShipwreckDebris } = await import('../../src/game/enemy-ship')
      const debris = createShipwreckDebris(0, 0)
      for (const p of debris.particles) {
        assert.equal(typeof p.vx, 'number')
        assert.equal(typeof p.vy, 'number')
        assert.equal(typeof p.rotSpeed, 'number')
        const speed = Math.sqrt(p.vx ** 2 + p.vy ** 2)
        assert.ok(speed > 0, 'particle should have non-zero speed')
      }
    })

    it('adds particle meshes to the group', async () => {
      const { createShipwreckDebris } = await import('../../src/game/enemy-ship')
      const debris = createShipwreckDebris(0, 0)
      assert.equal(debris.group.children.length, 16)
    })
  })

  // ---------------------------------------------------------------------------
  // updateShipwreckDebris
  // ---------------------------------------------------------------------------
  describe('updateShipwreckDebris', () => {
    it('returns true while elapsed < WRECK_DURATION (1.2s)', async () => {
      const { createShipwreckDebris, updateShipwreckDebris } =
        await import('../../src/game/enemy-ship')
      const debris = createShipwreckDebris(0, 0)
      const alive = updateShipwreckDebris(debris, 0.5)
      assert.equal(alive, true)
      assert.equal(debris.elapsed, 0.5)
    })

    it('returns false when elapsed >= WRECK_DURATION (1.2s)', async () => {
      const { createShipwreckDebris, updateShipwreckDebris } =
        await import('../../src/game/enemy-ship')
      const debris = createShipwreckDebris(0, 0)
      debris.elapsed = 1.19
      const alive = updateShipwreckDebris(debris, 0.02)
      assert.equal(alive, false)
    })

    it('moves particles by their velocity', async () => {
      const { createShipwreckDebris, updateShipwreckDebris } =
        await import('../../src/game/enemy-ship')
      const debris = createShipwreckDebris(0, 0)
      const p = debris.particles[0]
      const startX = p.mesh.position.x
      const startY = p.mesh.position.y

      updateShipwreckDebris(debris, 0.1)

      const expectedX = startX + p.vx * 0.1
      const expectedY = startY + p.vy * 0.1
      assert.ok(
        Math.abs(p.mesh.position.x - expectedX) < 0.01,
        `x should match: ${p.mesh.position.x} vs ${expectedX}`,
      )
      assert.ok(
        Math.abs(p.mesh.position.y - expectedY) < 0.01,
        `y should match: ${p.mesh.position.y} vs ${expectedY}`,
      )
    })

    it('shrinks particles as progress increases', async () => {
      const { createShipwreckDebris, updateShipwreckDebris } =
        await import('../../src/game/enemy-ship')
      const debris = createShipwreckDebris(0, 0)

      updateShipwreckDebris(debris, 0.6) // half of 1.2s

      const p = debris.particles[0]
      // At 50% progress, scale should be 0.5
      assert.ok(p.mesh.scale.x < 1, `scale should shrink, got ${p.mesh.scale.x}`)
      assert.ok(p.mesh.scale.x > 0, `scale should be positive, got ${p.mesh.scale.x}`)
    })
  })

  // ---------------------------------------------------------------------------
  // disposeShipwreckDebris
  // ---------------------------------------------------------------------------
  describe('disposeShipwreckDebris', () => {
    it('disposes particle geometry and material', async () => {
      const { createShipwreckDebris, disposeShipwreckDebris } =
        await import('../../src/game/enemy-ship')
      const debris = createShipwreckDebris(0, 0)
      // Should not throw
      disposeShipwreckDebris(debris)
      assert.ok(true, 'disposeShipwreckDebris should complete without error')
    })
  })

  // ---------------------------------------------------------------------------
  // disposeEnemyShip
  // ---------------------------------------------------------------------------
  describe('disposeEnemyShip', () => {
    it('disposes enemy mesh children', async () => {
      const { createEnemyShip, disposeEnemyShip } = await import('../../src/game/enemy-ship')
      const enemy = createEnemyShip(0, 0)
      // Should not throw
      disposeEnemyShip(enemy)
      assert.ok(true, 'disposeEnemyShip should complete without error')
    })
  })

  // ---------------------------------------------------------------------------
  // resetEnemyProjectileIdCounter
  // ---------------------------------------------------------------------------
  describe('resetEnemyProjectileIdCounter', () => {
    it('resets the projectile ID counter', async () => {
      const { createEnemyShip, updateEnemyShip, resetEnemyProjectileIdCounter } =
        await import('../../src/game/enemy-ship')
      resetEnemyProjectileIdCounter()

      const enemy = createEnemyShip(50, 0)
      enemy.shootTimer = 0.001
      const projs = updateEnemyShip(enemy, makeShip(0, 0), 0.01)
      assert.ok(projs.length > 0)
      assert.equal(projs[0].id, 'enemy-proj-0')

      // Fire again
      enemy.shootTimer = 0.001
      const projs2 = updateEnemyShip(enemy, makeShip(0, 0), 0.01)
      assert.ok(projs2.length > 0)
      assert.equal(projs2[0].id, 'enemy-proj-1')

      // Reset and verify counter starts from 0 again
      resetEnemyProjectileIdCounter()
      enemy.shootTimer = 0.001
      const projs3 = updateEnemyShip(enemy, makeShip(0, 0), 0.01)
      assert.ok(projs3.length > 0)
      assert.equal(projs3[0].id, 'enemy-proj-0')
    })
  })

  // ---------------------------------------------------------------------------
  // Exported constants
  // ---------------------------------------------------------------------------
  describe('exported constants', () => {
    it('exports expected constant values', async () => {
      const {
        ENEMY_COLLISION_RADIUS,
        ENEMY_MAX_HP,
        ORBIT_DISTANCE,
        ENEMY_SPAWN_DISTANCE,
        ENEMY_PROJECTILE_DAMAGE,
      } = await import('../../src/game/enemy-ship')

      assert.equal(ENEMY_COLLISION_RADIUS, 3)
      assert.equal(ENEMY_MAX_HP, 3)
      assert.equal(ORBIT_DISTANCE, 50)
      assert.equal(ENEMY_SPAWN_DISTANCE, 120)
      assert.equal(ENEMY_PROJECTILE_DAMAGE, 5)
    })
  })
})
