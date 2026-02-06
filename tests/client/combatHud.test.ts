import { describe, expect, it } from "vitest";
import { buildCombatHudState, COMBAT_HUD_LAYOUT } from "../../src/client/combatHud.js";
import type { DataBundle, UnitDefinition } from "../../src/data/schemas.js";
import type { SimState, UnitInstance, UnitRuntimeStats } from "../../src/sim/types.js";
import { RoundPhaseState } from "../../src/game/roundFlow.js";

const makeUnitDefinition = (id: string, cost: number): UnitDefinition => ({
  id,
  name: id,
  tier: 1,
  role: "test",
  class: "squad",
  cost,
  stats: {
    hp: 10,
    armor: 0,
    shield: 0,
    damage: 1,
    attackType: "kinetic",
    attackSpeed: 1,
    range: 1,
    projectileSpeed: 0,
    turnSpeed: 0,
    moveSpeed: 0,
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

const makeRuntimeStats = (maxHp: number, maxShield: number): UnitRuntimeStats => ({
  maxHp,
  armor: 0,
  maxShield,
  damage: 1,
  attackType: "kinetic",
  attackSpeed: 1,
  range: 1,
  projectileSpeed: 0,
  turnSpeed: 0,
  moveSpeed: 0,
  collisionSize: 0.5,
  targeting: "ground",
  squadSize: 1,
  accuracy: 1,
  aoeRadius: 0,
  homing: false,
  resistances: {},
  onHitEffects: []
});

const makeUnit = (id: string, definitionId: string, side: "north" | "south"): UnitInstance => ({
  id,
  definitionId,
  side,
  class: "squad",
  position: { x: 0, y: 0 },
  orientation: 0,
  hp: 5,
  shield: 5,
  stats: makeRuntimeStats(10, 10),
  behaviors: [],
  reviveCharges: 0,
  attackCooldown: 0,
  retargetCooldown: 0,
  blockedTicks: 0,
  statusEffects: []
});

const makeBundle = (units: UnitDefinition[]): DataBundle => ({
  units,
  techs: [],
  cards: [],
  specialists: []
});

describe("combat HUD", () => {
  it("summarizes combat HUD state for both sides", () => {
    const bundle = makeBundle([
      makeUnitDefinition("north-unit", 15),
      makeUnitDefinition("south-unit", 20)
    ]);

    const simState: SimState = {
      tick: 42,
      units: [makeUnit("u1", "north-unit", "north"), makeUnit("u2", "south-unit", "south")],
      projectiles: [],
      wreckage: []
    };

    const roundFlow = new RoundPhaseState({ planningMs: 30000, combatMs: 90000 });
    roundFlow.startRound(3);
    roundFlow.lockPlanning();

    const hudState = buildCombatHudState({
      roundFlow,
      simState,
      data: bundle,
      playerSide: "north"
    });

    expect(hudState.round).toBe(3);
    expect(hudState.phase).toBe("combat");
    expect(hudState.friendly.unitsAlive).toBe(1);
    expect(hudState.enemy.unitsAlive).toBe(1);
    expect(hudState.friendly.hpPercent).toBeCloseTo(0.5);
    expect(hudState.friendly.totalValue).toBe(15);
    expect(hudState.enemy.totalValue).toBe(20);
  });

  it("uses a copy of the default layout", () => {
    const bundle = makeBundle([makeUnitDefinition("north-unit", 5)]);

    const simState: SimState = {
      tick: 1,
      units: [makeUnit("u1", "north-unit", "north")],
      projectiles: [],
      wreckage: []
    };

    const roundFlow = new RoundPhaseState({ planningMs: 30000, combatMs: 90000 });
    roundFlow.startRound(1);

    const hudState = buildCombatHudState({
      roundFlow,
      simState,
      data: bundle,
      playerSide: "north"
    });

    expect(hudState.layout).not.toBe(COMBAT_HUD_LAYOUT);
    expect(hudState.layout[0]?.id).toBe("round_timer");
  });
});
