import * as THREE from 'three'

/**
 * Rick-and-Morty-style space gas station color palette.
 * Neon greens, pinks, and teals against grimy metal.
 * Designed for TOP-DOWN visibility (camera at z=150 looking down).
 */
export const GAS_STATION_COLORS = {
  // Structure surfaces (visible from above as the "floor plan")
  metalDark: 0x3a4a55,
  metalLight: 0x7a8a99,
  grime: 0x3d3d44,
  // Neon signage (Rick & Morty portal palette)
  neonGreen: 0x39ff14,
  neonPink: 0xff1493,
  neonTeal: 0x00f5ff,
  neonYellow: 0xffe500,
  neonOrange: 0xff6622,
  // Fuel pumps (from above: colored dots)
  pumpRed: 0xcc2233,
  pumpScreen: 0x22ff66,
  // Canopy
  canopy: 0x4a5568,
  canopyStripe: 0xcc3355,
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
 * Build a voxel-style space gas station for TOP-DOWN camera.
 * All visual detail is on the roof/top surface since the camera looks straight down.
 * Rick & Morty aesthetic: neon outlines, grimy surfaces, portal colors.
 *
 * Layout (seen from above):
 * - Main building (north): rectangle with neon border and "GAS" painted on roof
 * - Canopy (south): open structure with fuel pump islands and neon edge lighting
 * - Portal ring: glowing circle on the roof
 */
export function createGasStationModel(): {
  group: THREE.Group
  neonMeshes: THREE.Mesh[]
} {
  const station = new THREE.Group()
  const neonMeshes: THREE.Mesh[] = []

  const { metalDark, metalLight, grime, canopy, canopyStripe, pumpRed, pumpScreen } =
    GAS_STATION_COLORS
  const { neonGreen, neonPink, neonTeal, neonYellow, neonOrange } = GAS_STATION_COLORS

  // Helper to add a neon voxel (tracked for flicker animation)
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

  // Everything sits at z=0 (ground) and z=1 (roof surface).
  // Neon sits at z=1 so it's the top-most visible layer.

  // =====================
  // MAIN BUILDING — north section (y: 1 to 6)
  // 10 wide × 6 deep, viewed from above
  // =====================

  // Building base (z=0, gives the structure a little depth)
  for (let x = -5; x <= 5; x++) {
    for (let y = 1; y <= 6; y++) {
      addVoxel(station, x, y, 0, metalDark)
    }
  }

  // Roof surface (z=1) — grimy metal with some variation
  for (let x = -4; x <= 4; x++) {
    for (let y = 2; y <= 5; y++) {
      const color = (x + y) % 3 === 0 ? grime : metalLight
      addVoxel(station, x, y, 1, color)
    }
  }

  // Neon border around the building roof (z=1)
  // Top edge (north)
  for (let x = -5; x <= 5; x++) {
    addNeonVoxel(x, 6, 1, neonPink, 0.8)
  }
  // Bottom edge (south side of building)
  for (let x = -5; x <= 5; x++) {
    addNeonVoxel(x, 1, 1, neonPink, 0.8)
  }
  // Left edge
  for (let y = 2; y <= 5; y++) {
    addNeonVoxel(-5, y, 1, neonTeal, 0.7)
  }
  // Right edge
  for (let y = 2; y <= 5; y++) {
    addNeonVoxel(5, y, 1, neonTeal, 0.7)
  }

  // =====================
  // "GAS" NEON SIGN painted on the roof (z=2, above roof)
  // Letters run along X axis, "written" in Y height (3 tall)
  // Visible from directly above
  // =====================

  // "G" — x: -4 to -2, y: 3 to 5
  addNeonVoxel(-4, 5, 2, neonGreen, 1.0) // top-left
  addNeonVoxel(-3, 5, 2, neonGreen, 1.0) // top-mid
  addNeonVoxel(-2, 5, 2, neonGreen, 1.0) // top-right
  addNeonVoxel(-4, 4, 2, neonGreen, 1.0) // mid-left
  addNeonVoxel(-4, 3, 2, neonGreen, 1.0) // bot-left
  addNeonVoxel(-3, 3, 2, neonGreen, 1.0) // bot-mid
  addNeonVoxel(-2, 3, 2, neonGreen, 1.0) // bot-right
  addNeonVoxel(-2, 4, 2, neonGreen, 1.0) // mid-right (shelf of G)

  // "A" — x: 0 to 2, y: 3 to 5
  addNeonVoxel(0, 5, 2, neonPink, 1.0) // top-left
  addNeonVoxel(1, 5, 2, neonPink, 1.0) // top-mid
  addNeonVoxel(2, 5, 2, neonPink, 1.0) // top-right
  addNeonVoxel(0, 4, 2, neonPink, 1.0) // mid-left
  addNeonVoxel(1, 4, 2, neonPink, 1.0) // mid-bar
  addNeonVoxel(2, 4, 2, neonPink, 1.0) // mid-right
  addNeonVoxel(0, 3, 2, neonPink, 1.0) // bot-left
  addNeonVoxel(2, 3, 2, neonPink, 1.0) // bot-right (no bottom bar)

  // "S" — x: 4 (single column, so shift) → x: 3 to 5 would be off edge
  // Use x: 3 to 4, y: 3 to 5 (compact S)
  addNeonVoxel(4, 5, 2, neonTeal, 1.0) // top-right
  addNeonVoxel(3, 5, 2, neonTeal, 1.0) // top-left (top bar)
  addNeonVoxel(3, 4, 2, neonTeal, 1.0) // mid-left
  addNeonVoxel(4, 4, 2, neonTeal, 1.0) // mid-right (mid bar)
  addNeonVoxel(4, 3, 2, neonTeal, 1.0) // bot-right
  addNeonVoxel(3, 3, 2, neonTeal, 1.0) // bot-left (bottom bar)

  // =====================
  // CANOPY — south section (y: -6 to 0)
  // Open-air fuel pump area with a thin roof
  // =====================

  // Canopy roof surface (z=0, slightly lower than building)
  for (let x = -5; x <= 5; x++) {
    for (let y = -6; y <= 0; y++) {
      const isStripe = y === -3 // center racing stripe
      addVoxel(station, x, y, 0, isStripe ? canopyStripe : canopy)
    }
  }

  // Neon edge around canopy (z=1, sits on top)
  // South edge (front of station — what you fly toward)
  for (let x = -5; x <= 5; x++) {
    addNeonVoxel(x, -6, 1, neonYellow, 1.0)
  }
  // Left & right canopy edges
  for (let y = -5; y <= 0; y++) {
    addNeonVoxel(-5, y, 1, neonOrange, 0.6)
    addNeonVoxel(5, y, 1, neonOrange, 0.6)
  }

  // =====================
  // FUEL PUMP ISLANDS (on canopy, visible as colored blocks from above)
  // Two pump islands, each 1×3, with neon screens
  // =====================

  // Left pump island
  addVoxel(station, -2, -2, 1, pumpRed)
  addNeonVoxel(-2, -1, 1, pumpScreen, 0.8)
  addVoxel(station, -2, -4, 1, pumpRed)
  addNeonVoxel(-2, -5, 1, pumpScreen, 0.8)

  // Right pump island
  addVoxel(station, 2, -2, 1, pumpRed)
  addNeonVoxel(2, -1, 1, pumpScreen, 0.8)
  addVoxel(station, 2, -4, 1, pumpRed)
  addNeonVoxel(2, -5, 1, pumpScreen, 0.8)

  // Fuel hose lines (thin neon strips between pumps)
  addNeonVoxel(-2, -3, 1, neonYellow, 0.4)
  addNeonVoxel(2, -3, 1, neonYellow, 0.4)

  // =====================
  // PORTAL RING on building roof (z=2)
  // Interdimensional portal antenna — very R&M, glowing ring from above
  // =====================
  // Ring of 8 voxels around center
  addNeonVoxel(-1, 4, 2, neonGreen, 1.2)
  addNeonVoxel(0, 4, 2, neonTeal, 1.0)
  addNeonVoxel(1, 4, 2, neonPink, 1.2)
  // Center glow
  addNeonVoxel(0, 3, 2, neonGreen, 1.5)

  // =====================
  // CORNER ACCENT LIGHTS — little neon dots at building corners
  // =====================
  addNeonVoxel(-5, 6, 2, neonGreen, 1.0)
  addNeonVoxel(5, 6, 2, neonGreen, 1.0)
  addNeonVoxel(-5, 1, 2, neonPink, 1.0)
  addNeonVoxel(5, 1, 2, neonPink, 1.0)

  // =====================
  // LANDING PAD MARKERS (south of canopy, guide the player in)
  // Small neon dots like runway lights
  // =====================
  addNeonVoxel(-3, -7, 0, neonYellow, 0.5)
  addNeonVoxel(3, -7, 0, neonYellow, 0.5)
  addNeonVoxel(-3, -8, 0, neonOrange, 0.4)
  addNeonVoxel(3, -8, 0, neonOrange, 0.4)

  return { group: station, neonMeshes }
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
