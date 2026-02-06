import path from "node:path";
import { describe, expect, it } from "vitest";
import { RngService } from "../../src/core/rng.js";
import { loadBundleWithOverrides } from "../../src/data/index.js";
import { defaultSupplyConfig } from "../../src/game/economy.js";
import { createRosterState, createCardState } from "../../src/game/roster.js";
import {
  createShopState,
  lockUnitOffer,
  purchaseCardOffer,
  purchaseTechOffer,
  purchaseUnitOffer,
  rerollShop
} from "../../src/game/shop.js";

const createEconomy = (credits: number) => ({ credits, winStreak: 0, lossStreak: 0 });

describe("shop", () => {
  it("generates offers, locks units, and rerolls", async () => {
    const dataDir = path.join(process.cwd(), "data");
    const bundle = await loadBundleWithOverrides(dataDir);
    const rngService = new RngService(1234);
    rngService.setRoundSeed(1);

    const shop = createShopState(bundle, rngService.stream("shop"));
    expect(shop.unitOffers).toHaveLength(3);
    expect(shop.techOffers).toHaveLength(2);
    expect(shop.cardOffers).toHaveLength(2);

    const economy = createEconomy(10);
    const locked = lockUnitOffer(shop, economy, shop.unitOffers[0].id);
    expect(locked.success).toBe(true);
    expect(locked.economy?.credits).toBe(8);

    const rerolled = rerollShop(
      bundle,
      rngService.stream("shop-reroll"),
      locked.state ?? shop,
      locked.economy ?? economy
    );
    expect(rerolled.success).toBe(true);
    expect(rerolled.state?.rerollsUsed).toBe(1);
    expect(rerolled.state?.lockedUnitOffer?.unitId).toBe(shop.unitOffers[0].unitId);
  });

  it("validates purchases and updates inventory", async () => {
    const dataDir = path.join(process.cwd(), "data");
    const bundle = await loadBundleWithOverrides(dataDir);
    const rngService = new RngService(9001);
    rngService.setRoundSeed(1);

    const shop = createShopState(bundle, rngService.stream("shop"));
    const economy = createEconomy(200);
    const roster = createRosterState();
    const cards = createCardState();

    const unitPurchase = purchaseUnitOffer(
      bundle,
      shop,
      economy,
      roster,
      shop.unitOffers[0].id,
      defaultSupplyConfig
    );
    expect(unitPurchase.success).toBe(true);
    expect(unitPurchase.roster?.units).toHaveLength(1);

    const techPurchase = purchaseTechOffer(
      bundle,
      unitPurchase.state ?? shop,
      unitPurchase.economy ?? economy,
      unitPurchase.roster ?? roster,
      unitPurchase.state?.techOffers[0].id ?? shop.techOffers[0].id,
      unitPurchase.roster?.units[0].id ?? ""
    );
    expect(techPurchase.success).toBe(true);

    const cardPurchase = purchaseCardOffer(
      bundle,
      techPurchase.state ?? shop,
      techPurchase.economy ?? economy,
      cards,
      techPurchase.state?.cardOffers[0].id ?? shop.cardOffers[0].id
    );
    expect(cardPurchase.success).toBe(true);
    expect(cardPurchase.cards?.cards).toHaveLength(1);
  });
});
