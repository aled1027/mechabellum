import { describe, expect, it } from "vitest";
import {
  applyEndOfRoundEconomy,
  calculateSupplyAdjustedCost,
  defaultEconomyConfig,
  type PlayerEconomyState
} from "../../src/game/economy.js";

describe("economy", () => {
  it("pays out income with win bonus and interest cap", () => {
    const economy: PlayerEconomyState = { credits: 200, winStreak: 0, lossStreak: 0 };
    const update = applyEndOfRoundEconomy(economy, "win", {
      ...defaultEconomyConfig,
      interestCap: 10
    });

    expect(update.payout.interest).toBe(10);
    expect(update.payout.winBonus).toBe(defaultEconomyConfig.winBonus);
    expect(update.payout.total).toBe(36);
    expect(update.economy.credits).toBe(236);
    expect(update.economy.winStreak).toBe(1);
  });

  it("increments loss streak bonuses", () => {
    const economy: PlayerEconomyState = { credits: 10, winStreak: 0, lossStreak: 2 };
    const update = applyEndOfRoundEconomy(economy, "loss");

    expect(update.payout.lossBonus).toBe(6);
    expect(update.economy.lossStreak).toBe(3);
    expect(update.economy.credits).toBe(37);
  });

  it("scales unit costs with supply overage", () => {
    const cost = calculateSupplyAdjustedCost(50, 110, {
      supplyCap: 100,
      costScaling: 0.01
    });

    expect(cost.multiplier).toBeCloseTo(1.1);
    expect(cost.cost).toBe(55);
  });
});
