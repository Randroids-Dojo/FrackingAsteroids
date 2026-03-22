import * as THREE from 'three'
import { SHIP_COLORS, VOXEL_SIZE } from './ship-constants'

function addVoxel(group: THREE.Group, x: number, y: number, z: number, color: number): void {
  const geo = new THREE.BoxGeometry(VOXEL_SIZE, VOXEL_SIZE, VOXEL_SIZE)
  const mat = new THREE.MeshStandardMaterial({ color, flatShading: true })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x * VOXEL_SIZE, y * VOXEL_SIZE, z * VOXEL_SIZE)
  group.add(mesh)
}

/**
 * Build a voxel-style player ship (~8×8×4 voxels).
 * Ship faces +Y (up) in world space.
 */
export function createShipModel(): THREE.Group {
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
