/**
 * Warp speed streaks — radial light lines that convey extreme speed
 * or a gravitational pull effect. Used during the Arbiter approach.
 */

import * as THREE from 'three'

const STREAK_COUNT = 80
const STREAK_LENGTH_MIN = 4
const STREAK_LENGTH_MAX = 20
const STREAK_SPREAD = 300
const STREAK_Z = -5

export interface WarpStreaks {
  group: THREE.Group
  lines: {
    mesh: THREE.Mesh
    baseX: number
    baseY: number
    speed: number
    phase: number
  }[]
  active: boolean
  intensity: number
}

export function createWarpStreaks(): WarpStreaks {
  const group = new THREE.Group()
  const lines: WarpStreaks['lines'] = []

  for (let i = 0; i < STREAK_COUNT; i++) {
    // Random position in a ring around center (not too close to center)
    const angle = Math.random() * Math.PI * 2
    const dist = 30 + Math.random() * STREAK_SPREAD
    const baseX = Math.cos(angle) * dist
    const baseY = Math.sin(angle) * dist

    // Streak geometry — thin elongated box
    const length = STREAK_LENGTH_MIN + Math.random() * (STREAK_LENGTH_MAX - STREAK_LENGTH_MIN)
    const geo = new THREE.BoxGeometry(0.3, length, 0.3)

    // Blueish-white color with some variation
    const hue = 0.55 + Math.random() * 0.1 // blue to cyan
    const color = new THREE.Color().setHSL(hue, 0.6, 0.7 + Math.random() * 0.3)
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
    })

    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(baseX, baseY, STREAK_Z)

    // Orient streak radially outward from center
    mesh.rotation.z = angle - Math.PI / 2

    mesh.visible = false
    group.add(mesh)

    lines.push({
      mesh,
      baseX,
      baseY,
      speed: 0.5 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
    })
  }

  return { group, lines, active: false, intensity: 0 }
}

export function updateWarpStreaks(
  streaks: WarpStreaks,
  dt: number,
  active: boolean,
  centerX: number,
  centerY: number,
  time: number,
): void {
  // Ramp intensity up/down
  const targetIntensity = active ? 1 : 0
  const rampSpeed = active ? 2.0 : 3.0
  streaks.intensity += (targetIntensity - streaks.intensity) * Math.min(1, rampSpeed * dt)
  streaks.active = streaks.intensity > 0.01

  if (!streaks.active) {
    for (const line of streaks.lines) {
      line.mesh.visible = false
    }
    return
  }

  for (const line of streaks.lines) {
    line.mesh.visible = true

    // Animate: streaks pulse in brightness and stretch outward
    const pulse = 0.5 + 0.5 * Math.sin(time * line.speed * 3 + line.phase)
    const opacity = streaks.intensity * pulse * 0.7

    const mat = line.mesh.material as THREE.MeshBasicMaterial
    mat.opacity = opacity

    // Move streak positions relative to camera center
    line.mesh.position.x = centerX + line.baseX
    line.mesh.position.y = centerY + line.baseY

    // Stretch effect: scale Y increases with intensity
    const stretch = 1 + streaks.intensity * 2 * (0.5 + pulse * 0.5)
    line.mesh.scale.set(1, stretch, 1)
  }
}

export function disposeWarpStreaks(streaks: WarpStreaks): void {
  for (const line of streaks.lines) {
    line.mesh.geometry.dispose()
    ;(line.mesh.material as THREE.MeshBasicMaterial).dispose()
  }
}
