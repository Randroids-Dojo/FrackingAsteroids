import * as THREE from 'three'

/** Number of particle cubes per explosion. */
const PARTICLE_COUNT = 8

/** How long the explosion animation lasts in seconds. */
export const EXPLOSION_DURATION = 0.4

/** Speed particles fly outward in units/sec. */
const PARTICLE_SPEED = 40

/** Size of each particle cube. */
const PARTICLE_SIZE = 0.6

/** Explosion colors — amber/orange energy burst. */
const EXPLOSION_COLORS = [0xffaa00, 0xffdd44, 0xff6600, 0xffcc22] as const

export interface Explosion {
  group: THREE.Group
  particles: { mesh: THREE.Mesh; vx: number; vy: number }[]
  elapsed: number
}

/**
 * Create an explosion effect at the given position.
 * Returns an Explosion that must be updated each frame and removed when done.
 */
export function createExplosion(x: number, y: number): Explosion {
  const group = new THREE.Group()
  group.position.set(x, y, 0)

  const particles: Explosion['particles'] = []

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.5
    const speed = PARTICLE_SPEED * (0.6 + Math.random() * 0.4)
    const color = EXPLOSION_COLORS[i % EXPLOSION_COLORS.length]

    const geo = new THREE.BoxGeometry(PARTICLE_SIZE, PARTICLE_SIZE, PARTICLE_SIZE)
    const mat = new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
      emissive: color,
      emissiveIntensity: 0.8,
    })
    const mesh = new THREE.Mesh(geo, mat)
    group.add(mesh)

    particles.push({
      mesh,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    })
  }

  return { group, particles, elapsed: 0 }
}

/**
 * Update an explosion animation. Returns true if the explosion is still active.
 */
export function updateExplosion(explosion: Explosion, dt: number): boolean {
  explosion.elapsed += dt
  if (explosion.elapsed >= EXPLOSION_DURATION) return false

  const progress = explosion.elapsed / EXPLOSION_DURATION

  for (const p of explosion.particles) {
    p.mesh.position.x += p.vx * dt
    p.mesh.position.y += p.vy * dt

    // Fade out by shrinking
    const scale = 1 - progress
    p.mesh.scale.setScalar(scale)
  }

  return true
}

/**
 * Dispose all geometries and materials in an explosion.
 */
export function disposeExplosion(explosion: Explosion): void {
  for (const p of explosion.particles) {
    p.mesh.geometry.dispose()
    if (p.mesh.material instanceof THREE.Material) {
      p.mesh.material.dispose()
    }
  }
}
