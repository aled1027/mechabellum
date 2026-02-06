import { describe, expect, it } from "vitest";
import { scoreTarget, selectTarget } from "../../src/sim/targeting.js";
import { makeUnit } from "./helpers.js";

describe("targeting", () => {
  it("rewards marked targets", () => {
    const attacker = makeUnit({ position: { x: 0, y: 0 } });
    const target = makeUnit({
      id: "target",
      position: { x: 3, y: 0 }
    });
    const marked = makeUnit({
      id: "marked",
      position: { x: 3, y: 0 },
      statusEffects: [{ type: "mark", remainingTicks: 2, magnitude: 1 }]
    });

    const baseScore = scoreTarget(attacker, target);
    const markedScore = scoreTarget(attacker, marked);
    expect(markedScore).toBeLessThan(baseScore);
  });

  it("selects the lowest scored target", () => {
    const attacker = makeUnit({ position: { x: 0, y: 0 } });
    const closer = makeUnit({ id: "close", position: { x: 1, y: 0 } });
    const farther = makeUnit({ id: "far", position: { x: 5, y: 0 } });
    expect(selectTarget(attacker, [farther, closer])?.id).toBe("close");
  });
});
