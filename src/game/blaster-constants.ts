/**
 * Mining laser (blaster) constants.
 * Short-range mining tool — projectile speed matches ship speed
 * to feel like a tool, not a weapon.
 */

/** Base projectile speed in units/sec (tier 1). */
export const BASE_PROJECTILE_SPEED = 200

/** Speed multiplier per tier (index 0 = tier 1). */
export const SPEED_MULTIPLIERS = [1, 1.25, 1.5, 1.75, 2] as const

/** Fire rate in shots per second per tier (index 0 = tier 1). */
export const FIRE_RATES = [1, 2, 3, 4, 5] as const

/** Damage per projectile per tier (index 0 = tier 1). */
export const DAMAGE_PER_TIER = [1, 1, 2, 2, 3] as const

/** Projectile lifetime in seconds before auto-despawn. */
export const PROJECTILE_LIFETIME = 1.5

/** Projectile collision radius in world units. */
export const PROJECTILE_RADIUS = 1.0

/** Spread angle in radians for dual-fire (tier 4). */
export const DUAL_SPREAD_ANGLE = (8 * Math.PI) / 180

/** Spread angle in radians for triple-fire (tier 5). */
export const TRIPLE_SPREAD_ANGLE = (10 * Math.PI) / 180

/** Amber color for mining laser bolts. */
export const PROJECTILE_COLOR = 0xffaa00

/** Bright core color for projectile glow effect. */
export const PROJECTILE_CORE_COLOR = 0xffdd44

/** Lazer damage multiplier applied to all asteroid types. */
export const LAZER_DAMAGE_MULTIPLIER = 1.5

/** Maximum heat before the lazer overheats (seconds of sustained fire). */
export const LAZER_MAX_HEAT = 3.0

/** Heat gained per second of sustained lazer fire. */
export const LAZER_HEAT_RATE = 1.0

/** Heat lost per second when not firing (passive dissipation). */
export const LAZER_COOL_RATE = 0.5

/** Time in seconds for the lazer to fully cool down after overheating. */
export const LAZER_COOLDOWN_TIME = 2.0

/** Interval between lazer projectile spawns (seconds) for sustained beam feel. */
export const LAZER_FIRE_INTERVAL = 0.1

/** Clamp a tier value to the valid 1–5 range. */
export function clampTier(tier: number): number {
  return Math.max(1, Math.min(5, Math.round(tier)))
}
