/**
 * Engine trail particle effect — glowing particles emitted from the ship's rear.
 * Particle count and brightness scale with ship speed.
 */

import * as THREE from 'three'

/** Max particles in the trail pool. */
const MAX_PARTICLES = 40

/** Particle lifetime in seconds. */
const PARTICLE_LIFETIME = 0.4

/** Particle emission rate per second at max speed. */
const EMIT_RATE = 80

/** Size of each trail particle. */
const PARTICLE_SIZE = 0.4

/** How far behind the ship particles spawn. */
const SPAWN_OFFSET = 3.5

/** Engine trail colors — orange to red fade. */
const TRAIL_COLORS = [0xff6600, 0xff4400, 0xff8800, 0xffaa00] as const

interface TrailParticle {
  mesh: THREE.Mesh
  life: number
  maxLife: number
  vx: number
  vy: number
  active: boolean
}

export interface EngineTrail {
  group: THREE.Group
  particles: TrailParticle[]
  emitAccumulator: number
}

export function createEngineTrail(): EngineTrail {
  const group = new THREE.Group()
  const particles: TrailParticle[] = []

  for (let i = 0; i < MAX_PARTICLES; i++) {
    const color = TRAIL_COLORS[i % TRAIL_COLORS.length]
    const geo = new THREE.BoxGeometry(PARTICLE_SIZE, PARTICLE_SIZE, PARTICLE_SIZE)
    const mat = new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
      emissive: color,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.visible = false
    group.add(mesh)

    particles.push({ mesh, life: 0, maxLife: PARTICLE_LIFETIME, vx: 0, vy: 0, active: false })
  }

  return { group, particles, emitAccumulator: 0 }
}

/** Update engine trail. Speed is 0–1 normalized. */
export function updateEngineTrail(
  trail: EngineTrail,
  dt: number,
  shipX: number,
  shipY: number,
  shipRotation: number,
  speed: number,
): void {
  // Don't emit at very low speed
  const emitSpeed = Math.max(0, speed - 0.05)

  // Emit new particles
  if (emitSpeed > 0) {
    trail.emitAccumulator += EMIT_RATE * emitSpeed * dt
    while (trail.emitAccumulator >= 1) {
      trail.emitAccumulator -= 1
      emitParticle(trail, shipX, shipY, shipRotation, emitSpeed)
    }
  }

  // Update existing particles
  for (const p of trail.particles) {
    if (!p.active) continue

    p.life += dt
    if (p.life >= p.maxLife) {
      p.active = false
      p.mesh.visible = false
      continue
    }

    // Move
    p.mesh.position.x += p.vx * dt
    p.mesh.position.y += p.vy * dt

    // Fade and shrink
    const t = p.life / p.maxLife
    const scale = 1 - t * 0.8
    p.mesh.scale.setScalar(scale)

    const mat = p.mesh.material as THREE.MeshStandardMaterial
    mat.opacity = (1 - t) * 0.7
    mat.emissiveIntensity = (1 - t) * 0.8
  }
}

function emitParticle(
  trail: EngineTrail,
  shipX: number,
  shipY: number,
  shipRotation: number,
  speed: number,
): void {
  // Find an inactive particle
  const p = trail.particles.find((p) => !p.active)
  if (!p) return

  // Ship facing direction (rotation 0 = facing up, +90° offset from atan2)
  const facingAngle = shipRotation + Math.PI / 2
  // Spawn behind the ship
  const rearAngle = facingAngle + Math.PI
  const spawnX = shipX + Math.cos(rearAngle) * SPAWN_OFFSET
  const spawnY = shipY + Math.sin(rearAngle) * SPAWN_OFFSET

  // Add some spread
  const spread = (Math.random() - 0.5) * 0.8
  const emitAngle = rearAngle + spread

  const emitSpeed = 15 + speed * 25

  p.mesh.position.set(spawnX, spawnY, 0)
  p.mesh.visible = true
  p.mesh.scale.setScalar(1)
  p.active = true
  p.life = 0
  p.maxLife = PARTICLE_LIFETIME * (0.8 + Math.random() * 0.4)
  p.vx = Math.cos(emitAngle) * emitSpeed
  p.vy = Math.sin(emitAngle) * emitSpeed

  const mat = p.mesh.material as THREE.MeshStandardMaterial
  mat.opacity = 0.7
  mat.emissiveIntensity = 0.8
}

export function disposeEngineTrail(trail: EngineTrail): void {
  for (const p of trail.particles) {
    p.mesh.geometry.dispose()
    if (p.mesh.material instanceof THREE.Material) {
      p.mesh.material.dispose()
    }
  }
}
