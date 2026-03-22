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
