const BUTTON_SIZE = 80
const BORDER_WIDTH = 3

export interface FireButton {
  attach: () => void
  detach: () => void
}

function createButtonOverlay(container: HTMLElement): {
  button: HTMLElement
  setPressed: (pressed: boolean) => void
  destroy: () => void
} {
  const button = document.createElement('div')
  button.setAttribute('aria-label', 'Fire')
  button.setAttribute('role', 'button')
  button.style.cssText =
    `position:absolute;bottom:48px;right:48px;width:${BUTTON_SIZE}px;height:${BUTTON_SIZE}px;` +
    `border-radius:50%;border:${BORDER_WIDTH}px solid rgba(255,170,0,0.6);` +
    `background:rgba(255,170,0,0.15);z-index:10;touch-action:none;` +
    `display:flex;align-items:center;justify-content:center;`

  // Inner crosshair / fire indicator
  const inner = document.createElement('div')
  inner.style.cssText =
    `width:${BUTTON_SIZE * 0.4}px;height:${BUTTON_SIZE * 0.4}px;` +
    `border-radius:50%;background:rgba(255,170,0,0.4);pointer-events:none;`

  button.appendChild(inner)
  container.appendChild(button)

  return {
    button,
    setPressed(pressed: boolean) {
      if (pressed) {
        button.style.background = 'rgba(255,170,0,0.4)'
        inner.style.background = 'rgba(255,170,0,0.7)'
      } else {
        button.style.background = 'rgba(255,170,0,0.15)'
        inner.style.background = 'rgba(255,170,0,0.4)'
      }
    },
    destroy() {
      if (button.parentElement) button.parentElement.removeChild(button)
    },
  }
}

/**
 * Creates a visible fire button on the bottom-right of the screen for mobile.
 * Calls `onFire` on each touchstart on the button.
 */
export function createFireButton(container: HTMLElement, onFire: () => void): FireButton {
  const overlay = createButtonOverlay(container)
  let activeId: number | null = null

  function onTouchStart(e: TouchEvent): void {
    if (activeId !== null) return
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i]
      activeId = touch.identifier
      overlay.setPressed(true)
      onFire()
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
  }
}
