import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadBundleWithOverrides } from "../../src/data/index.js";
import {
  computeReplayChecksum,
  loadReplayFixtures,
  runReplay,
  validateReplayPayload
} from "../../src/sim/replayValidator.js";
import { ServerAuthoritativeSim } from "../../src/server/authoritative.js";

describe("replay validation", () => {
  it("produces stable checksums for replay fixtures", async () => {
    const dataDir = path.join(process.cwd(), "data");
    const bundle = await loadBundleWithOverrides(dataDir);
    const fixtures = await loadReplayFixtures(path.join(dataDir, "replays.json"));

    for (const fixture of fixtures) {
      const first = runReplay(bundle, fixture);
      const second = runReplay(bundle, fixture);
      expect(first).toEqual(second);
    }
  });

  it("reports checksum mismatches for replay payloads", async () => {
    const dataDir = path.join(process.cwd(), "data");
    const bundle = await loadBundleWithOverrides(dataDir);
    const input = {
      round: 1,
      placements: [
        { unitId: "crawler", side: "north", position: { x: 2, y: 1 }, orientation: 0 },
        { unitId: "mustang", side: "south", position: { x: 8, y: 6 }, orientation: 180 }
      ]
    };

    const sim = new ServerAuthoritativeSim(bundle, 123, { maxTicks: 5 });
    sim.applyInput(input);
    sim.runTicks(5);
    const checksum = computeReplayChecksum(sim.getState(), sim.getEvents());

    const payload = {
      baseSeed: 123,
      rounds: [
        {
          round: 1,
          ticks: 5,
          input,
          checksum
        }
      ]
    };

    const matches = validateReplayPayload(bundle, payload);
    expect(matches[0]?.match).toBe(true);

    const mismatched = validateReplayPayload(bundle, {
      ...payload,
      rounds: [{ ...payload.rounds[0], checksum: "bad" }]
    });
    expect(mismatched[0]?.match).toBe(false);
  });
});
