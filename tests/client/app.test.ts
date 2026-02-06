import { describe, expect, it } from "vitest";
import { createPlacements, createRosterFromUnits, positionToClip } from "../../src/client/app.js";
import { GridModel } from "../../src/grid/grid.js";
import type { UnitDefinition } from "../../src/data/schemas.js";

const makeUnit = (
  id: string,
  unitClass: UnitDefinition["class"],
  cost: number
): UnitDefinition => ({
  id,
  name: id,
  tier: 1,
  role: "test",
  class: unitClass,
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

describe("client app helpers", () => {
  it("builds roster counts and supply from units", () => {
    const units = [
      makeUnit("alpha", "squad", 20),
      makeUnit("beta", "giant", 50),
      makeUnit("gamma", "air", 30)
    ];

    const roster = createRosterFromUnits(units);

    expect(roster.units).toHaveLength(3);
    expect(roster.supply).toBe(100);
    expect(roster.unitCounts).toEqual({ squad: 1, giant: 1, air: 1 });
    expect(roster.units[0]?.definitionId).toBe("alpha");
  });

  it("creates placements inside deployment zones with correct orientation", () => {
    const grid = new GridModel();
    const units = [makeUnit("alpha", "squad", 10), makeUnit("beta", "squad", 10)];

    const northPlacements = createPlacements(grid, "north", units, 0);
    const southPlacements = createPlacements(grid, "south", units, 0);

    expect(northPlacements).toHaveLength(2);
    expect(southPlacements).toHaveLength(2);
    expect(northPlacements[0]?.orientation).toBe(0);
    expect(southPlacements[0]?.orientation).toBe(180);
    expect(northPlacements[0]?.position.y).toBeLessThanOrEqual(3);
    expect(southPlacements[0]?.position.y).toBeGreaterThanOrEqual(4);
  });

  it("maps grid positions to clip space", () => {
    expect(positionToClip({ x: 0, y: 0 })).toEqual([-1, 1]);
    expect(positionToClip({ x: GridModel.width - 1, y: GridModel.height - 1 })).toEqual([1, -1]);
  });
});
