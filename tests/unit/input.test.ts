import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  createInputState,
  inputToDirection,
  createInputHandler,
  KEY_MAP,
} from '../../src/game/input'

describe('createInputState', () => {
  it('returns all directions as false', () => {
    const state = createInputState()
    assert.equal(state.up, false)
    assert.equal(state.down, false)
    assert.equal(state.left, false)
    assert.equal(state.right, false)
  })
})

describe('KEY_MAP', () => {
  it('maps WASD keys to directions', () => {
    assert.equal(KEY_MAP['KeyW'], 'up')
    assert.equal(KEY_MAP['KeyS'], 'down')
    assert.equal(KEY_MAP['KeyA'], 'left')
    assert.equal(KEY_MAP['KeyD'], 'right')
  })

  it('maps Arrow keys to directions', () => {
    assert.equal(KEY_MAP['ArrowUp'], 'up')
    assert.equal(KEY_MAP['ArrowDown'], 'down')
    assert.equal(KEY_MAP['ArrowLeft'], 'left')
    assert.equal(KEY_MAP['ArrowRight'], 'right')
  })

  it('has exactly 8 mappings', () => {
    assert.equal(Object.keys(KEY_MAP).length, 8)
  })

  it('returns undefined for unmapped keys', () => {
    assert.equal(KEY_MAP['Space'], undefined)
    assert.equal(KEY_MAP['Enter'], undefined)
  })
})

describe('createInputHandler', () => {
  type Listener = (e: unknown) => void
  const listeners: Record<string, Listener[]> = {}

  beforeEach(() => {
    // Reset listeners
    for (const key of Object.keys(listeners)) {
      delete listeners[key]
    }

    // Mock window
    const g = globalThis as Record<string, unknown>
    g.window = {
      addEventListener(type: string, fn: Listener) {
        if (!listeners[type]) listeners[type] = []
        listeners[type].push(fn)
      },
      removeEventListener(type: string, fn: Listener) {
        if (listeners[type]) {
          listeners[type] = listeners[type].filter((f) => f !== fn)
        }
      },
    }
  })

  afterEach(() => {
    const g = globalThis as Record<string, unknown>
    delete g.window
  })

  function fireEvent(type: string, code: string): boolean {
    let prevented = false
    const event = {
      code,
      preventDefault() {
        prevented = true
      },
    }
    for (const fn of listeners[type] ?? []) {
      fn(event)
    }
    return prevented
  }

  it('registers keydown and keyup listeners on attach', () => {
    const state = createInputState()
    const handler = createInputHandler(state)
    handler.attach()
    assert.ok(listeners['keydown']?.length === 1)
    assert.ok(listeners['keyup']?.length === 1)
    handler.detach()
  })

  it('removes listeners on detach', () => {
    const state = createInputState()
    const handler = createInputHandler(state)
    handler.attach()
    handler.detach()
    assert.equal(listeners['keydown']?.length ?? 0, 0)
    assert.equal(listeners['keyup']?.length ?? 0, 0)
  })

  it('sets direction true on keydown', () => {
    const state = createInputState()
    const handler = createInputHandler(state)
    handler.attach()
    fireEvent('keydown', 'KeyW')
    assert.equal(state.up, true)
    fireEvent('keydown', 'KeyA')
    assert.equal(state.left, true)
    handler.detach()
  })

  it('sets direction false on keyup', () => {
    const state = createInputState()
    const handler = createInputHandler(state)
    handler.attach()
    fireEvent('keydown', 'KeyW')
    assert.equal(state.up, true)
    fireEvent('keyup', 'KeyW')
    assert.equal(state.up, false)
    handler.detach()
  })

  it('prevents default on mapped keydown', () => {
    const state = createInputState()
    const handler = createInputHandler(state)
    handler.attach()
    const prevented = fireEvent('keydown', 'ArrowUp')
    assert.equal(prevented, true)
    handler.detach()
  })

  it('does not prevent default on unmapped keydown', () => {
    const state = createInputState()
    const handler = createInputHandler(state)
    handler.attach()
    const prevented = fireEvent('keydown', 'Space')
    assert.equal(prevented, false)
    handler.detach()
  })

  it('ignores unmapped keys', () => {
    const state = createInputState()
    const handler = createInputHandler(state)
    handler.attach()
    fireEvent('keydown', 'Space')
    assert.equal(state.up, false)
    assert.equal(state.down, false)
    assert.equal(state.left, false)
    assert.equal(state.right, false)
    handler.detach()
  })

  it('resets all directions on detach', () => {
    const state = createInputState()
    const handler = createInputHandler(state)
    handler.attach()
    fireEvent('keydown', 'KeyW')
    fireEvent('keydown', 'KeyD')
    assert.equal(state.up, true)
    assert.equal(state.right, true)
    handler.detach()
    assert.equal(state.up, false)
    assert.equal(state.right, false)
    assert.equal(state.down, false)
    assert.equal(state.left, false)
  })

  it('handles arrow keys on keyup', () => {
    const state = createInputState()
    const handler = createInputHandler(state)
    handler.attach()
    fireEvent('keydown', 'ArrowDown')
    assert.equal(state.down, true)
    fireEvent('keyup', 'ArrowDown')
    assert.equal(state.down, false)
    handler.detach()
  })

  it('ignores unmapped keys on keyup', () => {
    const state = createInputState()
    const handler = createInputHandler(state)
    handler.attach()
    fireEvent('keyup', 'Enter')
    assert.equal(state.up, false)
    handler.detach()
  })
})

describe('inputToDirection', () => {
  it('returns [0, 0] when no keys pressed', () => {
    const state = createInputState()
    const [dx, dy] = inputToDirection(state)
    assert.equal(dx, 0)
    assert.equal(dy, 0)
  })

  it('returns [0, 1] for up only', () => {
    const state = createInputState()
    state.up = true
    const [dx, dy] = inputToDirection(state)
    assert.equal(dx, 0)
    assert.equal(dy, 1)
  })

  it('returns [0, -1] for down only', () => {
    const state = createInputState()
    state.down = true
    const [dx, dy] = inputToDirection(state)
    assert.equal(dx, 0)
    assert.equal(dy, -1)
  })

  it('returns [-1, 0] for left only', () => {
    const state = createInputState()
    state.left = true
    const [dx, dy] = inputToDirection(state)
    assert.equal(dx, -1)
    assert.equal(dy, 0)
  })

  it('returns [1, 0] for right only', () => {
    const state = createInputState()
    state.right = true
    const [dx, dy] = inputToDirection(state)
    assert.equal(dx, 1)
    assert.equal(dy, 0)
  })

  it('normalizes diagonal movement', () => {
    const state = createInputState()
    state.up = true
    state.right = true
    const [dx, dy] = inputToDirection(state)
    const len = Math.sqrt(dx * dx + dy * dy)
    assert.ok(Math.abs(len - 1) < 0.001, `diagonal length should be ~1, got ${len}`)
  })

  it('cancels opposing directions', () => {
    const state = createInputState()
    state.up = true
    state.down = true
    const [dx, dy] = inputToDirection(state)
    assert.equal(dx, 0)
    assert.equal(dy, 0)
  })

  it('cancels opposing horizontal directions', () => {
    const state = createInputState()
    state.left = true
    state.right = true
    const [dx, dy] = inputToDirection(state)
    assert.equal(dx, 0)
    assert.equal(dy, 0)
  })

  it('normalizes up-left diagonal', () => {
    const state = createInputState()
    state.up = true
    state.left = true
    const [dx, dy] = inputToDirection(state)
    assert.ok(dx < 0, 'dx should be negative')
    assert.ok(dy > 0, 'dy should be positive')
    const len = Math.sqrt(dx * dx + dy * dy)
    assert.ok(Math.abs(len - 1) < 0.001)
  })

  it('normalizes down-right diagonal', () => {
    const state = createInputState()
    state.down = true
    state.right = true
    const [dx, dy] = inputToDirection(state)
    assert.ok(dx > 0, 'dx should be positive')
    assert.ok(dy < 0, 'dy should be negative')
    const len = Math.sqrt(dx * dx + dy * dy)
    assert.ok(Math.abs(len - 1) < 0.001)
  })
})
