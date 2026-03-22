import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createInputState } from '../../src/game/input'
import { createVirtualJoystick } from '../../src/game/virtual-joystick'

type Listener = (...args: unknown[]) => void
type ListenerOptions = { passive?: boolean }

interface MockElement {
  style: Record<string, string>
  children: MockElement[]
  parentElement: MockElement | null
  appendChild(child: MockElement): void
  removeChild(child: MockElement): void
}

function createMockStyle(): Record<string, string> {
  const props: Record<string, string> = {}
  return new Proxy(props, {
    set(target, key, value: string) {
      if (key === 'cssText') {
        // Parse "key:value;key:value;" into individual properties
        for (const part of value.split(';')) {
          const colon = part.indexOf(':')
          if (colon < 0) continue
          const k = part.slice(0, colon).trim()
          const v = part.slice(colon + 1).trim()
          // Convert kebab-case to camelCase
          const camel = k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
          target[camel] = v
        }
        target['cssText'] = value
        return true
      }
      target[key as string] = value
      return true
    },
    get(target, key) {
      return target[key as string]
    },
  })
}

function createMockElement(): MockElement {
  const el: MockElement = {
    style: createMockStyle(),
    children: [],
    parentElement: null,
    appendChild(child: MockElement) {
      el.children.push(child)
      child.parentElement = el
    },
    removeChild(child: MockElement) {
      const idx = el.children.indexOf(child)
      if (idx >= 0) el.children.splice(idx, 1)
      child.parentElement = null
    },
  }
  return el
}

interface MockContainer extends MockElement {
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
  const base = createMockElement()
  return {
    ...base,
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
        preventDefault() {},
      }
      for (let i = 0; i < touches.length; i++) {
        ;(event.changedTouches as Record<number, unknown>)[i] = touches[i]
      }
      for (const fn of listeners[type] ?? []) {
        fn(event)
      }
    },
  }
}

describe('createVirtualJoystick', () => {
  let container: MockContainer

  beforeEach(() => {
    container = createMockContainer()

    // Mock document.createElement for the overlay DOM elements
    const g = globalThis as Record<string, unknown>
    g.document = {
      createElement() {
        return createMockElement()
      },
    }
  })

  afterEach(() => {
    const g = globalThis as Record<string, unknown>
    delete g.document
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

  it('appends overlay to container on creation', () => {
    const state = createInputState()
    createVirtualJoystick(state, container as unknown as HTMLElement)
    assert.equal(container.children.length, 1, 'should append base element')
    assert.equal(container.children[0].children.length, 1, 'base should contain knob')
  })

  it('removes overlay on detach', () => {
    const state = createInputState()
    const joystick = createVirtualJoystick(state, container as unknown as HTMLElement)
    assert.equal(container.children.length, 1)
    joystick.attach()
    joystick.detach()
    assert.equal(container.children.length, 0, 'overlay should be removed')
  })

  it('shows overlay on left-half touch start', () => {
    const state = createInputState()
    const joystick = createVirtualJoystick(state, container as unknown as HTMLElement)
    joystick.attach()
    const base = container.children[0]
    assert.equal(base.style.display, 'none')
    container.fireTouch('touchstart', [{ identifier: 1, clientX: 100, clientY: 300 }])
    assert.equal(base.style.display, 'block')
    joystick.detach()
  })

  it('hides overlay on touch end', () => {
    const state = createInputState()
    const joystick = createVirtualJoystick(state, container as unknown as HTMLElement)
    joystick.attach()
    const base = container.children[0]
    container.fireTouch('touchstart', [{ identifier: 1, clientX: 100, clientY: 300 }])
    assert.equal(base.style.display, 'block')
    container.fireTouch('touchend', [{ identifier: 1, clientX: 100, clientY: 300 }])
    assert.equal(base.style.display, 'none')
    joystick.detach()
  })

  it('activates on left-half touch start', () => {
    const state = createInputState()
    const joystick = createVirtualJoystick(state, container as unknown as HTMLElement)
    joystick.attach()
    container.fireTouch('touchstart', [{ identifier: 1, clientX: 100, clientY: 300 }])
    assert.equal(state.up, false)
    assert.equal(state.down, false)
    joystick.detach()
  })

  it('ignores right-half touch start', () => {
    const state = createInputState()
    const joystick = createVirtualJoystick(state, container as unknown as HTMLElement)
    joystick.attach()
    container.fireTouch('touchstart', [{ identifier: 1, clientX: 500, clientY: 300 }])
    container.fireTouch('touchmove', [{ identifier: 1, clientX: 500, clientY: 200 }])
    assert.equal(state.up, false)
    joystick.detach()
  })

  it('sets up direction on upward drag', () => {
    const state = createInputState()
    const joystick = createVirtualJoystick(state, container as unknown as HTMLElement)
    joystick.attach()
    container.fireTouch('touchstart', [{ identifier: 1, clientX: 100, clientY: 300 }])
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
