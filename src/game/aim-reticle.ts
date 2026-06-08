import * as THREE from 'three'

/** Color of the aim line and reticle (red). */
const RETICLE_COLOR = 0xff3030
/** Opacity for the semi-transparent aim line. */
const LINE_OPACITY = 0.45
/** Opacity for the reticle ring. */
const RING_OPACITY = 0.7
/** Dash length (world units) for the dashed aim line. */
const DASH_SIZE = 3
/** Gap length (world units) between dashes. */
const GAP_SIZE = 2
/** Z height to draw the aim line / reticle above the play field. */
const RETICLE_Z = 1
/** Reticle radius (world units) when the aim line hits no object. */
export const DEFAULT_RETICLE_RADIUS = 4
/** Number of segments used to draw the reticle ring. */
const RING_SEGMENTS = 32
/** How much larger than the target the ring is drawn, so it surrounds the object. */
const RING_TARGET_SCALE = 1.25

/** Axis-aligned world-space bounds of the visible screen. */
export interface ScreenBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** A circular obstacle the aim line can intersect. */
export interface AimObstacle {
  x: number
  y: number
  radius: number
}

/** The point on an obstacle that the aim line locked onto. */
export interface AimTarget {
  x: number
  y: number
  radius: number
}

export interface AimLineResult {
  /** World X where the line should stop (object surface or screen edge). */
  endX: number
  /** World Y where the line should stop. */
  endY: number
  /** The object the line intersects, or null when it reaches the screen edge. */
  target: AimTarget | null
}

/**
 * Parameter t > 0 at which a ray exits an axis-aligned box, assuming the ray
 * origin is inside the box. Returns the distance along the (unit) direction to
 * the first boundary crossing.
 */
function rayBoxExit(
  startX: number,
  startY: number,
  dirX: number,
  dirY: number,
  bounds: ScreenBounds,
): number {
  let tExit = Infinity
  if (dirX !== 0) {
    const tx = Math.max((bounds.minX - startX) / dirX, (bounds.maxX - startX) / dirX)
    if (tx < tExit) tExit = tx
  }
  if (dirY !== 0) {
    const ty = Math.max((bounds.minY - startY) / dirY, (bounds.maxY - startY) / dirY)
    if (ty < tExit) tExit = ty
  }
  return tExit
}

/**
 * Nearest forward intersection t of a ray with a circle, or null when the ray
 * misses. A ray starting inside the circle returns 0.
 */
function rayCircleEntry(
  startX: number,
  startY: number,
  dirX: number,
  dirY: number,
  cx: number,
  cy: number,
  radius: number,
): number | null {
  const fx = startX - cx
  const fy = startY - cy
  const b = 2 * (fx * dirX + fy * dirY)
  const c = fx * fx + fy * fy - radius * radius
  if (c <= 0) return 0 // origin is inside the circle
  const disc = b * b - 4 * c
  if (disc < 0) return null
  const t = (-b - Math.sqrt(disc)) / 2
  return t >= 0 ? t : null
}

/**
 * Compute the projected aim line from the ship along a direction.
 *
 * The line extends to the edge of the visible screen, unless it first
 * intersects an obstacle - in which case it stops at the obstacle's surface and
 * reports that obstacle as the locked target.
 *
 * @param startX - Ship center X (world)
 * @param startY - Ship center Y (world)
 * @param dirX - Aim direction X (need not be normalized)
 * @param dirY - Aim direction Y (need not be normalized)
 * @param bounds - Visible screen bounds in world space
 * @param obstacles - Circular obstacles to test (only those in front are considered)
 */
export function computeAimLine(
  startX: number,
  startY: number,
  dirX: number,
  dirY: number,
  bounds: ScreenBounds,
  obstacles: AimObstacle[],
): AimLineResult {
  const len = Math.hypot(dirX, dirY)
  if (len < 1e-6) {
    return { endX: startX, endY: startY, target: null }
  }
  const nx = dirX / len
  const ny = dirY / len

  const tEdge = rayBoxExit(startX, startY, nx, ny, bounds)

  let nearestT = tEdge
  let target: AimTarget | null = null
  for (const o of obstacles) {
    const t = rayCircleEntry(startX, startY, nx, ny, o.x, o.y, o.radius)
    if (t !== null && t <= nearestT) {
      nearestT = t
      target = { x: o.x, y: o.y, radius: o.radius }
    }
  }

  return {
    endX: startX + nx * nearestT,
    endY: startY + ny * nearestT,
    target,
  }
}

export interface AimReticle {
  /** Untransformed group added to the scene; children carry world coordinates. */
  group: THREE.Group
  line: THREE.Line
  lineGeometry: THREE.BufferGeometry
  linePositions: Float32Array
  ring: THREE.LineLoop
}

/**
 * Create the aim-line + reticle visuals: a red dashed semi-transparent line and
 * a red ring that snaps onto the targeted object. Hidden until updated.
 */
export function createAimReticle(): AimReticle {
  const group = new THREE.Group()
  group.visible = false

  // --- Dashed aim line (two vertices, positions updated each frame) ---
  const linePositions = new Float32Array(6)
  const lineGeometry = new THREE.BufferGeometry()
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3))
  const lineMaterial = new THREE.LineDashedMaterial({
    color: RETICLE_COLOR,
    transparent: true,
    opacity: LINE_OPACITY,
    dashSize: DASH_SIZE,
    gapSize: GAP_SIZE,
  })
  const line = new THREE.Line(lineGeometry, lineMaterial)
  group.add(line)

  // --- Reticle ring (unit circle, scaled and positioned each frame) ---
  const ringPositions = new Float32Array((RING_SEGMENTS + 1) * 3)
  for (let i = 0; i <= RING_SEGMENTS; i++) {
    const a = (i / RING_SEGMENTS) * Math.PI * 2
    ringPositions[i * 3] = Math.cos(a)
    ringPositions[i * 3 + 1] = Math.sin(a)
    ringPositions[i * 3 + 2] = 0
  }
  const ringGeometry = new THREE.BufferGeometry()
  ringGeometry.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3))
  const ringMaterial = new THREE.LineBasicMaterial({
    color: RETICLE_COLOR,
    transparent: true,
    opacity: RING_OPACITY,
  })
  const ring = new THREE.LineLoop(ringGeometry, ringMaterial)
  group.add(ring)

  return { group, line, lineGeometry, linePositions, ring }
}

/**
 * Update the aim line endpoints and reticle placement.
 *
 * @param reticle - The reticle visuals
 * @param visible - Whether to show the aim line / reticle
 * @param startX - Ship center X (world)
 * @param startY - Ship center Y (world)
 * @param result - Output of {@link computeAimLine}
 */
export function updateAimReticle(
  reticle: AimReticle,
  visible: boolean,
  startX: number,
  startY: number,
  result: AimLineResult,
): void {
  reticle.group.visible = visible
  if (!visible) return

  const { linePositions, lineGeometry, line, ring } = reticle
  linePositions[0] = startX
  linePositions[1] = startY
  linePositions[2] = RETICLE_Z
  linePositions[3] = result.endX
  linePositions[4] = result.endY
  linePositions[5] = RETICLE_Z
  lineGeometry.attributes.position.needsUpdate = true
  lineGeometry.computeBoundingSphere()
  // Dashed lines need per-vertex distances recomputed after moving vertices.
  line.computeLineDistances()

  if (result.target) {
    ring.position.set(result.target.x, result.target.y, RETICLE_Z)
    ring.scale.setScalar(result.target.radius * RING_TARGET_SCALE)
  } else {
    ring.position.set(result.endX, result.endY, RETICLE_Z)
    ring.scale.setScalar(DEFAULT_RETICLE_RADIUS)
  }
}

export function disposeAimReticle(reticle: AimReticle): void {
  reticle.group.traverse((obj) => {
    if (obj instanceof THREE.Line || obj instanceof THREE.LineLoop) {
      obj.geometry.dispose()
      if (obj.material instanceof THREE.Material) {
        obj.material.dispose()
      }
    }
  })
}
