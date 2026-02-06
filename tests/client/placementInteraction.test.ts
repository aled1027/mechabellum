import { describe, expect, it } from "vitest";
import type { UnitDefinition } from "../../src/data/schemas.js";
import { GridModel } from "../../src/grid/grid.js";
import type { PlayerPlacementState } from "../../src/grid/placement.js";
import {
  beginPlacement,
  confirmPlacement,
  createPlacementInteractionState,
  rotatePlacement,
  updatePlacementHover
} from "../../src/client/placementInteraction.js";

const makeUnit = (id: string, cost = 10): UnitDefinition => ({
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

const makePlayerState = (): PlayerPlacementState => ({
  side: "north",
  credits: 100,
  placementsThisRound: 0,
  unitCounts: {
    squad: 0,
    giant: 0,
    air: 0
  }
});

describe("placement interaction", () => {
  it("builds a placement request when valid", () => {
    const grid = new GridModel();
    const unit = makeUnit("crawler");
    const player = makePlayerState();
    const context = { grid, player, unit };

    const initial = beginPlacement(createPlacementInteractionState(), unit.id);
    const hovered = updatePlacementHover(initial, context, { x: 1, y: 1 });
    const confirmation = confirmPlacement(hovered);

    expect(confirmation.request?.unitId).toBe(unit.id);
    expect(confirmation.request?.position).toEqual({ x: 1, y: 1 });
  });

  it("reports invalid placement feedback", () => {
    const grid = new GridModel();
    const unit = makeUnit("crawler", 200);
    const player = makePlayerState();
    player.credits = 0;
    const context = { grid, player, unit };

    const initial = beginPlacement(createPlacementInteractionState(), unit.id);
    const hovered = updatePlacementHover(initial, context, { x: 1, y: 1 });

    expect(hovered.preview?.result.valid).toBe(false);
    expect(hovered.error).toBe("Insufficient credits");
  });

  it("rotates placement orientation", () => {
    const grid = new GridModel();
    const unit = makeUnit("crawler");
    const player = makePlayerState();
    const context = { grid, player, unit };

    const initial = beginPlacement(createPlacementInteractionState(), unit.id);
    const hovered = updatePlacementHover(initial, context, { x: 1, y: 1 });
    const rotated = rotatePlacement(hovered, "clockwise", context);

    expect(rotated.orientation).toBe(90);
    expect(rotated.preview?.request.orientation).toBe(90);
  });
});
