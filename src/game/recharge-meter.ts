import * as THREE from 'three'
import { FIRE_RATES, LAZER_MAX_HEAT, LAZER_COOLDOWN_TIME, clampTier } from './blaster-constants'
import type { BlasterState, LazerState } from './blaster'
import type { MiningTool } from './types'

const BAR_WIDTH = 4
const BAR_HEIGHT = 0.4
const BAR_OFFSET_Y = -3.5

const BG_COLOR = 0x333344
const FILL_COLOR = 0x00ff88
const CHARGING_COLOR = 0xffaa00
const LAZER_HEAT_COLOR = 0x00ccff
const LAZER_HOT_COLOR = 0xff6644
const LAZER_OVERHEAT_COLOR = 0xff4444

// Show "ready" color early so the player can anticipate firing
const READY_THRESHOLD = 0.9

// Show warning color when heat is above this threshold
const HEAT_WARNING_THRESHOLD = 0.7

export interface MeterState {
  visible: boolean
  /** 0–1 fill progress (0 = empty, 1 = full) */
  progress: number
  /** Hex color for the fill bar */
  color: number
}

/**
 * Compute recharge meter display state from blaster cooldown.
 * Pure function — no Three.js dependency.
 */
export function computeMeterState(blaster: BlasterState, tier: number): MeterState {
  const cooldownTotal = 1 / FIRE_RATES[clampTier(tier) - 1]
  const remaining = blaster.cooldownRemaining

  if (remaining <= 0) {
    return { visible: false, progress: 1, color: FILL_COLOR }
  }

  const progress = Math.max(0, Math.min(1, 1 - remaining / cooldownTotal))
  const color = progress >= READY_THRESHOLD ? FILL_COLOR : CHARGING_COLOR
  return { visible: true, progress, color }
}

/**
 * Compute meter display state for the lazer heat/cooldown system.
 * Pure function — no Three.js dependency.
 */
export function computeLazerMeterState(lazer: LazerState): MeterState {
  if (lazer.overheated) {
    // Cooldown phase: bar drains as cooldown progresses
    const progress = Math.max(0, Math.min(1, lazer.cooldownRemaining / LAZER_COOLDOWN_TIME))
    return { visible: true, progress, color: LAZER_OVERHEAT_COLOR }
  }

  const heatRatio = lazer.heat / LAZER_MAX_HEAT
  if (heatRatio <= 0) {
    return { visible: false, progress: 0, color: LAZER_HEAT_COLOR }
  }

  const color = heatRatio >= HEAT_WARNING_THRESHOLD ? LAZER_HOT_COLOR : LAZER_HEAT_COLOR
  return { visible: true, progress: heatRatio, color }
}

/**
 * Creates a recharge meter that sits below the ship.
 * Shows cooldown progress as a horizontal bar.
 */
export function createRechargeMeter(): THREE.Group {
  const group = new THREE.Group()

  const bgGeo = new THREE.PlaneGeometry(BAR_WIDTH, BAR_HEIGHT)
  const bgMat = new THREE.MeshBasicMaterial({ color: BG_COLOR, transparent: true, opacity: 0.5 })
  const bg = new THREE.Mesh(bgGeo, bgMat)
  bg.position.set(0, BAR_OFFSET_Y, 0)
  group.add(bg)

  const fillGeo = new THREE.PlaneGeometry(BAR_WIDTH, BAR_HEIGHT)
  const fillMat = new THREE.MeshBasicMaterial({ color: FILL_COLOR })
  const fill = new THREE.Mesh(fillGeo, fillMat)
  fill.position.set(0, BAR_OFFSET_Y, 0.01)
  group.add(fill)

  group.userData = { fill, fillMat, prevColor: 0 }

  return group
}

/**
 * Update the recharge meter to reflect current weapon state.
 * For blaster: fills left-to-right as the weapon recharges; hidden when fully charged.
 * For lazer: fills left-to-right as heat builds up; shows cooldown when overheated.
 */
export function updateRechargeMeter(
  meter: THREE.Group,
  blaster: BlasterState,
  tier: number,
  tool: MiningTool = 'blaster',
  lazer?: LazerState,
): void {
  const state =
    tool === 'lazer' && lazer ? computeLazerMeterState(lazer) : computeMeterState(blaster, tier)

  if (!state.visible) {
    meter.visible = false
    return
  }

  meter.visible = true

  const ud = meter.userData as {
    fill: THREE.Mesh
    fillMat: THREE.MeshBasicMaterial
    prevColor: number
  }

  ud.fill.scale.x = Math.max(0.001, state.progress)
  // Offset so the bar grows from the left edge, not the center
  ud.fill.position.x = -(BAR_WIDTH * (1 - state.progress)) / 2

  if (state.color !== ud.prevColor) {
    ud.fillMat.color.setHex(state.color)
    ud.prevColor = state.color
  }
}
