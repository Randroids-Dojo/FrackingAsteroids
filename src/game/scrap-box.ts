import * as THREE from 'three'
import type { Ship } from '@/lib/schemas'
import { SHIP_COLLISION_RADIUS } from './collision-constants'
import { COLLECTOR_RANGE, COLLECTOR_PULL_SPEED } from './metal-chunk'

// ---------------------------------------------------------------------------
// Scrap box constants
// ---------------------------------------------------------------------------

/** Collision radius for scrap boxes. */
export const SCRAP_BOX_RADIUS = 2.0

/** Voxel size for the scrap box. */
const BOX_VOXEL = 1.6

/** How much scrap a box gives when collected. */
export const SCRAP_BOX_VALUE = 10

/** Friction applied each frame. */
const BOX_FRICTION = 0.99

/** Slow tumble speed (radians/sec). */
const BOX_TUMBLE_SPEED = 1.5

/** Scrap box colors — metallic crate. */
const BOX_COLORS = {
  frame: 0x888888,
  panel: 0x556677,
  accent: 0xffaa00,
} as const

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

let nextScrapBoxId = 0

export interface ScrapBox {
  id: string
  mesh: THREE.Group
  x: number
  y: number
  vx: number
  vy: number
  rotSpeed: number
}

// ---------------------------------------------------------------------------
// Scrap box model — small metallic crate
// ---------------------------------------------------------------------------

function createScrapBoxModel(): THREE.Group {
  const group = new THREE.Group()

  // Main crate body (3x3x3 voxel cube with panels)
  const positions: [number, number, number, number][] = [
    // Frame edges
    [-1, -1, 0, BOX_COLORS.frame],
    [1, -1, 0, BOX_COLORS.frame],
    [-1, 1, 0, BOX_COLORS.frame],
    [1, 1, 0, BOX_COLORS.frame],
    // Center panels
    [0, -1, 0, BOX_COLORS.panel],
    [0, 1, 0, BOX_COLORS.panel],
    [-1, 0, 0, BOX_COLORS.panel],
    [1, 0, 0, BOX_COLORS.panel],
    // Center accent (glowing scrap indicator)
    [0, 0, 0, BOX_COLORS.accent],
    // Top layer
    [0, 0, 1, BOX_COLORS.frame],
  ]

  for (const [vx, vy, vz, color] of positions) {
    const geo = new THREE.BoxGeometry(BOX_VOXEL, BOX_VOXEL, BOX_VOXEL)
    const isAccent = color === BOX_COLORS.accent
    const mat = new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
      metalness: 0.6,
      roughness: 0.3,
      ...(isAccent ? { emissive: color, emissiveIntensity: 0.4 } : {}),
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(vx * BOX_VOXEL, vy * BOX_VOXEL, vz * BOX_VOXEL * 0.5)
    group.add(mesh)
  }

  return group
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a scrap box at the given position, drifting slowly.
 */
export function createScrapBox(x: number, y: number): ScrapBox {
  const mesh = createScrapBoxModel()
  mesh.position.set(x, y, 0)

  // Small random drift
  const angle = Math.random() * Math.PI * 2
  const speed = 3 + Math.random() * 4

  return {
    id: `scrap-box-${nextScrapBoxId++}`,
    mesh,
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    rotSpeed: (Math.random() - 0.5) * BOX_TUMBLE_SPEED * 2,
  }
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

/**
 * Update scrap box position and rotation.
 */
export function updateScrapBox(box: ScrapBox, dt: number): void {
  box.vx *= Math.pow(BOX_FRICTION, dt * 60)
  box.vy *= Math.pow(BOX_FRICTION, dt * 60)

  box.x += box.vx * dt
  box.y += box.vy * dt

  box.mesh.position.set(box.x, box.y, 0)
  box.mesh.rotation.z += box.rotSpeed * dt
  box.mesh.rotation.x += box.rotSpeed * 0.3 * dt
}

/**
 * Attract a scrap box toward the ship when collector is active.
 * Returns true if the box is close enough to be collected.
 */
export function attractScrapBoxToShip(box: ScrapBox, ship: Ship, _dt: number): boolean {
  const dx = ship.x - box.x
  const dy = ship.y - box.y
  const distSq = dx * dx + dy * dy
  const range = COLLECTOR_RANGE

  if (distSq > range * range) return false

  const dist = Math.sqrt(distSq)
  const collectDist = SCRAP_BOX_RADIUS + SHIP_COLLISION_RADIUS

  if (dist < collectDist) return true

  const nx = dx / dist
  const ny = dy / dist

  // Direct velocity set — tractor beam pulls boxes straight in
  const t = 1 - dist / range
  const speed = COLLECTOR_PULL_SPEED * (0.4 + 0.6 * t)
  box.vx = nx * speed
  box.vy = ny * speed

  return false
}

// ---------------------------------------------------------------------------
// Dispose
// ---------------------------------------------------------------------------

export function disposeScrapBox(box: ScrapBox): void {
  for (const child of box.mesh.children) {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose()
      if (child.material instanceof THREE.Material) {
        child.material.dispose()
      }
    }
  }
}

/** Reset scrap box ID counter (for testing). */
export function resetScrapBoxIdCounter(): void {
  nextScrapBoxId = 0
}
