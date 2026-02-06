import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { DataBundle } from "../data/schemas.js";
import type { SimEvent, SimInput, SimState } from "./types.js";
import { ServerAuthoritativeSim } from "../server/authoritative.js";

export interface ReplayFixture {
  name: string;
  seed: number;
  maxTicks: number;
  input: SimInput;
}

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

export const runReplay = (bundle: DataBundle, fixture: ReplayFixture): string => {
  const sim = new ServerAuthoritativeSim(bundle, fixture.seed, { maxTicks: fixture.maxTicks });
  sim.applyInput(fixture.input);
  sim.run();
  return checksum({
    state: stableState(sim.getState()),
    events: stableEvents(sim.getEvents())
  });
};

export const validateReplays = (
  bundle: DataBundle,
  fixtures: ReplayFixture[]
): Array<{ name: string; checksum: string }> => {
  return fixtures.map((fixture) => ({ name: fixture.name, checksum: runReplay(bundle, fixture) }));
};

export const loadReplayFixtures = async (fixturePath: string): Promise<ReplayFixture[]> => {
  const raw = await readFile(fixturePath, "utf-8");
  const parsed = JSON.parse(raw) as ReplayFixture[];
  return parsed;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const fixturePath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.join(process.cwd(), "data", "replays.json");
  const { loadBundleWithOverrides } = await import("../data/index.js");
  const bundle = await loadBundleWithOverrides(path.join(process.cwd(), "data"));
  const fixtures = await loadReplayFixtures(fixturePath);
  const results = validateReplays(bundle, fixtures);
  for (const result of results) {
    console.log(`${result.name}: ${result.checksum}`);
  }
}
