import * as THREE from 'three'

/** How long debris chunks fly before disappearing (seconds). */
const DEBRIS_LIFETIME = 1.2

/** Speed debris flies outward (units/sec). */
const DEBRIS_SPEED = 25

/** Rotation speed of tumbling debris (radians/sec). */
const DEBRIS_TUMBLE_SPEED = 6

/** How many hits between chunk break-offs. */
export const HITS_PER_BREAK = 3

export interface DebrisChunk {
  mesh: THREE.Mesh
  vx: number
  vy: number
  rotSpeed: number
  elapsed: number
}

/**
 * Pick and remove outer voxel meshes from an asteroid model near the hit point.
 * Returns the removed meshes repositioned to world space for use as flying debris.
 *
 * @param asteroidModel - The THREE.Group containing voxel meshes (mutated — children removed)
 * @param hitX - World-space X of the projectile hit
 * @param hitY - World-space Y of the projectile hit
 * @param count - Number of chunks to break off
 */
export function breakChunks(
  asteroidModel: THREE.Group,
  hitX: number,
  hitY: number,
  count: number,
): DebrisChunk[] {
  // Collect all voxel meshes (skip non-Mesh children like the health meter group)
  const meshes: THREE.Mesh[] = []
  for (const child of asteroidModel.children) {
    if (child instanceof THREE.Mesh) {
      meshes.push(child)
    }
  }

  if (meshes.length <= 4) return [] // keep a minimal core

  // Hit position in local space
  const localHitX = hitX - asteroidModel.position.x
  const localHitY = hitY - asteroidModel.position.y

  // Score meshes: prefer outer voxels near the hit point
  const scored = meshes.map((mesh) => {
    const distFromCenter = Math.sqrt(mesh.position.x ** 2 + mesh.position.y ** 2)
    const dx = mesh.position.x - localHitX
    const dy = mesh.position.y - localHitY
    const distFromHit = Math.sqrt(dx * dx + dy * dy)
    // Higher score = better candidate (far from center, close to hit)
    return { mesh, score: distFromCenter - distFromHit * 0.5 }
  })

  scored.sort((a, b) => b.score - a.score)

  const toRemove = Math.min(count, meshes.length - 4)
  const chunks: DebrisChunk[] = []

  for (let i = 0; i < toRemove; i++) {
    const { mesh } = scored[i]

    // Convert mesh position to world space before removing from parent
    const worldPos = new THREE.Vector3()
    mesh.getWorldPosition(worldPos)

    asteroidModel.remove(mesh)

    // Set mesh to world position (it's now a root-level object)
    mesh.position.copy(worldPos)

    // Fly outward from asteroid center
    const dx = worldPos.x - asteroidModel.position.x
    const dy = worldPos.y - asteroidModel.position.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const nx = dist > 0.01 ? dx / dist : Math.random() - 0.5
    const ny = dist > 0.01 ? dy / dist : Math.random() - 0.5
    const speed = DEBRIS_SPEED * (0.7 + Math.random() * 0.6)

    chunks.push({
      mesh,
      vx: nx * speed,
      vy: ny * speed,
      rotSpeed: (Math.random() - 0.5) * DEBRIS_TUMBLE_SPEED * 2,
      elapsed: 0,
    })
  }

  return chunks
}

/**
 * Update a debris chunk. Returns true if still alive.
 */
export function updateDebrisChunk(chunk: DebrisChunk, dt: number): boolean {
  chunk.elapsed += dt
  if (chunk.elapsed >= DEBRIS_LIFETIME) return false

  chunk.mesh.position.x += chunk.vx * dt
  chunk.mesh.position.y += chunk.vy * dt
  chunk.mesh.rotation.z += chunk.rotSpeed * dt
  chunk.mesh.rotation.x += chunk.rotSpeed * 0.7 * dt

  // Shrink over the last 40% of lifetime
  const fadeStart = DEBRIS_LIFETIME * 0.6
  if (chunk.elapsed > fadeStart) {
    const fadeProgress = (chunk.elapsed - fadeStart) / (DEBRIS_LIFETIME - fadeStart)
    chunk.mesh.scale.setScalar(1 - fadeProgress)
  }

  return true
}

/**
 * Dispose a debris chunk's geometry and material.
 */
export function disposeDebrisChunk(chunk: DebrisChunk): void {
  chunk.mesh.geometry.dispose()
  if (Array.isArray(chunk.mesh.material)) {
    chunk.mesh.material.forEach((m) => m.dispose())
  } else {
    chunk.mesh.material.dispose()
  }
}
