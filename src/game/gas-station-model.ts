import * as THREE from 'three'

/**
 * Rick-and-Morty-style space gas station color palette.
 * Inspired by Moon's Drive-In — teal/turquoise dominant, neon pink signage.
 * Model is tilted ~35° so the front facade is visible from the top-down camera.
 */
export const GAS_STATION_COLORS = {
  // Main structure (teal/turquoise like Moon's Drive-In)
  teal: 0x2dd4a8,
  tealDark: 0x1a9e7e,
  tealLight: 0x5eeacc,
  // Darker accents
  darkTrim: 0x1a3a4a,
  grime: 0x2a3a3a,
  // Platform / base
  platform: 0x556677,
  platformDark: 0x3a4a55,
  platformEdge: 0x44556a,
  // Neon signage
  neonPink: 0xff1493,
  neonRed: 0xff2244,
  neonYellow: 0xffe500,
  neonGreen: 0x39ff14,
  neonTeal: 0x00f5ff,
  // Windows
  windowGlow: 0xffcc44,
  windowDark: 0x443300,
  // Fuel pumps
  pumpRed: 0xcc2233,
  pumpBody: 0xaa3344,
  pumpNozzle: 0x888888,
  // Roof
  roofDark: 0x1a6655,
} as const

/** Voxel size — same as asteroids for proper scale at camera height. */
const V = 2.0

function addVoxel(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  color: number,
  emissive?: number,
  emissiveIntensity?: number,
): void {
  const geo = new THREE.BoxGeometry(V, V, V)
  const mat = new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    emissive: emissive ?? 0x000000,
    emissiveIntensity: emissiveIntensity ?? 0,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x * V, y * V, z * V)
  group.add(mesh)
}

/**
 * Build a Rick-and-Morty-style space gas station (Moon's Drive-In inspired).
 * The model is built in local coords then tilted ~35° around X so the
 * top-down camera sees both the roof and the front facade.
 *
 * Structure:
 * - Floating platform base
 * - Main diner building (teal, wide, retro)
 * - Large front windows with warm glow
 * - Neon "GAS" sign on the front facade
 * - Horizontal neon accent stripes
 * - Canopy wing extending to the right with fuel pumps
 * - Rooftop antenna / portal dish
 */
export function createGasStationModel(): {
  group: THREE.Group
  neonMeshes: THREE.Mesh[]
} {
  // Inner group holds the actual geometry — we tilt this
  const inner = new THREE.Group()
  // Outer group stays upright at world position
  const outer = new THREE.Group()

  const neonMeshes: THREE.Mesh[] = []

  const {
    teal,
    tealDark,
    tealLight,
    darkTrim,
    grime,
    platform,
    platformDark,
    platformEdge,
    windowGlow,
    windowDark,
    pumpRed,
    pumpBody,
    roofDark,
  } = GAS_STATION_COLORS
  const { neonPink, neonRed, neonYellow, neonGreen, neonTeal } = GAS_STATION_COLORS

  function addNeonVoxel(
    x: number,
    y: number,
    z: number,
    color: number,
    intensity: number = 0.9,
  ): void {
    const geo = new THREE.BoxGeometry(V, V, V)
    const mat = new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
      emissive: color,
      emissiveIntensity: intensity,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x * V, y * V, z * V)
    inner.add(mesh)
    neonMeshes.push(mesh)
  }

  // =====================
  // FLOATING PLATFORM (z: -1 to 0)
  // Wide oval-ish base the station sits on
  // =====================
  for (let x = -7; x <= 8; x++) {
    for (let y = -3; y <= 3; y++) {
      const dist = Math.abs(x * 0.4) + Math.abs(y)
      if (dist <= 3.5) {
        addVoxel(inner, x, y, -1, x % 2 === 0 ? platform : platformDark)
      }
    }
  }
  // Platform rim — neon underglow
  for (let x = -7; x <= 8; x++) {
    for (let y = -3; y <= 3; y++) {
      const dist = Math.abs(x * 0.4) + Math.abs(y)
      if (dist > 2.8 && dist <= 3.5) {
        addNeonVoxel(x, y, -2, neonTeal, 0.5)
      }
    }
  }

  // =====================
  // MAIN BUILDING (z: 0 to 4)
  // Wide retro diner — x: -5 to 3, y: -2 to 2
  // =====================

  // Ground floor walls (z: 0 to 2)
  for (let z = 0; z <= 2; z++) {
    // Back wall (y=2)
    for (let x = -5; x <= 3; x++) {
      addVoxel(inner, x, 2, z, tealDark)
    }
    // Left wall (x=-5)
    for (let y = -1; y <= 1; y++) {
      addVoxel(inner, -5, y, z, teal)
    }
    // Right wall (x=3)
    for (let y = -1; y <= 1; y++) {
      addVoxel(inner, 3, y, z, teal)
    }
  }

  // Front facade (y=-2) — the star of the show, visible when tilted
  // Bottom row: dark trim
  for (let x = -5; x <= 3; x++) {
    addVoxel(inner, x, -2, 0, darkTrim)
  }
  // Middle rows: windows with warm glow + teal pillars
  for (let x = -5; x <= 3; x++) {
    if (x === -5 || x === -1 || x === 3) {
      // Structural pillars
      addVoxel(inner, x, -2, 1, teal)
      addVoxel(inner, x, -2, 2, teal)
    } else {
      // Windows — warm yellow glow
      addVoxel(inner, x, -2, 1, windowDark, windowGlow, 0.6)
      addVoxel(inner, x, -2, 2, windowDark, windowGlow, 0.4)
    }
  }

  // Upper facade (z=3) — solid teal with neon stripe
  for (let x = -5; x <= 3; x++) {
    addVoxel(inner, x, -2, 3, tealLight)
  }

  // Neon stripe across the front facade (z=3, the sign band)
  addNeonVoxel(-5, -2, 4, neonPink, 1.0)
  for (let x = -4; x <= 2; x++) {
    addNeonVoxel(x, -2, 4, neonPink, 0.9)
  }
  addNeonVoxel(3, -2, 4, neonPink, 1.0)

  // Second neon stripe lower on facade
  addNeonVoxel(-5, -2, 2.5, neonTeal, 0.5)
  addNeonVoxel(3, -2, 2.5, neonTeal, 0.5)

  // =====================
  // ROOF (z: 3-4)
  // Flat with slight overhang
  // =====================
  for (let x = -6; x <= 4; x++) {
    for (let y = -3; y <= 2; y++) {
      const color = (x + y) % 3 === 0 ? grime : roofDark
      addVoxel(inner, x, y, 3, color)
    }
  }
  // Roof overhang front edge — visible from angle
  for (let x = -6; x <= 4; x++) {
    addVoxel(inner, x, -3, 3, tealLight)
  }

  // =====================
  // "GAS" NEON SIGN on front facade (z=4-5, y=-3, sticking out front)
  // Big blocky neon letters — the marquee
  // =====================

  // "G" — x: -4 to -2
  addNeonVoxel(-4, -3, 5, neonRed, 1.2)
  addNeonVoxel(-3, -3, 5, neonRed, 1.2)
  addNeonVoxel(-2, -3, 5, neonRed, 1.2)
  addNeonVoxel(-4, -3, 4, neonRed, 1.2)
  addNeonVoxel(-4, -3, 3, neonRed, 1.0)
  addNeonVoxel(-3, -3, 3, neonRed, 1.0)
  addNeonVoxel(-2, -3, 3, neonRed, 1.0)
  addNeonVoxel(-2, -3, 4, neonRed, 1.0) // shelf

  // "A" — x: -1 to 1
  addNeonVoxel(-1, -3, 5, neonYellow, 1.2)
  addNeonVoxel(0, -3, 5, neonYellow, 1.2)
  addNeonVoxel(1, -3, 5, neonYellow, 1.2)
  addNeonVoxel(-1, -3, 4, neonYellow, 1.2)
  addNeonVoxel(1, -3, 4, neonYellow, 1.2)
  addNeonVoxel(0, -3, 4, neonYellow, 1.0) // crossbar
  addNeonVoxel(-1, -3, 3, neonYellow, 1.0)
  addNeonVoxel(1, -3, 3, neonYellow, 1.0)

  // "S" — x: 2 to 4
  addNeonVoxel(2, -3, 5, neonGreen, 1.2)
  addNeonVoxel(3, -3, 5, neonGreen, 1.2)
  addNeonVoxel(4, -3, 5, neonGreen, 1.2)
  addNeonVoxel(2, -3, 4, neonGreen, 1.2)
  addNeonVoxel(3, -3, 4, neonGreen, 1.0)
  addNeonVoxel(4, -3, 4, neonGreen, 1.0)
  addNeonVoxel(4, -3, 3, neonGreen, 1.0)
  addNeonVoxel(3, -3, 3, neonGreen, 1.0)
  addNeonVoxel(2, -3, 3, neonGreen, 1.0)

  // =====================
  // CANOPY WING (extends right, x: 4 to 8)
  // Open-air fuel pump area with roof overhang
  // =====================

  // Canopy roof
  for (let x = 4; x <= 8; x++) {
    for (let y = -2; y <= 2; y++) {
      addVoxel(inner, x, y, 3, x % 2 === 0 ? tealDark : teal)
    }
  }

  // Support pillars (z: 0-2)
  for (let z = 0; z <= 2; z++) {
    addVoxel(inner, 5, -2, z, platformEdge)
    addVoxel(inner, 8, -2, z, platformEdge)
    addVoxel(inner, 5, 2, z, platformEdge)
    addVoxel(inner, 8, 2, z, platformEdge)
  }

  // Canopy front neon strip
  for (let x = 4; x <= 8; x++) {
    addNeonVoxel(x, -2, 3, neonPink, 0.7)
  }

  // =====================
  // FUEL PUMPS (under canopy, z: 0-2)
  // =====================
  // Pump 1
  addVoxel(inner, 6, -1, 0, pumpBody)
  addVoxel(inner, 6, -1, 1, pumpRed)
  addNeonVoxel(6, -1, 2, neonGreen, 0.8) // screen

  // Pump 2
  addVoxel(inner, 6, 1, 0, pumpBody)
  addVoxel(inner, 6, 1, 1, pumpRed)
  addNeonVoxel(6, 1, 2, neonGreen, 0.8)

  // Pump 3
  addVoxel(inner, 8, 0, 0, pumpBody)
  addVoxel(inner, 8, 0, 1, pumpRed)
  addNeonVoxel(8, 0, 2, neonGreen, 0.8)

  // =====================
  // ROOFTOP ANTENNA / PORTAL DISH
  // =====================
  addVoxel(inner, -2, 0, 4, darkTrim)
  addVoxel(inner, -2, 0, 5, darkTrim)
  addNeonVoxel(-2, 0, 6, neonGreen, 1.5) // glowing tip
  addNeonVoxel(-3, 0, 5, neonTeal, 0.8) // dish arms
  addNeonVoxel(-1, 0, 5, neonTeal, 0.8)

  // =====================
  // NEON UNDERGLOW on front overhang (very visible when tilted)
  // =====================
  for (let x = -6; x <= 4; x += 2) {
    addNeonVoxel(x, -3, 2, neonPink, 0.6)
  }

  // =====================
  // PARKED "SHIPS" on platform (small colored blobs, R&M style)
  // =====================
  addVoxel(inner, -6, -1, 0, 0xff6600) // orange car
  addVoxel(inner, -6, 1, 0, 0xcc0044) // red car
  addVoxel(inner, -7, 0, 0, 0x4488ff) // blue car

  // =====================
  // TILT the inner group so the facade is visible from above
  // ~35° around X axis tilts the front face toward the camera
  // =====================
  inner.rotation.x = -Math.PI * 0.19 // ~34 degrees

  // Shift down slightly to compensate for tilt lifting the model
  inner.position.y = -2

  outer.add(inner)

  return { group: outer, neonMeshes }
}

/**
 * Animate the gas station neon lights — flickering / pulsing effect.
 * Call once per frame with elapsed time.
 */
export function updateGasStationNeon(neonMeshes: THREE.Mesh[], elapsed: number): void {
  for (let i = 0; i < neonMeshes.length; i++) {
    const mat = neonMeshes[i].material as THREE.MeshStandardMaterial
    const baseIntensity = (mat.userData as { baseIntensity?: number })?.baseIntensity ?? 0.9
    // Each mesh flickers at a slightly different phase
    const phase = i * 1.7
    const flicker = 0.6 + 0.4 * Math.sin(elapsed * 3.0 + phase)
    // Occasional random "glitch" flicker (very R&M)
    const glitch = Math.sin(elapsed * 17.3 + i * 5.1) > 0.92 ? 0.2 : 1.0
    mat.emissiveIntensity = flicker * glitch * baseIntensity
  }
}

/**
 * Store base intensities so the flicker animation can reference them.
 * Call once after creating the model.
 */
export function initGasStationNeon(neonMeshes: THREE.Mesh[]): void {
  for (const mesh of neonMeshes) {
    const mat = mesh.material as THREE.MeshStandardMaterial
    mat.userData = { baseIntensity: mat.emissiveIntensity }
  }
}
