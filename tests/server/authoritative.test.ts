import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadBundleWithOverrides } from "../../src/data/index.js";
import { ServerAuthoritativeSim } from "../../src/server/authoritative.js";

const placements = [
  { unitId: "crawler", side: "north", position: { x: 2, y: 1 }, orientation: 0 },
  { unitId: "mustang", side: "south", position: { x: 8, y: 6 }, orientation: 180 }
];

describe("ServerAuthoritativeSim", () => {
  it("advances a single step", async () => {
    const dataDir = path.join(process.cwd(), "data");
    const bundle = await loadBundleWithOverrides(dataDir);
    const sim = new ServerAuthoritativeSim(bundle, 1337, { maxTicks: 3 });

    sim.applyInput({ round: 1, placements });
    sim.step();

    expect(sim.getState().tick).toBe(1);
    expect(sim.getEvents().some((event) => event.type === "tick")).toBe(true);
  });

  it("runs to the configured max tick", async () => {
    const dataDir = path.join(process.cwd(), "data");
    const bundle = await loadBundleWithOverrides(dataDir);
    const sim = new ServerAuthoritativeSim(bundle, 1337, { maxTicks: 3 });

    sim.applyInput({ round: 1, placements });
    sim.run();

    expect(sim.getState().tick).toBe(3);
  });
});
