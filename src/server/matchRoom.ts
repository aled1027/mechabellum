import type { DataBundle } from "../data/schemas.js";
import type { PlayerSide } from "../grid/grid.js";
import { GridModel } from "../grid/grid.js";
import type { PlacementLimits } from "../grid/placement.js";
import { defaultLimits } from "../grid/placement.js";
import { RoundPhaseState } from "../game/roundFlow.js";
import { resolveCombatOutcome } from "../game/roundFlow.js";
import type { SimEvent, SimInput, SimState } from "../sim/types.js";
import { ServerAuthoritativeSim } from "./authoritative.js";
import { ReplayRecorder, type ReplayPayload } from "../sim/replay.js";
import type { TelemetrySink } from "../analytics/telemetry.js";
import { buildCombatTelemetryEvent } from "../analytics/telemetry.js";

export interface MatchRoomConfig {
  tickMs: number;
  maxTicks: number;
  planningMs: number;
  combatMs: number;
  replayVersion: string;
  placementLimits?: PlacementLimits;
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
  private readonly placementLimits: PlacementLimits;
  private readonly grid = new GridModel();
  private inputsBySide: Map<PlayerSide, SimInput["placements"]> = new Map();
  private round = 0;
  private combatSnapshot?: MatchCombatSnapshot;

  constructor(
    private readonly data: DataBundle,
    private readonly baseSeed: number,
    private readonly config: MatchRoomConfig = defaultMatchRoomConfig,
    private readonly telemetry?: TelemetrySink
  ) {
    this.roundFlow = new RoundPhaseState({
      planningMs: config.planningMs,
      combatMs: config.combatMs
    });
    this.recorder = new ReplayRecorder(baseSeed, config.replayVersion);
    this.placementLimits = config.placementLimits ?? defaultLimits;
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
    const validationError = this.validatePlacements(placements, player.side);
    if (validationError) {
      return { success: false, error: validationError };
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

  private validatePlacements(
    placements: SimInput["placements"],
    side: PlayerSide
  ): string | undefined {
    if (placements.length > this.placementLimits.maxPlacementsPerRound) {
      return "Placement limit reached";
    }

    const classCounts: Record<"squad" | "giant" | "air", number> = {
      squad: 0,
      giant: 0,
      air: 0
    };
    const occupiedTiles = new Set<string>();

    for (const placement of placements) {
      const unit = this.data.units.find((entry) => entry.id === placement.unitId);
      if (!unit) {
        return `Unknown unit ${placement.unitId}`;
      }

      const tileKey = `${placement.position.x},${placement.position.y}`;
      if (occupiedTiles.has(tileKey)) {
        return "Duplicate placement tile";
      }
      occupiedTiles.add(tileKey);

      if (!this.grid.isInBounds(placement.position)) {
        return "Position out of bounds";
      }
      if (!this.grid.ownsTile(side, placement.position)) {
        return "Tile not owned by player";
      }
      if (![0, 90, 180, 270].includes(placement.orientation)) {
        return "Invalid orientation";
      }
      if (placement.level !== undefined) {
        if (!Number.isInteger(placement.level) || placement.level < 0 || placement.level > 3) {
          return "Invalid unit level";
        }
      }
      if (placement.techs) {
        if (placement.techs.length > 2) {
          return "Too many techs selected";
        }
        const techSet = new Set(placement.techs);
        if (techSet.size !== placement.techs.length) {
          return "Duplicate tech selection";
        }
        for (const techId of placement.techs) {
          if (!this.data.techs.some((tech) => tech.id === techId)) {
            return `Unknown tech ${techId}`;
          }
        }
      }

      classCounts[unit.class] += 1;
      if (unit.class === "squad" && classCounts.squad > this.placementLimits.maxSquads) {
        return "Squad cap reached";
      }
      if (unit.class === "giant" && classCounts.giant > this.placementLimits.maxGiants) {
        return "Giant cap reached";
      }
      if (unit.class === "air" && classCounts.air > this.placementLimits.maxAirSquads) {
        return "Air squad cap reached";
      }
    }

    return undefined;
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
    this.telemetry?.record(
      buildCombatTelemetryEvent(input, state, events, this.combatSnapshot.outcome, this.data, {
        round: this.round
      })
    );
  }
}
