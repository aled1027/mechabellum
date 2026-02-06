import { describe, expect, it } from "vitest";
import { GridModel } from "../../src/grid/grid.js";

describe("GridModel", () => {
  it("checks bounds", () => {
    const grid = new GridModel();
    expect(grid.isInBounds({ x: 0, y: 0 })).toBe(true);
    expect(grid.isInBounds({ x: 11, y: 7 })).toBe(true);
    expect(grid.isInBounds({ x: -1, y: 0 })).toBe(false);
    expect(grid.isInBounds({ x: 12, y: 0 })).toBe(false);
  });

  it("builds deployment zones", () => {
    const grid = new GridModel();
    const zone = grid.getDeploymentZone("north");
    expect(zone.tiles).toHaveLength(48);
    expect(zone.tiles.every((tile) => tile.y <= 3)).toBe(true);
  });

  it("checks tile ownership", () => {
    const grid = new GridModel();
    expect(grid.ownsTile("north", { x: 5, y: 3 })).toBe(true);
    expect(grid.ownsTile("north", { x: 5, y: 4 })).toBe(false);
    expect(grid.ownsTile("south", { x: 5, y: 4 })).toBe(true);
  });

  it("orients facing for the south player", () => {
    const grid = new GridModel();
    expect(grid.orientFacing("south", 90)).toBe(270);
    expect(grid.orientFacing("south", 180)).toBe(0);
    expect(grid.orientFacing("north", 90)).toBe(90);
  });
});
