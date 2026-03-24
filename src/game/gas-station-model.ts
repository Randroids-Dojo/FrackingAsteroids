import * as THREE from 'three'

/**
 * Rick-and-Morty-style space gas station color palette.
 * Inspired by Moon's Drive-In — teal/turquoise dominant, neon pink signage.
 * Model is tilted so the front facade is visible from the top-down camera.
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
  neonOrange: 0xff6622,
  // Windows
  windowGlow: 0xffcc44,
  windowDark: 0x443300,
  // Fuel pumps
  pumpRed: 0xcc2233,
  pumpBody: 0xaa3344,
  // Roof
  roofDark: 0x1a6655,
  // Sign tower
  signPole: 0x666688,
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
 * Build a Rick-and-Morty space gas station (Moon's Drive-In inspired).
 * Much larger and more recognizable as a building.
 *
 * The model is tilted ~30° around X so the top-down camera sees
 * both the roof and the front facade — fake isometric.
 *
 * Key features for readability:
 * - Tall sign tower with "GAS" (like a real gas station pylon)
 * - Wide main diner building with obvious windows
 * - Separate canopy area with fuel pump islands
 * - Floating platform with neon underglow
 * - Parked ships for scale reference
 */
export function createGasStationModel(): {
  group: THREE.Group
  neonMeshes: THREE.Mesh[]
} {
  const inner = new THREE.Group()
  const outer = new THREE.Group()
  const neonMeshes: THREE.Mesh[] = []

  const C = GAS_STATION_COLORS

  function neon(
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

  function v(x: number, y: number, z: number, color: number): void {
    addVoxel(inner, x, y, z, color)
  }

  function vGlow(
    x: number,
    y: number,
    z: number,
    color: number,
    emColor: number,
    emInt: number,
  ): void {
    addVoxel(inner, x, y, z, color, emColor, emInt)
  }

  // =========================================================
  // FLOATING PLATFORM — big chunky base (x: -10 to 14, y: -6 to 6)
  // =========================================================
  for (let x = -10; x <= 14; x++) {
    for (let y = -6; y <= 6; y++) {
      // Rounded corners
      const cx = (x - 2) * 0.35
      const cy = y * 0.5
      if (cx * cx + cy * cy > 12) continue
      v(x, y, -1, (x + y) % 2 === 0 ? C.platform : C.platformDark)
    }
  }
  // Platform edge glow
  for (let x = -10; x <= 14; x++) {
    for (let y = -6; y <= 6; y++) {
      const cx = (x - 2) * 0.35
      const cy = y * 0.5
      const d = cx * cx + cy * cy
      if (d > 10.5 && d <= 12) {
        neon(x, y, -2, C.neonTeal, 0.4)
      }
    }
  }

  // =========================================================
  // MAIN BUILDING — wide retro diner
  // x: -8 to 5, y: -3 to 4, z: 0 to 5
  // =========================================================

  // Solid walls — back (y=4), left (x=-8), right (x=5)
  for (let z = 0; z <= 4; z++) {
    for (let x = -8; x <= 5; x++) {
      v(x, 4, z, z <= 1 ? C.tealDark : C.teal)
    }
    for (let y = -2; y <= 3; y++) {
      v(-8, y, z, C.teal)
      v(5, y, z, C.teal)
    }
  }

  // Interior fill (so it's not hollow from above)
  for (let x = -7; x <= 4; x++) {
    for (let y = -2; y <= 3; y++) {
      v(x, y, 0, C.darkTrim) // floor
    }
  }

  // ---- FRONT FACADE (y = -3) — the money shot ----
  // Bottom row: dark base trim
  for (let x = -8; x <= 5; x++) {
    v(x, -3, 0, C.darkTrim)
  }

  // Facade z=1 to z=3: windows between pillars
  for (let z = 1; z <= 3; z++) {
    for (let x = -8; x <= 5; x++) {
      // Pillars every 4 voxels and at edges
      const isPillar = x === -8 || x === -4 || x === 1 || x === 5
      if (isPillar) {
        v(x, -3, z, C.teal)
      } else {
        // Windows — warm interior glow
        const glow = z === 2 ? 0.7 : 0.4
        vGlow(x, -3, z, C.windowDark, C.windowGlow, glow)
      }
    }
  }

  // Upper facade band (z=4): solid teal with neon stripe
  for (let x = -8; x <= 5; x++) {
    v(x, -3, 4, C.tealLight)
  }

  // Horizontal neon stripe across facade top
  for (let x = -8; x <= 5; x++) {
    neon(x, -3, 5, C.neonPink, 1.0)
  }

  // Horizontal neon stripe at window sill level
  for (let x = -8; x <= 5; x += 3) {
    neon(x, -3, 1, C.neonTeal, 0.5)
  }

  // ---- ROOF (z=5) ----
  for (let x = -9; x <= 6; x++) {
    for (let y = -4; y <= 4; y++) {
      const color = (x + y) % 3 === 0 ? C.grime : C.roofDark
      v(x, y, 5, color)
    }
  }
  // Roof overhang front lip — visible teal edge
  for (let x = -9; x <= 6; x++) {
    v(x, -4, 5, C.tealLight)
  }

  // Neon underglow on overhang front (very visible when tilted)
  for (let x = -9; x <= 6; x += 2) {
    neon(x, -4, 4, C.neonPink, 0.6)
  }

  // =========================================================
  // TALL SIGN TOWER — the iconic gas station pylon
  // Left side of building, x=-10, tall vertical with "GAS" at top
  // This is the most recognizable feature of a gas station
  // =========================================================

  // Pole (z: 0 to 10)
  for (let z = 0; z <= 10; z++) {
    v(-10, -1, z, C.signPole)
    v(-10, 0, z, C.signPole)
  }

  // Sign board at top (x: -11 to -9, z: 8 to 12)
  for (let x = -11; x <= -9; x++) {
    for (let z = 7; z <= 12; z++) {
      v(x, -1, z, C.darkTrim)
      v(x, 0, z, C.darkTrim)
    }
  }

  // Neon border around sign
  for (let z = 7; z <= 12; z++) {
    neon(-12, -1, z, C.neonPink, 1.0)
    neon(-8, -1, z, C.neonPink, 1.0)
  }
  for (let x = -11; x <= -9; x++) {
    neon(x, -1, 13, C.neonPink, 1.0)
    neon(x, -1, 6, C.neonPink, 1.0)
  }

  // "G" on sign (z: 10-12, x: -11 to -9) — front face y=-2
  neon(-11, -2, 12, C.neonGreen, 1.3)
  neon(-10, -2, 12, C.neonGreen, 1.3)
  neon(-9, -2, 12, C.neonGreen, 1.3)
  neon(-11, -2, 11, C.neonGreen, 1.3)
  neon(-11, -2, 10, C.neonGreen, 1.2)
  neon(-10, -2, 10, C.neonGreen, 1.2)
  neon(-9, -2, 10, C.neonGreen, 1.2)
  neon(-9, -2, 11, C.neonGreen, 1.2) // shelf

  // "A" on sign (z: 7-9, shifted down)
  neon(-11, -2, 9, C.neonYellow, 1.3)
  neon(-10, -2, 9, C.neonYellow, 1.3)
  neon(-9, -2, 9, C.neonYellow, 1.3)
  neon(-11, -2, 8, C.neonYellow, 1.3)
  neon(-9, -2, 8, C.neonYellow, 1.3)
  neon(-10, -2, 8, C.neonYellow, 1.1) // crossbar
  neon(-11, -2, 7, C.neonYellow, 1.2)
  neon(-9, -2, 7, C.neonYellow, 1.2)

  // "S" would overlap — instead put a big neon star/circle at top
  neon(-10, -2, 14, C.neonRed, 1.5) // beacon on top

  // =========================================================
  // CANOPY — separate fuel pump area (x: 7 to 13, y: -4 to 4)
  // Big flat roof with visible pillars and pump islands
  // =========================================================

  // Canopy roof (z=4, one layer lower than main building roof)
  for (let x = 7; x <= 13; x++) {
    for (let y = -4; y <= 4; y++) {
      const stripe = y === 0 // center racing stripe
      v(x, y, 4, stripe ? C.neonPink : x % 2 === 0 ? C.tealDark : C.teal)
    }
  }

  // Canopy support pillars (4 corners, z: 0-3)
  const pillarPositions = [
    [7, -4],
    [13, -4],
    [7, 4],
    [13, 4],
  ]
  for (const [px, py] of pillarPositions) {
    for (let z = 0; z <= 3; z++) {
      v(px, py, z, C.platformEdge)
    }
  }

  // Neon edge strips on canopy
  for (let x = 7; x <= 13; x++) {
    neon(x, -4, 4, C.neonOrange, 0.8) // front edge
    neon(x, 4, 4, C.neonOrange, 0.6) // back edge
  }
  for (let y = -3; y <= 3; y++) {
    neon(13, y, 4, C.neonOrange, 0.7) // right edge
  }

  // ---- FUEL PUMP ISLANDS ----
  // Island 1 (x=9, y: -2 to 2) — row of 3 pumps
  for (let y = -2; y <= 2; y += 2) {
    v(9, y, 0, C.pumpBody)
    v(9, y, 1, C.pumpRed)
    v(9, y, 2, C.pumpRed)
    neon(9, y, 3, C.neonGreen, 0.9) // screen on top
  }

  // Island 2 (x=12, y: -2 to 2)
  for (let y = -2; y <= 2; y += 2) {
    v(12, y, 0, C.pumpBody)
    v(12, y, 1, C.pumpRed)
    v(12, y, 2, C.pumpRed)
    neon(12, y, 3, C.neonGreen, 0.9)
  }

  // Concrete pump island pads (lighter ground)
  for (let y = -3; y <= 3; y++) {
    v(9, y, 0, C.platformEdge)
    v(12, y, 0, C.platformEdge)
  }

  // "GASOLINE" text on canopy front edge — just neon dots spelling it out
  // Simplified: alternating colored neon across the canopy front
  neon(8, -5, 4, C.neonRed, 1.0)
  neon(9, -5, 4, C.neonYellow, 1.0)
  neon(10, -5, 4, C.neonGreen, 1.0)
  neon(11, -5, 4, C.neonRed, 1.0)
  neon(12, -5, 4, C.neonYellow, 1.0)

  // =========================================================
  // ROOFTOP DETAILS — antenna, vents, portal dish
  // =========================================================

  // Big antenna/dish (center of main building roof)
  v(-1, 1, 6, C.darkTrim)
  v(-1, 1, 7, C.darkTrim)
  v(-1, 1, 8, C.signPole)
  neon(-1, 1, 9, C.neonGreen, 1.5) // glowing tip

  // Dish arms
  neon(-2, 1, 7, C.neonTeal, 0.8)
  neon(0, 1, 7, C.neonTeal, 0.8)
  neon(-1, 2, 7, C.neonTeal, 0.8)
  neon(-1, 0, 7, C.neonTeal, 0.8)

  // Roof vents (small dark blocks)
  v(2, 2, 6, C.grime)
  v(4, 0, 6, C.grime)

  // =========================================================
  // PARKED SHIPS — colorful blobs for scale & life
  // =========================================================
  // Left side parking lot
  v(-7, -5, 0, 0xff6600) // orange
  v(-7, -5, 1, 0xff6600)
  v(-5, -5, 0, 0xcc0044) // red
  v(-5, -5, 1, 0xcc0044)
  v(-3, -5, 0, 0x4488ff) // blue
  v(-3, -5, 1, 0x4488ff)

  // Right side — a ship at the pump
  v(10, -1, 0, 0xffaa00) // yellow ship at pump
  v(11, -1, 0, 0xffaa00)
  v(10, -1, 1, 0xffaa00)

  v(10, 2, 0, 0x88ff44) // green ship
  v(11, 2, 0, 0x88ff44)

  // =========================================================
  // CONNECTING WALKWAY between building and canopy (x: 5 to 7)
  // =========================================================
  for (let y = -2; y <= 2; y++) {
    v(6, y, 0, C.platformDark)
    v(6, y, 4, C.tealDark) // roof bridge
  }
  // Walkway neon edges
  neon(6, -3, 4, C.neonPink, 0.7)
  neon(6, 3, 4, C.neonPink, 0.7)

  // =========================================================
  // TILT for fake isometric view from top-down camera
  // =========================================================
  inner.rotation.x = -Math.PI * 0.18 // ~32 degrees

  // Compensate for tilt moving things upward
  inner.position.y = -4

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
    const phase = i * 1.7
    const flicker = 0.6 + 0.4 * Math.sin(elapsed * 3.0 + phase)
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
