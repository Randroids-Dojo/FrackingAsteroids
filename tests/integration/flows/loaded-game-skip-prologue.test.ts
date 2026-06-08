/**
 * Integration test: Loaded-game skipPrologue path
 *
 * Loaded games never run the tutorial, so the scene's scripted-prologue init
 * (maxed "intro" ship, prologue field, ship at the origin) would otherwise
 * persist. createGameScene({ skipPrologue: true }) must call resetShipToStation()
 * at init so loaded games start at the station with the normal ship.
 *
 * resetShipToStation() is the only init-time path that fires onToolChange('blaster')
 * and onPlayerDamage(PLAYER_MAX_HP), so those callbacks are the observable signal
 * that the reset ran.
 */

import { describe, it, before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { installMockThree, uninstallMockThree } from '../helpers/mock-three'
import type { GameScene, GameSceneOptions } from '../../../src/game/scene'

// Loaded lazily after mock-three + DOM globals are installed.
let createGameScene: (
  container: HTMLElement,
  getPaused: () => boolean,
  getTutorialStep: () => 'done',
  options?: GameSceneOptions,
) => GameScene
let PLAYER_MAX_HP: number

// --- Minimal DOM mock (no jsdom) ---------------------------------------------

function makeElement(): Record<string, unknown> {
  const el: Record<string, unknown> = {
    style: {} as Record<string, string>,
    children: [] as unknown[],
    parentElement: null as unknown,
    textContent: '',
    clientWidth: 800,
    clientHeight: 600,
    appendChild(child: Record<string, unknown>) {
      child.parentElement = el
      ;(el.children as unknown[]).push(child)
      return child
    },
    removeChild(child: Record<string, unknown>) {
      const arr = el.children as unknown[]
      const i = arr.indexOf(child)
      if (i >= 0) arr.splice(i, 1)
      child.parentElement = null
      return child
    },
    remove() {
      const parent = el.parentElement as { removeChild?: (c: unknown) => void } | null
      parent?.removeChild?.(el)
    },
    setAttribute() {},
    addEventListener() {},
    removeEventListener() {},
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 }
    },
  }
  return el
}

const savedGlobals: Record<string, PropertyDescriptor | undefined> = {}

function installDom(): void {
  const g = globalThis as Record<string, unknown>
  for (const key of ['window', 'document', 'requestAnimationFrame', 'cancelAnimationFrame']) {
    savedGlobals[key] = Object.getOwnPropertyDescriptor(g, key)
  }
  // hasTouch stays false: no `ontouchstart` on window and no navigator.maxTouchPoints.
  g.window = {
    devicePixelRatio: 1,
    innerWidth: 1024,
    innerHeight: 768,
    addEventListener() {},
    removeEventListener() {},
  }
  g.document = {
    createElement: () => makeElement(),
  }
  g.requestAnimationFrame = () => 0
  g.cancelAnimationFrame = () => {}
}

function uninstallDom(): void {
  const g = globalThis as Record<string, unknown>
  for (const [key, desc] of Object.entries(savedGlobals)) {
    if (desc) Object.defineProperty(g, key, desc)
    else delete g[key]
  }
}

before(async () => {
  installMockThree()
  installDom()
  const scene = await import('../../../src/game/scene')
  createGameScene = scene.createGameScene
  PLAYER_MAX_HP = scene.PLAYER_MAX_HP
})

after(() => {
  uninstallDom()
  uninstallMockThree()
})

describe('loaded game skipPrologue', () => {
  let container: HTMLElement
  let scene: GameScene | null

  beforeEach(() => {
    container = makeElement() as unknown as HTMLElement
    scene = null
  })

  afterEach(() => {
    scene?.dispose()
  })

  it('resets to the station with the normal ship when skipPrologue is true', () => {
    let toolChange: string | null = null
    let damageHp: number | null = null

    scene = createGameScene(
      container,
      () => false,
      () => 'done',
      {
        skipPrologue: true,
        onToolChange: (tool) => {
          toolChange = tool
        },
        onPlayerDamage: (hp) => {
          damageHp = hp
        },
      },
    )

    // resetShipToStation() swaps to the blaster and restores full HP at init.
    assert.equal(toolChange, 'blaster', 'should reset active tool to blaster')
    assert.equal(damageHp, PLAYER_MAX_HP, 'should restore full HP')
  })

  it('leaves the scripted prologue intact when skipPrologue is false', () => {
    let toolChangeCalled = false
    let damageCalled = false

    scene = createGameScene(
      container,
      () => false,
      () => 'done',
      {
        skipPrologue: false,
        onToolChange: () => {
          toolChangeCalled = true
        },
        onPlayerDamage: () => {
          damageCalled = true
        },
      },
    )

    // Without skipPrologue, resetShipToStation() is not invoked at init, so
    // neither reset-only callback fires.
    assert.equal(toolChangeCalled, false, 'should not reset the tool')
    assert.equal(damageCalled, false, 'should not touch player HP')
  })
})
