import type { UnitDefinition } from "../data/schemas.js";
import type { StatusEffectType, UnitRuntimeStats, UnitInstance } from "../sim/types.js";
import type { DataBundle } from "../data/schemas.js";

export interface UnitInspectionStats {
  hp: number;
  armor: number;
  shield: number;
  damage: number;
  attackType: string;
  attackSpeed: number;
  range: number;
  moveSpeed: number;
  turnSpeed: number;
  targeting: string;
  squadSize: number;
}

export interface UnitInspectionState {
  id: string;
  name: string;
  role: string;
  class: string;
  tier: number;
  cost: number;
  level?: number;
  techs: string[];
  stats: UnitInspectionStats;
  currentHp?: number;
  currentShield?: number;
  statusEffects: StatusEffectType[];
}

export interface UnitInspectionInput {
  unit: UnitDefinition;
  level?: number;
  techs?: string[];
  runtimeStats?: UnitRuntimeStats;
  currentHp?: number;
  currentShield?: number;
  statusEffects?: StatusEffectType[];
}

const statsFromDefinition = (unit: UnitDefinition): UnitInspectionStats => ({
  hp: unit.stats.hp,
  armor: unit.stats.armor,
  shield: unit.stats.shield,
  damage: unit.stats.damage,
  attackType: unit.stats.attackType,
  attackSpeed: unit.stats.attackSpeed,
  range: unit.stats.range,
  moveSpeed: unit.stats.moveSpeed,
  turnSpeed: unit.stats.turnSpeed,
  targeting: unit.stats.targeting,
  squadSize: unit.stats.squadSize
});

const statsFromRuntime = (stats: UnitRuntimeStats): UnitInspectionStats => ({
  hp: stats.maxHp,
  armor: stats.armor,
  shield: stats.maxShield,
  damage: stats.damage,
  attackType: stats.attackType,
  attackSpeed: stats.attackSpeed,
  range: stats.range,
  moveSpeed: stats.moveSpeed,
  turnSpeed: stats.turnSpeed,
  targeting: stats.targeting,
  squadSize: stats.squadSize
});

export const buildUnitInspectionState = (input: UnitInspectionInput): UnitInspectionState => {
  const { unit, runtimeStats, statusEffects, currentHp, currentShield } = input;
  return {
    id: unit.id,
    name: unit.name,
    role: unit.role,
    class: unit.class,
    tier: unit.tier,
    cost: unit.cost,
    level: input.level,
    techs: input.techs ?? [],
    stats: runtimeStats ? statsFromRuntime(runtimeStats) : statsFromDefinition(unit),
    currentHp,
    currentShield,
    statusEffects: statusEffects ?? []
  };
};

export const buildUnitInspectionFromSim = (
  unit: UnitInstance,
  data: DataBundle
): UnitInspectionState => {
  const definition = data.units.find((entry) => entry.id === unit.definitionId);
  if (!definition) {
    throw new Error(`Unit definition not found: ${unit.definitionId}`);
  }

  return buildUnitInspectionState({
    unit: definition,
    runtimeStats: unit.stats,
    currentHp: unit.hp,
    currentShield: unit.shield,
    statusEffects: unit.statusEffects.map((effect) => effect.type)
  });
};
