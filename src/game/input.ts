/**
 * Keyboard input state tracker.
 * Tracks which movement keys are currently held down.
 */
export interface InputState {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
}

/**
 * Aim state tracks where the player is pointing (mouse cursor or touch).
 * Uses world coordinates so the ship can rotate toward the target.
 */
export interface AimState {
  /** Whether an aim target is currently active */
  active: boolean
  /** Screen-space X of the aim target (pixels from left of canvas) */
  screenX: number
  /** Screen-space Y of the aim target (pixels from top of canvas) */
  screenY: number
}

export function createInputState(): InputState {
  return { up: false, down: false, left: false, right: false }
}

export function createAimState(): AimState {
  return { active: false, screenX: 0, screenY: 0 }
}

export const KEY_MAP: Record<string, keyof InputState> = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
}

export function createInputHandler(state: InputState): {
  attach: () => void
  detach: () => void
} {
  function onKeyDown(e: KeyboardEvent): void {
    const dir = KEY_MAP[e.code]
    if (dir) {
      state[dir] = true
      e.preventDefault()
    }
  }

  function onKeyUp(e: KeyboardEvent): void {
    const dir = KEY_MAP[e.code]
    if (dir) {
      state[dir] = false
    }
  }

  return {
    attach() {
      window.addEventListener('keydown', onKeyDown)
      window.addEventListener('keyup', onKeyUp)
    },
    detach() {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      // Reset on detach
      state.up = false
      state.down = false
      state.left = false
      state.right = false
    },
  }
}

/**
 * Creates mouse/touch aim handler that tracks cursor position over the canvas.
 */
export function createAimHandler(
  aimState: AimState,
  canvas: HTMLElement,
): {
  attach: () => void
  detach: () => void
} {
  function onMouseMove(e: MouseEvent): void {
    const rect = canvas.getBoundingClientRect()
    aimState.active = true
    aimState.screenX = e.clientX - rect.left
    aimState.screenY = e.clientY - rect.top
  }

  function onMouseLeave(): void {
    aimState.active = false
  }

  function onTouchMove(e: TouchEvent): void {
    if (e.touches.length > 0) {
      const touch = e.touches[0]
      const rect = canvas.getBoundingClientRect()
      aimState.active = true
      aimState.screenX = touch.clientX - rect.left
      aimState.screenY = touch.clientY - rect.top
    }
  }

  function onTouchEnd(): void {
    aimState.active = false
  }

  return {
    attach() {
      canvas.addEventListener('mousemove', onMouseMove)
      canvas.addEventListener('mouseleave', onMouseLeave)
      canvas.addEventListener('touchmove', onTouchMove, { passive: true })
      canvas.addEventListener('touchend', onTouchEnd)
    },
    detach() {
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseleave', onMouseLeave)
      canvas.removeEventListener('touchmove', onTouchMove)
      canvas.removeEventListener('touchend', onTouchEnd)
      aimState.active = false
    },
  }
}

/**
 * Convert input state to a normalized direction vector.
 * Returns [dx, dy] where each is in range [-1, 1].
 */
export function inputToDirection(input: InputState): [number, number] {
  let dx = 0
  let dy = 0
  if (input.left) dx -= 1
  if (input.right) dx += 1
  if (input.up) dy += 1
  if (input.down) dy -= 1

  // Normalize diagonal movement
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len > 1) {
    dx /= len
    dy /= len
  }

  return [dx, dy]
}
