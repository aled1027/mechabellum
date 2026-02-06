import type { AttackType, TargetingFlags, UnitClass } from "../../src/data/schemas.js";
import type { GridPosition, Orientation, PlayerSide } from "../../src/grid/grid.js";
import type { UnitInstance } from "../../src/sim/types.js";

interface UnitOverrides extends Partial<UnitInstance> {
  stats?: Partial<UnitInstance["stats"]>;
  position?: GridPosition;
  orientation?: Orientation;
  side?: PlayerSide;
  class?: UnitClass;
}

const baseStats: UnitInstance["stats"] = {
  maxHp: 100,
  armor: 0,
  maxShield: 0,
  damage: 10,
  attackType: "kinetic" as AttackType,
  attackSpeed: 1,
  range: 3,
  projectileSpeed: 0,
  turnSpeed: 0,
  moveSpeed: 0,
  collisionSize: 0.5,
  targeting: "ground" as TargetingFlags,
  squadSize: 1,
  accuracy: 1,
  aoeRadius: 0,
  homing: false,
  resistances: {},
  onHitEffects: []
};

export const makeUnit = (overrides: UnitOverrides = {}): UnitInstance => {
  const stats = { ...baseStats, ...overrides.stats };
  return {
    id: overrides.id ?? "unit",
    definitionId: overrides.definitionId ?? "unit",
    side: overrides.side ?? "north",
    class: overrides.class ?? "squad",
    position: overrides.position ?? { x: 0, y: 0 },
    orientation: overrides.orientation ?? 0,
    hp: overrides.hp ?? stats.maxHp,
    shield: overrides.shield ?? stats.maxShield,
    stats,
    attackCooldown: overrides.attackCooldown ?? 0,
    retargetCooldown: overrides.retargetCooldown ?? 0,
    blockedTicks: overrides.blockedTicks ?? 0,
    targetId: overrides.targetId,
    path: overrides.path,
    statusEffects: overrides.statusEffects ? [...overrides.statusEffects] : []
  };
};
