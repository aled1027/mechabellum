import { z } from "zod";
import type { DataBundle } from "../data/schemas.js";
import type { SimEvent, SimInput, SimState } from "./types.js";
import { ServerAuthoritativeSim } from "../server/authoritative.js";
import { computeRoundSeed } from "../core/rng.js";

export interface ReplayRound {
  round: number;
  seed: number;
  ticks: number;
  input: SimInput;
  checksum?: string;
}

export interface ReplayPayload {
  version: string;
  baseSeed: number;
  rounds: ReplayRound[];
}

const ReplayRoundSchema = z.object({
  round: z.number().int().nonnegative(),
  seed: z.number().int(),
  ticks: z.number().int().nonnegative(),
  input: z.object({
    round: z.number().int().nonnegative(),
    placements: z.array(
      z.object({
        unitId: z.string(),
        side: z.enum(["north", "south"]),
        position: z.object({ x: z.number(), y: z.number() }),
        orientation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]),
        level: z.number().int().optional(),
        techs: z.array(z.string()).optional()
      })
    )
  }),
  checksum: z.string().optional()
});

const ReplayPayloadSchema = z.object({
  version: z.string().min(1),
  baseSeed: z.number().int(),
  rounds: z.array(ReplayRoundSchema)
});

export interface ReplayStorage {
  saveReplay(id: string, payload: ReplayPayload): Promise<void>;
  loadReplay(id: string): Promise<ReplayPayload | undefined>;
}

export class InMemoryReplayStorage implements ReplayStorage {
  private readonly entries = new Map<string, ReplayPayload>();

  async saveReplay(id: string, payload: ReplayPayload): Promise<void> {
    this.entries.set(id, payload);
  }

  async loadReplay(id: string): Promise<ReplayPayload | undefined> {
    return this.entries.get(id);
  }
}

export const serializeReplayPayload = (payload: ReplayPayload): string => JSON.stringify(payload);

export const parseReplayPayload = (payload: string): ReplayPayload =>
  ReplayPayloadSchema.parse(JSON.parse(payload));

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

export const REPLAY_SPEED_MIN = 0.25;
export const REPLAY_SPEED_MAX = 2;
export const REPLAY_SPEED_OPTIONS = [0.25, 0.5, 1, 1.5, 2] as const;

const assertReplaySpeed = (speed: number): void => {
  if (speed < REPLAY_SPEED_MIN || speed > REPLAY_SPEED_MAX) {
    throw new Error(`speed must be between ${REPLAY_SPEED_MIN} and ${REPLAY_SPEED_MAX}`);
  }
};

export class ReplayRecorder {
  private readonly rounds: ReplayRound[] = [];

  constructor(
    private readonly baseSeed: number,
    private readonly version: string = "1"
  ) {}

  recordRound(input: SimInput, ticks: number, checksum?: string): void {
    if (!Number.isInteger(ticks) || ticks < 0) {
      throw new Error("ticks must be a non-negative integer");
    }
    this.rounds.push({
      round: input.round,
      seed: computeRoundSeed(this.baseSeed, input.round),
      ticks,
      input,
      checksum
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
    assertReplaySpeed(speed);
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
