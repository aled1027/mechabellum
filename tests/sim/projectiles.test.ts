import { describe, expect, it } from "vitest";
import { updateProjectiles } from "../../src/sim/projectiles.js";
import { makeUnit } from "./helpers.js";

const baseProjectile = {
  id: "proj",
  sourceId: "source",
  position: { x: 0, y: 0 },
  velocity: { x: 1, y: 0 },
  speed: 1,
  damage: 10,
  attackType: "kinetic" as const,
  aoeRadius: 0,
  homing: false,
  remainingTicks: 2,
  onHitEffects: []
};

describe("projectiles", () => {
  it("impacts targets and applies damage", () => {
    const target = makeUnit({ id: "target", position: { x: 1, y: 0 }, hp: 50 });
    const events: Array<{ tick: number; type: string; payload?: Record<string, unknown> }> = [];

    const next = updateProjectiles(
      [{ ...baseProjectile, targetId: target.id }],
      [target],
      events,
      5
    );

    expect(next).toHaveLength(0);
    expect(target.hp).toBe(40);
    expect(events.some((event) => event.type === "projectile_impact")).toBe(true);
  });

  it("applies area-of-effect impacts", () => {
    const units = [
      makeUnit({ id: "a", position: { x: 1, y: 0 }, hp: 50 }),
      makeUnit({ id: "b", position: { x: 1.2, y: 0 }, hp: 50 })
    ];
    const events: Array<{ tick: number; type: string; payload?: Record<string, unknown> }> = [];

    const next = updateProjectiles(
      [{ ...baseProjectile, targetId: "a", aoeRadius: 1 }],
      units,
      events,
      8
    );

    expect(next).toHaveLength(0);
    expect(units[0].hp).toBe(40);
    expect(units[1].hp).toBe(40);
  });
});
