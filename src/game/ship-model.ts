import * as THREE from 'three'
import { SHIP_COLORS, VOXEL_SIZE } from './ship-constants'

/** Prologue ship voxel size — larger for imposing scale. */
const PROLOGUE_VOXEL = 0.8

/** Prologue-specific colors. */
const PROLOGUE_COLORS = {
  gold: 0xccaa44,
  turret: 0xffaa00,
  scoop: 0x44cc88,
  cargo: 0x888899,
  lazerLens: 0x00ffff,
}

function addVoxelSized(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  color: number,
  voxelSize: number,
): void {
  const geo = new THREE.BoxGeometry(voxelSize, voxelSize, voxelSize)
  const mat = new THREE.MeshStandardMaterial({ color, flatShading: true })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x * voxelSize, y * voxelSize, z * voxelSize)
  group.add(mesh)
}

function addVoxel(group: THREE.Group, x: number, y: number, z: number, color: number): void {
  addVoxelSized(group, x, y, z, color, VOXEL_SIZE)
}

/**
 * Build a voxel-style player ship.
 * @param variant - 'normal' for standard ship, 'prologue' for maxed ship with modules
 */
export function createShipModel(variant: 'normal' | 'prologue' = 'normal'): THREE.Group {
  if (variant === 'prologue') return createPrologueShipModel()

  const ship = new THREE.Group()
  const { hull, cockpit, engine, wingTip } = SHIP_COLORS

  // Main body (center fuselage) — 3 wide, 6 long
  for (let row = -2; row <= 3; row++) {
    addVoxel(ship, 0, row, 0, hull)
    if (row >= -1 && row <= 2) {
      addVoxel(ship, -1, row, 0, hull)
      addVoxel(ship, 1, row, 0, hull)
    }
  }

  // Cockpit (front nose) — raised slightly
  addVoxel(ship, 0, 4, 0.5, cockpit)

  // Wings — swept back
  for (let w = 2; w <= 4; w++) {
    const row = -w + 2
    addVoxel(ship, -w, row, 0, hull)
    addVoxel(ship, w, row, 0, hull)
  }

  // Wing tips — green accent
  addVoxel(ship, -4, -2, 0, wingTip)
  addVoxel(ship, 4, -2, 0, wingTip)

  // Engine glow (rear) — recessed slightly
  addVoxel(ship, -1, -3, -0.3, engine)
  addVoxel(ship, 0, -3, -0.3, engine)
  addVoxel(ship, 1, -3, -0.3, engine)

  return ship
}

/**
 * Build the prologue maxed-out ship (~8×6×4 world units) with detachable module groups.
 * Named child groups: 'turrets', 'scoop', 'cargoPods', 'lazerLens'
 */
function createPrologueShipModel(): THREE.Group {
  const ship = new THREE.Group()
  const v = PROLOGUE_VOXEL
  const { hull, cockpit, engine, wingTip } = SHIP_COLORS
  const { gold, turret, scoop, cargo, lazerLens } = PROLOGUE_COLORS

  // Main body — scaled up version of normal hull with gold accents
  let voxelCount = 0
  for (let row = -2; row <= 3; row++) {
    const color = voxelCount++ % 3 === 0 ? gold : hull
    addVoxelSized(ship, 0, row, 0, color, v)
    if (row >= -1 && row <= 2) {
      addVoxelSized(ship, -1, row, 0, voxelCount++ % 3 === 0 ? gold : hull, v)
      addVoxelSized(ship, 1, row, 0, voxelCount++ % 3 === 0 ? gold : hull, v)
    }
  }

  // Cockpit
  addVoxelSized(ship, 0, 4, 0.5, cockpit, v)

  // Wings — swept back, wider
  for (let w = 2; w <= 5; w++) {
    const row = -w + 2
    addVoxelSized(ship, -w, row, 0, voxelCount++ % 3 === 0 ? gold : hull, v)
    addVoxelSized(ship, w, row, 0, voxelCount++ % 3 === 0 ? gold : hull, v)
  }

  // Wing tips
  addVoxelSized(ship, -5, -3, 0, wingTip, v)
  addVoxelSized(ship, 5, -3, 0, wingTip, v)

  // Engine glow — wider
  for (let x = -2; x <= 2; x++) {
    addVoxelSized(ship, x, -3, -0.3, engine, v)
  }

  // --- Detachable modules ---

  // Turrets: weapon pods on outer wing tips
  const turrets = new THREE.Group()
  turrets.name = 'turrets'
  for (const side of [-1, 1]) {
    const tx = side * 6
    addVoxelSized(turrets, tx, -2, 0, turret, v)
    addVoxelSized(turrets, tx, -1, 0, turret, v)
    addVoxelSized(turrets, tx, -2, 0.8, turret, v)
  }
  ship.add(turrets)

  // Collector scoop: U-shape around front
  const scoopGroup = new THREE.Group()
  scoopGroup.name = 'scoop'
  addVoxelSized(scoopGroup, -2, 3, 0, scoop, v)
  addVoxelSized(scoopGroup, 2, 3, 0, scoop, v)
  addVoxelSized(scoopGroup, -3, 2, 0, scoop, v)
  addVoxelSized(scoopGroup, 3, 2, 0, scoop, v)
  addVoxelSized(scoopGroup, -3, 3, 0, scoop, v)
  addVoxelSized(scoopGroup, 3, 3, 0, scoop, v)
  ship.add(scoopGroup)

  // Cargo pods: rectangular blocks flanking rear engine
  const cargoPods = new THREE.Group()
  cargoPods.name = 'cargoPods'
  for (const side of [-1, 1]) {
    const cx = side * 3
    addVoxelSized(cargoPods, cx, -3, 0, cargo, v)
    addVoxelSized(cargoPods, cx, -4, 0, cargo, v)
    addVoxelSized(cargoPods, cx, -3, 0.8, cargo, v)
    addVoxelSized(cargoPods, cx, -4, 0.8, cargo, v)
  }
  ship.add(cargoPods)

  // Lazer lens: bright cyan on top of cockpit
  const lens = new THREE.Group()
  lens.name = 'lazerLens'
  addVoxelSized(lens, 0, 4, 1.3, lazerLens, v)
  ship.add(lens)

  return ship
}
