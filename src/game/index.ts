/**
 * FrackingAsteroids — Game Engine Entry Point
 */

export { BLASTER_COSTS, COLLECTOR_COSTS, STORAGE_COSTS } from './types'
export type { GameEngine, Asteroid, Fragment, Projectile } from './types'

export {
  SHIP_ACCELERATION,
  SHIP_MAX_SPEED,
  SHIP_FRICTION,
  SHIP_COLORS,
  VOXEL_SIZE,
} from './ship-constants'
export { createShipModel } from './ship-model'
export { createLargeAsteroidModel, ASTEROID_COLORS } from './asteroid-model'
export { createProjectileModel } from './projectile-model'
export {
  BASE_PROJECTILE_SPEED,
  SPEED_MULTIPLIERS,
  FIRE_RATES,
  DAMAGE_PER_TIER,
  PROJECTILE_LIFETIME,
  PROJECTILE_RADIUS,
  DUAL_SPREAD_ANGLE,
  TRIPLE_SPREAD_ANGLE,
  PROJECTILE_COLOR,
  PROJECTILE_CORE_COLOR,
} from './blaster-constants'
export {
  createBlasterState,
  updateBlasterCooldown,
  fireBlaster,
  updateProjectiles,
  resetProjectileIdCounter,
} from './blaster'
export type { BlasterState } from './blaster'
export {
  createInputState,
  createInputHandler,
  createAimState,
  createAimHandler,
  inputToDirection,
} from './input'
export type { InputState, AimState } from './input'
export { updateShip, aimToRotation } from './ship-controller'
export { createVirtualJoystick } from './virtual-joystick'
export type { VirtualJoystick } from './virtual-joystick'
export { createGameScene } from './scene'
export type { GameScene } from './scene'
