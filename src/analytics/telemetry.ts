import type { CombatOutcome } from "../game/roundFlow.js";
import type { DataBundle } from "../data/schemas.js";
import type { SimEvent, SimInput, SimState } from "../sim/types.js";
import { GridModel } from "../grid/grid.js";
import { buildSquadOffsets } from "../sim/formation.js";

export type TelemetryEventType =
  | "unit_pick"
  | "tech_pick"
  | "card_pick"
  | "economy_income"
  | "economy_spend"
  | "shop_reroll"
  | "shop_lock"
  | "combat_end";

export interface TelemetryContext {
  playerId?: string;
  round?: number;
  matchId?: string;
}

export interface BaseTelemetryEvent {
  type: TelemetryEventType;
  timestamp?: number;
  context?: TelemetryContext;
}

export interface UnitPickTelemetryEvent extends BaseTelemetryEvent {
  type: "unit_pick";
  unitId: string;
  cost: number;
  supply: number;
}

export interface TechPickTelemetryEvent extends BaseTelemetryEvent {
  type: "tech_pick";
  techId: string;
  unitId: string;
  cost: number;
}

export interface CardPickTelemetryEvent extends BaseTelemetryEvent {
  type: "card_pick";
  cardId: string;
  cost: number;
}

export interface EconomyTelemetryEvent extends BaseTelemetryEvent {
  type: "economy_income" | "economy_spend";
  amount: number;
  reason: string;
}

export interface ShopTelemetryEvent extends BaseTelemetryEvent {
  type: "shop_reroll" | "shop_lock";
  cost: number;
}

export interface CombatTelemetryEvent extends BaseTelemetryEvent {
  type: "combat_end";
  winner: CombatOutcome["winner"];
  reason: CombatOutcome["reason"];
  ticks: number;
  totalDamage: number;
  deaths: number;
  survivors: Record<"north" | "south", number>;
  timeToKill: Partial<Record<"north" | "south", number>>;
}

export type TelemetryEventInput =
  | UnitPickTelemetryEvent
  | TechPickTelemetryEvent
  | CardPickTelemetryEvent
  | EconomyTelemetryEvent
  | ShopTelemetryEvent
  | CombatTelemetryEvent;

export type TelemetryEvent = TelemetryEventInput & { timestamp: number };

export interface TelemetrySink {
  record(event: TelemetryEventInput): void;
}

export class TelemetryCollector implements TelemetrySink {
  private readonly events: TelemetryEvent[] = [];

  constructor(private readonly clock: () => number = () => Date.now()) {}

  record(event: TelemetryEventInput): void {
    const timestamp = event.timestamp ?? this.clock();
    this.events.push({ ...event, timestamp });
  }

  getEvents(): TelemetryEvent[] {
    return [...this.events];
  }

  flush(): TelemetryEvent[] {
    const snapshot = [...this.events];
    this.events.length = 0;
    return snapshot;
  }
}

export interface TelemetrySummary {
  unitPicks: Record<string, number>;
  techPicks: Record<string, number>;
  cardPicks: Record<string, number>;
  economy: {
    spend: number;
    income: number;
    byReason: Record<string, number>;
  };
  shop: {
    rerolls: number;
    locks: number;
    spend: number;
  };
  combat: {
    matches: number;
    totalDamage: number;
    deaths: number;
    wins: Record<"north" | "south" | "draw", number>;
  };
}

export const summarizeTelemetry = (events: TelemetryEventInput[]): TelemetrySummary => {
  const summary: TelemetrySummary = {
    unitPicks: {},
    techPicks: {},
    cardPicks: {},
    economy: { spend: 0, income: 0, byReason: {} },
    shop: { rerolls: 0, locks: 0, spend: 0 },
    combat: { matches: 0, totalDamage: 0, deaths: 0, wins: { north: 0, south: 0, draw: 0 } }
  };

  for (const event of events) {
    switch (event.type) {
      case "unit_pick":
        summary.unitPicks[event.unitId] = (summary.unitPicks[event.unitId] ?? 0) + 1;
        summary.economy.spend += event.cost;
        summary.economy.byReason.unit = (summary.economy.byReason.unit ?? 0) + event.cost;
        break;
      case "tech_pick":
        summary.techPicks[event.techId] = (summary.techPicks[event.techId] ?? 0) + 1;
        summary.economy.spend += event.cost;
        summary.economy.byReason.tech = (summary.economy.byReason.tech ?? 0) + event.cost;
        break;
      case "card_pick":
        summary.cardPicks[event.cardId] = (summary.cardPicks[event.cardId] ?? 0) + 1;
        summary.economy.spend += event.cost;
        summary.economy.byReason.card = (summary.economy.byReason.card ?? 0) + event.cost;
        break;
      case "economy_income":
        summary.economy.income += event.amount;
        summary.economy.byReason[event.reason] =
          (summary.economy.byReason[event.reason] ?? 0) + event.amount;
        break;
      case "economy_spend":
        summary.economy.spend += event.amount;
        summary.economy.byReason[event.reason] =
          (summary.economy.byReason[event.reason] ?? 0) - event.amount;
        break;
      case "shop_reroll":
        summary.shop.rerolls += 1;
        summary.shop.spend += event.cost;
        summary.economy.spend += event.cost;
        summary.economy.byReason.reroll =
          (summary.economy.byReason.reroll ?? 0) + event.cost;
        break;
      case "shop_lock":
        summary.shop.locks += 1;
        summary.shop.spend += event.cost;
        summary.economy.spend += event.cost;
        summary.economy.byReason.lock = (summary.economy.byReason.lock ?? 0) + event.cost;
        break;
      case "combat_end":
        summary.combat.matches += 1;
        summary.combat.totalDamage += event.totalDamage;
        summary.combat.deaths += event.deaths;
        summary.combat.wins[event.winner] += 1;
        break;
    }
  }

  return summary;
};

interface UnitSideIndex {
  unitId: string;
  side: "north" | "south";
}

const buildUnitSideIndex = (input: SimInput, data: DataBundle): UnitSideIndex[] => {
  const grid = new GridModel();
  const index: UnitSideIndex[] = [];
  for (const placement of input.placements) {
    const definition = data.units.find((unit) => unit.id === placement.unitId);
    if (!definition) {
      continue;
    }
    const facing = grid.orientFacing(placement.side, placement.orientation);
    const offsets = buildSquadOffsets(
      definition.stats.squadSize,
      definition.stats.collisionSize,
      facing
    );
    offsets.forEach((_, offsetIndex) => {
      const id = `${placement.side}-${definition.id}-${placement.position.x}-${placement.position.y}-${offsetIndex}`;
      index.push({ unitId: id, side: placement.side });
    });
  }
  return index;
};

export const buildCombatTelemetryEvent = (
  input: SimInput,
  state: SimState,
  events: SimEvent[],
  outcome: CombatOutcome,
  data: DataBundle,
  context?: TelemetryContext,
  timestamp?: number
): CombatTelemetryEvent => {
  const sideIndex = buildUnitSideIndex(input, data);
  const sideById = new Map(sideIndex.map((entry) => [entry.unitId, entry.side]));
  const deaths = events.filter((event) => event.type === "death");
  const damageEvents = events.filter((event) => event.type === "damage");

  const timeToKill: Partial<Record<"north" | "south", number>> = {};
  for (const death of deaths) {
    const unitId = death.payload?.unitId;
    if (typeof unitId !== "string") {
      continue;
    }
    const side = sideById.get(unitId);
    if (!side) {
      continue;
    }
    const tick = death.tick;
    const current = timeToKill[side];
    timeToKill[side] = current === undefined ? tick : Math.max(current, tick);
  }

  const survivors = {
    north: state.units.filter((unit) => unit.side === "north").length,
    south: state.units.filter((unit) => unit.side === "south").length
  };

  const totalDamage = damageEvents.reduce((sum, event) => {
    const damage = event.payload?.damage;
    if (typeof damage !== "number") {
      return sum;
    }
    return sum + damage;
  }, 0);

  return {
    type: "combat_end",
    winner: outcome.winner,
    reason: outcome.reason,
    ticks: state.tick,
    totalDamage,
    deaths: deaths.length,
    survivors,
    timeToKill,
    context,
    timestamp
  };
};
