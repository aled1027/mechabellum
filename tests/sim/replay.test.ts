import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadBundleWithOverrides } from "../../src/data/index.js";
import { ServerAuthoritativeSim } from "../../src/server/authoritative.js";
import { computeRoundSeed } from "../../src/core/rng.js";
import { ReplayPlayer, ReplayRecorder } from "../../src/sim/replay.js";

const placements = [
  { unitId: "crawler", side: "north", position: { x: 2, y: 1 }, orientation: 0 },
  { unitId: "mustang", side: "south", position: { x: 8, y: 6 }, orientation: 180 }
];

describe("Replay system", () => {
  it("records round inputs with deterministic seeds", async () => {
    const recorder = new ReplayRecorder(1337, "1");
    recorder.recordRound({ round: 1, placements });

    const payload = recorder.buildPayload();
    expect(payload.rounds).toHaveLength(1);
    expect(payload.rounds[0].seed).toBe(computeRoundSeed(1337, 1));
  });

  it("replays a round deterministically", async () => {
    const dataDir = path.join(process.cwd(), "data");
    const bundle = await loadBundleWithOverrides(dataDir);

    const recorder = new ReplayRecorder(1337, "1");
    recorder.recordRound({ round: 1, placements });

    const payload = recorder.buildPayload();
    const replay = new ReplayPlayer(bundle, payload, { tickMs: 50, maxTicks: 3 });
    const replayResult = replay.runRound(0, 3);

    const sim = new ServerAuthoritativeSim(bundle, 1337, { tickMs: 50, maxTicks: 3 });
    sim.applyInput({ round: 1, placements });
    sim.runTicks(3);

    expect(replayResult.state.tick).toBe(sim.getState().tick);
    expect(replayResult.events.length).toBe(sim.getEvents().length);
  });
});
