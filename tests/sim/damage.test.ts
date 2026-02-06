import { describe, expect, it } from "vitest";
import { applyDamage, rollHit } from "../../src/sim/damage.js";
import { makeUnit } from "./helpers.js";

const stubRng = (value: number) => ({
  nextFloat: () => value,
  nextInt: () => 0,
  nextRange: () => 0
});

describe("damage", () => {
  it("applies resistance, armor, and shields", () => {
    const target = makeUnit({
      id: "target",
      stats: {
        maxHp: 100,
        maxShield: 10,
        armor: 2,
        resistances: { kinetic: 0.2 }
      },
      hp: 100,
      shield: 10
    });
    const events: Array<{ tick: number; type: string; payload?: Record<string, unknown> }> = [];

    const result = applyDamage(target, 20, "kinetic", events, 1, 1);

    expect(result.damage).toBeCloseTo(14);
    expect(target.shield).toBe(0);
    expect(target.hp).toBe(96);
    expect(events[0].type).toBe("damage");
  });

  it("respects accuracy", () => {
    const unit = makeUnit({ stats: { accuracy: 0 } });
    expect(rollHit(unit, stubRng(0.5))).toBe(false);
    const accurate = makeUnit({ stats: { accuracy: 1 } });
    expect(rollHit(accurate, stubRng(0.5))).toBe(true);
  });
});
