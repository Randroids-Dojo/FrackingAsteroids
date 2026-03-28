function getButtonSize(): number {
  const vw = Math.min(window.innerWidth, window.innerHeight)
  return Math.max(56, Math.min(80, Math.round(vw * 0.12)))
}

const BORDER_WIDTH = 3
const BUTTON_GAP = 16

export interface ActionButton {
  attach: () => void
  detach: () => void
  /** Whether the button is currently held down. */
  isPressed: () => boolean
}

interface ButtonStyle {
  r: number
  g: number
  b: number
}

const STYLE_FIRE: ButtonStyle = { r: 255, g: 170, b: 0 }
const STYLE_COLLECT: ButtonStyle = { r: 0, g: 170, b: 255 }

function rgba(s: ButtonStyle, a: number): string {
  return `rgba(${s.r},${s.g},${s.b},${a})`
}

function createButtonOverlay(
  container: HTMLElement,
  style: ButtonStyle,
  bottomOffset: string,
  label: string,
): {
  button: HTMLElement
  setPressed: (pressed: boolean) => void
  destroy: () => void
} {
  const size = getButtonSize()
  const rightMargin = Math.max(16, Math.round(size * 0.4))
  const button = document.createElement('div')
  button.setAttribute('aria-label', label)
  button.setAttribute('role', 'button')
  button.style.cssText =
    `position:absolute;bottom:${bottomOffset};right:${rightMargin}px;width:${size}px;height:${size}px;` +
    `border-radius:50%;border:${BORDER_WIDTH}px solid ${rgba(style, 0.6)};` +
    `background:${rgba(style, 0.15)};z-index:10;touch-action:none;` +
    `display:flex;align-items:center;justify-content:center;`

  const innerSize = Math.round(size * 0.4)
  const inner = document.createElement('div')
  inner.style.cssText =
    `width:${innerSize}px;height:${innerSize}px;` +
    `border-radius:50%;background:${rgba(style, 0.4)};pointer-events:none;`

  button.appendChild(inner)
  container.appendChild(button)

  return {
    button,
    setPressed(pressed: boolean) {
      if (pressed) {
        button.style.background = rgba(style, 0.4)
        inner.style.background = rgba(style, 0.7)
      } else {
        button.style.background = rgba(style, 0.15)
        inner.style.background = rgba(style, 0.4)
      }
    },
    destroy() {
      if (button.parentElement) button.parentElement.removeChild(button)
    },
  }
}

function createActionButton(
  container: HTMLElement,
  style: ButtonStyle,
  bottomOffset: string,
  label: string,
  onPress: () => void,
  onRelease?: () => void,
): ActionButton {
  const overlay = createButtonOverlay(container, style, bottomOffset, label)
  let activeId: number | null = null

  function onTouchStart(e: TouchEvent): void {
    if (activeId !== null) return
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      activeId = touch.identifier
      overlay.setPressed(true)
      onPress()
      e.preventDefault()
      return
    }
  }

  function onTouchEnd(e: TouchEvent): void {
    if (activeId === null) return
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      if (touch.identifier === activeId) {
        activeId = null
        overlay.setPressed(false)
        if (onRelease) onRelease()
        return
      }
    }
  }

  return {
    attach() {
      overlay.button.addEventListener('touchstart', onTouchStart, { passive: false })
      overlay.button.addEventListener('touchend', onTouchEnd)
      overlay.button.addEventListener('touchcancel', onTouchEnd)
    },
    detach() {
      overlay.button.removeEventListener('touchstart', onTouchStart)
      overlay.button.removeEventListener('touchend', onTouchEnd)
      overlay.button.removeEventListener('touchcancel', onTouchEnd)
      activeId = null
      overlay.destroy()
    },
    isPressed() {
      return activeId !== null
    },
  }
}

function getFireBottom(): string {
  return window.innerHeight < 600 ? '22%' : '28%'
}

function getCollectBottom(): string {
  const size = getButtonSize()
  const base = window.innerHeight < 600 ? '22%' : '28%'
  return `calc(${base} + ${size + BUTTON_GAP}px)`
}

/**
 * Creates a visible fire button on the bottom-right of the screen for mobile.
 * Calls `onFire` on each touchstart.
 */
export function createFireButton(container: HTMLElement, onFire: () => void): ActionButton {
  return createActionButton(container, STYLE_FIRE, getFireBottom(), 'Fire', onFire)
}

/**
 * Creates a collect button above the fire button on the bottom-right.
 * The collector is active while the button is held down.
 */
export function createCollectButton(
  container: HTMLElement,
  onPress: () => void,
  onRelease: () => void,
): ActionButton {
  return createActionButton(
    container,
    STYLE_COLLECT,
    getCollectBottom(),
    'Collect',
    onPress,
    onRelease,
  )
}
