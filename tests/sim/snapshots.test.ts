import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadBundleWithOverrides } from "../../src/data/index.js";
import { ServerAuthoritativeSim } from "../../src/server/authoritative.js";

const buildBundle = async () => loadBundleWithOverrides(path.join(process.cwd(), "data"));

describe("snapshots", () => {
  it("captures periodic snapshots", async () => {
    const bundle = await buildBundle();
    const sim = new ServerAuthoritativeSim(bundle, 123, {
      tickMs: 50,
      maxTicks: 5,
      snapshotInterval: 2,
      snapshotLimit: 3
    });
    sim.applyInput({
      round: 1,
      placements: [
        { unitId: "crawler", side: "north", position: { x: 2, y: 1 }, orientation: 0 },
        { unitId: "mustang", side: "south", position: { x: 8, y: 6 }, orientation: 180 }
      ]
    });
    sim.runTicks(5);

    const snapshots = sim.getSnapshots();
    expect(snapshots.length).toBeGreaterThan(0);
    expect(snapshots.length).toBeLessThanOrEqual(3);
    for (const snapshot of snapshots) {
      expect(snapshot.tick % 2).toBe(0);
      expect(snapshot.checksum).toBeTruthy();
    }
  });
});
