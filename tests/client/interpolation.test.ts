import { describe, expect, it } from "vitest";
import { interpolatePosition, lerp } from "../../src/client/interpolation.js";

describe("interpolation", () => {
  it("lerps between values", () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });

  it("interpolates positions", () => {
    const position = interpolatePosition({ x: 0, y: 0 }, { x: 10, y: 20 }, 0.25);
    expect(position).toEqual({ x: 2.5, y: 5 });
  });
});
