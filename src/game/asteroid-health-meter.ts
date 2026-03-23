import * as THREE from 'three'

/** Health meter bar width in world units. */
const HEALTH_BAR_WIDTH = 10

/** Health meter bar height in world units. */
const HEALTH_BAR_HEIGHT = 0.6

/** Vertical offset above the asteroid center. */
const HEALTH_BAR_OFFSET_Y = 12

/** Background color (dark, semi-transparent). */
const BG_COLOR = 0x333344

/** Fill color — green when healthy, red when low. */
const HEALTHY_COLOR = 0x00ff88
const DAMAGED_COLOR = 0xffaa00
const CRITICAL_COLOR = 0xff4444

/** Threshold for color changes (fraction of maxHp). */
const DAMAGED_THRESHOLD = 0.5
const CRITICAL_THRESHOLD = 0.25

export interface HealthMeterState {
  visible: boolean
  progress: number
  color: number
}

/**
 * Compute health meter display state from asteroid HP.
 * Only visible when asteroid has taken damage (hp < maxHp).
 */
export function computeHealthMeterState(hp: number, maxHp: number): HealthMeterState {
  if (maxHp <= 0) return { visible: false, progress: 0, color: CRITICAL_COLOR }

  const fraction = Math.max(0, Math.min(1, hp / maxHp))

  if (fraction >= 1) {
    return { visible: false, progress: 1, color: HEALTHY_COLOR }
  }

  let color: number
  if (fraction <= CRITICAL_THRESHOLD) {
    color = CRITICAL_COLOR
  } else if (fraction <= DAMAGED_THRESHOLD) {
    color = DAMAGED_COLOR
  } else {
    color = HEALTHY_COLOR
  }

  return { visible: true, progress: fraction, color }
}

/**
 * Create a health meter group to display above an asteroid.
 */
export function createHealthMeter(): THREE.Group {
  const group = new THREE.Group()

  const bgGeo = new THREE.PlaneGeometry(HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT)
  const bgMat = new THREE.MeshBasicMaterial({ color: BG_COLOR, transparent: true, opacity: 0.6 })
  const bg = new THREE.Mesh(bgGeo, bgMat)
  bg.position.set(0, HEALTH_BAR_OFFSET_Y, 0.5)
  group.add(bg)

  const fillGeo = new THREE.PlaneGeometry(HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT)
  const fillMat = new THREE.MeshBasicMaterial({ color: HEALTHY_COLOR })
  const fill = new THREE.Mesh(fillGeo, fillMat)
  fill.position.set(0, HEALTH_BAR_OFFSET_Y, 0.51)
  group.add(fill)

  group.userData = { fill, fillMat, prevColor: 0 }
  group.visible = false

  return group
}

/**
 * Update the health meter to reflect current HP.
 */
export function updateHealthMeter(meter: THREE.Group, hp: number, maxHp: number): void {
  const state = computeHealthMeterState(hp, maxHp)

  meter.visible = state.visible

  if (!state.visible) return

  const ud = meter.userData as {
    fill: THREE.Mesh
    fillMat: THREE.MeshBasicMaterial
    prevColor: number
  }

  ud.fill.scale.x = state.progress
  ud.fill.position.x = -(HEALTH_BAR_WIDTH * (1 - state.progress)) / 2

  if (state.color !== ud.prevColor) {
    ud.fillMat.color.setHex(state.color)
    ud.prevColor = state.color
  }
}
