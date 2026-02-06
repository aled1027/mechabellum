import { describe, expect, it } from "vitest";
import type { TechDefinition, UnitDefinition } from "../../src/data/schemas.js";
import { applyUpgradeModifiers, canAddTech } from "../../src/game/upgrades.js";

const baseStats: UnitDefinition["stats"] = {
  hp: 100,
  armor: 0,
  shield: 0,
  damage: 20,
  attackType: "kinetic",
  attackSpeed: 1,
  range: 2,
  projectileSpeed: 0,
  turnSpeed: 0,
  moveSpeed: 1,
  collisionSize: 1,
  targeting: "ground",
  squadSize: 1,
  accuracy: 1,
  aoeRadius: 0,
  homing: false,
  resistances: {},
  onHitEffects: []
};

describe("upgrades", () => {
  it("applies upgrade modifiers", () => {
    const upgraded = applyUpgradeModifiers(baseStats, 2);
    expect(upgraded.hp).toBe(130);
    expect(upgraded.damage).toBe(23);
    expect(upgraded.attackSpeed).toBeCloseTo(1.05);
  });

  it("enforces tech branch exclusivity and caps", () => {
    const techs: TechDefinition[] = [
      {
        id: "armor_plating",
        name: "Armor Plating",
        description: "",
        branch: "defense",
        maxLevel: 1,
        modifiers: {}
      },
      {
        id: "speed_overdrive",
        name: "Speed Overdrive",
        description: "",
        branch: "defense",
        maxLevel: 1,
        modifiers: {}
      },
      {
        id: "target_sync",
        name: "Target Sync",
        description: "",
        branch: "control",
        maxLevel: 1,
        modifiers: {}
      }
    ];

    const branchResult = canAddTech(["armor_plating"], techs[1], techs);
    expect(branchResult.valid).toBe(false);

    const capResult = canAddTech(["armor_plating", "target_sync"], techs[2], techs);
    expect(capResult.valid).toBe(false);
  });
});
