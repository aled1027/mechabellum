import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadBundleWithOverrides } from "../../src/data/index.js";
import { RoundPhaseState, resolveCombatOutcome } from "../../src/game/roundFlow.js";
import { makeUnit } from "../sim/helpers.js";

describe("round flow", () => {
  it("transitions phases and enforces planning locks", () => {
    const roundState = new RoundPhaseState({ planningMs: 30000, combatMs: 90000 });
    roundState.startRound(1);

    expect(roundState.getPhase()).toBe("planning");
    expect(roundState.canAcceptPlanningActions()).toBe(true);

    roundState.advanceTime(30000);
    expect(roundState.getPhase()).toBe("combat");
    expect(roundState.canAcceptPlanningActions()).toBe(false);

    roundState.advanceTime(90000);
    expect(roundState.getPhase()).toBe("resolution");
  });

  it("resolves combat timeouts by hp percent then value", async () => {
    const dataDir = path.join(process.cwd(), "data");
    const bundle = await loadBundleWithOverrides(dataDir);

    const state = {
      tick: 0,
      units: [
        makeUnit({
          id: "north",
          definitionId: "mustang",
          side: "north",
          hp: 60,
          stats: { maxHp: 100, maxShield: 0 }
        }),
        makeUnit({
          id: "south",
          definitionId: "crawler",
          side: "south",
          hp: 40,
          stats: { maxHp: 100, maxShield: 0 }
        })
      ],
      projectiles: [],
      wreckage: []
    };

    const outcome = resolveCombatOutcome(state, bundle);
    expect(outcome.winner).toBe("north");

    const tieState = {
      ...state,
      units: [
        makeUnit({
          id: "north",
          definitionId: "mustang",
          side: "north",
          hp: 50,
          stats: { maxHp: 100, maxShield: 0 }
        }),
        makeUnit({
          id: "south",
          definitionId: "crawler",
          side: "south",
          hp: 50,
          stats: { maxHp: 100, maxShield: 0 }
        })
      ]
    };
    const valueOutcome = resolveCombatOutcome(tieState, bundle);
    expect(valueOutcome.winner).toBe("north");
  });

  it("locks phases early and handles full draw", async () => {
    const roundState = new RoundPhaseState({ planningMs: 30000, combatMs: 90000 });
    roundState.startRound(2);
    roundState.lockPlanning();
    expect(roundState.getPhase()).toBe("combat");

    roundState.lockCombat();
    expect(roundState.getPhase()).toBe("resolution");

    const dataDir = path.join(process.cwd(), "data");
    const bundle = await loadBundleWithOverrides(dataDir);
    const drawState = {
      tick: 0,
      units: [
        makeUnit({
          id: "north",
          definitionId: "crawler",
          side: "north",
          hp: 50,
          stats: { maxHp: 100, maxShield: 0 }
        }),
        makeUnit({
          id: "south",
          definitionId: "crawler",
          side: "south",
          hp: 50,
          stats: { maxHp: 100, maxShield: 0 }
        })
      ],
      projectiles: [],
      wreckage: []
    };
    const drawOutcome = resolveCombatOutcome(drawState, bundle);
    expect(drawOutcome.winner).toBe("draw");
  });
});
