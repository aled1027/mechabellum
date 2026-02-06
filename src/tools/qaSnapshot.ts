import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadBundleWithOverrides } from "../data/index.js";
import { ServerAuthoritativeSim } from "../server/authoritative.js";
import { buildCombatSnapshot } from "../sim/qa.js";
import type { ReplayFixture } from "../sim/replayValidator.js";

const main = async () => {
  const dataDir = process.argv[2] ?? path.join(process.cwd(), "data");
  const raw = await readFile(path.join(dataDir, "replays.json"), "utf-8");
  const fixtures = JSON.parse(raw) as ReplayFixture[];
  const bundle = await loadBundleWithOverrides(dataDir);

  const snapshots = fixtures.map((fixture) => {
    const sim = new ServerAuthoritativeSim(bundle, fixture.seed, { maxTicks: fixture.maxTicks });
    sim.applyInput(fixture.input);
    sim.runTicks(fixture.maxTicks);
    return {
      name: fixture.name,
      snapshot: buildCombatSnapshot(sim.getState(), sim.getEvents())
    };
  });

  console.log(JSON.stringify(snapshots, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
