import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { createFireButton } from '../../src/game/fire-button'

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

describe('createFireButton', () => {
  let container: MockElement

  beforeEach(() => {
    container = createMockElement()
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

  it('appends button overlay to container on creation', () => {
    createFireButton(container as unknown as HTMLElement, () => {})
    assert.equal(container.children.length, 1, 'should append button element')
    assert.equal(container.children[0].children.length, 1, 'button should contain inner indicator')
  })

  it('sets aria-label and role on the button', () => {
    createFireButton(container as unknown as HTMLElement, () => {})
    const button = container.children[0]
    assert.equal(button.attributes['aria-label'], 'Fire')
    assert.equal(button.attributes['role'], 'button')
  })

  it('registers touch listeners on attach', () => {
    const fb = createFireButton(container as unknown as HTMLElement, () => {})
    fb.attach()
    const button = container.children[0]
    assert.ok(button.listeners['touchstart']?.length === 1)
    assert.ok(button.listeners['touchend']?.length === 1)
    assert.ok(button.listeners['touchcancel']?.length === 1)
    fb.detach()
  })

  it('removes listeners on detach', () => {
    const fb = createFireButton(container as unknown as HTMLElement, () => {})
    fb.attach()
    fb.detach()
    // Button is removed from container on detach, so check container is empty
    assert.equal(container.children.length, 0)
  })

  it('calls onFire callback on touchstart', () => {
    let fired = false
    const fb = createFireButton(container as unknown as HTMLElement, () => {
      fired = true
    })
    fb.attach()
    const button = container.children[0]
    button.fireTouch('touchstart', [{ identifier: 1, clientX: 500, clientY: 400 }])
    assert.equal(fired, true)
    fb.detach()
  })

  it('calls preventDefault on touchstart', () => {
    const fb = createFireButton(container as unknown as HTMLElement, () => {})
    fb.attach()
    const button = container.children[0]
    let prevented = false
    const event = {
      changedTouches: {
        length: 1,
        0: { identifier: 1, clientX: 500, clientY: 400 },
        [Symbol.iterator]: function* () {
          yield { identifier: 1, clientX: 500, clientY: 400 }
        },
      },
      preventDefault() {
        prevented = true
      },
    }
    for (const fn of button.listeners['touchstart'] ?? []) {
      fn(event)
    }
    assert.equal(prevented, true)
    fb.detach()
  })

  it('ignores second touch while first is active', () => {
    let fireCount = 0
    const fb = createFireButton(container as unknown as HTMLElement, () => {
      fireCount++
    })
    fb.attach()
    const button = container.children[0]
    button.fireTouch('touchstart', [{ identifier: 1, clientX: 500, clientY: 400 }])
    button.fireTouch('touchstart', [{ identifier: 2, clientX: 500, clientY: 400 }])
    assert.equal(fireCount, 1, 'should only fire once while first touch is active')
    fb.detach()
  })

  it('allows firing again after touch end', () => {
    let fireCount = 0
    const fb = createFireButton(container as unknown as HTMLElement, () => {
      fireCount++
    })
    fb.attach()
    const button = container.children[0]
    button.fireTouch('touchstart', [{ identifier: 1, clientX: 500, clientY: 400 }])
    button.fireTouch('touchend', [{ identifier: 1, clientX: 500, clientY: 400 }])
    button.fireTouch('touchstart', [{ identifier: 2, clientX: 500, clientY: 400 }])
    assert.equal(fireCount, 2, 'should fire again after releasing')
    fb.detach()
  })

  it('allows firing again after touch cancel', () => {
    let fireCount = 0
    const fb = createFireButton(container as unknown as HTMLElement, () => {
      fireCount++
    })
    fb.attach()
    const button = container.children[0]
    button.fireTouch('touchstart', [{ identifier: 1, clientX: 500, clientY: 400 }])
    button.fireTouch('touchcancel', [{ identifier: 1, clientX: 500, clientY: 400 }])
    button.fireTouch('touchstart', [{ identifier: 2, clientX: 500, clientY: 400 }])
    assert.equal(fireCount, 2, 'should fire again after cancel')
    fb.detach()
  })

  it('ignores touchend for wrong identifier', () => {
    let fireCount = 0
    const fb = createFireButton(container as unknown as HTMLElement, () => {
      fireCount++
    })
    fb.attach()
    const button = container.children[0]
    button.fireTouch('touchstart', [{ identifier: 1, clientX: 500, clientY: 400 }])
    // End a different touch
    button.fireTouch('touchend', [{ identifier: 99, clientX: 500, clientY: 400 }])
    // Try to fire again — should be blocked because touch 1 is still active
    button.fireTouch('touchstart', [{ identifier: 2, clientX: 500, clientY: 400 }])
    assert.equal(fireCount, 1, 'should still be locked to first touch')
    fb.detach()
  })

  it('removes button element from container on detach', () => {
    const fb = createFireButton(container as unknown as HTMLElement, () => {})
    assert.equal(container.children.length, 1)
    fb.attach()
    fb.detach()
    assert.equal(container.children.length, 0, 'button should be removed')
  })
})
