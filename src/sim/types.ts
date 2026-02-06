import type { GridPosition, Orientation, PlayerSide } from "../grid/grid.js";
import type { AttackType, TargetingFlags, UnitClass } from "../data/schemas.js";

export type StatusEffectType = "emp" | "stun" | "burn" | "slow" | "mark";

export interface StatusEffectInstance {
  type: StatusEffectType;
  remainingTicks: number;
  magnitude: number;
  sourceId?: string;
}

export interface UnitRuntimeStats {
  maxHp: number;
  armor: number;
  maxShield: number;
  damage: number;
  attackType: AttackType;
  attackSpeed: number;
  range: number;
  projectileSpeed: number;
  turnSpeed: number;
  moveSpeed: number;
  collisionSize: number;
  targeting: TargetingFlags;
  squadSize: number;
  accuracy: number;
  aoeRadius: number;
  homing: boolean;
  resistances: Partial<Record<AttackType, number>>;
  onHitEffects: Array<{
    type: StatusEffectType;
    durationTicks: number;
    magnitude: number;
  }>;
}

export interface UnitInstance {
  id: string;
  definitionId: string;
  side: PlayerSide;
  class: UnitClass;
  position: GridPosition;
  orientation: Orientation;
  hp: number;
  shield: number;
  stats: UnitRuntimeStats;
  attackCooldown: number;
  retargetCooldown: number;
  blockedTicks: number;
  targetId?: string;
  path?: GridPosition[];
  statusEffects: StatusEffectInstance[];
}

export interface ProjectileInstance {
  id: string;
  sourceId: string;
  targetId?: string;
  position: GridPosition;
  velocity: GridPosition;
  speed: number;
  damage: number;
  attackType: AttackType;
  aoeRadius: number;
  homing: boolean;
  remainingTicks: number;
  onHitEffects: Array<{
    type: StatusEffectType;
    durationTicks: number;
    magnitude: number;
  }>;
}

export interface WreckageObstacle {
  id: string;
  position: GridPosition;
  radius: number;
  remainingTicks: number;
}

export interface SimState {
  tick: number;
  units: UnitInstance[];
  projectiles: ProjectileInstance[];
  wreckage: WreckageObstacle[];
}

export interface SimEvent {
  tick: number;
  type: string;
  payload?: Record<string, unknown>;
}

export interface SimInput {
  round: number;
  placements: Array<{
    unitId: string;
    side: PlayerSide;
    position: GridPosition;
    orientation: Orientation;
    level?: number;
    techs?: string[];
  }>;
}
