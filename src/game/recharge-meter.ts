import * as THREE from 'three'
import { FIRE_RATES } from './blaster-constants'
import type { BlasterState } from './blaster'

export const BAR_WIDTH = 4
const BAR_HEIGHT = 0.4
const BAR_OFFSET_Y = -3.5

const BG_COLOR = 0x333344
export const FILL_COLOR = 0x00ff88
export const CHARGING_COLOR = 0xffaa00

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
  const clampedTier = Math.max(1, Math.min(5, Math.round(tier)))
  const cooldownTotal = 1 / FIRE_RATES[clampedTier - 1]
  const remaining = blaster.cooldownRemaining

  if (remaining <= 0) {
    return { visible: false, progress: 1, color: FILL_COLOR }
  }

  const progress = Math.max(0, Math.min(1, 1 - remaining / cooldownTotal))
  const color = progress >= 0.9 ? FILL_COLOR : CHARGING_COLOR
  return { visible: true, progress, color }
}

/**
 * Creates a recharge meter that sits below the ship.
 * Shows cooldown progress as a horizontal bar.
 */
export function createRechargeMeter(): THREE.Group {
  const group = new THREE.Group()

  // Background bar
  const bgGeo = new THREE.PlaneGeometry(BAR_WIDTH, BAR_HEIGHT)
  const bgMat = new THREE.MeshBasicMaterial({ color: BG_COLOR, transparent: true, opacity: 0.5 })
  const bg = new THREE.Mesh(bgGeo, bgMat)
  bg.position.set(0, BAR_OFFSET_Y, 0)
  group.add(bg)

  // Fill bar — will be scaled on X to show progress
  const fillGeo = new THREE.PlaneGeometry(BAR_WIDTH, BAR_HEIGHT)
  const fillMat = new THREE.MeshBasicMaterial({ color: FILL_COLOR })
  const fill = new THREE.Mesh(fillGeo, fillMat)
  fill.position.set(0, BAR_OFFSET_Y, 0.01)
  group.add(fill)

  // Store references for updates
  group.userData = { fill, fillMat }

  return group
}

/**
 * Update the recharge meter to reflect current cooldown state.
 * The meter fills from left to right as the weapon recharges.
 * Hidden when fully charged.
 */
export function updateRechargeMeter(meter: THREE.Group, blaster: BlasterState, tier: number): void {
  const state = computeMeterState(blaster, tier)

  meter.visible = state.visible
  if (!state.visible) return

  const { fill, fillMat } = meter.userData as {
    fill: THREE.Mesh
    fillMat: THREE.MeshBasicMaterial
  }

  fill.scale.x = state.progress
  fill.position.x = -(BAR_WIDTH * (1 - state.progress)) / 2
  fillMat.color.setHex(state.color)
}
