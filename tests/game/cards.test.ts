import { describe, expect, it } from "vitest";
import { activateCard, advanceCardCooldowns, processCardTriggers } from "../../src/game/cards.js";
import { createCardState } from "../../src/game/roster.js";
import type { CardDefinition } from "../../src/data/schemas.js";

const makeEconomy = (credits = 0) => ({ credits, winStreak: 0, lossStreak: 0 });

describe("cards", () => {
  it("applies instant effects and tracks cooldowns", () => {
    const card: CardDefinition = {
      id: "supply",
      name: "Supply",
      rarity: "common",
      description: "Gain credits",
      type: "instant",
      cooldownRounds: 1,
      effects: [{ kind: "credits", amount: 10 }]
    };
    const state = createCardState();
    const activation = activateCard(makeEconomy(0), state, card);
    expect(activation.success).toBe(true);
    expect(activation.context?.economy.credits).toBe(10);
    expect(activation.state?.cooldowns.common).toBe(1);

    const second = activateCard(makeEconomy(0), activation.state ?? state, card);
    expect(second.success).toBe(false);
    expect(second.error).toBe("Card on cooldown");

    const cooled = advanceCardCooldowns(activation.state ?? state);
    expect(cooled.cooldowns.common).toBeUndefined();
  });

  it("queues triggered cards and resolves on trigger", () => {
    const card: CardDefinition = {
      id: "ambush",
      name: "Ambush",
      rarity: "rare",
      description: "Gain credits on combat start",
      type: "triggered",
      trigger: "combat_start",
      effects: [{ kind: "credits", amount: 5 }]
    };
    const state = createCardState();
    const activation = activateCard(makeEconomy(0), state, card);
    expect(activation.context?.economy.credits).toBe(0);
    expect(activation.state?.activeCards).toHaveLength(1);

    const triggered = processCardTriggers(
      makeEconomy(0),
      activation.state ?? state,
      "combat_start",
      [card]
    );
    expect(triggered.context?.economy.credits).toBe(5);
    expect(triggered.state?.activeCards).toHaveLength(0);
  });
});
