import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadBundleWithOverrides } from "../../src/data/index.js";
import { defaultLimits } from "../../src/grid/placement.js";
import { defaultSupplyConfig } from "../../src/game/economy.js";
import {
  createCardState,
  createRosterState,
  purchaseCard,
  purchaseTech,
  purchaseUnit,
  purchaseUpgrade,
  resetCardPurchases
} from "../../src/game/roster.js";

const createEconomy = (credits: number) => ({ credits, winStreak: 0, lossStreak: 0 });

describe("roster purchases", () => {
  it("rejects unit purchases for insufficient credits and caps", async () => {
    const dataDir = path.join(process.cwd(), "data");
    const bundle = await loadBundleWithOverrides(dataDir);
    const unit = bundle.units[0];

    const noCredits = purchaseUnit(
      createEconomy(0),
      createRosterState(),
      unit,
      defaultSupplyConfig
    );
    expect(noCredits.success).toBe(false);
    expect(noCredits.error).toBe("Insufficient credits");

    const cappedRoster = {
      ...createRosterState(),
      unitCounts: {
        squad: defaultLimits.maxSquads,
        giant: 0,
        air: 0
      }
    };
    const capped = purchaseUnit(
      createEconomy(500),
      cappedRoster,
      { ...unit, class: "squad" },
      defaultSupplyConfig,
      defaultLimits
    );
    expect(capped.success).toBe(false);
    expect(capped.error).toBe("Squad cap reached");
  });

  it("handles upgrades, tech, and card purchase limits", async () => {
    const dataDir = path.join(process.cwd(), "data");
    const bundle = await loadBundleWithOverrides(dataDir);

    const roster = createRosterState();
    const economy = createEconomy(200);
    const unitPurchase = purchaseUnit(economy, roster, bundle.units[0], defaultSupplyConfig);
    expect(unitPurchase.success).toBe(true);

    const unitId = unitPurchase.roster?.units[0].id ?? "";
    const maxedRoster = {
      ...(unitPurchase.roster ?? roster),
      units: [{ id: unitId, definitionId: bundle.units[0].id, level: 3, techs: [] }]
    };
    const maxedUpgrade = purchaseUpgrade(createEconomy(200), maxedRoster, unitId);
    expect(maxedUpgrade.success).toBe(false);
    expect(maxedUpgrade.error).toBe("Upgrade already maxed");

    const limitedRoster = {
      ...(unitPurchase.roster ?? roster),
      units: [{ id: unitId, definitionId: bundle.units[0].id, level: 0, techs: ["a", "b"] }]
    };
    const techResult = purchaseTech(
      createEconomy(200),
      limitedRoster,
      unitId,
      {
        id: "target_sync",
        name: "Target Sync",
        description: "",
        branch: "control",
        maxLevel: 1,
        modifiers: {}
      },
      [
        {
          id: "target_sync",
          name: "Target Sync",
          description: "",
          branch: "control",
          maxLevel: 1,
          modifiers: {}
        }
      ],
      20
    );
    expect(techResult.success).toBe(false);
    expect(techResult.error).toBe("Tech limit reached");

    const cardState = { ...createCardState(), cardsPurchasedThisRound: 2 };
    const cardResult = purchaseCard(createEconomy(200), cardState, bundle.cards[0], 10);
    expect(cardResult.success).toBe(false);
    expect(cardResult.error).toBe("Card purchase limit reached");
  });

  it("resets card purchase tracking", () => {
    const cardState = {
      cards: ["one"],
      cardsPurchasedThisRound: 2,
      cooldowns: { basic: 1 },
      activeCards: []
    };
    const reset = resetCardPurchases(cardState);
    expect(reset.cardsPurchasedThisRound).toBe(0);
    expect(reset.cards).toEqual(["one"]);
  });
});
