import path from "node:path";
import { describe, expect, it } from "vitest";
import { DataStore, createDataStore, loadDataBundle } from "../../src/data/loader.js";
import type { DataBundle, UnitDefinition } from "../../src/data/schemas.js";

describe("data loading", () => {
  it("loads the bundle from disk", async () => {
    const dataDir = path.join(process.cwd(), "data");
    const bundle = await loadDataBundle(dataDir);
    expect(bundle.units.length).toBeGreaterThan(10);
    expect(bundle.techs[0].id).toBe("armor_plating");
  });

  it("creates a data store snapshot", async () => {
    const dataDir = path.join(process.cwd(), "data");
    const store = await createDataStore({ dataDir, enableHotReload: false });
    const snapshot = store.getSnapshot();
    expect(snapshot.units.length).toBeGreaterThan(0);
  });

  it("notifies subscribers on updates", () => {
    const initial: DataBundle = {
      units: [],
      techs: [],
      cards: [],
      specialists: []
    };
    const store = new DataStore(initial);
    const updates: number[] = [];
    const unsubscribe = store.subscribe((snapshot) => updates.push(snapshot.units.length));

    const unit: UnitDefinition = {
      id: "u1",
      name: "Unit",
      tier: 1,
      role: "test",
      class: "squad",
      cost: 0,
      stats: {
        hp: 1,
        armor: 0,
        shield: 0,
        damage: 0,
        attackType: "kinetic",
        attackSpeed: 1,
        range: 0,
        projectileSpeed: 0,
        turnSpeed: 0,
        moveSpeed: 0,
        collisionSize: 1,
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
    };

    store.update({ ...initial, units: [unit] });
    unsubscribe();
    store.update({ ...initial, units: [] });

    expect(updates).toEqual([1]);
  });
});
