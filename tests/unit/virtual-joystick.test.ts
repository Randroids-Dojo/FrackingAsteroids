import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createInputState } from '../../src/game/input'
import { createVirtualJoystick } from '../../src/game/virtual-joystick'

type Listener = (...args: unknown[]) => void
type ListenerOptions = { passive?: boolean }

interface MockContainer {
  listeners: Record<string, Listener[]>
  addEventListener(type: string, fn: Listener, opts?: ListenerOptions): void
  removeEventListener(type: string, fn: Listener): void
  getBoundingClientRect(): { left: number; top: number; width: number; height: number }
  fireTouch(
    type: string,
    touches: Array<{ identifier: number; clientX: number; clientY: number }>,
  ): void
}

function createMockContainer(): MockContainer {
  const listeners: Record<string, Listener[]> = {}
  return {
    listeners,
    addEventListener(type: string, fn: Listener) {
      if (!listeners[type]) listeners[type] = []
      listeners[type].push(fn)
    },
    removeEventListener(type: string, fn: Listener) {
      if (listeners[type]) {
        listeners[type] = listeners[type].filter((f) => f !== fn)
      }
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 800, height: 600 }
    },
    fireTouch(
      type: string,
      touches: Array<{ identifier: number; clientX: number; clientY: number }>,
    ) {
      let prevented = false
      const event = {
        changedTouches: {
          length: touches.length,
          [Symbol.iterator]: function* () {
            for (let i = 0; i < touches.length; i++) {
              yield touches[i]
            }
          },
        },
        touches: {
          length: touches.length,
        },
        preventDefault() {
          prevented = true
        },
      }
      // Index changedTouches
      for (let i = 0; i < touches.length; i++) {
        ;(event.changedTouches as Record<number, unknown>)[i] = touches[i]
      }
      for (const fn of listeners[type] ?? []) {
        fn(event)
      }
      return prevented
    },
  }
}

describe('createVirtualJoystick', () => {
  let container: MockContainer

  beforeEach(() => {
    container = createMockContainer()
  })

  afterEach(() => {
    // cleanup
  })

  it('registers touch listeners on attach', () => {
    const state = createInputState()
    const joystick = createVirtualJoystick(state, container as unknown as HTMLElement)
    joystick.attach()
    assert.ok(container.listeners['touchstart']?.length === 1)
    assert.ok(container.listeners['touchmove']?.length === 1)
    assert.ok(container.listeners['touchend']?.length === 1)
    assert.ok(container.listeners['touchcancel']?.length === 1)
    joystick.detach()
  })

  it('removes listeners on detach', () => {
    const state = createInputState()
    const joystick = createVirtualJoystick(state, container as unknown as HTMLElement)
    joystick.attach()
    joystick.detach()
    assert.equal(container.listeners['touchstart']?.length ?? 0, 0)
    assert.equal(container.listeners['touchmove']?.length ?? 0, 0)
    assert.equal(container.listeners['touchend']?.length ?? 0, 0)
    assert.equal(container.listeners['touchcancel']?.length ?? 0, 0)
  })

  it('activates on left-half touch start', () => {
    const state = createInputState()
    const joystick = createVirtualJoystick(state, container as unknown as HTMLElement)
    joystick.attach()
    // Touch at x=100 (left half of 800px container)
    container.fireTouch('touchstart', [{ identifier: 1, clientX: 100, clientY: 300 }])
    // No direction yet (at origin)
    assert.equal(state.up, false)
    assert.equal(state.down, false)
    joystick.detach()
  })

  it('ignores right-half touch start', () => {
    const state = createInputState()
    const joystick = createVirtualJoystick(state, container as unknown as HTMLElement)
    joystick.attach()
    // Touch at x=500 (right half of 800px container)
    container.fireTouch('touchstart', [{ identifier: 1, clientX: 500, clientY: 300 }])
    // Now try move - should not affect input
    container.fireTouch('touchmove', [{ identifier: 1, clientX: 500, clientY: 200 }])
    assert.equal(state.up, false)
    joystick.detach()
  })

  it('sets up direction on upward drag', () => {
    const state = createInputState()
    const joystick = createVirtualJoystick(state, container as unknown as HTMLElement)
    joystick.attach()
    container.fireTouch('touchstart', [{ identifier: 1, clientX: 100, clientY: 300 }])
    // Drag upward (screen Y decreases)
    container.fireTouch('touchmove', [{ identifier: 1, clientX: 100, clientY: 240 }])
    assert.equal(state.up, true)
    assert.equal(state.down, false)
    joystick.detach()
  })

  it('sets down direction on downward drag', () => {
    const state = createInputState()
    const joystick = createVirtualJoystick(state, container as unknown as HTMLElement)
    joystick.attach()
    container.fireTouch('touchstart', [{ identifier: 1, clientX: 100, clientY: 300 }])
    container.fireTouch('touchmove', [{ identifier: 1, clientX: 100, clientY: 360 }])
    assert.equal(state.down, true)
    assert.equal(state.up, false)
    joystick.detach()
  })

  it('sets left direction on leftward drag', () => {
    const state = createInputState()
    const joystick = createVirtualJoystick(state, container as unknown as HTMLElement)
    joystick.attach()
    container.fireTouch('touchstart', [{ identifier: 1, clientX: 100, clientY: 300 }])
    container.fireTouch('touchmove', [{ identifier: 1, clientX: 40, clientY: 300 }])
    assert.equal(state.left, true)
    assert.equal(state.right, false)
    joystick.detach()
  })

  it('sets right direction on rightward drag', () => {
    const state = createInputState()
    const joystick = createVirtualJoystick(state, container as unknown as HTMLElement)
    joystick.attach()
    container.fireTouch('touchstart', [{ identifier: 1, clientX: 100, clientY: 300 }])
    container.fireTouch('touchmove', [{ identifier: 1, clientX: 160, clientY: 300 }])
    assert.equal(state.right, true)
    assert.equal(state.left, false)
    joystick.detach()
  })

  it('supports diagonal movement', () => {
    const state = createInputState()
    const joystick = createVirtualJoystick(state, container as unknown as HTMLElement)
    joystick.attach()
    container.fireTouch('touchstart', [{ identifier: 1, clientX: 100, clientY: 300 }])
    // Drag up-right
    container.fireTouch('touchmove', [{ identifier: 1, clientX: 160, clientY: 240 }])
    assert.equal(state.up, true)
    assert.equal(state.right, true)
    assert.equal(state.down, false)
    assert.equal(state.left, false)
    joystick.detach()
  })

  it('applies dead zone', () => {
    const state = createInputState()
    const joystick = createVirtualJoystick(state, container as unknown as HTMLElement)
    joystick.attach()
    container.fireTouch('touchstart', [{ identifier: 1, clientX: 100, clientY: 300 }])
    // Move only 5px (within 10px dead zone)
    container.fireTouch('touchmove', [{ identifier: 1, clientX: 105, clientY: 300 }])
    assert.equal(state.right, false)
    assert.equal(state.left, false)
    assert.equal(state.up, false)
    assert.equal(state.down, false)
    joystick.detach()
  })

  it('resets on touch end', () => {
    const state = createInputState()
    const joystick = createVirtualJoystick(state, container as unknown as HTMLElement)
    joystick.attach()
    container.fireTouch('touchstart', [{ identifier: 1, clientX: 100, clientY: 300 }])
    container.fireTouch('touchmove', [{ identifier: 1, clientX: 160, clientY: 240 }])
    assert.equal(state.up, true)
    assert.equal(state.right, true)
    container.fireTouch('touchend', [{ identifier: 1, clientX: 160, clientY: 240 }])
    assert.equal(state.up, false)
    assert.equal(state.right, false)
    assert.equal(state.down, false)
    assert.equal(state.left, false)
    joystick.detach()
  })

  it('resets all directions on detach', () => {
    const state = createInputState()
    const joystick = createVirtualJoystick(state, container as unknown as HTMLElement)
    joystick.attach()
    container.fireTouch('touchstart', [{ identifier: 1, clientX: 100, clientY: 300 }])
    container.fireTouch('touchmove', [{ identifier: 1, clientX: 160, clientY: 240 }])
    joystick.detach()
    assert.equal(state.up, false)
    assert.equal(state.right, false)
    assert.equal(state.down, false)
    assert.equal(state.left, false)
  })
})
