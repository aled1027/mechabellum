import type { DataBundle } from "../data/schemas.js";
import type { PlayerSide } from "../grid/grid.js";
import { RoundPhaseState } from "../game/roundFlow.js";
import { resolveCombatOutcome } from "../game/roundFlow.js";
import type { SimEvent, SimInput, SimState } from "../sim/types.js";
import { ServerAuthoritativeSim } from "./authoritative.js";
import { ReplayRecorder, type ReplayPayload } from "../sim/replay.js";

export interface MatchRoomConfig {
  tickMs: number;
  maxTicks: number;
  planningMs: number;
  combatMs: number;
  replayVersion: string;
}

export interface MatchPlayer {
  id: string;
  side: PlayerSide;
}

export interface MatchCombatSnapshot {
  state: SimState;
  events: SimEvent[];
  outcome: ReturnType<typeof resolveCombatOutcome>;
}

export interface MatchSnapshot {
  round: number;
  phase: ReturnType<RoundPhaseState["getPhase"]>;
  remainingMs: number;
  inputsReceived: PlayerSide[];
  combat?: MatchCombatSnapshot;
  replay?: ReplayPayload;
}

export interface PlanningSubmissionResult {
  success: boolean;
  error?: string;
}

export const defaultMatchRoomConfig: MatchRoomConfig = {
  tickMs: 50,
  maxTicks: 1800,
  planningMs: 45000,
  combatMs: 90000,
  replayVersion: "1"
};

export class MatchRoom {
  private readonly players: MatchPlayer[] = [];
  private readonly roundFlow: RoundPhaseState;
  private readonly recorder: ReplayRecorder;
  private inputsBySide: Map<PlayerSide, SimInput["placements"]> = new Map();
  private round = 0;
  private combatSnapshot?: MatchCombatSnapshot;

  constructor(
    private readonly data: DataBundle,
    private readonly baseSeed: number,
    private readonly config: MatchRoomConfig = defaultMatchRoomConfig
  ) {
    this.roundFlow = new RoundPhaseState({
      planningMs: config.planningMs,
      combatMs: config.combatMs
    });
    this.recorder = new ReplayRecorder(baseSeed, config.replayVersion);
  }

  addPlayer(player: MatchPlayer): void {
    if (this.players.some((entry) => entry.id === player.id)) {
      return;
    }
    this.players.push(player);
  }

  startRound(round: number): void {
    this.round = round;
    this.inputsBySide = new Map();
    this.combatSnapshot = undefined;
    this.roundFlow.startRound(round);
  }

  submitPlanningInput(
    playerId: string,
    placements: SimInput["placements"]
  ): PlanningSubmissionResult {
    const player = this.players.find((entry) => entry.id === playerId);
    if (!player) {
      return { success: false, error: "Player not found" };
    }
    if (!this.roundFlow.canAcceptPlanningActions()) {
      return { success: false, error: "Planning phase locked" };
    }
    const sanitized = placements.map((placement) => ({
      ...placement,
      side: player.side
    }));
    this.inputsBySide.set(player.side, sanitized);
    this.maybeResolveCombat();
    return { success: true };
  }

  advanceTime(deltaMs: number): void {
    const previousPhase = this.roundFlow.getPhase();
    this.roundFlow.advanceTime(deltaMs);
    const currentPhase = this.roundFlow.getPhase();
    if (previousPhase !== currentPhase && currentPhase === "combat") {
      this.maybeResolveCombat(true);
    }
  }

  lockPlanning(): void {
    this.roundFlow.lockPlanning();
    this.maybeResolveCombat(true);
  }

  getSnapshot(): MatchSnapshot {
    return {
      round: this.round,
      phase: this.roundFlow.getPhase(),
      remainingMs: this.roundFlow.getRemainingMs(),
      inputsReceived: Array.from(this.inputsBySide.keys()),
      combat: this.combatSnapshot,
      replay: this.recorder.buildPayload()
    };
  }

  reconnect(playerId: string): MatchSnapshot {
    const player = this.players.find((entry) => entry.id === playerId);
    if (!player) {
      throw new Error("Player not found");
    }
    return this.getSnapshot();
  }

  private maybeResolveCombat(force: boolean = false): void {
    if (this.combatSnapshot) {
      return;
    }
    if (!force && this.inputsBySide.size < 2) {
      return;
    }
    const placements = Array.from(this.inputsBySide.values()).flat();
    const input: SimInput = {
      round: this.round,
      placements
    };
    this.roundFlow.lockPlanning();
    const sim = new ServerAuthoritativeSim(this.data, this.baseSeed, {
      tickMs: this.config.tickMs,
      maxTicks: this.config.maxTicks
    });
    sim.applyInput(input);
    sim.run();
    const state = sim.getState();
    const events = sim.getEvents();
    this.combatSnapshot = {
      state,
      events,
      outcome: resolveCombatOutcome(state, this.data)
    };
    this.roundFlow.lockCombat();
    this.recorder.recordRound(input);
  }
}
