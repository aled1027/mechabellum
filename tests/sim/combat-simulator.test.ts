import { describe, expect, it } from "vitest";
import { CombatSimulator } from "../../src/sim/combat.js";
import { RngService } from "../../src/core/rng.js";
import type { DataBundle, UnitDefinition } from "../../src/data/schemas.js";

const makeUnit = (overrides: Partial<UnitDefinition> & { id: string }): UnitDefinition => {
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
      damage: 2,
      attackType: "kinetic",
      attackSpeed: 1,
      range: 3,
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

describe("CombatSimulator", () => {
  it("applies direct damage and status effects", () => {
    const bundle = makeBundle([
      makeUnit({
        id: "burner",
        stats: {
          damage: 2,
          accuracy: 1,
          onHitEffects: [{ type: "burn", duration: 1, magnitude: 1 }]
        }
      }),
      makeUnit({ id: "dummy", stats: { hp: 12 } })
    ]);
    const sim = new CombatSimulator(bundle, new RngService(1));
    sim.init({
      round: 1,
      placements: [
        { unitId: "burner", side: "north", position: { x: 1, y: 1 }, orientation: 0 },
        { unitId: "dummy", side: "south", position: { x: 1, y: 2 }, orientation: 180 }
      ]
    });

    sim.step(1);

    const state = sim.getState();
    const target = state.units.find((unit) => unit.definitionId === "dummy");
    expect(target?.hp).toBeLessThan(12);
    expect(target?.statusEffects.some((status) => status.type === "burn")).toBe(true);
    expect(sim.getEvents().some((event) => event.type === "status_apply")).toBe(true);
  });

  it("records misses for inaccurate attackers", () => {
    const bundle = makeBundle([
      makeUnit({ id: "miss", stats: { accuracy: 0 } }),
      makeUnit({ id: "dummy" })
    ]);
    const sim = new CombatSimulator(bundle, new RngService(2));
    sim.init({
      round: 1,
      placements: [
        { unitId: "miss", side: "north", position: { x: 1, y: 1 }, orientation: 0 },
        { unitId: "dummy", side: "south", position: { x: 1, y: 2 }, orientation: 180 }
      ]
    });

    sim.step(1);

    expect(sim.getEvents().some((event) => event.type === "miss")).toBe(true);
  });

  it("spawns projectiles for ranged attackers", () => {
    const bundle = makeBundle([
      makeUnit({ id: "shooter", stats: { projectileSpeed: 1, range: 5 } }),
      makeUnit({ id: "dummy" })
    ]);
    const sim = new CombatSimulator(bundle, new RngService(3));
    sim.init({
      round: 1,
      placements: [
        { unitId: "shooter", side: "north", position: { x: 1, y: 1 }, orientation: 0 },
        { unitId: "dummy", side: "south", position: { x: 1, y: 4 }, orientation: 180 }
      ]
    });

    sim.step(1);

    expect(sim.getState().projectiles.length).toBeGreaterThan(0);
    expect(sim.getEvents().some((event) => event.type === "attack")).toBe(true);
  });

  it("tracks blocked movement and clears wreckage", () => {
    const bundle = makeBundle([
      makeUnit({ id: "mover", stats: { moveSpeed: 1, range: 0.5 } }),
      makeUnit({ id: "blocker" }),
      makeUnit({ id: "enemy", class: "air", stats: { hp: 5 } }),
      makeUnit({ id: "killer", stats: { damage: 20, range: 3 } })
    ]);
    const sim = new CombatSimulator(bundle, new RngService(4), {
      tickMs: 50,
      wreckageDurationMs: 100,
      blockedRetargetMs: 1000
    });
    sim.init({
      round: 1,
      placements: [
        { unitId: "mover", side: "north", position: { x: 0, y: 0 }, orientation: 0 },
        { unitId: "blocker", side: "north", position: { x: 0.4, y: 0 }, orientation: 0 },
        { unitId: "killer", side: "north", position: { x: 2, y: 0 }, orientation: 0 },
        { unitId: "enemy", side: "south", position: { x: 3, y: 0 }, orientation: 180 }
      ]
    });

    sim.step(1);
    const mover = sim.getState().units.find((unit) => unit.definitionId === "mover");
    expect(mover?.blockedTicks).toBeGreaterThan(0);

    expect(sim.getState().wreckage).toHaveLength(1);

    sim.step(2);
    expect(sim.getState().wreckage).toHaveLength(0);
  });

  it("applies saturation accuracy penalties", () => {
    const bundle = makeBundle([
      makeUnit({ id: "attacker-a", stats: { accuracy: 1 } }),
      makeUnit({ id: "attacker-b", stats: { accuracy: 1 } }),
      makeUnit({ id: "target", stats: { hp: 20 } })
    ]);
    const sim = new CombatSimulator(bundle, new RngService(5), {
      saturationAccuracyPenalty: 1,
      saturationMinAccuracyMultiplier: 0
    });
    sim.init({
      round: 1,
      placements: [
        { unitId: "attacker-a", side: "north", position: { x: 1, y: 1 }, orientation: 0 },
        { unitId: "attacker-b", side: "north", position: { x: 1, y: 2 }, orientation: 0 },
        { unitId: "target", side: "south", position: { x: 1, y: 3 }, orientation: 180 }
      ]
    });

    sim.step(1);
    const misses = sim.getEvents().filter((event) => event.type === "miss");
    expect(misses.length).toBe(2);
    const target = sim.getState().units.find((unit) => unit.definitionId === "target");
    expect(target?.hp).toBe(20);
  });

  it("prevents giants from overlapping smaller units", () => {
    const bundle = makeBundle([
      makeUnit({
        id: "giant",
        class: "giant",
        stats: { moveSpeed: 1, range: 0.5, collisionSize: 1.2 }
      }),
      makeUnit({ id: "blocker", stats: { moveSpeed: 0, collisionSize: 0.8 } }),
      makeUnit({ id: "enemy", stats: { hp: 10 } })
    ]);
    const sim = new CombatSimulator(bundle, new RngService(6));
    sim.init({
      round: 1,
      placements: [
        { unitId: "giant", side: "north", position: { x: 0, y: 0 }, orientation: 0 },
        { unitId: "blocker", side: "north", position: { x: 0.2, y: 0 }, orientation: 0 },
        { unitId: "enemy", side: "south", position: { x: 3, y: 0 }, orientation: 180 }
      ]
    });

    sim.step(1);
    const giant = sim.getState().units.find((unit) => unit.definitionId === "giant");
    expect(giant?.position.x).toBe(0);
  });
});
