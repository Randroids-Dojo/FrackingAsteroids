import * as THREE from 'three'

/**
 * Rick-and-Morty-style space gas station color palette.
 * Neon greens, pinks, and teals against grimy metal.
 */
export const GAS_STATION_COLORS = {
  // Structure
  metal: 0x556677,
  metalDark: 0x3a4a55,
  metalLight: 0x7a8a99,
  floor: 0x444455,
  // Neon signage (Rick & Morty portal palette)
  neonGreen: 0x39ff14,
  neonPink: 0xff1493,
  neonTeal: 0x00f5ff,
  neonYellow: 0xffe500,
  // Fuel pumps
  pumpBody: 0x883333,
  pumpScreen: 0x22ff66,
  // Window / glass
  glass: 0x44aacc,
  // Roof accent
  roofStripe: 0xcc3355,
} as const

/** Voxel size for the gas station — same scale as asteroids for visibility. */
const GS_VOXEL = 2.0

function addVoxel(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  color: number,
  emissive?: number,
  emissiveIntensity?: number,
): void {
  const geo = new THREE.BoxGeometry(GS_VOXEL, GS_VOXEL, GS_VOXEL)
  const mat = new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    emissive: emissive ?? 0x000000,
    emissiveIntensity: emissiveIntensity ?? 0,
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.position.set(x * GS_VOXEL, y * GS_VOXEL, z * GS_VOXEL)
  group.add(mesh)
}

/**
 * Build a voxel-style space gas station, Rick & Morty aesthetic.
 * Boxy main building, canopy with fuel pumps, neon sign on top.
 * Returns the group + a list of neon meshes for animation.
 */
export function createGasStationModel(): {
  group: THREE.Group
  neonMeshes: THREE.Mesh[]
} {
  const station = new THREE.Group()
  const neonMeshes: THREE.Mesh[] = []

  const { metal, metalDark, metalLight, floor, glass, roofStripe, pumpBody, pumpScreen } =
    GAS_STATION_COLORS
  const { neonGreen, neonPink, neonTeal, neonYellow } = GAS_STATION_COLORS

  // Helper to add a neon voxel (tracked for animation)
  function addNeonVoxel(
    x: number,
    y: number,
    z: number,
    color: number,
    intensity: number = 0.9,
  ): void {
    const geo = new THREE.BoxGeometry(GS_VOXEL, GS_VOXEL, GS_VOXEL)
    const mat = new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
      emissive: color,
      emissiveIntensity: intensity,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x * GS_VOXEL, y * GS_VOXEL, z * GS_VOXEL)
    station.add(mesh)
    neonMeshes.push(mesh)
  }

  // =====================
  // MAIN BUILDING (8 wide × 5 deep × 4 tall)
  // Centered on x, extending in +y (north) direction
  // =====================

  // Floor slab
  for (let x = -4; x <= 4; x++) {
    for (let y = -3; y <= 3; y++) {
      addVoxel(station, x, y, 0, floor)
    }
  }

  // Walls — left, right, back
  for (let z = 1; z <= 3; z++) {
    // Left wall
    for (let y = -3; y <= 3; y++) {
      addVoxel(station, -4, y, z, metal)
    }
    // Right wall
    for (let y = -3; y <= 3; y++) {
      addVoxel(station, 4, y, z, metal)
    }
    // Back wall (north side)
    for (let x = -3; x <= 3; x++) {
      addVoxel(station, x, 3, z, metalDark)
    }
  }

  // Front wall with window gap (south side, facing player approach)
  for (let z = 1; z <= 3; z++) {
    for (let x = -3; x <= 3; x++) {
      if (z >= 2 && x >= -1 && x <= 1) {
        // Glass window strip
        addVoxel(station, x, -3, z, glass, 0x225577, 0.3)
      } else {
        addVoxel(station, x, -3, z, metal)
      }
    }
  }

  // Roof
  for (let x = -4; x <= 4; x++) {
    for (let y = -3; y <= 3; y++) {
      const isEdge = x === -4 || x === 4 || y === -3 || y === 3
      addVoxel(station, x, y, 4, isEdge ? roofStripe : metalLight)
    }
  }

  // =====================
  // CANOPY extending south (fuel pump area)
  // =====================
  // Support pillars
  for (let z = 1; z <= 3; z++) {
    addVoxel(station, -3, -6, z, metalDark)
    addVoxel(station, 3, -6, z, metalDark)
  }

  // Canopy roof
  for (let x = -4; x <= 4; x++) {
    for (let y = -7; y <= -4; y++) {
      addVoxel(station, x, y, 4, metalLight)
    }
  }

  // =====================
  // FUEL PUMPS (under canopy)
  // =====================
  // Left pump
  addVoxel(station, -2, -5, 1, pumpBody)
  addVoxel(station, -2, -5, 2, pumpBody)
  addNeonVoxel(-2, -5, 3, pumpScreen, 0.7) // Glowing screen

  // Right pump
  addVoxel(station, 2, -5, 1, pumpBody)
  addVoxel(station, 2, -5, 2, pumpBody)
  addNeonVoxel(2, -5, 3, pumpScreen, 0.7)

  // =====================
  // NEON SIGN on roof — "GAS" in voxels
  // Letters at z=5 (one above roof), centered on x
  // =====================

  // "G" (x: -3 to -1)
  addNeonVoxel(-3, 0, 5, neonGreen)
  addNeonVoxel(-3, 1, 5, neonGreen)
  addNeonVoxel(-3, 2, 5, neonGreen)
  addNeonVoxel(-2, 2, 5, neonGreen)
  addNeonVoxel(-1, 2, 5, neonGreen)
  addNeonVoxel(-1, 0, 5, neonGreen)
  addNeonVoxel(-1, 1, 5, neonGreen)
  addNeonVoxel(-2, 0, 5, neonGreen)

  // "A" (x: 0)
  addNeonVoxel(0, 0, 5, neonPink)
  addNeonVoxel(0, 1, 5, neonPink)
  addNeonVoxel(0, 2, 5, neonPink)
  // A needs width — use z levels to spell vertically
  // Actually let's lay out the sign along the X axis for top-down visibility
  // Re-approach: sign runs along X, letters in X, vertical in Z

  // "S" (x: 1 to 3)
  addNeonVoxel(1, 2, 5, neonTeal)
  addNeonVoxel(2, 2, 5, neonTeal)
  addNeonVoxel(3, 2, 5, neonTeal)
  addNeonVoxel(1, 1, 5, neonTeal)
  addNeonVoxel(2, 1, 5, neonTeal)
  addNeonVoxel(3, 0, 5, neonTeal)
  addNeonVoxel(2, 0, 5, neonTeal)
  addNeonVoxel(1, 0, 5, neonTeal)

  // =====================
  // NEON ACCENT STRIPS (sides of building)
  // =====================
  // Left side neon strip
  for (let y = -3; y <= 3; y += 2) {
    addNeonVoxel(-4, y, 3, neonPink, 0.6)
  }
  // Right side neon strip
  for (let y = -3; y <= 3; y += 2) {
    addNeonVoxel(4, y, 3, neonTeal, 0.6)
  }

  // Canopy edge neon (front of canopy, very Rick & Morty)
  for (let x = -4; x <= 4; x++) {
    addNeonVoxel(x, -7, 4, neonYellow, 0.8)
  }

  // =====================
  // PORTAL-ESQUE RING on top (z=6, small decorative ring)
  // A tiny interdimensional portal antenna — very R&M
  // =====================
  addNeonVoxel(0, 0, 6, neonGreen, 1.2)
  addNeonVoxel(-1, 0, 6, neonPink, 0.8)
  addNeonVoxel(1, 0, 6, neonPink, 0.8)
  addNeonVoxel(0, -1, 6, neonTeal, 0.8)
  addNeonVoxel(0, 1, 6, neonTeal, 0.8)

  return { group: station, neonMeshes }
}

/**
 * Animate the gas station neon lights — flickering / pulsing effect.
 * Call once per frame with elapsed time.
 */
export function updateGasStationNeon(neonMeshes: THREE.Mesh[], elapsed: number): void {
  for (let i = 0; i < neonMeshes.length; i++) {
    const mat = neonMeshes[i].material as THREE.MeshStandardMaterial
    // Each mesh flickers at a slightly different phase
    const phase = i * 1.7
    const flicker = 0.6 + 0.4 * Math.sin(elapsed * 3.0 + phase)
    // Occasional random "glitch" flicker (very R&M)
    const glitch = Math.sin(elapsed * 17.3 + i * 5.1) > 0.92 ? 0.2 : 1.0
    mat.emissiveIntensity = flicker * glitch * (mat.userData?.baseIntensity ?? 0.9)
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
