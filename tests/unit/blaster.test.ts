import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  createBlasterState,
  updateBlasterCooldown,
  fireBlaster,
  updateProjectiles,
  resetProjectileIdCounter,
  createFireInputState,
  clearStaleFireState,
  createLazerState,
  updateLazerState,
} from '../../src/game/blaster'
import {
  BASE_PROJECTILE_SPEED,
  PROJECTILE_LIFETIME,
  DUAL_SPREAD_ANGLE,
  TRIPLE_SPREAD_ANGLE,
  LAZER_MAX_HEAT,
  LAZER_COOLDOWN_TIME,
  LAZER_FIRE_INTERVAL,
} from '../../src/game/blaster-constants'

function makeShip() {
  return { x: 0, y: 0, rotation: 0, velocityX: 0, velocityY: 0 }
}

describe('createBlasterState', () => {
  it('starts with zero cooldown', () => {
    const state = createBlasterState()
    assert.equal(state.cooldownRemaining, 0)
  })
})

describe('updateBlasterCooldown', () => {
  it('reduces cooldown by dt', () => {
    const state = createBlasterState()
    state.cooldownRemaining = 1.0
    updateBlasterCooldown(state, 0.3)
    assert.ok(Math.abs(state.cooldownRemaining - 0.7) < 0.001)
  })

  it('does not go below zero', () => {
    const state = createBlasterState()
    state.cooldownRemaining = 0.1
    updateBlasterCooldown(state, 0.5)
    assert.equal(state.cooldownRemaining, 0)
  })
})

describe('fireBlaster', () => {
  beforeEach(() => {
    resetProjectileIdCounter()
  })

  it('fires a single projectile at tier 1', () => {
    const blaster = createBlasterState()
    const ship = makeShip()
    const projectiles = fireBlaster(blaster, ship, 100, 0, 1)
    assert.equal(projectiles.length, 1)
    assert.equal(projectiles[0].damage, 1)
  })

  it('sets cooldown after firing', () => {
    const blaster = createBlasterState()
    const ship = makeShip()
    fireBlaster(blaster, ship, 100, 0, 1)
    assert.ok(blaster.cooldownRemaining > 0)
    // Tier 1 fire rate = 1/sec → cooldown = 1.0
    assert.ok(Math.abs(blaster.cooldownRemaining - 1.0) < 0.001)
  })

  it('returns empty array when on cooldown', () => {
    const blaster = createBlasterState()
    blaster.cooldownRemaining = 0.5
    const ship = makeShip()
    const projectiles = fireBlaster(blaster, ship, 100, 0, 1)
    assert.equal(projectiles.length, 0)
  })

  it('projectile velocity points toward target', () => {
    const blaster = createBlasterState()
    const ship = makeShip()
    const projectiles = fireBlaster(blaster, ship, 100, 0, 1)
    assert.equal(projectiles.length, 1)
    assert.ok(projectiles[0].velocityX > 0, 'should move right toward target')
    assert.ok(Math.abs(projectiles[0].velocityY) < 0.001, 'no vertical velocity')
  })

  it('projectile speed matches tier 1 base speed', () => {
    const blaster = createBlasterState()
    const ship = makeShip()
    const projectiles = fireBlaster(blaster, ship, 100, 0, 1)
    const p = projectiles[0]
    const speed = Math.sqrt(p.velocityX ** 2 + p.velocityY ** 2)
    assert.ok(Math.abs(speed - BASE_PROJECTILE_SPEED) < 0.01)
  })

  it('tier 2 fires faster (shorter cooldown)', () => {
    const blaster = createBlasterState()
    const ship = makeShip()
    fireBlaster(blaster, ship, 100, 0, 2)
    // Tier 2 fire rate = 2/sec → cooldown = 0.5
    assert.ok(Math.abs(blaster.cooldownRemaining - 0.5) < 0.001)
  })

  it('tier 3 does 2 damage', () => {
    const blaster = createBlasterState()
    const ship = makeShip()
    const projectiles = fireBlaster(blaster, ship, 100, 0, 3)
    assert.equal(projectiles[0].damage, 2)
  })

  it('tier 4 fires dual projectiles', () => {
    const blaster = createBlasterState()
    const ship = makeShip()
    const projectiles = fireBlaster(blaster, ship, 100, 0, 4)
    assert.equal(projectiles.length, 2)

    // Both should have roughly the same speed
    const speed0 = Math.sqrt(projectiles[0].velocityX ** 2 + projectiles[0].velocityY ** 2)
    const speed1 = Math.sqrt(projectiles[1].velocityX ** 2 + projectiles[1].velocityY ** 2)
    assert.ok(Math.abs(speed0 - speed1) < 0.01)

    // They should spread: one slightly up, one slightly down
    const angle0 = Math.atan2(projectiles[0].velocityY, projectiles[0].velocityX)
    const angle1 = Math.atan2(projectiles[1].velocityY, projectiles[1].velocityX)
    const spread = Math.abs(angle1 - angle0)
    assert.ok(Math.abs(spread - 2 * DUAL_SPREAD_ANGLE) < 0.001)
  })

  it('tier 5 fires triple projectiles with correct damage', () => {
    const blaster = createBlasterState()
    const ship = makeShip()
    const projectiles = fireBlaster(blaster, ship, 100, 0, 5)
    assert.equal(projectiles.length, 3)
    for (const p of projectiles) {
      assert.equal(p.damage, 3)
    }

    // Center bolt should aim straight at target
    const centerAngle = Math.atan2(projectiles[1].velocityY, projectiles[1].velocityX)
    assert.ok(Math.abs(centerAngle) < 0.01, 'center bolt should aim at target')

    // Outer bolts should spread by TRIPLE_SPREAD_ANGLE
    const leftAngle = Math.atan2(projectiles[0].velocityY, projectiles[0].velocityX)
    const rightAngle = Math.atan2(projectiles[2].velocityY, projectiles[2].velocityX)
    assert.ok(Math.abs(Math.abs(leftAngle - centerAngle) - TRIPLE_SPREAD_ANGLE) < 0.001)
    assert.ok(Math.abs(Math.abs(rightAngle - centerAngle) - TRIPLE_SPREAD_ANGLE) < 0.001)
  })

  it('clamps tier to valid range', () => {
    const blaster = createBlasterState()
    const ship = makeShip()
    // Tier 0 should clamp to 1
    const p0 = fireBlaster(blaster, ship, 100, 0, 0)
    assert.equal(p0.length, 1)
    assert.equal(p0[0].damage, 1)

    blaster.cooldownRemaining = 0
    // Tier 10 should clamp to 5
    const p10 = fireBlaster(blaster, ship, 100, 0, 10)
    assert.equal(p10.length, 3)
    assert.equal(p10[0].damage, 3)
  })

  it('fires forward when target is on top of ship', () => {
    const blaster = createBlasterState()
    const ship = makeShip()
    const projectiles = fireBlaster(blaster, ship, 0, 0, 1)
    assert.equal(projectiles.length, 1)
    const speed = Math.sqrt(projectiles[0].velocityX ** 2 + projectiles[0].velocityY ** 2)
    assert.ok(speed > 0, 'should still fire')
  })

  it('fires from ship position when ship is not at origin', () => {
    const blaster = createBlasterState()
    const ship = makeShip()
    ship.x = 50
    ship.y = 30
    const projectiles = fireBlaster(blaster, ship, 150, 30, 1)
    assert.equal(projectiles.length, 1)
    assert.equal(projectiles[0].x, 50)
    assert.equal(projectiles[0].y, 30)
    assert.ok(projectiles[0].velocityX > 0, 'should fire toward target')
  })

  it('fires toward diagonal target', () => {
    const blaster = createBlasterState()
    const ship = makeShip()
    const projectiles = fireBlaster(blaster, ship, 100, 100, 1)
    assert.equal(projectiles.length, 1)
    assert.ok(projectiles[0].velocityX > 0, 'should have positive X velocity')
    assert.ok(projectiles[0].velocityY > 0, 'should have positive Y velocity')
    // 45° diagonal: vx and vy should be equal
    assert.ok(Math.abs(projectiles[0].velocityX - projectiles[0].velocityY) < 0.01)
  })

  it('tier 2 has 1.25x speed multiplier', () => {
    const blaster = createBlasterState()
    const ship = makeShip()
    const projectiles = fireBlaster(blaster, ship, 100, 0, 2)
    const p = projectiles[0]
    const speed = Math.sqrt(p.velocityX ** 2 + p.velocityY ** 2)
    assert.ok(Math.abs(speed - BASE_PROJECTILE_SPEED * 1.25) < 0.01)
  })

  it('tier 4 does 2 damage', () => {
    const blaster = createBlasterState()
    const ship = makeShip()
    const projectiles = fireBlaster(blaster, ship, 100, 0, 4)
    for (const p of projectiles) {
      assert.equal(p.damage, 2)
    }
  })

  it('generates unique projectile IDs', () => {
    const blaster = createBlasterState()
    const ship = makeShip()
    const p1 = fireBlaster(blaster, ship, 100, 0, 1)
    blaster.cooldownRemaining = 0
    const p2 = fireBlaster(blaster, ship, 100, 0, 1)
    assert.notEqual(p1[0].id, p2[0].id)
  })
})

describe('updateProjectiles', () => {
  beforeEach(() => {
    resetProjectileIdCounter()
  })

  it('moves projectiles by velocity * dt', () => {
    const projectiles = [
      { id: 'p1', x: 0, y: 0, velocityX: 100, velocityY: 50, damage: 1, tool: 'blaster' as const },
    ]
    const elapsed = new Map<string, number>()
    const result = updateProjectiles(projectiles, 0.1, elapsed)
    assert.equal(result.length, 1)
    assert.ok(Math.abs(result[0].x - 10) < 0.001)
    assert.ok(Math.abs(result[0].y - 5) < 0.001)
  })

  it('removes projectiles past lifetime', () => {
    const projectiles = [
      { id: 'p1', x: 0, y: 0, velocityX: 100, velocityY: 0, damage: 1, tool: 'blaster' as const },
    ]
    const elapsed = new Map<string, number>()
    elapsed.set('p1', PROJECTILE_LIFETIME - 0.01)
    const result = updateProjectiles(projectiles, 0.02, elapsed)
    assert.equal(result.length, 0)
  })

  it('keeps projectiles within lifetime', () => {
    const projectiles = [
      { id: 'p1', x: 0, y: 0, velocityX: 100, velocityY: 0, damage: 1, tool: 'blaster' as const },
    ]
    const elapsed = new Map<string, number>()
    const result = updateProjectiles(projectiles, 0.1, elapsed)
    assert.equal(result.length, 1)
    const age = elapsed.get('p1')
    assert.ok(age !== undefined)
    assert.ok(Math.abs(age - 0.1) < 0.001)
  })

  it('cleans up elapsed map for removed projectiles', () => {
    const projectiles = [
      { id: 'p1', x: 0, y: 0, velocityX: 100, velocityY: 0, damage: 1, tool: 'blaster' as const },
    ]
    const elapsed = new Map<string, number>()
    elapsed.set('p1', PROJECTILE_LIFETIME)
    updateProjectiles(projectiles, 0.1, elapsed)
    assert.equal(elapsed.has('p1'), false)
  })

  it('handles empty array', () => {
    const elapsed = new Map<string, number>()
    const result = updateProjectiles([], 0.1, elapsed)
    assert.equal(result.length, 0)
  })

  it('accumulates age across multiple frames', () => {
    const projectiles = [
      { id: 'p1', x: 0, y: 0, velocityX: 100, velocityY: 0, damage: 1, tool: 'blaster' as const },
    ]
    const elapsed = new Map<string, number>()

    // Frame 1
    updateProjectiles(projectiles, 0.5, elapsed)
    const age1 = elapsed.get('p1')
    assert.ok(age1 !== undefined)
    assert.ok(Math.abs(age1 - 0.5) < 0.001)

    // Frame 2 — age should accumulate
    updateProjectiles(projectiles, 0.5, elapsed)
    const age2 = elapsed.get('p1')
    assert.ok(age2 !== undefined)
    assert.ok(Math.abs(age2 - 1.0) < 0.001)

    // Frame 3 — should expire (1.0 + 0.6 = 1.6 > 1.5 lifetime)
    const result = updateProjectiles(projectiles, 0.6, elapsed)
    assert.equal(result.length, 0)
    assert.equal(elapsed.has('p1'), false)
  })

  it('handles multiple projectiles with mixed lifetimes', () => {
    const projectiles = [
      { id: 'p1', x: 0, y: 0, velocityX: 100, velocityY: 0, damage: 1, tool: 'blaster' as const },
      { id: 'p2', x: 0, y: 0, velocityX: 200, velocityY: 0, damage: 2, tool: 'blaster' as const },
    ]
    const elapsed = new Map<string, number>()
    elapsed.set('p1', PROJECTILE_LIFETIME) // will expire
    elapsed.set('p2', 0) // will survive
    const result = updateProjectiles(projectiles, 0.1, elapsed)
    assert.equal(result.length, 1)
    assert.equal(result[0].id, 'p2')
  })
})

describe('clearStaleFireState — pause/unpause rotation lock fix', () => {
  it('fire state must be cleared on pause→unpause to prevent rotation lock', () => {
    // Simulates the scene.ts game loop logic around pause/unpause transitions.
    // The bug: player fires at crystalline asteroid, popup pauses the game,
    // mouseup fires on the popup overlay (not the canvas), so mouseHoldingFire
    // stays true. On unpause, the hold-to-fire loop keeps overriding fireTarget
    // from stale aim coords, locking the ship's rotation.
    const fireState = createFireInputState()
    let wasPaused = false
    let paused = false
    const aimState = { active: true, screenX: 400, screenY: 300 }

    // --- Frame 1: player is firing normally ---
    fireState.mouseHoldingFire = true
    fireState.fireTarget = { x: 100, y: 200 }

    // --- Popup appears: game pauses ---
    paused = true

    // --- Paused frame: scene.ts skips the update, sets wasPaused = true ---
    wasPaused = true

    // mouseup fires on the popup overlay, never reaches the canvas.
    // fireState.mouseHoldingFire stays true.

    // --- Popup dismissed: game unpauses ---
    paused = false

    // --- First unpaused frame: scene.ts must clear stale fire state ---
    // This is the fix — scene.ts must call clearStaleFireState here.
    if (!paused && wasPaused) {
      clearStaleFireState(fireState)
      wasPaused = false
    }

    // The hold-to-fire loop runs:
    if (fireState.mouseHoldingFire && aimState.active) {
      fireState.fireTarget = { x: aimState.screenX, y: aimState.screenY }
    }

    // After clearing, mouseHoldingFire should be false, so fireTarget stays null
    assert.equal(
      fireState.mouseHoldingFire,
      false,
      'mouseHoldingFire must be false after pause→unpause transition',
    )
    assert.equal(
      fireState.fireTarget,
      null,
      'fireTarget must be null — hold-to-fire loop must not re-lock aim',
    )
  })

  it('clearStaleFireState resets both fields', () => {
    const fireState = createFireInputState()
    fireState.mouseHoldingFire = true
    fireState.fireTarget = { x: 50, y: 50 }

    clearStaleFireState(fireState)

    assert.equal(fireState.mouseHoldingFire, false)
    assert.equal(fireState.fireTarget, null)
  })
})

describe('createLazerState', () => {
  it('starts with zero heat and not overheated', () => {
    const state = createLazerState()
    assert.equal(state.heat, 0)
    assert.equal(state.overheated, false)
    assert.equal(state.cooldownRemaining, 0)
    assert.equal(state.fireTimer, 0)
  })
})

describe('updateLazerState', () => {
  it('returns false when not firing and heat is zero', () => {
    const state = createLazerState()
    const shouldFire = updateLazerState(state, 1 / 60, false)
    assert.equal(shouldFire, false)
    assert.equal(state.heat, 0)
  })

  it('builds heat while firing', () => {
    const state = createLazerState()
    // Fire for 1 second
    for (let i = 0; i < 60; i++) {
      updateLazerState(state, 1 / 60, true)
    }
    assert.ok(Math.abs(state.heat - 1.0) < 0.05, `heat should be ~1.0, got ${state.heat}`)
  })

  it('fires at LAZER_FIRE_INTERVAL rate when firing', () => {
    const state = createLazerState()
    let fireCount = 0
    // Fire for 1 second at 60fps
    for (let i = 0; i < 60; i++) {
      if (updateLazerState(state, 1 / 60, true)) {
        fireCount++
      }
    }
    // Expected: ~10 fires in 1s at 0.1s interval
    const expected = Math.floor(1.0 / LAZER_FIRE_INTERVAL)
    assert.ok(Math.abs(fireCount - expected) <= 1, `expected ~${expected} fires, got ${fireCount}`)
  })

  it('overheats after sustained firing for LAZER_MAX_HEAT seconds', () => {
    const state = createLazerState()
    const frames = Math.ceil(LAZER_MAX_HEAT * 60) + 1
    for (let i = 0; i < frames; i++) {
      updateLazerState(state, 1 / 60, true)
    }
    assert.equal(state.overheated, true)
    assert.ok(state.cooldownRemaining > 0)
  })

  it('returns false while overheated', () => {
    const state = createLazerState()
    state.overheated = true
    state.cooldownRemaining = LAZER_COOLDOWN_TIME
    const shouldFire = updateLazerState(state, 1 / 60, true)
    assert.equal(shouldFire, false)
  })

  it('recovers from overheat after cooldown period', () => {
    const state = createLazerState()
    state.overheated = true
    state.cooldownRemaining = LAZER_COOLDOWN_TIME

    // Wait full cooldown
    const frames = Math.ceil(LAZER_COOLDOWN_TIME * 60) + 1
    for (let i = 0; i < frames; i++) {
      updateLazerState(state, 1 / 60, false)
    }
    assert.equal(state.overheated, false)
    assert.equal(state.heat, 0)
  })

  it('passively cools when not firing and not overheated', () => {
    const state = createLazerState()
    state.heat = 1.0
    // Not firing for 1 second
    for (let i = 0; i < 60; i++) {
      updateLazerState(state, 1 / 60, false)
    }
    assert.ok(state.heat < 1.0, `heat should decrease, got ${state.heat}`)
    assert.ok(state.heat > 0, 'heat should not be fully cooled in 1s from 1.0')
  })

  it('resets fire timer when not firing', () => {
    const state = createLazerState()
    state.fireTimer = 0.05
    updateLazerState(state, 1 / 60, false)
    assert.equal(state.fireTimer, 0)
  })
})
