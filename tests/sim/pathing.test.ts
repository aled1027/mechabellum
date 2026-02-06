import { describe, expect, it } from "vitest";
import { findPath } from "../../src/sim/pathing.js";

describe("findPath", () => {
  it("returns the start when already at the goal", () => {
    const path = findPath({ x: 2, y: 2 }, { x: 2, y: 2 }, () => false);
    expect(path).toEqual([{ x: 2, y: 2 }]);
  });

  it("finds a straight path when unobstructed", () => {
    const path = findPath({ x: 0, y: 0 }, { x: 2, y: 0 }, () => false);
    expect(path).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 }
    ]);
  });

  it("avoids blocked tiles", () => {
    const path = findPath(
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      (pos) => pos.x === 1 && pos.y === 0
    );
    expect(path.some((pos) => pos.x === 1 && pos.y === 0)).toBe(false);
    expect(path[0]).toEqual({ x: 0, y: 0 });
    expect(path[path.length - 1]).toEqual({ x: 2, y: 0 });
  });
});
