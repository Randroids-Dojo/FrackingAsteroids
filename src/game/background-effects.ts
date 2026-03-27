/**
 * Background visual effects — nebula swirls, distant black holes,
 * and twinkling deep-space stars.
 */

import * as THREE from 'three'

// ---------------------------------------------------------------------------
// Twinkling Stars — enhanced star layer with brightness variation
// ---------------------------------------------------------------------------

const TWINKLE_STAR_COUNT = 200

export interface TwinkleStars {
  points: THREE.Points
  geometry: THREE.BufferGeometry
  /** Per-star base brightness (0.3–1.0). */
  baseBrightness: Float32Array
  /** Per-star twinkle phase offset. */
  phases: Float32Array
  /** Per-star twinkle speed. */
  speeds: Float32Array
}

export function createTwinkleStars(): TwinkleStars {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(TWINKLE_STAR_COUNT * 3)
  const colors = new Float32Array(TWINKLE_STAR_COUNT * 3)
  const baseBrightness = new Float32Array(TWINKLE_STAR_COUNT)
  const phases = new Float32Array(TWINKLE_STAR_COUNT)
  const speeds = new Float32Array(TWINKLE_STAR_COUNT)

  // Star color palette — warm whites, pale blues, subtle golds
  const starColors = [
    [1.0, 1.0, 1.0],
    [0.8, 0.9, 1.0],
    [1.0, 0.95, 0.8],
    [0.7, 0.85, 1.0],
    [1.0, 0.9, 0.9],
  ]

  for (let i = 0; i < TWINKLE_STAR_COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 1200
    positions[i * 3 + 1] = (Math.random() - 0.5) * 1200
    positions[i * 3 + 2] = -40 + Math.random() * -20

    const c = starColors[Math.floor(Math.random() * starColors.length)]
    colors[i * 3] = c[0]
    colors[i * 3 + 1] = c[1]
    colors[i * 3 + 2] = c[2]

    baseBrightness[i] = 0.3 + Math.random() * 0.7
    phases[i] = Math.random() * Math.PI * 2
    speeds[i] = 0.5 + Math.random() * 2.0
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const material = new THREE.PointsMaterial({
    size: 0.8,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
  })

  const points = new THREE.Points(geometry, material)

  return { points, geometry, baseBrightness, phases, speeds }
}

export function updateTwinkleStars(
  stars: TwinkleStars,
  time: number,
  camX: number,
  camY: number,
): void {
  // Parallax at slower rate than main stars
  stars.points.position.x = camX * 0.3
  stars.points.position.y = camY * 0.3

  // Update brightness via color attribute
  const colors = stars.geometry.getAttribute('color') as THREE.BufferAttribute
  const arr = colors.array as Float32Array

  for (let i = 0; i < TWINKLE_STAR_COUNT; i++) {
    const brightness =
      stars.baseBrightness[i] * (0.6 + 0.4 * Math.sin(time * stars.speeds[i] + stars.phases[i]))

    const baseR = arr[i * 3]
    const baseG = arr[i * 3 + 1]
    const baseB = arr[i * 3 + 2]

    // Modulate existing color by brightness
    arr[i * 3] = baseR > 0 ? Math.min(1, (baseR / Math.max(baseR, baseG, baseB)) * brightness) : 0
    arr[i * 3 + 1] =
      baseG > 0 ? Math.min(1, (baseG / Math.max(baseR, baseG, baseB)) * brightness) : 0
    arr[i * 3 + 2] =
      baseB > 0 ? Math.min(1, (baseB / Math.max(baseR, baseG, baseB)) * brightness) : 0
  }

  colors.needsUpdate = true
}

export function disposeTwinkleStars(stars: TwinkleStars): void {
  stars.geometry.dispose()
  if (stars.points.material instanceof THREE.Material) {
    stars.points.material.dispose()
  }
}

// ---------------------------------------------------------------------------
// Nebula Swirls — large semi-transparent glowing clouds
// ---------------------------------------------------------------------------

const NEBULA_COUNT = 5

export interface NebulaSwirl {
  mesh: THREE.Mesh
  baseX: number
  baseY: number
  rotationSpeed: number
  driftSpeed: number
  driftAngle: number
  pulseSpeed: number
  pulsePhase: number
}

export interface NebulaSystem {
  swirls: NebulaSwirl[]
  group: THREE.Group
}

const NEBULA_COLORS = [
  0x220044, // deep purple
  0x001133, // dark blue
  0x110022, // dark magenta
  0x002222, // dark teal
  0x1a0011, // dark maroon
] as const

export function createNebulaSystem(): NebulaSystem {
  const group = new THREE.Group()
  const swirls: NebulaSwirl[] = []

  for (let i = 0; i < NEBULA_COUNT; i++) {
    const size = 80 + Math.random() * 120
    const geo = new THREE.CircleGeometry(size, 32)
    const color = NEBULA_COLORS[i % NEBULA_COLORS.length]

    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.08 + Math.random() * 0.06,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const mesh = new THREE.Mesh(geo, mat)
    const baseX = (Math.random() - 0.5) * 600
    const baseY = (Math.random() - 0.5) * 600
    mesh.position.set(baseX, baseY, -15)

    group.add(mesh)

    swirls.push({
      mesh,
      baseX,
      baseY,
      rotationSpeed: (Math.random() - 0.5) * 0.1,
      driftSpeed: 1 + Math.random() * 2,
      driftAngle: Math.random() * Math.PI * 2,
      pulseSpeed: 0.3 + Math.random() * 0.5,
      pulsePhase: Math.random() * Math.PI * 2,
    })
  }

  return { swirls, group }
}

export function updateNebulaSystem(
  system: NebulaSystem,
  time: number,
  camX: number,
  camY: number,
): void {
  // Parallax at very slow rate
  system.group.position.x = camX * 0.15
  system.group.position.y = camY * 0.15

  for (const swirl of system.swirls) {
    swirl.mesh.rotation.z += swirl.rotationSpeed * 0.016 // approx per-frame
    const mat = swirl.mesh.material as THREE.MeshBasicMaterial
    const basePulse = 0.06 + Math.sin(time * swirl.pulseSpeed + swirl.pulsePhase) * 0.03
    mat.opacity = basePulse
  }
}

export function disposeNebulaSystem(system: NebulaSystem): void {
  for (const swirl of system.swirls) {
    swirl.mesh.geometry.dispose()
    if (swirl.mesh.material instanceof THREE.Material) {
      swirl.mesh.material.dispose()
    }
  }
}

// ---------------------------------------------------------------------------
// Black Hole — gravitational distortion visual
// ---------------------------------------------------------------------------

export interface BlackHole {
  group: THREE.Group
  ringMeshes: THREE.Mesh[]
  coreMesh: THREE.Mesh
  x: number
  y: number
}

export function createBlackHole(x: number, y: number): BlackHole {
  const group = new THREE.Group()
  group.position.set(x, y, -10)

  // Dark core
  const coreGeo = new THREE.CircleGeometry(8, 32)
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.9,
  })
  const coreMesh = new THREE.Mesh(coreGeo, coreMat)
  group.add(coreMesh)

  // Accretion rings
  const ringMeshes: THREE.Mesh[] = []
  const ringColors = [0xff4400, 0xff8800, 0xffaa00, 0xff6600]

  for (let i = 0; i < 4; i++) {
    const innerRadius = 10 + i * 4
    const outerRadius = innerRadius + 2
    const geo = new THREE.RingGeometry(innerRadius, outerRadius, 64)
    const mat = new THREE.MeshBasicMaterial({
      color: ringColors[i],
      transparent: true,
      opacity: 0.15 - i * 0.03,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const mesh = new THREE.Mesh(geo, mat)
    group.add(mesh)
    ringMeshes.push(mesh)
  }

  return { group, ringMeshes, coreMesh, x, y }
}

export function updateBlackHole(hole: BlackHole, time: number, camX: number, camY: number): void {
  // Parallax
  hole.group.position.x = hole.x + camX * 0.1
  hole.group.position.y = hole.y + camY * 0.1

  // Spin rings at different speeds
  for (let i = 0; i < hole.ringMeshes.length; i++) {
    hole.ringMeshes[i].rotation.z = time * (0.3 + i * 0.15) * (i % 2 === 0 ? 1 : -1)
    const mat = hole.ringMeshes[i].material as THREE.MeshBasicMaterial
    mat.opacity = 0.12 - i * 0.02 + Math.sin(time * 2 + i) * 0.03
  }
}

export function disposeBlackHole(hole: BlackHole): void {
  hole.coreMesh.geometry.dispose()
  ;(hole.coreMesh.material as THREE.Material).dispose()
  for (const ring of hole.ringMeshes) {
    ring.geometry.dispose()
    ;(ring.material as THREE.Material).dispose()
  }
}
