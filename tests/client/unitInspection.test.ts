import { describe, expect, it } from "vitest";
import {
  buildUnitInspectionFromSim,
  buildUnitInspectionState
} from "../../src/client/unitInspection.js";
import type { DataBundle, UnitDefinition } from "../../src/data/schemas.js";
import type { UnitInstance, UnitRuntimeStats } from "../../src/sim/types.js";

const makeUnit = (id: string): UnitDefinition => ({
  id,
  name: id,
  tier: 1,
  role: "test",
  class: "squad",
  cost: 10,
  stats: {
    hp: 10,
    armor: 1,
    shield: 0,
    damage: 2,
    attackType: "kinetic",
    attackSpeed: 1,
    range: 2,
    projectileSpeed: 0,
    turnSpeed: 1,
    moveSpeed: 1,
    collisionSize: 0.5,
    targeting: "ground",
    squadSize: 1,
    accuracy: 1,
    aoeRadius: 0,
    homing: false,
    resistances: {},
    onHitEffects: []
  },
  behaviors: [],
  tags: []
});

const makeRuntimeStats = (): UnitRuntimeStats => ({
  maxHp: 20,
  armor: 2,
  maxShield: 5,
  damage: 3,
  attackType: "energy",
  attackSpeed: 0.8,
  range: 3,
  projectileSpeed: 0,
  turnSpeed: 1.2,
  moveSpeed: 1.4,
  collisionSize: 0.6,
  targeting: "both",
  squadSize: 1,
  accuracy: 1,
  aoeRadius: 0,
  homing: false,
  resistances: {},
  onHitEffects: []
});

const makeSimUnit = (definitionId: string): UnitInstance => ({
  id: "unit-1",
  definitionId,
  side: "north",
  class: "squad",
  position: { x: 0, y: 0 },
  orientation: 0,
  hp: 12,
  shield: 3,
  stats: makeRuntimeStats(),
  behaviors: [],
  reviveCharges: 0,
  attackCooldown: 0,
  retargetCooldown: 0,
  blockedTicks: 0,
  statusEffects: [{ type: "burn", remainingTicks: 2, magnitude: 1 }]
});

describe("unit inspection", () => {
  it("builds a static inspection state", () => {
    const unit = makeUnit("crawler");
    const inspection = buildUnitInspectionState({ unit, level: 2, techs: ["armor"] });

    expect(inspection.level).toBe(2);
    expect(inspection.techs).toEqual(["armor"]);
    expect(inspection.stats.hp).toBe(10);
  });

  it("builds an inspection state from sim units", () => {
    const unit = makeUnit("crawler");
    const bundle: DataBundle = { units: [unit], techs: [], cards: [], specialists: [] };
    const inspection = buildUnitInspectionFromSim(makeSimUnit(unit.id), bundle);

    expect(inspection.currentHp).toBe(12);
    expect(inspection.currentShield).toBe(3);
    expect(inspection.stats.hp).toBe(20);
    expect(inspection.statusEffects).toEqual(["burn"]);
  });
});
