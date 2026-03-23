import * as THREE from 'three'
import { PROJECTILE_COLOR, PROJECTILE_CORE_COLOR } from './blaster-constants'

/** Voxel size for projectile bolts — small and punchy. */
const BOLT_VOXEL = 0.4

function addVoxel(group: THREE.Group, x: number, y: number, z: number, color: number): void {
  const geo = new THREE.BoxGeometry(BOLT_VOXEL, BOLT_VOXEL, BOLT_VOXEL)
  const mat = new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    emissive: color,
    emissiveIntensity: 0.6,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x * BOLT_VOXEL, y * BOLT_VOXEL, z * BOLT_VOXEL)
  group.add(mesh)
}

/**
 * Build a voxel-style mining laser bolt (3 voxels long, 1 wide).
 * Oriented along +Y (ship forward). Amber with a bright core.
 */
export function createProjectileModel(): THREE.Group {
  const bolt = new THREE.Group()

  // Tail
  addVoxel(bolt, 0, -1, 0, PROJECTILE_COLOR)
  // Core (bright center)
  addVoxel(bolt, 0, 0, 0, PROJECTILE_CORE_COLOR)
  // Tip
  addVoxel(bolt, 0, 1, 0, PROJECTILE_COLOR)

  return bolt
}
