import { describe, expect, it } from "vitest";
import { buildCombatOverlayState } from "../../src/client/combatOverlay.js";
import type { SimState, UnitInstance, UnitRuntimeStats } from "../../src/sim/types.js";

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

const makeUnit = (id: string, hp: number, shield: number): UnitInstance => ({
  id,
  definitionId: id,
  side: "north",
  class: "squad",
  position: { x: 0, y: 0 },
  orientation: 0,
  hp,
  shield,
  stats: makeRuntimeStats(10, 5),
  behaviors: [],
  reviveCharges: 0,
  attackCooldown: 0,
  retargetCooldown: 0,
  blockedTicks: 0,
  statusEffects: [{ type: "stun", remainingTicks: 2, magnitude: 1 }]
});

describe("combat overlay", () => {
  it("builds overlay data for units", () => {
    const simState: SimState = {
      tick: 5,
      units: [makeUnit("u1", 2, 1)],
      projectiles: [],
      wreckage: []
    };

    const overlay = buildCombatOverlayState(simState);

    expect(overlay.tick).toBe(5);
    expect(overlay.units[0]?.hpPercent).toBeCloseTo(0.2);
    expect(overlay.units[0]?.shieldPercent).toBeCloseTo(0.2);
    expect(overlay.units[0]?.statusEffects).toEqual(["stun"]);
    expect(overlay.units[0]?.lowHealth).toBe(true);
  });
});
