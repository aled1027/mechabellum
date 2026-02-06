import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadBundleWithOverrides } from "../../src/data/index.js";
import { loadReplayFixtures, runReplay } from "../../src/sim/replayValidator.js";

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
});
