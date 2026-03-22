import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BLASTER_COSTS,
  COLLECTOR_COSTS,
  STORAGE_COSTS,
} from "../../src/game/types";

describe("upgrade costs", () => {
  it("BLASTER_COSTS has 4 tiers (2–5)", () => {
    assert.equal(BLASTER_COSTS.length, 4);
    assert.equal(BLASTER_COSTS[0].tier, 2);
    assert.equal(BLASTER_COSTS[3].tier, 5);
  });

  it("COLLECTOR_COSTS has 4 tiers (2–5)", () => {
    assert.equal(COLLECTOR_COSTS.length, 4);
    assert.equal(COLLECTOR_COSTS[0].tier, 2);
    assert.equal(COLLECTOR_COSTS[3].tier, 5);
  });

  it("STORAGE_COSTS has 4 tiers (2–5)", () => {
    assert.equal(STORAGE_COSTS.length, 4);
    assert.equal(STORAGE_COSTS[0].tier, 2);
    assert.equal(STORAGE_COSTS[3].tier, 5);
  });

  it("costs increase with tier", () => {
    for (const costs of [BLASTER_COSTS, COLLECTOR_COSTS, STORAGE_COSTS]) {
      for (let i = 1; i < costs.length; i++) {
        assert.ok(
          costs[i].cost > costs[i - 1].cost,
          `tier ${costs[i].tier} should cost more than tier ${costs[i - 1].tier}`,
        );
      }
    }
  });
});
