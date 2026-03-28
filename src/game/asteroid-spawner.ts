import type { Asteroid, AsteroidType } from './types'

/** Number of asteroids to spawn after tutorial. */
const ASTEROID_COUNT = 20

/** Minimum distance from station center to spawn asteroids. */
const MIN_STATION_DISTANCE = 100

/** Maximum spawn distance from station center. */
const MAX_SPAWN_DISTANCE = 500

/** Crystalline asteroids spawn closer to the station so players discover them early. */
const CRYSTALLINE_MAX_DISTANCE = 200

/** Minimum spacing between asteroids. */
const MIN_ASTEROID_SPACING = 30

/** HP values per asteroid type and size. */
const HP_TABLE: Record<AsteroidType, Record<number, number>> = {
  common: { 1: 15, 2: 8, 3: 4 },
  dense: { 1: 25, 2: 14, 3: 8 },
  precious: { 1: 10, 2: 6, 3: 3 },
  comet: { 1: 18, 2: 10, 3: 5 },
  crystalline: { 1: 30, 2: 18, 3: 10 },
}

/** Weighted type distribution for random selection. */
const TYPE_WEIGHTS: { type: AsteroidType; weight: number }[] = [
  { type: 'common', weight: 50 },
  { type: 'dense', weight: 25 },
  { type: 'precious', weight: 15 },
  { type: 'comet', weight: 10 },
  { type: 'crystalline', weight: 8 },
]

/** Weighted size distribution (1=large, 2=medium, 3=small). */
const SIZE_WEIGHTS: { size: number; weight: number }[] = [
  { size: 1, weight: 30 },
  { size: 2, weight: 40 },
  { size: 3, weight: 30 },
]

/** Maximum drift speed for asteroids (units/sec). */
const MAX_DRIFT_SPEED = 3

function pickWeighted<T>(items: { weight: number }[] & { type?: T }[], rand: () => number): number {
  const total = items.reduce((sum, item) => sum + item.weight, 0)
  let r = rand() * total
  for (let i = 0; i < items.length; i++) {
    r -= items[i].weight
    if (r <= 0) return i
  }
  return items.length - 1
}

/**
 * Generate a field of asteroids spread around a center point (the station).
 * Returns asteroid data objects ready to be added to the game state.
 *
 * @param stationX - Station X position (asteroids avoid this area)
 * @param stationY - Station Y position
 * @param seed - Random seed for reproducible generation
 */
export function spawnAsteroidField(stationX: number, stationY: number, seed?: number): Asteroid[] {
  const asteroids: Asteroid[] = []
  const positions: { x: number; y: number }[] = []

  // Simple seeded random
  let s = seed ?? Date.now() % 2147483647
  function rand(): number {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }

  let attempts = 0
  const maxAttempts = ASTEROID_COUNT * 20

  while (asteroids.length < ASTEROID_COUNT && attempts < maxAttempts) {
    attempts++

    const typeIdx = pickWeighted(TYPE_WEIGHTS, rand)
    const type = TYPE_WEIGHTS[typeIdx].type

    // Crystalline asteroids spawn closer to the station
    const maxDist = type === 'crystalline' ? CRYSTALLINE_MAX_DISTANCE : MAX_SPAWN_DISTANCE

    // Random position in a ring around the station
    const angle = rand() * Math.PI * 2
    const distance = MIN_STATION_DISTANCE + rand() * (maxDist - MIN_STATION_DISTANCE)
    const x = stationX + Math.cos(angle) * distance
    const y = stationY + Math.sin(angle) * distance

    // Check minimum spacing against existing asteroids
    let tooClose = false
    for (const pos of positions) {
      const dx = x - pos.x
      const dy = y - pos.y
      if (dx * dx + dy * dy < MIN_ASTEROID_SPACING * MIN_ASTEROID_SPACING) {
        tooClose = true
        break
      }
    }
    if (tooClose) continue
    const sizeIdx = pickWeighted(SIZE_WEIGHTS, rand)
    const size = SIZE_WEIGHTS[sizeIdx].size

    const hp = HP_TABLE[type][size]

    // Slow random drift
    const driftAngle = rand() * Math.PI * 2
    const driftSpeed = rand() * MAX_DRIFT_SPEED
    const velocityX = Math.cos(driftAngle) * driftSpeed
    const velocityY = Math.sin(driftAngle) * driftSpeed

    asteroids.push({
      id: `asteroid-${asteroids.length}`,
      x,
      y,
      velocityX,
      velocityY,
      type,
      hp,
      maxHp: hp,
      size,
    })
    positions.push({ x, y })
  }

  return asteroids
}
