import type { InputState } from './input'
import {
  beginJoystick,
  createJoystick,
  endJoystick,
  JOYSTICK_RADIUS,
  moveJoystick,
  readJoystick,
  type JoystickState,
} from '@randroids-dojo/vibekit'

const JOYSTICK_DEAD_ZONE_PIXELS = 10
const JOYSTICK_MAX_RADIUS = JOYSTICK_RADIUS
const DIRECTION_THRESHOLD = 0.3
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

function touchBelongsToJoystick(touch: Touch, joystickState: JoystickState): boolean {
  return joystickState.active && touch.identifier === joystickState.pointerId
}

/**
 * Creates a virtual joystick that writes to an InputState and renders
 * a visible base + knob overlay. Active only on touch devices. The
 * left half of the container acts as the joystick area.
 */
export function createVirtualJoystick(
  inputState: InputState,
  container: HTMLElement,
): VirtualJoystick {
  const joystick = createJoystick()

  const overlay = createOverlay(container, COLOR_MOVE)

  function isLeftHalf(touch: Touch): boolean {
    const rect = container.getBoundingClientRect()
    return touch.clientX - rect.left < rect.width / 2
  }

  function resetInputState(): void {
    inputState.up = false
    inputState.down = false
    inputState.left = false
    inputState.right = false
    inputState.joystickAngle = null
  }

  function updateDirection(touch: Touch): void {
    moveJoystick(joystick, touch.clientX, touch.clientY)

    const dx = joystick.currentX - joystick.originX
    const dy = joystick.currentY - joystick.originY

    overlay.move(dx, dy)

    const dist = Math.hypot(dx, dy)
    if (dist < JOYSTICK_DEAD_ZONE_PIXELS) {
      resetInputState()
      return
    }

    const vector = readJoystick(joystick)

    inputState.right = vector.x > DIRECTION_THRESHOLD
    inputState.left = vector.x < -DIRECTION_THRESHOLD
    inputState.down = vector.y > DIRECTION_THRESHOLD
    inputState.up = vector.y < -DIRECTION_THRESHOLD

    inputState.joystickAngle = Math.atan2(-vector.x, -vector.y)
  }

  function onTouchStart(e: TouchEvent): void {
    if (joystick.active) return
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      if (isLeftHalf(touch)) {
        beginJoystick(joystick, touch.identifier, touch.clientX, touch.clientY)

        const rect = container.getBoundingClientRect()
        overlay.show(touch.clientX - rect.left, touch.clientY - rect.top)

        e.preventDefault()
        return
      }
    }
  }

  function onTouchMove(e: TouchEvent): void {
    if (!joystick.active) return
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      if (touchBelongsToJoystick(touch, joystick)) {
        updateDirection(touch)
        e.preventDefault()
        return
      }
    }
  }

  function resetAndHide(): void {
    endJoystick(joystick)
    resetInputState()
    overlay.hide()
  }

  function onTouchEnd(e: TouchEvent): void {
    if (!joystick.active) return
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      if (touchBelongsToJoystick(touch, joystick)) {
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
      endJoystick(joystick)
      resetInputState()
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
  const joystick = createJoystick()
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
    moveJoystick(joystick, touch.clientX, touch.clientY)

    const dx = joystick.currentX - joystick.originX
    const dy = joystick.currentY - joystick.originY

    overlay.move(dx, dy)

    const dist = Math.hypot(dx, dy)
    if (dist < JOYSTICK_DEAD_ZONE_PIXELS) {
      fireAngle = null
      return
    }

    const vector = readJoystick(joystick)
    fireAngle = Math.atan2(-vector.y, vector.x)
  }

  function onTouchStart(e: TouchEvent): void {
    if (joystick.active) return
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      if (isRightHalf(touch) && !isOnButton(touch.target)) {
        beginJoystick(joystick, touch.identifier, touch.clientX, touch.clientY)

        const rect = container.getBoundingClientRect()
        overlay.show(touch.clientX - rect.left, touch.clientY - rect.top)

        e.preventDefault()
        return
      }
    }
  }

  function onTouchMove(e: TouchEvent): void {
    if (!joystick.active) return
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      if (touchBelongsToJoystick(touch, joystick)) {
        updateDirection(touch)
        e.preventDefault()
        return
      }
    }
  }

  function resetAndHide(): void {
    endJoystick(joystick)
    fireAngle = null
    overlay.hide()
  }

  function onTouchEnd(e: TouchEvent): void {
    if (!joystick.active) return
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      if (touchBelongsToJoystick(touch, joystick)) {
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
      endJoystick(joystick)
      fireAngle = null
      overlay.destroy()
    },
    getFireAngle() {
      return fireAngle
    },
  }
}
