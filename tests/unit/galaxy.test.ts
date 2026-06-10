import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_TRAVEL_STATUS,
  FUEL_PACK_AMOUNT,
  FUEL_PACK_COST,
  GALAXY_SYSTEMS,
  MAX_FUEL,
  calculateJumpFuelCost,
  buyFuelPack,
  getSolarSystem,
  resolveJump,
} from '../../src/game/galaxy'

describe('galaxy systems', () => {
  it('defines a home system and three jump targets', () => {
    assert.equal(GALAXY_SYSTEMS.length, 4)
    assert.equal(getSolarSystem(DEFAULT_TRAVEL_STATUS.currentSystem).name, 'Terra Prime')
  })

  it('calculates zero fuel cost for the current system', () => {
    assert.equal(calculateJumpFuelCost('terra-prime', 'terra-prime'), 0)
  })

  it('calculates positive fuel costs for remote systems', () => {
    const cost = calculateJumpFuelCost('terra-prime', 'cinder-belt')
    assert.ok(cost > 0)
    assert.equal(cost, calculateJumpFuelCost('cinder-belt', 'terra-prime'))
  })
})

describe('resolveJump', () => {
  it('spends fuel and moves current system on success', () => {
    const result = resolveJump(DEFAULT_TRAVEL_STATUS, 'cinder-belt')
    assert.equal(result.ok, true)
    assert.equal(result.travel.currentSystem, 'cinder-belt')
    assert.equal(result.travel.fuel, MAX_FUEL - result.cost)
  })

  it('blocks jumping to the current system', () => {
    const result = resolveJump(DEFAULT_TRAVEL_STATUS, 'terra-prime')
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.reason, 'same-system')
    assert.equal(result.travel, DEFAULT_TRAVEL_STATUS)
  })

  it('blocks jumps without enough fuel', () => {
    const result = resolveJump({ ...DEFAULT_TRAVEL_STATUS, fuel: 1 }, 'umbra-depths')
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.reason, 'not-enough-fuel')
  })
})

describe('buyFuelPack', () => {
  it('adds one pack of fuel and spends scrap', () => {
    const travel = { ...DEFAULT_TRAVEL_STATUS, fuel: 40 }
    const result = buyFuelPack(travel, FUEL_PACK_COST)
    assert.equal(result.ok, true)
    assert.equal(result.fuelAdded, FUEL_PACK_AMOUNT)
    assert.equal(result.scrapSpent, FUEL_PACK_COST)
    assert.equal(result.travel.fuel, 40 + FUEL_PACK_AMOUNT)
  })

  it('caps fuel at maxFuel', () => {
    const travel = { ...DEFAULT_TRAVEL_STATUS, fuel: 90 }
    const result = buyFuelPack(travel, FUEL_PACK_COST)
    assert.equal(result.ok, true)
    assert.equal(result.fuelAdded, 10)
    assert.equal(result.travel.fuel, MAX_FUEL)
  })

  it('blocks fuel purchases when the tank is full', () => {
    const result = buyFuelPack(DEFAULT_TRAVEL_STATUS, FUEL_PACK_COST)
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.reason, 'full')
  })

  it('blocks fuel purchases without enough scrap', () => {
    const travel = { ...DEFAULT_TRAVEL_STATUS, fuel: 40 }
    const result = buyFuelPack(travel, FUEL_PACK_COST - 1)
    assert.equal(result.ok, false)
    if (!result.ok) assert.equal(result.reason, 'not-enough-scrap')
  })
})
