import { describe, expect, it } from "vitest";
import {
  addStatusEffect,
  getArmorMultiplier,
  getMoveSpeedMultiplier,
  hasStatus,
  tickStatusEffects
} from "../../src/sim/status.js";
import { makeUnit } from "./helpers.js";

describe("status effects", () => {
  it("merges status effects of the same type", () => {
    const unit = makeUnit();
    const events: Array<{ tick: number; type: string; payload?: Record<string, unknown> }> = [];

    addStatusEffect(unit, { type: "slow", durationTicks: 2, magnitude: 1 }, "src", events, 1);
    addStatusEffect(unit, { type: "slow", durationTicks: 5, magnitude: 3 }, "src", events, 1);

    expect(unit.statusEffects).toHaveLength(1);
    expect(unit.statusEffects[0].remainingTicks).toBe(5);
    expect(unit.statusEffects[0].magnitude).toBe(3);
  });

  it("ticks burn damage and expires effects", () => {
    const unit = makeUnit({ hp: 20 });
    const events: Array<{ tick: number; type: string; payload?: Record<string, unknown> }> = [];

    addStatusEffect(unit, { type: "burn", durationTicks: 2, magnitude: 1 }, "src", events, 1);
    tickStatusEffects(unit, events, 2);

    expect(unit.hp).toBe(18);
    expect(hasStatus(unit, "burn")).toBe(true);

    tickStatusEffects(unit, events, 3);
    expect(hasStatus(unit, "burn")).toBe(false);
  });

  it("computes move speed and armor multipliers", () => {
    const unit = makeUnit({
      statusEffects: [{ type: "slow", remainingTicks: 2, magnitude: 5 }]
    });
    expect(getMoveSpeedMultiplier(unit)).toBe(0.4);

    const burned = makeUnit({
      statusEffects: [{ type: "burn", remainingTicks: 2, magnitude: 1 }]
    });
    expect(getArmorMultiplier(burned)).toBe(0.8);
  });
});
