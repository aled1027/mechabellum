import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadBundleWithOverrides } from "../../src/data/index.js";
import { resolveCombatOutcome } from "../../src/game/roundFlow.js";
import { ServerAuthoritativeSim } from "../../src/server/authoritative.js";
import {
  TelemetryCollector,
  buildCombatTelemetryEvent,
  summarizeTelemetry
} from "../../src/analytics/telemetry.js";

const buildDataBundle = async () => {
  const dataDir = path.join(process.cwd(), "data");
  return loadBundleWithOverrides(dataDir);
};

describe("telemetry", () => {
  it("collects events with timestamps", () => {
    const collector = new TelemetryCollector(() => 1234);
    collector.record({ type: "economy_income", amount: 20, reason: "win" });

    const events = collector.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].timestamp).toBe(1234);
  });

  it("summarizes picks and economy events", () => {
    const summary = summarizeTelemetry([
      { type: "unit_pick", unitId: "crawler", cost: 50, supply: 50 },
      { type: "unit_pick", unitId: "crawler", cost: 50, supply: 100 },
      { type: "tech_pick", techId: "armor_plating", unitId: "crawler-1", cost: 20 },
      { type: "card_pick", cardId: "supply_drop", cost: 10 },
      { type: "economy_income", amount: 30, reason: "win" },
      { type: "shop_reroll", cost: 5 }
    ]);

    expect(summary.unitPicks.crawler).toBe(2);
    expect(summary.techPicks.armor_plating).toBe(1);
    expect(summary.cardPicks.supply_drop).toBe(1);
    expect(summary.economy.income).toBe(30);
    expect(summary.shop.rerolls).toBe(1);
    expect(summary.economy.spend).toBeGreaterThan(0);
  });

  it("builds combat telemetry from a simulation", async () => {
    const bundle = await buildDataBundle();
    const sim = new ServerAuthoritativeSim(bundle, 1337, { tickMs: 50, maxTicks: 5 });
    const input = {
      round: 1,
      placements: [
        { unitId: "crawler", side: "north", position: { x: 2, y: 1 }, orientation: 0 },
        { unitId: "mustang", side: "south", position: { x: 8, y: 6 }, orientation: 180 }
      ]
    };
    sim.applyInput(input);
    sim.runTicks(5);

    const state = sim.getState();
    const events = sim.getEvents();
    const outcome = resolveCombatOutcome(state, bundle);

    const event = buildCombatTelemetryEvent(input, state, events, outcome, bundle, { round: 1 });

    expect(event.type).toBe("combat_end");
    expect(event.ticks).toBe(state.tick);
    expect(event.survivors.north).toBeGreaterThanOrEqual(0);
  });
});
