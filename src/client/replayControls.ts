import type { ReplayPayload, ReplayTimelineState } from "../sim/replay.js";
import { REPLAY_SPEED_MAX, REPLAY_SPEED_MIN } from "../sim/replay.js";

export interface ReplayPlaybackState {
  roundIndex: number;
  tick: number;
  speed: number;
  playing: boolean;
  maxTicks: number;
}

export const createReplayPlaybackState = (
  payload: ReplayPayload,
  speed: number = 1
): ReplayPlaybackState => {
  const round = payload.rounds[0];
  if (!round) {
    throw new Error("Replay payload has no rounds");
  }
  return {
    roundIndex: 0,
    tick: 0,
    speed: clampSpeed(speed),
    playing: false,
    maxTicks: round.ticks
  };
};

const clampSpeed = (speed: number): number => {
  if (speed < REPLAY_SPEED_MIN || speed > REPLAY_SPEED_MAX) {
    throw new Error(`speed must be between ${REPLAY_SPEED_MIN} and ${REPLAY_SPEED_MAX}`);
  }
  return speed;
};

export const setReplaySpeed = (state: ReplayPlaybackState, speed: number): ReplayPlaybackState => ({
  ...state,
  speed: clampSpeed(speed)
});

export const toggleReplayPlayback = (state: ReplayPlaybackState): ReplayPlaybackState => ({
  ...state,
  playing: !state.playing
});

export const setReplayPlaying = (
  state: ReplayPlaybackState,
  playing: boolean
): ReplayPlaybackState => ({
  ...state,
  playing
});

export const setReplayRound = (
  state: ReplayPlaybackState,
  payload: ReplayPayload,
  roundIndex: number
): ReplayPlaybackState => {
  const round = payload.rounds[roundIndex];
  if (!round) {
    throw new Error("Round not found");
  }
  return {
    ...state,
    roundIndex,
    tick: 0,
    maxTicks: round.ticks
  };
};

export const scrubReplayTick = (state: ReplayPlaybackState, tick: number): ReplayPlaybackState => ({
  ...state,
  tick: Math.max(0, Math.min(state.maxTicks, tick))
});

export const stepReplayTick = (state: ReplayPlaybackState, delta: number): ReplayPlaybackState => ({
  ...state,
  tick: Math.max(0, Math.min(state.maxTicks, state.tick + delta)),
  playing: false
});

export const syncReplayPlaybackFromTimeline = (
  state: ReplayPlaybackState,
  payload: ReplayPayload,
  timeline: ReplayTimelineState
): ReplayPlaybackState => {
  const round = payload.rounds[timeline.roundIndex];
  if (!round) {
    throw new Error("Round not found");
  }
  return {
    ...state,
    roundIndex: timeline.roundIndex,
    tick: Math.min(round.ticks, timeline.tick),
    speed: clampSpeed(timeline.speed),
    maxTicks: round.ticks
  };
};
