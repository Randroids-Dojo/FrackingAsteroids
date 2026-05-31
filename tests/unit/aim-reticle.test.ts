import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  computeAimLine,
  createAimReticle,
  updateAimReticle,
  disposeAimReticle,
  DEFAULT_RETICLE_RADIUS,
} from '../../src/game/aim-reticle'

const BOUNDS = { minX: -100, maxX: 100, minY: -100, maxY: 100 }

describe('computeAimLine — geometry', () => {
  it('extends to the right screen edge when nothing is in the way', () => {
    const r = computeAimLine(0, 0, 1, 0, BOUNDS, [])
    assert.equal(r.target, null)
    assert.ok(Math.abs(r.endX - 100) < 1e-6, `endX should be 100, got ${r.endX}`)
    assert.ok(Math.abs(r.endY - 0) < 1e-6, `endY should be 0, got ${r.endY}`)
  })

  it('extends to the top screen edge when aiming straight up', () => {
    const r = computeAimLine(0, 0, 0, 1, BOUNDS, [])
    assert.equal(r.target, null)
    assert.ok(Math.abs(r.endY - 100) < 1e-6)
    assert.ok(Math.abs(r.endX - 0) < 1e-6)
  })

  it('stops at a diagonal corner', () => {
    const r = computeAimLine(0, 0, 1, 1, BOUNDS, [])
    // Exits at x=100 and y=100 simultaneously
    assert.ok(Math.abs(r.endX - 100) < 1e-6)
    assert.ok(Math.abs(r.endY - 100) < 1e-6)
  })

  it('respects a non-centered start position', () => {
    const r = computeAimLine(50, 0, 1, 0, BOUNDS, [])
    assert.ok(Math.abs(r.endX - 100) < 1e-6)
  })

  it('normalizes a non-unit direction vector', () => {
    const r = computeAimLine(0, 0, 5, 0, BOUNDS, [])
    assert.ok(Math.abs(r.endX - 100) < 1e-6)
  })

  it('returns the start point for a zero-length direction', () => {
    const r = computeAimLine(7, 9, 0, 0, BOUNDS, [])
    assert.equal(r.target, null)
    assert.equal(r.endX, 7)
    assert.equal(r.endY, 9)
  })

  it('stops at an obstacle in the aim path and locks the reticle on it', () => {
    const obstacles = [{ x: 50, y: 0, radius: 10 }]
    const r = computeAimLine(0, 0, 1, 0, BOUNDS, obstacles)
    assert.ok(r.target)
    assert.equal(r.target?.x, 50)
    assert.equal(r.target?.y, 0)
    assert.equal(r.target?.radius, 10)
    // Stops at the near surface (40), not the center (50) or the edge (100)
    assert.ok(Math.abs(r.endX - 40) < 1e-6, `endX should be 40, got ${r.endX}`)
  })

  it('ignores obstacles that are not in the aim direction', () => {
    const obstacles = [{ x: -50, y: 0, radius: 10 }]
    const r = computeAimLine(0, 0, 1, 0, BOUNDS, obstacles)
    assert.equal(r.target, null)
    assert.ok(Math.abs(r.endX - 100) < 1e-6)
  })

  it('ignores obstacles the ray misses', () => {
    const obstacles = [{ x: 50, y: 50, radius: 5 }]
    const r = computeAimLine(0, 0, 1, 0, BOUNDS, obstacles)
    assert.equal(r.target, null)
  })

  it('picks the nearest obstacle among several', () => {
    const obstacles = [
      { x: 80, y: 0, radius: 5 },
      { x: 40, y: 0, radius: 5 },
      { x: 60, y: 0, radius: 5 },
    ]
    const r = computeAimLine(0, 0, 1, 0, BOUNDS, obstacles)
    assert.equal(r.target?.x, 40)
    assert.ok(Math.abs(r.endX - 35) < 1e-6)
  })

  it('does not lock onto an obstacle beyond the screen edge', () => {
    const obstacles = [{ x: 150, y: 0, radius: 5 }]
    const r = computeAimLine(0, 0, 1, 0, BOUNDS, obstacles)
    assert.equal(r.target, null)
    assert.ok(Math.abs(r.endX - 100) < 1e-6)
  })

  it('treats a start inside an obstacle as an immediate hit', () => {
    const obstacles = [{ x: 0, y: 0, radius: 10 }]
    const r = computeAimLine(0, 0, 1, 0, BOUNDS, obstacles)
    assert.ok(r.target)
    assert.ok(Math.abs(r.endX) < 1e-6)
    assert.ok(Math.abs(r.endY) < 1e-6)
  })
})

describe('aim reticle — rendering', () => {
  it('creates a hidden reticle group with line and ring', () => {
    const reticle = createAimReticle()
    assert.equal(reticle.group.visible, false)
    assert.ok(reticle.line)
    assert.ok(reticle.ring)
    assert.equal(reticle.linePositions.length, 6)
    disposeAimReticle(reticle)
  })

  it('updateAimReticle sets line endpoints and shows the group', () => {
    const reticle = createAimReticle()
    updateAimReticle(reticle, true, 1, 2, { endX: 10, endY: 2, target: null })
    assert.equal(reticle.group.visible, true)
    assert.equal(reticle.linePositions[0], 1)
    assert.equal(reticle.linePositions[1], 2)
    assert.equal(reticle.linePositions[3], 10)
    assert.equal(reticle.linePositions[4], 2)
    disposeAimReticle(reticle)
  })

  it('places the ring at the screen edge with the default radius when no target', () => {
    const reticle = createAimReticle()
    updateAimReticle(reticle, true, 0, 0, { endX: 50, endY: 0, target: null })
    assert.equal(reticle.ring.position.x, 50)
    assert.equal(reticle.ring.scale.x, DEFAULT_RETICLE_RADIUS)
    disposeAimReticle(reticle)
  })

  it('centers and scales the ring on the target when locked on', () => {
    const reticle = createAimReticle()
    updateAimReticle(reticle, true, 0, 0, {
      endX: 40,
      endY: 0,
      target: { x: 50, y: 5, radius: 8 },
    })
    assert.equal(reticle.ring.position.x, 50)
    assert.equal(reticle.ring.position.y, 5)
    assert.ok(reticle.ring.scale.x > 8) // scaled larger than the object so it surrounds it
    disposeAimReticle(reticle)
  })

  it('hides the group when visible is false', () => {
    const reticle = createAimReticle()
    updateAimReticle(reticle, true, 0, 0, { endX: 10, endY: 0, target: null })
    updateAimReticle(reticle, false, 0, 0, { endX: 10, endY: 0, target: null })
    assert.equal(reticle.group.visible, false)
    disposeAimReticle(reticle)
  })

  it('disposeAimReticle does not throw', () => {
    const reticle = createAimReticle()
    assert.doesNotThrow(() => disposeAimReticle(reticle))
  })
})
