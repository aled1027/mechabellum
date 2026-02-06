import type { SimEvent, SimState } from "./types.js";

export interface UnitBehaviorSnapshot {
  id: string;
  definitionId: string;
  side: string;
  hp: number;
  shield: number;
  position: { x: number; y: number };
  statusEffects: Array<{ type: string; remainingTicks: number; magnitude: number }>;
}

export interface CombatSnapshot {
  tick: number;
  units: UnitBehaviorSnapshot[];
  deaths: Array<{ unitId: string; tick: number }>;
  totalDamage: number;
}

const roundValue = (value: number, precision: number): number => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

export const buildUnitBehaviorSnapshot = (state: SimState): UnitBehaviorSnapshot[] => {
  return [...state.units]
    .map((unit) => ({
      id: unit.id,
      definitionId: unit.definitionId,
      side: unit.side,
      hp: roundValue(unit.hp, 2),
      shield: roundValue(unit.shield, 2),
      position: {
        x: roundValue(unit.position.x, 3),
        y: roundValue(unit.position.y, 3)
      },
      statusEffects: unit.statusEffects.map((effect) => ({
        type: effect.type,
        remainingTicks: effect.remainingTicks,
        magnitude: effect.magnitude
      }))
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
};

export const buildCombatSnapshot = (state: SimState, events: SimEvent[]): CombatSnapshot => {
  const deaths = events
    .filter((event) => event.type === "death")
    .map((event) => ({ unitId: String(event.payload?.unitId ?? ""), tick: event.tick }))
    .sort((a, b) => (a.tick !== b.tick ? a.tick - b.tick : a.unitId.localeCompare(b.unitId)));

  const totalDamage = events
    .filter((event) => event.type === "damage")
    .reduce((sum, event) => {
      const damage = event.payload?.damage;
      if (typeof damage !== "number") {
        return sum;
      }
      return sum + damage;
    }, 0);

  return {
    tick: state.tick,
    units: buildUnitBehaviorSnapshot(state),
    deaths,
    totalDamage: roundValue(totalDamage, 2)
  };
};

const hashString = (value: string): string => {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
};

export const computeSyncChecksum = (state: SimState, events: SimEvent[]): string => {
  const snapshot = buildCombatSnapshot(state, events);
  return hashString(JSON.stringify(snapshot));
};

export const computeStateChecksum = (state: SimState): string => {
  const payload = {
    tick: state.tick,
    units: buildUnitBehaviorSnapshot(state)
  };
  return hashString(JSON.stringify(payload));
};
