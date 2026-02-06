import { createHash } from "node:crypto";
import path from "node:path";
import { loadBundleWithOverrides } from "../data/index.js";
import { ServerAuthoritativeSim } from "../server/authoritative.js";
import type { SimState, SimEvent } from "./types.js";

const stableState = (state: SimState): SimState => {
  return {
    tick: state.tick,
    units: [...state.units].sort((a, b) => a.id.localeCompare(b.id)),
    projectiles: [...state.projectiles].sort((a, b) => a.id.localeCompare(b.id)),
    wreckage: [...state.wreckage].sort((a, b) => a.id.localeCompare(b.id))
  };
};

const stableEvents = (events: SimEvent[]): SimEvent[] => {
  return [...events].sort((a, b) => a.tick - b.tick || a.type.localeCompare(b.type));
};

const checksum = (payload: unknown): string => {
  const hash = createHash("sha256");
  hash.update(JSON.stringify(payload));
  return hash.digest("hex");
};

const run = async () => {
  const dataDir = path.join(process.cwd(), "data");
  const bundle = await loadBundleWithOverrides(dataDir);

  const sim = new ServerAuthoritativeSim(bundle, 1337, { maxTicks: 20 });
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
  const state = stableState(sim.getState());
  const events = stableEvents(sim.getEvents());

  const digest = checksum({ state, events });
  console.log(`Deterministic checksum: ${digest}`);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
