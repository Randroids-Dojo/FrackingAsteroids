/**
 * The Arbiter — a massive AI construct that halts the player's
 * maxed-out ship during the prologue and strips its upgrades.
 *
 * ~20×20 world units at voxel size 2.0, dwarfing the player ship.
 */

import * as THREE from 'three'

const VOXEL = 2.0

const COLORS = {
  body: 0x2a2a3a,
  bodyDark: 0x1a1a2a,
  blade: 0x3a3a4a,
  red: 0xff2244,
  eye: 0x00ffff,
}

function addVoxel(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  color: number,
): void {
  const geo = new THREE.BoxGeometry(VOXEL, VOXEL, VOXEL)
  const mat = new THREE.MeshStandardMaterial({ color, flatShading: true })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x * VOXEL, y * VOXEL, z * VOXEL)
  group.add(mesh)
}

/** Build the Arbiter voxel model. */
export function createArbiterModel(): THREE.Group {
  const arbiter = new THREE.Group()

  // Central body — dense 5×5 core
  for (let x = -2; x <= 2; x++) {
    for (let y = -2; y <= 2; y++) {
      const dist = Math.abs(x) + Math.abs(y)
      if (dist <= 3) {
        const color = dist <= 1 ? COLORS.body : COLORS.bodyDark
        addVoxel(arbiter, x, y, 0, color)
      }
    }
  }

  // Eye — single bright voxel at center, raised
  addVoxel(arbiter, 0, 0, 1, COLORS.eye)

  // Blade wings — sharp diagonals extending outward
  for (let i = 1; i <= 5; i++) {
    addVoxel(arbiter, -2 - i, -i, 0, COLORS.blade)
    addVoxel(arbiter, 2 + i, -i, 0, COLORS.blade)
    addVoxel(arbiter, -2 - i, i, 0, COLORS.blade)
    addVoxel(arbiter, 2 + i, i, 0, COLORS.blade)
  }

  // Upper blade edges
  for (let i = 1; i <= 3; i++) {
    addVoxel(arbiter, -2 - i, -i, 1, COLORS.red)
    addVoxel(arbiter, 2 + i, -i, 1, COLORS.red)
  }

  // Antenna arrays — tall vertical stacks above core
  for (let z = 1; z <= 3; z++) {
    addVoxel(arbiter, -1, 2, z, COLORS.bodyDark)
    addVoxel(arbiter, 1, 2, z, COLORS.bodyDark)
  }
  // Antenna tips — red
  addVoxel(arbiter, -1, 2, 4, COLORS.red)
  addVoxel(arbiter, 1, 2, 4, COLORS.red)

  // Bottom layer for depth
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      addVoxel(arbiter, x, y, -1, COLORS.bodyDark)
    }
  }

  // Red accent vents on sides
  addVoxel(arbiter, -3, 0, 0, COLORS.red)
  addVoxel(arbiter, 3, 0, 0, COLORS.red)
  addVoxel(arbiter, 0, -3, 0, COLORS.red)

  return arbiter
}
