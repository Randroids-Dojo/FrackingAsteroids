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

export function createInputState(): InputState {
  return { up: false, down: false, left: false, right: false }
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
