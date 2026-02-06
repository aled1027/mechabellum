import { describe, expect, it } from "vitest";
import { runLoadTest } from "../../src/tools/loadTest.js";

describe("load test", () => {
  it("runs match simulations", async () => {
    const result = await runLoadTest({
      matches: 2,
      rounds: 2,
      seed: 1,
      maxTicks: 2,
      planningMs: 1000,
      combatMs: 1000
    });

    expect(result.matches).toBe(2);
    expect(result.rounds).toBe(2);
    expect(result.totalCombats).toBe(4);
    expect(result.totalTicks).toBeGreaterThanOrEqual(0);
  });
});
