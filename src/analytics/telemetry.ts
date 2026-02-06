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
  | "combat_end"
  | "network_latency";

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

export interface NetworkLatencyTelemetryEvent extends BaseTelemetryEvent {
  type: "network_latency";
  rttMs: number;
  jitterMs: number;
  sampleCount: number;
  packetLoss?: number;
}

export type TelemetryEventInput =
  | UnitPickTelemetryEvent
  | TechPickTelemetryEvent
  | CardPickTelemetryEvent
  | EconomyTelemetryEvent
  | ShopTelemetryEvent
  | CombatTelemetryEvent
  | NetworkLatencyTelemetryEvent;

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
  network: {
    samples: number;
    avgRtt: number;
    avgJitter: number;
    maxRtt: number;
    maxJitter: number;
  };
}

export const summarizeTelemetry = (events: TelemetryEventInput[]): TelemetrySummary => {
  const summary: TelemetrySummary = {
    unitPicks: {},
    techPicks: {},
    cardPicks: {},
    economy: { spend: 0, income: 0, byReason: {} },
    shop: { rerolls: 0, locks: 0, spend: 0 },
    combat: { matches: 0, totalDamage: 0, deaths: 0, wins: { north: 0, south: 0, draw: 0 } },
    network: { samples: 0, avgRtt: 0, avgJitter: 0, maxRtt: 0, maxJitter: 0 }
  };
  let totalRtt = 0;
  let totalJitter = 0;

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
        summary.economy.byReason.reroll = (summary.economy.byReason.reroll ?? 0) + event.cost;
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
      case "network_latency":
        summary.network.samples += event.sampleCount;
        totalRtt += event.rttMs * event.sampleCount;
        totalJitter += event.jitterMs * event.sampleCount;
        summary.network.maxRtt = Math.max(summary.network.maxRtt, event.rttMs);
        summary.network.maxJitter = Math.max(summary.network.maxJitter, event.jitterMs);
        break;
    }
  }

  if (summary.network.samples > 0) {
    summary.network.avgRtt = totalRtt / summary.network.samples;
    summary.network.avgJitter = totalJitter / summary.network.samples;
  }

  return summary;
};

export interface LatencyMetrics {
  avgRtt: number;
  jitter: number;
  maxRtt: number;
  minRtt: number;
  sampleCount: number;
}

export const computeLatencyMetrics = (samples: number[]): LatencyMetrics => {
  if (samples.length === 0) {
    throw new Error("Latency samples cannot be empty");
  }
  let total = 0;
  let maxRtt = -Infinity;
  let minRtt = Infinity;
  let jitterTotal = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const value = samples[i];
    total += value;
    maxRtt = Math.max(maxRtt, value);
    minRtt = Math.min(minRtt, value);
    if (i > 0) {
      jitterTotal += Math.abs(value - samples[i - 1]);
    }
  }
  const avgRtt = total / samples.length;
  const jitter = samples.length > 1 ? jitterTotal / (samples.length - 1) : 0;
  return {
    avgRtt,
    jitter,
    maxRtt,
    minRtt,
    sampleCount: samples.length
  };
};

export const buildNetworkLatencyTelemetryEvent = (
  samples: number[],
  context?: TelemetryContext,
  timestamp?: number,
  packetLoss?: number
): NetworkLatencyTelemetryEvent => {
  const metrics = computeLatencyMetrics(samples);
  return {
    type: "network_latency",
    rttMs: metrics.avgRtt,
    jitterMs: metrics.jitter,
    sampleCount: metrics.sampleCount,
    packetLoss,
    context,
    timestamp
  };
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
