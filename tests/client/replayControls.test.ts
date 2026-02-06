import { describe, expect, it } from "vitest";
import {
  createReplayPlaybackState,
  scrubReplayTick,
  setReplayRound,
  setReplaySpeed,
  stepReplayTick,
  syncReplayPlaybackFromTimeline,
  toggleReplayPlayback
} from "../../src/client/replayControls.js";
import type { ReplayPayload, ReplayTimelineState } from "../../src/sim/replay.js";

const payload: ReplayPayload = {
  version: "1",
  baseSeed: 1,
  rounds: [
    { round: 1, seed: 2, ticks: 100, input: { round: 1, placements: [] } },
    { round: 2, seed: 3, ticks: 200, input: { round: 2, placements: [] } }
  ]
};

describe("replay controls", () => {
  it("creates playback state and toggles play", () => {
    const state = createReplayPlaybackState(payload, 1);
    expect(state.maxTicks).toBe(100);
    expect(toggleReplayPlayback(state).playing).toBe(true);
  });

  it("scrubs ticks within bounds", () => {
    const state = createReplayPlaybackState(payload, 1);
    const scrubbed = scrubReplayTick(state, 150);
    expect(scrubbed.tick).toBe(100);
  });

  it("steps ticks and pauses playback", () => {
    const state = createReplayPlaybackState(payload, 1);
    const stepped = stepReplayTick({ ...state, playing: true, tick: 10 }, 5);
    expect(stepped.tick).toBe(15);
    expect(stepped.playing).toBe(false);
  });

  it("changes rounds and speed", () => {
    const state = createReplayPlaybackState(payload, 1);
    const roundTwo = setReplayRound(state, payload, 1);
    expect(roundTwo.maxTicks).toBe(200);
    expect(setReplaySpeed(roundTwo, 0.5).speed).toBe(0.5);
  });

  it("syncs state from timeline", () => {
    const state = createReplayPlaybackState(payload, 1);
    const timeline: ReplayTimelineState = { roundIndex: 1, tick: 50, speed: 1.5 };
    const synced = syncReplayPlaybackFromTimeline(state, payload, timeline);
    expect(synced.roundIndex).toBe(1);
    expect(synced.tick).toBe(50);
  });
});
