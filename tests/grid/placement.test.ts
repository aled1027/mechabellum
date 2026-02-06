import { describe, expect, it } from "vitest";
import { GridModel } from "../../src/grid/grid.js";
import {
  defaultLimits,
  validatePlacement,
  type PlayerPlacementState,
  type PlacementRequest
} from "../../src/grid/placement.js";
import type { UnitDefinition } from "../../src/data/schemas.js";

const makeUnit = (overrides: Partial<UnitDefinition> = {}): UnitDefinition => ({
  id: overrides.id ?? "unit",
  name: "Unit",
  tier: 1,
  role: "test",
  class: overrides.class ?? "squad",
  cost: overrides.cost ?? 10,
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
  tags: [],
  ...overrides
});

const baseState: PlayerPlacementState = {
  side: "north",
  credits: 100,
  placementsThisRound: 0,
  unitCounts: {
    squad: 0,
    giant: 0,
    air: 0
  }
};

const baseRequest: PlacementRequest = {
  unitId: "unit",
  position: { x: 1, y: 1 },
  orientation: 0
};

describe("validatePlacement", () => {
  it("rejects out-of-bounds positions", () => {
    const grid = new GridModel();
    const result = validatePlacement(
      grid,
      { ...baseRequest, position: { x: -1, y: 0 } },
      baseState,
      makeUnit()
    );
    expect(result).toEqual({ valid: false, error: "Position out of bounds" });
  });

  it("rejects tiles outside the player zone", () => {
    const grid = new GridModel();
    const result = validatePlacement(
      grid,
      { ...baseRequest, position: { x: 1, y: 6 } },
      baseState,
      makeUnit()
    );
    expect(result).toEqual({ valid: false, error: "Tile not owned by player" });
  });

  it("enforces placement and credit limits", () => {
    const grid = new GridModel();
    const result = validatePlacement(
      grid,
      baseRequest,
      { ...baseState, placementsThisRound: defaultLimits.maxPlacementsPerRound },
      makeUnit()
    );
    expect(result).toEqual({ valid: false, error: "Placement limit reached" });

    const creditsResult = validatePlacement(
      grid,
      baseRequest,
      { ...baseState, credits: 0 },
      makeUnit({ cost: 10 })
    );
    expect(creditsResult).toEqual({ valid: false, error: "Insufficient credits" });
  });

  it("enforces unit caps", () => {
    const grid = new GridModel();
    const squadResult = validatePlacement(
      grid,
      baseRequest,
      { ...baseState, unitCounts: { ...baseState.unitCounts, squad: defaultLimits.maxSquads } },
      makeUnit({ class: "squad" })
    );
    expect(squadResult).toEqual({ valid: false, error: "Squad cap reached" });

    const giantResult = validatePlacement(
      grid,
      baseRequest,
      { ...baseState, unitCounts: { ...baseState.unitCounts, giant: defaultLimits.maxGiants } },
      makeUnit({ class: "giant" })
    );
    expect(giantResult).toEqual({ valid: false, error: "Giant cap reached" });

    const airResult = validatePlacement(
      grid,
      baseRequest,
      { ...baseState, unitCounts: { ...baseState.unitCounts, air: defaultLimits.maxAirSquads } },
      makeUnit({ class: "air" })
    );
    expect(airResult).toEqual({ valid: false, error: "Air squad cap reached" });
  });

  it("rejects invalid orientations", () => {
    const grid = new GridModel();
    const result = validatePlacement(
      grid,
      { ...baseRequest, orientation: 45 as PlacementRequest["orientation"] },
      baseState,
      makeUnit()
    );
    expect(result).toEqual({ valid: false, error: "Invalid orientation" });
  });

  it("accepts valid placements", () => {
    const grid = new GridModel();
    const result = validatePlacement(grid, baseRequest, baseState, makeUnit());
    expect(result).toEqual({ valid: true });
  });
});
