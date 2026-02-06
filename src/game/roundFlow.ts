import type { DataBundle } from "../data/schemas.js";
import type { SimState } from "../sim/types.js";
import type { PlayerSide } from "../grid/grid.js";

export type RoundPhase = "planning" | "combat" | "resolution";

export interface RoundTimerConfig {
  planningMs: number;
  combatMs: number;
}

export interface CombatOutcome {
  winner: PlayerSide | "draw";
  reason: "elimination" | "timeout";
}

export class RoundPhaseState {
  private remainingMs = 0;
  private phase: RoundPhase = "planning";
  private round = 0;

  constructor(private readonly config: RoundTimerConfig) {}

  startRound(round: number): void {
    this.round = round;
    this.phase = "planning";
    this.remainingMs = this.config.planningMs;
  }

  getPhase(): RoundPhase {
    return this.phase;
  }

  getRound(): number {
    return this.round;
  }

  getRemainingMs(): number {
    return this.remainingMs;
  }

  advanceTime(deltaMs: number): void {
    if (this.phase === "resolution") {
      return;
    }
    this.remainingMs = Math.max(0, this.remainingMs - deltaMs);
    if (this.remainingMs > 0) {
      return;
    }

    if (this.phase === "planning") {
      this.phase = "combat";
      this.remainingMs = this.config.combatMs;
      return;
    }

    if (this.phase === "combat") {
      this.phase = "resolution";
      this.remainingMs = 0;
    }
  }

  lockPlanning(): void {
    if (this.phase !== "planning") {
      return;
    }
    this.phase = "combat";
    this.remainingMs = this.config.combatMs;
  }

  lockCombat(): void {
    if (this.phase !== "combat") {
      return;
    }
    this.phase = "resolution";
    this.remainingMs = 0;
  }

  canAcceptPlanningActions(): boolean {
    return this.phase === "planning";
  }
}

const totalsForSide = (state: SimState, data: DataBundle, side: PlayerSide) => {
  let current = 0;
  let max = 0;
  let value = 0;
  for (const unit of state.units) {
    if (unit.side !== side) {
      continue;
    }
    current += unit.hp + unit.shield;
    max += unit.stats.maxHp + unit.stats.maxShield;
    const definition = data.units.find((entry) => entry.id === unit.definitionId);
    value += definition?.cost ?? 0;
  }
  return { current, max, value };
};

export const resolveCombatOutcome = (state: SimState, data: DataBundle): CombatOutcome => {
  const northUnits = state.units.filter((unit) => unit.side === "north");
  const southUnits = state.units.filter((unit) => unit.side === "south");

  if (northUnits.length === 0 && southUnits.length === 0) {
    return { winner: "draw", reason: "elimination" };
  }
  if (northUnits.length === 0) {
    return { winner: "south", reason: "elimination" };
  }
  if (southUnits.length === 0) {
    return { winner: "north", reason: "elimination" };
  }

  const northTotals = totalsForSide(state, data, "north");
  const southTotals = totalsForSide(state, data, "south");

  const northPercent = northTotals.max > 0 ? northTotals.current / northTotals.max : 0;
  const southPercent = southTotals.max > 0 ? southTotals.current / southTotals.max : 0;
  const delta = northPercent - southPercent;

  if (Math.abs(delta) > 1e-6) {
    return { winner: delta > 0 ? "north" : "south", reason: "timeout" };
  }

  if (northTotals.value !== southTotals.value) {
    return { winner: northTotals.value > southTotals.value ? "north" : "south", reason: "timeout" };
  }

  return { winner: "draw", reason: "timeout" };
};
