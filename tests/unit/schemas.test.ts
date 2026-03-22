import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  GameStateSchema,
  FeedbackSchema,
  defaultGameState,
  ShipSchema,
  UpgradesSchema,
  CargoSchema,
} from "../../src/lib/schemas";

describe("ShipSchema", () => {
  it("accepts valid ship data", () => {
    const result = ShipSchema.safeParse({
      x: 0,
      y: 0,
      rotation: 1.5,
      velocityX: 0,
      velocityY: 0,
    });
    assert.equal(result.success, true);
  });

  it("rejects missing fields", () => {
    const result = ShipSchema.safeParse({ x: 0 });
    assert.equal(result.success, false);
  });
});

describe("UpgradesSchema", () => {
  it("accepts valid tier values (1–5)", () => {
    const result = UpgradesSchema.safeParse({
      blaster: 1,
      collector: 5,
      storage: 3,
    });
    assert.equal(result.success, true);
  });

  it("rejects tier 0", () => {
    const result = UpgradesSchema.safeParse({
      blaster: 0,
      collector: 1,
      storage: 1,
    });
    assert.equal(result.success, false);
  });

  it("rejects tier 6", () => {
    const result = UpgradesSchema.safeParse({
      blaster: 6,
      collector: 1,
      storage: 1,
    });
    assert.equal(result.success, false);
  });
});

describe("CargoSchema", () => {
  it("accepts valid cargo", () => {
    const result = CargoSchema.safeParse({
      scrap: 100,
      fragments: 25,
      capacity: 50,
    });
    assert.equal(result.success, true);
  });

  it("rejects negative scrap", () => {
    const result = CargoSchema.safeParse({
      scrap: -1,
      fragments: 0,
      capacity: 50,
    });
    assert.equal(result.success, false);
  });
});

describe("GameStateSchema", () => {
  it("accepts a full valid game state", () => {
    const state = defaultGameState();
    const result = GameStateSchema.safeParse(state);
    assert.equal(result.success, true);
  });

  it("rejects partial state", () => {
    const result = GameStateSchema.safeParse({ score: 5 });
    assert.equal(result.success, false);
  });
});

describe("FeedbackSchema", () => {
  it("accepts valid feedback", () => {
    const result = FeedbackSchema.safeParse({ message: "Great game!" });
    assert.equal(result.success, true);
  });

  it("rejects empty message", () => {
    const result = FeedbackSchema.safeParse({ message: "" });
    assert.equal(result.success, false);
  });
});

describe("defaultGameState", () => {
  it("returns tier-1 upgrades", () => {
    const state = defaultGameState();
    assert.equal(state.upgrades.blaster, 1);
    assert.equal(state.upgrades.collector, 1);
    assert.equal(state.upgrades.storage, 1);
  });

  it("returns empty cargo with capacity 50", () => {
    const state = defaultGameState();
    assert.equal(state.cargo.scrap, 0);
    assert.equal(state.cargo.fragments, 0);
    assert.equal(state.cargo.capacity, 50);
  });

  it("starts at wave 1 with score 0", () => {
    const state = defaultGameState();
    assert.equal(state.wave, 1);
    assert.equal(state.score, 0);
  });
});
