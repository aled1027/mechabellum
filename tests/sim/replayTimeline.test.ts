import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadBundleWithOverrides } from "../../src/data/index.js";
import { ReplayRecorder, ReplayTimeline } from "../../src/sim/replay.js";

const placements = [
  { unitId: "crawler", side: "north", position: { x: 2, y: 1 }, orientation: 0 },
  { unitId: "mustang", side: "south", position: { x: 8, y: 6 }, orientation: 180 }
];

describe("ReplayTimeline", () => {
  it("enforces the replay speed range", async () => {
    const bundle = await loadBundleWithOverrides(path.join(process.cwd(), "data"));
    const recorder = new ReplayRecorder(1337, "1");
    recorder.recordRound({ round: 1, placements }, 3);

    const payload = recorder.buildPayload();
    const timeline = new ReplayTimeline(bundle, payload, { tickMs: 50, maxTicks: 3 });

    expect(() => timeline.setSpeed(0.1)).toThrow("speed must be between");
    expect(() => timeline.setSpeed(0.25)).not.toThrow();
    expect(() => timeline.setSpeed(2)).not.toThrow();
  });
});
