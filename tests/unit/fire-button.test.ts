import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createCollectButton } from '../../src/game/fire-button'

type Listener = (...args: unknown[]) => void

interface MockElement {
  style: Record<string, string>
  children: MockElement[]
  parentElement: MockElement | null
  listeners: Record<string, Listener[]>
  appendChild(child: MockElement): void
  removeChild(child: MockElement): void
  addEventListener(type: string, fn: Listener, opts?: { passive?: boolean }): void
  removeEventListener(type: string, fn: Listener): void
  setAttribute(name: string, value: string): void
  getAttribute(name: string): string | null
  attributes: Record<string, string>
  fireTouch(
    type: string,
    touches: Array<{ identifier: number; clientX: number; clientY: number }>,
  ): void
}

function createMockStyle(): Record<string, string> {
  const props: Record<string, string> = {}
  return new Proxy(props, {
    set(target, key, value: string) {
      if (key === 'cssText') {
        for (const part of value.split(';')) {
          const colon = part.indexOf(':')
          if (colon < 0) continue
          const k = part.slice(0, colon).trim()
          const v = part.slice(colon + 1).trim()
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
  const listeners: Record<string, Listener[]> = {}
  const attributes: Record<string, string> = {}
  const el: MockElement = {
    style: createMockStyle(),
    children: [],
    parentElement: null,
    listeners,
    attributes,
    appendChild(child: MockElement) {
      el.children.push(child)
      child.parentElement = el
    },
    removeChild(child: MockElement) {
      const idx = el.children.indexOf(child)
      if (idx >= 0) el.children.splice(idx, 1)
      child.parentElement = null
    },
    addEventListener(type: string, fn: Listener) {
      if (!listeners[type]) listeners[type] = []
      listeners[type].push(fn)
    },
    removeEventListener(type: string, fn: Listener) {
      if (listeners[type]) {
        listeners[type] = listeners[type].filter((f) => f !== fn)
      }
    },
    setAttribute(name: string, value: string) {
      attributes[name] = value
    },
    getAttribute(name: string) {
      return attributes[name] ?? null
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
  return el
}

function setupDocument(): void {
  const g = globalThis as Record<string, unknown>
  g.document = {
    createElement() {
      return createMockElement()
    },
  }
  g.window = { innerWidth: 375, innerHeight: 667 }
}

function teardownDocument(): void {
  const g = globalThis as Record<string, unknown>
  delete g.document
  delete g.window
}

describe('createCollectButton', () => {
  let container: MockElement

  beforeEach(() => {
    container = createMockElement()
    setupDocument()
  })

  afterEach(() => {
    teardownDocument()
  })

  it('appends button overlay to container', () => {
    createCollectButton(
      container as unknown as HTMLElement,
      () => {},
      () => {},
    )
    assert.equal(container.children.length, 1)
    assert.equal(container.children[0].children.length, 1)
  })

  it('sets aria-label to Collect', () => {
    createCollectButton(
      container as unknown as HTMLElement,
      () => {},
      () => {},
    )
    const button = container.children[0]
    assert.equal(button.attributes['aria-label'], 'Collect')
  })

  it('calls onPress on touchstart and onRelease on touchend', () => {
    let pressed = false
    let released = false
    const cb = createCollectButton(
      container as unknown as HTMLElement,
      () => {
        pressed = true
      },
      () => {
        released = true
      },
    )
    cb.attach()
    const button = container.children[0]
    button.fireTouch('touchstart', [{ identifier: 1, clientX: 500, clientY: 400 }])
    assert.equal(pressed, true)
    assert.equal(released, false)
    button.fireTouch('touchend', [{ identifier: 1, clientX: 500, clientY: 400 }])
    assert.equal(released, true)
    cb.detach()
  })

  it('calls onRelease on touchcancel', () => {
    let released = false
    const cb = createCollectButton(
      container as unknown as HTMLElement,
      () => {},
      () => {
        released = true
      },
    )
    cb.attach()
    const button = container.children[0]
    button.fireTouch('touchstart', [{ identifier: 1, clientX: 500, clientY: 400 }])
    button.fireTouch('touchcancel', [{ identifier: 1, clientX: 500, clientY: 400 }])
    assert.equal(released, true)
    cb.detach()
  })

  it('reports isPressed while held', () => {
    const cb = createCollectButton(
      container as unknown as HTMLElement,
      () => {},
      () => {},
    )
    cb.attach()
    const button = container.children[0]
    assert.equal(cb.isPressed(), false)
    button.fireTouch('touchstart', [{ identifier: 1, clientX: 500, clientY: 400 }])
    assert.equal(cb.isPressed(), true)
    button.fireTouch('touchend', [{ identifier: 1, clientX: 500, clientY: 400 }])
    assert.equal(cb.isPressed(), false)
    cb.detach()
  })
})
