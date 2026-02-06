import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadBundleWithOverrides } from "../../src/data/index.js";
import { ServerAuthoritativeSim } from "../../src/server/authoritative.js";
import { buildCombatSnapshot } from "../../src/sim/qa.js";
import { loadReplayFixtures } from "../../src/sim/replayValidator.js";

interface SnapshotFixture {
  name: string;
  snapshot: ReturnType<typeof buildCombatSnapshot>;
}

describe("qa snapshots", () => {
  it("matches stored combat snapshots", async () => {
    const dataDir = path.join(process.cwd(), "data");
    const bundle = await loadBundleWithOverrides(dataDir);
    const fixtures = await loadReplayFixtures(path.join(dataDir, "replays.json"));
    const snapshotRaw = await readFile(path.join(dataDir, "qa-snapshots.json"), "utf-8");
    const snapshots = JSON.parse(snapshotRaw) as SnapshotFixture[];

    for (const fixture of fixtures) {
      const sim = new ServerAuthoritativeSim(bundle, fixture.seed, { maxTicks: fixture.maxTicks });
      sim.applyInput(fixture.input);
      sim.runTicks(fixture.maxTicks);
      const snapshot = buildCombatSnapshot(sim.getState(), sim.getEvents());
      const expected = snapshots.find((entry) => entry.name === fixture.name);
      expect(expected?.snapshot).toEqual(snapshot);
    }
  });
});
