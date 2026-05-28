import type { InputState } from './input'

const JOYSTICK_DEAD_ZONE = 10
const JOYSTICK_MAX_RADIUS = 50
const BASE_RADIUS = 60
const KNOB_RADIUS = 24

const COLOR_MOVE = '255,255,255'
const COLOR_FIRE = '255,170,0'

export interface VirtualJoystick {
  attach: () => void
  detach: () => void
}

export interface FiringJoystick {
  attach: () => void
  detach: () => void
  /** World-space angle (radians, +X = 0, +Y = π/2) the player is aiming at, or null when inactive. */
  getFireAngle: () => number | null
}

function createOverlay(
  container: HTMLElement,
  rgb: string,
): {
  base: HTMLElement
  knob: HTMLElement
  show: (x: number, y: number) => void
  move: (dx: number, dy: number) => void
  hide: () => void
  destroy: () => void
} {
  const base = document.createElement('div')
  base.style.cssText =
    `position:absolute;width:${BASE_RADIUS * 2}px;height:${BASE_RADIUS * 2}px;` +
    `border-radius:50%;border:2px solid rgba(${rgb},0.25);` +
    `background:rgba(${rgb},0.06);pointer-events:none;` +
    `display:none;transform:translate(-50%,-50%);z-index:10;`

  const knob = document.createElement('div')
  knob.style.cssText =
    `position:absolute;width:${KNOB_RADIUS * 2}px;height:${KNOB_RADIUS * 2}px;` +
    `border-radius:50%;background:rgba(${rgb},0.35);` +
    `left:50%;top:50%;transform:translate(-50%,-50%);`

  base.appendChild(knob)
  container.appendChild(base)

  return {
    base,
    knob,
    show(x: number, y: number) {
      base.style.display = 'block'
      base.style.left = `${x}px`
      base.style.top = `${y}px`
      knob.style.left = '50%'
      knob.style.top = '50%'
    },
    move(dx: number, dy: number) {
      const dist = Math.sqrt(dx * dx + dy * dy)
      const clamped = Math.min(dist, JOYSTICK_MAX_RADIUS)
      const scale = dist > 0 ? clamped / dist : 0
      const offsetX = dx * scale
      const offsetY = dy * scale
      knob.style.left = `calc(50% + ${offsetX}px)`
      knob.style.top = `calc(50% + ${offsetY}px)`
    },
    hide() {
      base.style.display = 'none'
    },
    destroy() {
      if (base.parentElement) base.parentElement.removeChild(base)
    },
  }
}

/**
 * Creates a virtual joystick that writes to an InputState and renders
 * a visible base + knob overlay. Active only on touch devices — the
 * left half of the container acts as the joystick area. A touch-start
 * anchors the joystick center, then dragging sets the direction.
 */
export function createVirtualJoystick(
  inputState: InputState,
  container: HTMLElement,
): VirtualJoystick {
  let activeId: number | null = null
  let originX = 0
  let originY = 0

  const overlay = createOverlay(container, COLOR_MOVE)

  function isLeftHalf(touch: Touch): boolean {
    const rect = container.getBoundingClientRect()
    return touch.clientX - rect.left < rect.width / 2
  }

  function updateDirection(touch: Touch): void {
    const dx = touch.clientX - originX
    const dy = touch.clientY - originY

    overlay.move(dx, dy)

    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < JOYSTICK_DEAD_ZONE) {
      inputState.up = false
      inputState.down = false
      inputState.left = false
      inputState.right = false
      inputState.joystickAngle = null
      return
    }

    // Normalize to max radius
    const nx = dx / Math.max(dist, JOYSTICK_MAX_RADIUS)
    const ny = dy / Math.max(dist, JOYSTICK_MAX_RADIUS)

    // Map to cardinal directions with 0.3 threshold for diagonals
    inputState.right = nx > 0.3
    inputState.left = nx < -0.3
    inputState.down = ny > 0.3 // screen Y is inverted vs game Y
    inputState.up = ny < -0.3

    // Store precise angle for smooth 360° ship rotation.
    // Screen coords: dx is right, dy is down. Game coords: +Y is up.
    // Ship rotation formula: atan2(-game_dx, game_dy) = atan2(-dx, -dy)
    inputState.joystickAngle = Math.atan2(-dx, -dy)
  }

  function onTouchStart(e: TouchEvent): void {
    if (activeId !== null) return
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      if (isLeftHalf(touch)) {
        activeId = touch.identifier
        originX = touch.clientX
        originY = touch.clientY

        const rect = container.getBoundingClientRect()
        overlay.show(touch.clientX - rect.left, touch.clientY - rect.top)

        e.preventDefault()
        return
      }
    }
  }

  function onTouchMove(e: TouchEvent): void {
    if (activeId === null) return
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      if (touch.identifier === activeId) {
        updateDirection(touch)
        e.preventDefault()
        return
      }
    }
  }

  function resetAndHide(): void {
    activeId = null
    inputState.up = false
    inputState.down = false
    inputState.left = false
    inputState.right = false
    inputState.joystickAngle = null
    overlay.hide()
  }

  function onTouchEnd(e: TouchEvent): void {
    if (activeId === null) return
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      if (touch.identifier === activeId) {
        resetAndHide()
        return
      }
    }
  }

  return {
    attach() {
      container.addEventListener('touchstart', onTouchStart, { passive: false })
      container.addEventListener('touchmove', onTouchMove, { passive: false })
      container.addEventListener('touchend', onTouchEnd)
      container.addEventListener('touchcancel', onTouchEnd)
    },
    detach() {
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchmove', onTouchMove)
      container.removeEventListener('touchend', onTouchEnd)
      container.removeEventListener('touchcancel', onTouchEnd)
      activeId = null
      inputState.up = false
      inputState.down = false
      inputState.left = false
      inputState.right = false
      inputState.joystickAngle = null
      overlay.destroy()
    },
  }
}

/**
 * Creates a floating firing joystick on the right half of the container.
 * Mirrors the movement joystick: touch-start anchors the center, dragging
 * sets the aim angle. Exposes the current world-space aim angle so the
 * scene can convert it into a per-frame fire target. The blaster cooldown
 * gates whether each frame's fire target produces a projectile.
 *
 * Touches that land on existing buttons (role="button") are ignored so
 * the collect and tool-toggle buttons keep working independently.
 */
export function createFiringJoystick(container: HTMLElement): FiringJoystick {
  let activeId: number | null = null
  let originX = 0
  let originY = 0
  let fireAngle: number | null = null

  const overlay = createOverlay(container, COLOR_FIRE)

  function isRightHalf(touch: Touch): boolean {
    const rect = container.getBoundingClientRect()
    return touch.clientX - rect.left >= rect.width / 2
  }

  function isOnButton(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false
    return target.closest('[role="button"]') !== null
  }

  function updateDirection(touch: Touch): void {
    const dx = touch.clientX - originX
    const dy = touch.clientY - originY

    overlay.move(dx, dy)

    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < JOYSTICK_DEAD_ZONE) {
      fireAngle = null
      return
    }

    // Screen coords: +X right, +Y down. World coords: +X right, +Y up.
    // World aim angle: atan2(world_dy, world_dx) = atan2(-screen_dy, screen_dx).
    fireAngle = Math.atan2(-dy, dx)
  }

  function onTouchStart(e: TouchEvent): void {
    if (activeId !== null) return
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      if (isRightHalf(touch) && !isOnButton(touch.target)) {
        activeId = touch.identifier
        originX = touch.clientX
        originY = touch.clientY

        const rect = container.getBoundingClientRect()
        overlay.show(touch.clientX - rect.left, touch.clientY - rect.top)

        e.preventDefault()
        return
      }
    }
  }

  function onTouchMove(e: TouchEvent): void {
    if (activeId === null) return
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      if (touch.identifier === activeId) {
        updateDirection(touch)
        e.preventDefault()
        return
      }
    }
  }

  function resetAndHide(): void {
    activeId = null
    fireAngle = null
    overlay.hide()
  }

  function onTouchEnd(e: TouchEvent): void {
    if (activeId === null) return
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      if (touch.identifier === activeId) {
        resetAndHide()
        return
      }
    }
  }

  return {
    attach() {
      container.addEventListener('touchstart', onTouchStart, { passive: false })
      container.addEventListener('touchmove', onTouchMove, { passive: false })
      container.addEventListener('touchend', onTouchEnd)
      container.addEventListener('touchcancel', onTouchEnd)
    },
    detach() {
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchmove', onTouchMove)
      container.removeEventListener('touchend', onTouchEnd)
      container.removeEventListener('touchcancel', onTouchEnd)
      activeId = null
      fireAngle = null
      overlay.destroy()
    },
    getFireAngle() {
      return fireAngle
    },
  }
}
