import { describe, expect, it } from "vitest";
import { CombatSimulator } from "../../src/sim/combat.js";
import { RngService } from "../../src/core/rng.js";
import type { DataBundle, UnitDefinition } from "../../src/data/schemas.js";

const makeUnit = (
  overrides: Partial<UnitDefinition> & { id: string; behaviors?: UnitDefinition["behaviors"] }
): UnitDefinition => {
  const { stats: statsOverrides, ...rest } = overrides;
  return {
    id: overrides.id,
    name: overrides.id,
    tier: 1,
    role: "test",
    class: overrides.class ?? "squad",
    cost: 0,
    stats: {
      hp: 10,
      armor: 0,
      shield: 0,
      damage: 4,
      attackType: "kinetic",
      attackSpeed: 1,
      range: 2,
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
      onHitEffects: [],
      ...statsOverrides
    },
    behaviors: overrides.behaviors ?? [],
    tags: [],
    ...rest
  };
};

const makeBundle = (units: UnitDefinition[]): DataBundle => ({
  units,
  techs: [],
  cards: [],
  specialists: []
});

describe("unit behaviors", () => {
  it("applies chain lightning jumps", () => {
    const bundle = makeBundle([
      makeUnit({
        id: "chain",
        stats: { damage: 10, range: 3 },
        behaviors: [
          { type: "chain_lightning", chainCount: 2, chainRange: 2.5, damageFalloff: 0.8 }
        ]
      }),
      makeUnit({ id: "target-a", stats: { hp: 20 } }),
      makeUnit({ id: "target-b", stats: { hp: 20 } }),
      makeUnit({ id: "target-c", stats: { hp: 20 } })
    ]);

    const sim = new CombatSimulator(bundle, new RngService(1));
    sim.init({
      round: 1,
      placements: [
        { unitId: "chain", side: "north", position: { x: 1, y: 1 }, orientation: 0 },
        { unitId: "target-a", side: "south", position: { x: 2, y: 1 }, orientation: 180 },
        { unitId: "target-b", side: "south", position: { x: 2, y: 2 }, orientation: 180 },
        { unitId: "target-c", side: "south", position: { x: 2, y: 3 }, orientation: 180 }
      ]
    });

    sim.step(1);

    expect(sim.getEvents().some((event) => event.type === "chain_lightning")).toBe(true);
  });

  it("revives units once when defeated", () => {
    const bundle = makeBundle([
      makeUnit({
        id: "reviver",
        stats: { hp: 20 },
        behaviors: [{ type: "revive", reviveHpPercent: 0.5, reviveCharges: 1 }]
      }),
      makeUnit({ id: "killer", stats: { damage: 50, range: 3 } })
    ]);

    const sim = new CombatSimulator(bundle, new RngService(2));
    sim.init({
      round: 1,
      placements: [
        { unitId: "reviver", side: "north", position: { x: 1, y: 1 }, orientation: 0 },
        { unitId: "killer", side: "south", position: { x: 1, y: 2 }, orientation: 180 }
      ]
    });

    sim.step(1);

    expect(sim.getEvents().some((event) => event.type === "revive")).toBe(true);
    const revived = sim.getState().units.find((unit) => unit.definitionId === "reviver");
    expect(revived?.reviveCharges).toBe(0);
  });

  it("keeps cloaked units untargetable beyond reveal range", () => {
    const bundle = makeBundle([
      makeUnit({ id: "spotter", stats: { range: 4 } }),
      makeUnit({
        id: "cloak",
        behaviors: [{ type: "cloak", revealRange: 1.5 }]
      })
    ]);

    const sim = new CombatSimulator(bundle, new RngService(3));
    sim.init({
      round: 1,
      placements: [
        { unitId: "spotter", side: "north", position: { x: 1, y: 1 }, orientation: 0 },
        { unitId: "cloak", side: "south", position: { x: 4, y: 4 }, orientation: 180 }
      ]
    });

    sim.step(1);

    const spotter = sim.getState().units.find((unit) => unit.definitionId === "spotter");
    expect(spotter?.targetId).toBeUndefined();
  });
});
