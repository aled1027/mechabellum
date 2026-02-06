import { describe, expect, it } from "vitest";
import { buildSquadOffsets } from "../../src/sim/formation.js";

describe("buildSquadOffsets", () => {
  it("creates a grid formation", () => {
    const offsets = buildSquadOffsets(4, 1, 0);
    expect(offsets).toEqual([
      { x: -0.6, y: -0.6 },
      { x: 0.6, y: -0.6 },
      { x: -0.6, y: 0.6 },
      { x: 0.6, y: 0.6 }
    ]);
  });

  it("rotates offsets based on orientation", () => {
    const offsets = buildSquadOffsets(2, 1, 90);
    expect(offsets).toHaveLength(2);
    expect(offsets[0].x).toBeCloseTo(0, 5);
    expect(offsets[0].y).toBeCloseTo(-0.6, 5);
    expect(offsets[1].x).toBeCloseTo(0, 5);
    expect(offsets[1].y).toBeCloseTo(0.6, 5);
  });
});
