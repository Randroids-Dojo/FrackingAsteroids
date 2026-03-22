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
export { createInputState, createInputHandler, inputToDirection } from './input'
export type { InputState } from './input'
export { updateShip } from './ship-controller'
export { createGameScene } from './scene'
export type { GameScene } from './scene'
