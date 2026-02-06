import type { ReplayPayload, ReplayTimelineState } from "../sim/replay.js";
import { REPLAY_SPEED_OPTIONS } from "../sim/replay.js";

export interface ReplayHudRoundSummary {
  round: number;
  ticks: number;
}

export interface ReplayHudState {
  round: number;
  roundIndex: number;
  tick: number;
  speed: number;
  speedOptions: number[];
  rounds: ReplayHudRoundSummary[];
}

export const buildReplayHudState = (
  payload: ReplayPayload,
  timeline: ReplayTimelineState,
  speedOptions: readonly number[] = REPLAY_SPEED_OPTIONS
): ReplayHudState => {
  const round = payload.rounds[timeline.roundIndex];
  if (!round) {
    throw new Error("Round not found");
  }

  return {
    round: round.round,
    roundIndex: timeline.roundIndex,
    tick: timeline.tick,
    speed: timeline.speed,
    speedOptions: [...speedOptions],
    rounds: payload.rounds.map((entry) => ({
      round: entry.round,
      ticks: entry.ticks
    }))
  };
};
