import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { computeMeterState } from '../../src/game/recharge-meter'
import { FIRE_RATES } from '../../src/game/blaster-constants'

function makeBlaster(cooldownRemaining: number) {
  return { cooldownRemaining }
}

describe('computeMeterState', () => {
  it('returns hidden when cooldown is zero', () => {
    const state = computeMeterState(makeBlaster(0), 1)
    assert.equal(state.visible, false)
    assert.equal(state.progress, 1)
  })

  it('returns hidden when cooldown is negative', () => {
    const state = computeMeterState(makeBlaster(-0.1), 1)
    assert.equal(state.visible, false)
  })

  it('returns visible when on cooldown', () => {
    const cooldownTotal = 1 / FIRE_RATES[0] // tier 1: 1 shot/sec → 1s cooldown
    const state = computeMeterState(makeBlaster(cooldownTotal * 0.5), 1)
    assert.equal(state.visible, true)
    assert.ok(
      Math.abs(state.progress - 0.5) < 0.001,
      `progress should be ~0.5, got ${state.progress}`,
    )
  })

  it('progress is 0 at start of cooldown', () => {
    const cooldownTotal = 1 / FIRE_RATES[0]
    const state = computeMeterState(makeBlaster(cooldownTotal), 1)
    assert.equal(state.visible, true)
    assert.ok(Math.abs(state.progress) < 0.001, `progress should be ~0, got ${state.progress}`)
  })

  it('uses amber color while charging', () => {
    const cooldownTotal = 1 / FIRE_RATES[0]
    const state = computeMeterState(makeBlaster(cooldownTotal * 0.5), 1)
    assert.equal(state.color, 0xffaa00)
  })

  it('uses green color when nearly ready (>=90%)', () => {
    const cooldownTotal = 1 / FIRE_RATES[0]
    const state = computeMeterState(makeBlaster(cooldownTotal * 0.05), 1)
    assert.ok(state.progress >= 0.9, `progress should be >=0.9, got ${state.progress}`)
    assert.equal(state.color, 0x00ff88)
  })

  it('clamps tier to valid range', () => {
    const cooldownTotal = 1 / FIRE_RATES[0]
    const state = computeMeterState(makeBlaster(cooldownTotal * 0.5), 0)
    assert.equal(state.visible, true)
    assert.ok(Math.abs(state.progress - 0.5) < 0.001)
  })

  it('handles tier 5 fire rate', () => {
    const cooldownTotal = 1 / FIRE_RATES[4] // tier 5: 5 shots/sec → 0.2s cooldown
    const state = computeMeterState(makeBlaster(cooldownTotal * 0.5), 5)
    assert.equal(state.visible, true)
    assert.ok(Math.abs(state.progress - 0.5) < 0.001)
  })

  it('clamps progress to 0-1 range', () => {
    const cooldownTotal = 1 / FIRE_RATES[0]
    const state = computeMeterState(makeBlaster(cooldownTotal * 2), 1)
    assert.equal(state.progress, 0, 'progress should clamp to 0')
  })
})

import { installMockThree, uninstallMockThree } from '../integration/helpers/mock-three'

before(() => {
  installMockThree()
})

after(() => {
  uninstallMockThree()
})

describe('createRechargeMeter', () => {
  it('returns a group with bg and fill children', async () => {
    const { createRechargeMeter } = await import('../../src/game/recharge-meter')
    const meter = createRechargeMeter()
    assert.equal(meter.children.length, 2, 'should have bg and fill meshes')
  })

  it('stores fill, fillMat, and prevColor in userData', async () => {
    const { createRechargeMeter } = await import('../../src/game/recharge-meter')
    const meter = createRechargeMeter()
    const ud = meter.userData as Record<string, unknown>
    assert.ok(ud.fill, 'userData should have fill')
    assert.ok(ud.fillMat, 'userData should have fillMat')
    assert.equal(ud.prevColor, 0, 'prevColor should start at 0')
  })

  it('fill mesh is the second child', async () => {
    const { createRechargeMeter } = await import('../../src/game/recharge-meter')
    const meter = createRechargeMeter()
    const ud = meter.userData as Record<string, unknown>
    assert.equal(ud.fill, meter.children[1], 'fill should be second child')
  })
})

describe('updateRechargeMeter', () => {
  function patchFillMatColor(meter: { userData: Record<string, unknown> }) {
    const ud = meter.userData as Record<string, unknown>
    const fillMat = ud.fillMat as Record<string, unknown>
    fillMat.color = {
      _hex: 0,
      setHex(hex: number) {
        ;(this as Record<string, unknown>)._hex = hex
      },
    }
  }

  it('hides meter when cooldown is zero', async () => {
    const { createRechargeMeter, updateRechargeMeter } =
      await import('../../src/game/recharge-meter')
    const meter = createRechargeMeter()
    patchFillMatColor(meter)
    updateRechargeMeter(meter, makeBlaster(0), 1)
    assert.equal(meter.visible, false)
  })

  it('hides meter when cooldown is negative', async () => {
    const { createRechargeMeter, updateRechargeMeter } =
      await import('../../src/game/recharge-meter')
    const meter = createRechargeMeter()
    patchFillMatColor(meter)
    updateRechargeMeter(meter, makeBlaster(-0.5), 1)
    assert.equal(meter.visible, false)
  })

  it('shows meter when cooldown is positive', async () => {
    const { createRechargeMeter, updateRechargeMeter } =
      await import('../../src/game/recharge-meter')
    const meter = createRechargeMeter()
    patchFillMatColor(meter)
    const cooldownTotal = 1 / FIRE_RATES[0]
    updateRechargeMeter(meter, makeBlaster(cooldownTotal * 0.5), 1)
    assert.equal(meter.visible, true)
  })

  it('updates fill scale based on progress', async () => {
    const { createRechargeMeter, updateRechargeMeter } =
      await import('../../src/game/recharge-meter')
    const meter = createRechargeMeter()
    patchFillMatColor(meter)
    const cooldownTotal = 1 / FIRE_RATES[0]
    updateRechargeMeter(meter, makeBlaster(cooldownTotal * 0.5), 1)

    const ud = meter.userData as Record<string, unknown>
    const fill = ud.fill as { scale: { x: number }; position: { x: number } }
    assert.ok(
      Math.abs(fill.scale.x - 0.5) < 0.001,
      `fill scale.x should be ~0.5, got ${fill.scale.x}`,
    )
  })

  it('offsets fill position so bar grows from left edge', async () => {
    const { createRechargeMeter, updateRechargeMeter } =
      await import('../../src/game/recharge-meter')
    const meter = createRechargeMeter()
    patchFillMatColor(meter)
    const cooldownTotal = 1 / FIRE_RATES[0]
    updateRechargeMeter(meter, makeBlaster(cooldownTotal * 0.5), 1)

    const ud = meter.userData as Record<string, unknown>
    const fill = ud.fill as { position: { x: number } }
    // BAR_WIDTH = 4, progress = 0.5 → offset = -(4 * 0.5) / 2 = -1
    assert.ok(
      Math.abs(fill.position.x - -1) < 0.001,
      `fill position.x should be ~-1, got ${fill.position.x}`,
    )
  })

  it('uses amber color while charging (<90%)', async () => {
    const { createRechargeMeter, updateRechargeMeter } =
      await import('../../src/game/recharge-meter')
    const meter = createRechargeMeter()
    patchFillMatColor(meter)
    const cooldownTotal = 1 / FIRE_RATES[0]
    updateRechargeMeter(meter, makeBlaster(cooldownTotal * 0.5), 1)

    const ud = meter.userData as Record<string, unknown>
    const fillMat = ud.fillMat as { color: { _hex: number } }
    assert.equal(fillMat.color._hex, 0xffaa00, 'should use amber/charging color')
  })

  it('uses green color when nearly ready (>=90%)', async () => {
    const { createRechargeMeter, updateRechargeMeter } =
      await import('../../src/game/recharge-meter')
    const meter = createRechargeMeter()
    patchFillMatColor(meter)
    const cooldownTotal = 1 / FIRE_RATES[0]
    // 5% remaining → 95% progress → above 0.9 threshold
    updateRechargeMeter(meter, makeBlaster(cooldownTotal * 0.05), 1)

    const ud = meter.userData as Record<string, unknown>
    const fillMat = ud.fillMat as { color: { _hex: number } }
    assert.equal(fillMat.color._hex, 0x00ff88, 'should use green/ready color')
  })

  it('only calls setHex when color changes', async () => {
    const { createRechargeMeter, updateRechargeMeter } =
      await import('../../src/game/recharge-meter')
    const meter = createRechargeMeter()
    patchFillMatColor(meter)
    const cooldownTotal = 1 / FIRE_RATES[0]

    let setHexCallCount = 0
    const ud = meter.userData as Record<string, unknown>
    const fillMat = ud.fillMat as Record<string, unknown>
    fillMat.color = {
      _hex: 0,
      setHex(hex: number) {
        setHexCallCount++
        ;(this as Record<string, unknown>)._hex = hex
      },
    }

    // First call — should set color
    updateRechargeMeter(meter, makeBlaster(cooldownTotal * 0.5), 1)
    assert.equal(setHexCallCount, 1, 'should call setHex on first update')

    // Second call with same progress — same color, should not call setHex again
    updateRechargeMeter(meter, makeBlaster(cooldownTotal * 0.5), 1)
    assert.equal(setHexCallCount, 1, 'should not call setHex when color unchanged')

    // Third call crossing threshold — should call setHex again
    updateRechargeMeter(meter, makeBlaster(cooldownTotal * 0.05), 1)
    assert.equal(setHexCallCount, 2, 'should call setHex when color changes')
  })
})
