import { describe, expect, it } from "vitest";
import {
  addSpecialist,
  createSpecialistState,
  defaultSpecialistConfig,
  processSpecialistTrigger,
  resetSpecialistRound,
  tickSpecialistCooldowns,
  updateSpecialistLevels
} from "../../src/game/specialists.js";
import type { SpecialistDefinition } from "../../src/data/schemas.js";

const makeEconomy = (credits = 0) => ({ credits, winStreak: 0, lossStreak: 0 });

const specialists: SpecialistDefinition[] = [
  {
    id: "alpha",
    name: "Alpha",
    description: "",
    class: "elite",
    levels: [
      {
        level: 1,
        unlockRound: 1,
        passives: [
          {
            trigger: "round_start",
            effects: [{ kind: "credits", amount: 2 }]
          }
        ]
      },
      {
        level: 3,
        unlockRound: 8,
        active: {
          trigger: "combat_start",
          cooldownMs: 5000,
          maxActivationsPerRound: 1,
          effects: [{ kind: "credits", amount: 5 }]
        }
      }
    ]
  },
  {
    id: "beta",
    name: "Beta",
    description: "",
    class: "supply",
    levels: [
      {
        level: 1,
        unlockRound: 1,
        passives: []
      },
      {
        level: 3,
        unlockRound: 8,
        active: {
          trigger: "combat_start",
          cooldownMs: 5000,
          maxActivationsPerRound: 1,
          effects: [{ kind: "credits", amount: 7 }]
        }
      }
    ]
  }
];

describe("specialists", () => {
  it("unlocks levels and applies passive triggers", () => {
    let state = createSpecialistState();
    state = addSpecialist(state, "alpha");
    state = updateSpecialistLevels(state, specialists, 5);

    const result = processSpecialistTrigger(makeEconomy(0), state, "round_start", specialists);
    expect(result.context?.economy.credits).toBe(2);
  });

  it("respects active limits and cooldowns", () => {
    let state = createSpecialistState();
    state = addSpecialist(state, "alpha");
    state = addSpecialist(state, "beta");
    state = updateSpecialistLevels(state, specialists, 8);

    const limitedConfig = { ...defaultSpecialistConfig, maxActiveSpecialists: 1 };
    const activation = processSpecialistTrigger(
      makeEconomy(0),
      state,
      "combat_start",
      specialists,
      limitedConfig
    );
    expect(activation.context?.economy.credits).toBe(5);

    const updated = activation.state ?? state;
    const alpha = updated.specialists.find((entry) => entry.id === "alpha");
    const beta = updated.specialists.find((entry) => entry.id === "beta");
    expect(alpha?.activeCooldownMs).toBeGreaterThan(0);
    expect(beta?.activeCooldownMs).toBe(0);

    const reset = resetSpecialistRound(updated);
    const cooled = tickSpecialistCooldowns(reset, 5000);
    const cooledAlpha = cooled.specialists.find((entry) => entry.id === "alpha");
    expect(cooledAlpha?.activeCooldownMs).toBe(0);
  });
});
