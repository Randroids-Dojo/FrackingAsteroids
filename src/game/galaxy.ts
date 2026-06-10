export const SOLAR_SYSTEM_IDS = [
  'terra-prime',
  'cinder-belt',
  'aurora-reach',
  'umbra-depths',
] as const

export type SolarSystemId = (typeof SOLAR_SYSTEM_IDS)[number]

export interface SolarSystem {
  id: SolarSystemId
  name: string
  region: string
  mapX: number
  mapY: number
  stationX: number
  stationY: number
  entryX: number
  entryY: number
  danger: 'Low' | 'Medium' | 'High'
  resourceFocus: string
}

export interface TravelStatus {
  currentSystem: SolarSystemId
  fuel: number
  maxFuel: number
}

export interface JumpDestination {
  stationX: number
  stationY: number
  entryX: number
  entryY: number
}

export type JumpFailureReason = 'same-system' | 'unknown-system' | 'not-enough-fuel'

export type JumpResult =
  | {
      ok: true
      target: SolarSystem
      cost: number
      travel: TravelStatus
    }
  | {
      ok: false
      reason: JumpFailureReason
      target: SolarSystem | null
      cost: number
      travel: TravelStatus
    }

export type FuelPurchaseResult =
  | {
      ok: true
      fuelAdded: number
      scrapSpent: number
      travel: TravelStatus
    }
  | {
      ok: false
      reason: 'full' | 'not-enough-scrap'
      fuelAdded: number
      scrapSpent: number
      travel: TravelStatus
    }

export const HOME_SYSTEM_ID: SolarSystemId = 'terra-prime'
export const MAX_FUEL = 100
export const FUEL_PACK_AMOUNT = 25
export const FUEL_PACK_COST = 20
export const MIN_JUMP_FUEL_COST = 8
const FUEL_PER_MAP_UNIT = 0.18

export const DEFAULT_TRAVEL_STATUS: TravelStatus = {
  currentSystem: HOME_SYSTEM_ID,
  fuel: MAX_FUEL,
  maxFuel: MAX_FUEL,
}

export const GALAXY_SYSTEMS: readonly SolarSystem[] = [
  {
    id: 'terra-prime',
    name: 'Terra Prime',
    region: 'Home claim',
    mapX: 12,
    mapY: 58,
    stationX: 30,
    stationY: 200,
    entryX: 30,
    entryY: 250,
    danger: 'Low',
    resourceFocus: 'Balanced ore field',
  },
  {
    id: 'cinder-belt',
    name: 'Cinder Belt',
    region: 'Inner refinery lane',
    mapX: 38,
    mapY: 36,
    stationX: 620,
    stationY: -180,
    entryX: 620,
    entryY: -130,
    danger: 'Medium',
    resourceFocus: 'Dense metal clusters',
  },
  {
    id: 'aurora-reach',
    name: 'Aurora Reach',
    region: 'Frozen outer stream',
    mapX: 64,
    mapY: 18,
    stationX: -540,
    stationY: -360,
    entryX: -540,
    entryY: -310,
    danger: 'Medium',
    resourceFocus: 'Gold-rich fragments',
  },
  {
    id: 'umbra-depths',
    name: 'Umbra Depths',
    region: 'Dark gravity well',
    mapX: 84,
    mapY: 70,
    stationX: 860,
    stationY: 520,
    entryX: 860,
    entryY: 570,
    danger: 'High',
    resourceFocus: 'Crystalline anomalies',
  },
]

export function getSolarSystem(id: SolarSystemId): SolarSystem {
  return GALAXY_SYSTEMS.find((system) => system.id === id) ?? GALAXY_SYSTEMS[0]
}

export function findSolarSystem(id: string): SolarSystem | null {
  return GALAXY_SYSTEMS.find((system) => system.id === id) ?? null
}

export function getJumpDestination(system: SolarSystem): JumpDestination {
  return {
    stationX: system.stationX,
    stationY: system.stationY,
    entryX: system.entryX,
    entryY: system.entryY,
  }
}

export function calculateJumpFuelCost(fromId: SolarSystemId, toId: SolarSystemId): number {
  if (fromId === toId) return 0
  const from = getSolarSystem(fromId)
  const to = getSolarSystem(toId)
  const dx = to.mapX - from.mapX
  const dy = to.mapY - from.mapY
  return Math.max(MIN_JUMP_FUEL_COST, Math.ceil(Math.hypot(dx, dy) * FUEL_PER_MAP_UNIT))
}

export function resolveJump(travel: TravelStatus, targetId: SolarSystemId): JumpResult {
  if (travel.currentSystem === targetId) {
    return {
      ok: false,
      reason: 'same-system',
      target: getSolarSystem(targetId),
      cost: 0,
      travel,
    }
  }

  const target = findSolarSystem(targetId)
  if (!target) {
    return {
      ok: false,
      reason: 'unknown-system',
      target: null,
      cost: 0,
      travel,
    }
  }

  const cost = calculateJumpFuelCost(travel.currentSystem, target.id)
  if (travel.fuel < cost) {
    return {
      ok: false,
      reason: 'not-enough-fuel',
      target,
      cost,
      travel,
    }
  }

  return {
    ok: true,
    target,
    cost,
    travel: {
      ...travel,
      currentSystem: target.id,
      fuel: travel.fuel - cost,
    },
  }
}

export function buyFuelPack(travel: TravelStatus, scrap: number): FuelPurchaseResult {
  if (travel.fuel >= travel.maxFuel) {
    return {
      ok: false,
      reason: 'full',
      fuelAdded: 0,
      scrapSpent: 0,
      travel,
    }
  }
  if (scrap < FUEL_PACK_COST) {
    return {
      ok: false,
      reason: 'not-enough-scrap',
      fuelAdded: 0,
      scrapSpent: 0,
      travel,
    }
  }

  const nextFuel = Math.min(travel.maxFuel, travel.fuel + FUEL_PACK_AMOUNT)
  return {
    ok: true,
    fuelAdded: nextFuel - travel.fuel,
    scrapSpent: FUEL_PACK_COST,
    travel: {
      ...travel,
      fuel: nextFuel,
    },
  }
}
