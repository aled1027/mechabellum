import { createHash } from "node:crypto";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadBundleWithOverrides } from "../src/data/index.js";
import { ServerAuthoritativeSim } from "../src/server/authoritative.js";
import type { SimEvent, SimState } from "../src/sim/types.js";

const stableState = (state: SimState): SimState => ({
  tick: state.tick,
  units: [...state.units].sort((a, b) => a.id.localeCompare(b.id)),
  projectiles: [...state.projectiles].sort((a, b) => a.id.localeCompare(b.id)),
  wreckage: [...state.wreckage].sort((a, b) => a.id.localeCompare(b.id))
});

const stableEvents = (events: SimEvent[]): SimEvent[] =>
  [...events].sort((a, b) => a.tick - b.tick || a.type.localeCompare(b.type));

const checksum = (payload: unknown): string => {
  const hash = createHash("sha256");
  hash.update(JSON.stringify(payload));
  return hash.digest("hex");
};

const runSim = async (): Promise<string> => {
  const dataDir = path.join(process.cwd(), "data");
  const bundle = await loadBundleWithOverrides(dataDir);
  const sim = new ServerAuthoritativeSim(bundle, 1337, { maxTicks: 120 });

  sim.applyInput({
    round: 1,
    placements: [
      { unitId: "crawler", side: "north", position: { x: 2, y: 1 }, orientation: 0 },
      { unitId: "mustang", side: "north", position: { x: 3, y: 2 }, orientation: 0 },
      { unitId: "crawler", side: "south", position: { x: 8, y: 6 }, orientation: 180 },
      { unitId: "mustang", side: "south", position: { x: 9, y: 5 }, orientation: 180 }
    ]
  });

  sim.run();
  const payload = {
    state: stableState(sim.getState()),
    events: stableEvents(sim.getEvents())
  };
  return checksum(payload);
};

describe("combat determinism", () => {
  it("produces stable checksums across runs", async () => {
    const first = await runSim();
    const second = await runSim();
    expect(first).toEqual(second);
  });
});
