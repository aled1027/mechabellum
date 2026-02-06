import { describe, expect, it } from "vitest";
import { ReplayRecorder, REPLAY_SPEED_OPTIONS } from "../../src/sim/replay.js";
import { buildReplayHudState } from "../../src/client/replayHud.js";

describe("replay HUD", () => {
  it("builds replay HUD state from payload and timeline", () => {
    const recorder = new ReplayRecorder(1337, "1");
    recorder.recordRound({ round: 1, placements: [] }, 12);
    recorder.recordRound({ round: 2, placements: [] }, 24);

    const payload = recorder.buildPayload();
    const hud = buildReplayHudState(payload, { roundIndex: 1, tick: 5, speed: 1 });

    expect(hud.round).toBe(2);
    expect(hud.rounds).toHaveLength(2);
    expect(hud.rounds[0].ticks).toBe(12);
    expect(hud.speedOptions).toEqual([...REPLAY_SPEED_OPTIONS]);
  });
});
