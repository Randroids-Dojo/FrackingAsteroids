import type { InputState } from './input'

const JOYSTICK_DEAD_ZONE = 10
const JOYSTICK_MAX_RADIUS = 50

export interface VirtualJoystick {
  attach: () => void
  detach: () => void
}

/**
 * Creates a virtual joystick that writes to an InputState.
 * Active only on touch devices — the left half of the container acts as
 * the joystick area. A touch-start anchors the joystick center, then
 * dragging sets the direction.
 */
export function createVirtualJoystick(
  inputState: InputState,
  container: HTMLElement,
): VirtualJoystick {
  let activeId: number | null = null
  let originX = 0
  let originY = 0

  function isLeftHalf(touch: Touch): boolean {
    const rect = container.getBoundingClientRect()
    return touch.clientX - rect.left < rect.width / 2
  }

  function updateDirection(touch: Touch): void {
    const dx = touch.clientX - originX
    const dy = touch.clientY - originY

    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < JOYSTICK_DEAD_ZONE) {
      inputState.up = false
      inputState.down = false
      inputState.left = false
      inputState.right = false
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
  }

  function onTouchStart(e: TouchEvent): void {
    if (activeId !== null) return
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      if (isLeftHalf(touch)) {
        activeId = touch.identifier
        originX = touch.clientX
        originY = touch.clientY
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

  function onTouchEnd(e: TouchEvent): void {
    if (activeId === null) return
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      if (touch.identifier === activeId) {
        activeId = null
        inputState.up = false
        inputState.down = false
        inputState.left = false
        inputState.right = false
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
    },
  }
}
