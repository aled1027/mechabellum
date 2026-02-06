import type { DataBundle } from "../data/schemas.js";
import type { SimEvent, SimInput, SimState } from "./types.js";
import { ServerAuthoritativeSim } from "../server/authoritative.js";
import { computeRoundSeed } from "../core/rng.js";

export interface ReplayRound {
  round: number;
  seed: number;
  input: SimInput;
}

export interface ReplayPayload {
  version: string;
  baseSeed: number;
  rounds: ReplayRound[];
}

export interface ReplayRunResult {
  state: SimState;
  events: SimEvent[];
}

export interface ReplayConfig {
  tickMs: number;
  maxTicks: number;
}

export const defaultReplayConfig: ReplayConfig = {
  tickMs: 50,
  maxTicks: 1800
};

export class ReplayRecorder {
  private readonly rounds: ReplayRound[] = [];

  constructor(
    private readonly baseSeed: number,
    private readonly version: string = "1"
  ) {}

  recordRound(input: SimInput): void {
    this.rounds.push({
      round: input.round,
      seed: computeRoundSeed(this.baseSeed, input.round),
      input
    });
  }

  buildPayload(): ReplayPayload {
    return {
      version: this.version,
      baseSeed: this.baseSeed,
      rounds: [...this.rounds]
    };
  }
}

export class ReplayPlayer {
  constructor(
    private readonly bundle: DataBundle,
    private readonly payload: ReplayPayload,
    private readonly config: ReplayConfig = defaultReplayConfig
  ) {}

  runRound(roundIndex: number, maxTicks: number = this.config.maxTicks): ReplayRunResult {
    const round = this.payload.rounds[roundIndex];
    if (!round) {
      throw new Error("Round not found");
    }
    const sim = new ServerAuthoritativeSim(this.bundle, this.payload.baseSeed, {
      tickMs: this.config.tickMs,
      maxTicks
    });
    sim.applyInput(round.input);
    sim.runTicks(maxTicks);
    return { state: sim.getState(), events: sim.getEvents() };
  }

  seek(roundIndex: number, tick: number): ReplayRunResult {
    if (tick < 0) {
      throw new Error("tick must be >= 0");
    }
    const round = this.payload.rounds[roundIndex];
    if (!round) {
      throw new Error("Round not found");
    }
    const sim = new ServerAuthoritativeSim(this.bundle, this.payload.baseSeed, {
      tickMs: this.config.tickMs,
      maxTicks: Math.max(tick, 1)
    });
    sim.applyInput(round.input);
    sim.runTicks(tick);
    return { state: sim.getState(), events: sim.getEvents() };
  }
}

export interface ReplayTimelineState {
  roundIndex: number;
  tick: number;
  speed: number;
}

export class ReplayTimeline {
  private roundIndex = 0;
  private speed = 1;
  private tick = 0;
  private accumulatorMs = 0;
  private sim?: ServerAuthoritativeSim;

  constructor(
    private readonly bundle: DataBundle,
    private readonly payload: ReplayPayload,
    private readonly config: ReplayConfig = defaultReplayConfig
  ) {
    this.bootstrapSim();
  }

  setSpeed(speed: number): void {
    if (speed <= 0) {
      throw new Error("speed must be > 0");
    }
    this.speed = speed;
  }

  setRound(roundIndex: number): void {
    if (!this.payload.rounds[roundIndex]) {
      throw new Error("Round not found");
    }
    this.roundIndex = roundIndex;
    this.tick = 0;
    this.accumulatorMs = 0;
    this.bootstrapSim();
  }

  getState(): ReplayTimelineState {
    return {
      roundIndex: this.roundIndex,
      tick: this.tick,
      speed: this.speed
    };
  }

  seek(tick: number): ReplayRunResult {
    if (tick < 0) {
      throw new Error("tick must be >= 0");
    }
    this.tick = tick;
    this.accumulatorMs = 0;
    this.bootstrapSim();
    if (!this.sim) {
      throw new Error("Replay simulator unavailable");
    }
    this.sim.runTicks(tick);
    return { state: this.sim.getState(), events: this.sim.getEvents() };
  }

  advance(deltaMs: number): ReplayRunResult {
    if (!this.sim) {
      throw new Error("Replay simulator unavailable");
    }
    this.accumulatorMs += deltaMs * this.speed;
    const tickBudget = Math.floor(this.accumulatorMs / this.config.tickMs);
    if (tickBudget > 0) {
      this.sim.runTicks(tickBudget);
      this.tick += tickBudget;
      this.accumulatorMs -= tickBudget * this.config.tickMs;
    }
    return { state: this.sim.getState(), events: this.sim.getEvents() };
  }

  private bootstrapSim(): void {
    const round = this.payload.rounds[this.roundIndex];
    if (!round) {
      this.sim = undefined;
      return;
    }
    this.sim = new ServerAuthoritativeSim(this.bundle, this.payload.baseSeed, {
      tickMs: this.config.tickMs,
      maxTicks: this.config.maxTicks
    });
    this.sim.applyInput(round.input);
  }
}
