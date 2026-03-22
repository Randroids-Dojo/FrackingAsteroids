import * as THREE from 'three'
import { VOXEL_SIZE } from './ship-constants'

/** Asteroid voxel colors (hex values). */
export const ASTEROID_COLORS = {
  rock: 0x8b7355,
  rockDark: 0x6b5340,
  rockLight: 0xa08868,
  crystal: 0x88ccff,
} as const

function addVoxel(group: THREE.Group, x: number, y: number, z: number, color: number): void {
  const geo = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE)
  const mat = new THREE.MeshStandardMaterial({ color, flatShading: true })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x * VOXEL_SIZE, y * VOXEL_SIZE, z * VOXEL_SIZE)
  group.add(mesh)
}

/**
 * Build a voxel-style large asteroid (~10×10×4 voxels).
 * Irregular, rocky shape with a few crystal accents.
 */
export function createLargeAsteroidModel(): THREE.Group {
  const asteroid = new THREE.Group()
  const { rock, rockDark, rockLight, crystal } = ASTEROID_COLORS

  // Core — solid 6×6 center
  for (let x = -3; x <= 3; x++) {
    for (let y = -3; y <= 3; y++) {
      const dist = Math.abs(x) + Math.abs(y)
      if (dist <= 4) {
        const color = (x + y) % 3 === 0 ? rockDark : rock
        addVoxel(asteroid, x, y, 0, color)
      }
    }
  }

  // Top layer — slightly smaller for 3D depth
  for (let x = -2; x <= 2; x++) {
    for (let y = -2; y <= 2; y++) {
      const dist = Math.abs(x) + Math.abs(y)
      if (dist <= 3) {
        const color = (x * y) % 2 === 0 ? rockLight : rock
        addVoxel(asteroid, x, y, 1, color)
      }
    }
  }

  // Bottom layer — offset slightly for asymmetry
  for (let x = -2; x <= 3; x++) {
    for (let y = -3; y <= 2; y++) {
      const dist = Math.abs(x) + Math.abs(y)
      if (dist <= 3) {
        addVoxel(asteroid, x, y, -1, rockDark)
      }
    }
  }

  // Bumpy protrusions — irregular edges
  addVoxel(asteroid, -4, 0, 0, rock)
  addVoxel(asteroid, 4, 1, 0, rockDark)
  addVoxel(asteroid, 0, -4, 0, rock)
  addVoxel(asteroid, 1, 4, 0, rockDark)
  addVoxel(asteroid, -3, -3, 0, rock)

  // Crystal accents — small mineral deposits
  addVoxel(asteroid, 2, 1, 1, crystal)
  addVoxel(asteroid, -1, -2, 1, crystal)

  return asteroid
}
