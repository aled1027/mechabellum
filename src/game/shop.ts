import type { DataBundle, CardDefinition, UnitDefinition } from "../data/schemas.js";
import type { RngStream } from "../core/rng.js";
import type { PlayerEconomyState } from "./economy.js";
import type { PlayerCardState, PlayerRosterState, PurchaseOutcome } from "./roster.js";
import { purchaseCard, purchaseTech, purchaseUnit } from "./roster.js";
import type { SupplyConfig } from "./economy.js";

export interface ShopUnitOffer {
  id: string;
  unitId: string;
  baseCost: number;
}

export interface ShopTechOffer {
  id: string;
  techId: string;
  cost: number;
}

export interface ShopCardOffer {
  id: string;
  cardId: string;
  cost: number;
}

export interface ShopState {
  unitOffers: ShopUnitOffer[];
  techOffers: ShopTechOffer[];
  cardOffers: ShopCardOffer[];
  rerollsUsed: number;
  lockedUnitOffer?: ShopUnitOffer;
}

export interface ShopConfig {
  unitOfferCount: number;
  techOfferCount: number;
  cardOfferCount: number;
  rerollCost: number;
  rerollLimit: number;
  lockCost: number;
  defaultTechCost: number;
  defaultCardCost: number;
  unitTierWeights: Record<number, number>;
  cardRarityWeights: Record<CardDefinition["rarity"], number>;
}

export interface ShopRerollResult {
  success: boolean;
  error?: string;
  state?: ShopState;
  economy?: PlayerEconomyState;
}

export interface ShopLockResult {
  success: boolean;
  error?: string;
  state?: ShopState;
  economy?: PlayerEconomyState;
}

export interface ShopPurchaseResult {
  success: boolean;
  error?: string;
  state?: ShopState;
  economy?: PlayerEconomyState;
  roster?: PlayerRosterState;
  cards?: PlayerCardState;
  cost?: number;
}

const pickWeightedIndex = <T>(items: T[], weights: number[], rng: RngStream): number => {
  const total = weights.reduce((sum, value) => sum + value, 0);
  const roll = rng.nextFloat() * total;
  let running = 0;
  for (let i = 0; i < items.length; i += 1) {
    running += weights[i];
    if (roll <= running) {
      return i;
    }
  }
  return Math.max(0, items.length - 1);
};

const pickUnique = <T>(items: T[], count: number, rng: RngStream): T[] => {
  if (items.length === 0 || count <= 0) {
    return [];
  }
  let pool = [...items];
  const chosen: T[] = [];
  for (let i = 0; i < count; i += 1) {
    if (pool.length === 0) {
      pool = [...items];
    }
    const index = rng.nextInt(pool.length);
    chosen.push(pool[index]);
    pool.splice(index, 1);
  }
  return chosen;
};

const pickWeightedUnits = (
  units: UnitDefinition[],
  count: number,
  rng: RngStream,
  weights: Record<number, number>
): UnitDefinition[] => {
  if (units.length === 0 || count <= 0) {
    return [];
  }
  let pool = [...units];
  const chosen: UnitDefinition[] = [];
  for (let i = 0; i < count; i += 1) {
    if (pool.length === 0) {
      pool = [...units];
    }
    const weightList = pool.map((unit) => weights[unit.tier] ?? 1);
    const index = pickWeightedIndex(pool, weightList, rng);
    chosen.push(pool[index]);
    pool.splice(index, 1);
  }
  return chosen;
};

const pickWeightedCards = (
  cards: CardDefinition[],
  count: number,
  rng: RngStream,
  weights: Record<CardDefinition["rarity"], number>
): CardDefinition[] => {
  if (cards.length === 0 || count <= 0) {
    return [];
  }
  let pool = [...cards];
  const chosen: CardDefinition[] = [];
  for (let i = 0; i < count; i += 1) {
    if (pool.length === 0) {
      pool = [...cards];
    }
    const weightList = pool.map((card) => weights[card.rarity] ?? 1);
    const index = pickWeightedIndex(pool, weightList, rng);
    chosen.push(pool[index]);
    pool.splice(index, 1);
  }
  return chosen;
};

export const defaultShopConfig: ShopConfig = {
  unitOfferCount: 3,
  techOfferCount: 2,
  cardOfferCount: 2,
  rerollCost: 5,
  rerollLimit: 2,
  lockCost: 2,
  defaultTechCost: 30,
  defaultCardCost: 15,
  unitTierWeights: {
    1: 0.6,
    2: 0.3,
    3: 0.1
  },
  cardRarityWeights: {
    common: 0.7,
    rare: 0.2,
    epic: 0.08,
    legendary: 0.02
  }
};

export const generateShopOffers = (
  data: DataBundle,
  rng: RngStream,
  config: ShopConfig = defaultShopConfig,
  lockedUnitOffer?: ShopUnitOffer
): Omit<ShopState, "rerollsUsed"> => {
  const remainingUnits = data.units.filter((unit) => unit.id !== lockedUnitOffer?.unitId);
  const unitOffers = pickWeightedUnits(
    remainingUnits,
    config.unitOfferCount - (lockedUnitOffer ? 1 : 0),
    rng,
    config.unitTierWeights
  ).map((unit, index) => ({
    id: `unit-${index}-${unit.id}`,
    unitId: unit.id,
    baseCost: unit.cost
  }));

  if (lockedUnitOffer) {
    unitOffers.unshift({ ...lockedUnitOffer, id: `locked-${lockedUnitOffer.unitId}` });
  }

  const techOffers = pickUnique(data.techs, config.techOfferCount, rng).map((tech, index) => ({
    id: `tech-${index}-${tech.id}`,
    techId: tech.id,
    cost: tech.cost ?? config.defaultTechCost
  }));

  const cardOffers = pickWeightedCards(
    data.cards,
    config.cardOfferCount,
    rng,
    config.cardRarityWeights
  ).map((card, index) => ({
    id: `card-${index}-${card.id}`,
    cardId: card.id,
    cost: card.cost ?? config.defaultCardCost
  }));

  return { unitOffers, techOffers, cardOffers, lockedUnitOffer };
};

export const createShopState = (
  data: DataBundle,
  rng: RngStream,
  config: ShopConfig = defaultShopConfig,
  lockedUnitOffer?: ShopUnitOffer
): ShopState => {
  const offers = generateShopOffers(data, rng, config, lockedUnitOffer);
  return { ...offers, rerollsUsed: 0 };
};

export const rerollShop = (
  data: DataBundle,
  rng: RngStream,
  state: ShopState,
  economy: PlayerEconomyState,
  config: ShopConfig = defaultShopConfig
): ShopRerollResult => {
  if (state.rerollsUsed >= config.rerollLimit) {
    return { success: false, error: "Reroll limit reached" };
  }
  if (economy.credits < config.rerollCost) {
    return { success: false, error: "Insufficient credits" };
  }

  const nextEconomy: PlayerEconomyState = {
    ...economy,
    credits: economy.credits - config.rerollCost
  };
  const offers = generateShopOffers(data, rng, config, state.lockedUnitOffer);

  return {
    success: true,
    economy: nextEconomy,
    state: { ...offers, rerollsUsed: state.rerollsUsed + 1 }
  };
};

export const lockUnitOffer = (
  state: ShopState,
  economy: PlayerEconomyState,
  offerId: string,
  config: ShopConfig = defaultShopConfig
): ShopLockResult => {
  const offer = state.unitOffers.find((unitOffer) => unitOffer.id === offerId);
  if (!offer) {
    return { success: false, error: "Offer not found" };
  }
  if (economy.credits < config.lockCost) {
    return { success: false, error: "Insufficient credits" };
  }
  const nextEconomy: PlayerEconomyState = {
    ...economy,
    credits: economy.credits - config.lockCost
  };
  return {
    success: true,
    economy: nextEconomy,
    state: { ...state, lockedUnitOffer: offer }
  };
};

const removeOfferById = <T extends { id: string }>(offers: T[], offerId: string): T[] =>
  offers.filter((offer) => offer.id !== offerId);

export const purchaseUnitOffer = (
  data: DataBundle,
  state: ShopState,
  economy: PlayerEconomyState,
  roster: PlayerRosterState,
  offerId: string,
  supplyConfig: SupplyConfig
): ShopPurchaseResult => {
  const offer = state.unitOffers.find((unitOffer) => unitOffer.id === offerId);
  if (!offer) {
    return { success: false, error: "Offer not found" };
  }
  const unit = data.units.find((entry) => entry.id === offer.unitId);
  if (!unit) {
    return { success: false, error: "Unit not found" };
  }

  const purchase = purchaseUnit(economy, roster, unit, supplyConfig);
  if (!purchase.success || !purchase.economy || !purchase.roster) {
    return { success: false, error: purchase.error };
  }

  return {
    success: true,
    economy: purchase.economy,
    roster: purchase.roster,
    cost: purchase.cost,
    state: {
      ...state,
      unitOffers: removeOfferById(state.unitOffers, offerId)
    }
  };
};

export const purchaseTechOffer = (
  data: DataBundle,
  state: ShopState,
  economy: PlayerEconomyState,
  roster: PlayerRosterState,
  offerId: string,
  unitId: string,
  config: ShopConfig = defaultShopConfig
): ShopPurchaseResult => {
  const offer = state.techOffers.find((techOffer) => techOffer.id === offerId);
  if (!offer) {
    return { success: false, error: "Offer not found" };
  }
  const tech = data.techs.find((entry) => entry.id === offer.techId);
  if (!tech) {
    return { success: false, error: "Tech not found" };
  }

  const purchase = purchaseTech(economy, roster, unitId, tech, data.techs, config.defaultTechCost);
  if (!purchase.success || !purchase.economy || !purchase.roster) {
    return { success: false, error: purchase.error };
  }

  return {
    success: true,
    economy: purchase.economy,
    roster: purchase.roster,
    cost: purchase.cost,
    state: {
      ...state,
      techOffers: removeOfferById(state.techOffers, offerId)
    }
  };
};

export const purchaseCardOffer = (
  data: DataBundle,
  state: ShopState,
  economy: PlayerEconomyState,
  cardState: PlayerCardState,
  offerId: string,
  config: ShopConfig = defaultShopConfig
): ShopPurchaseResult => {
  const offer = state.cardOffers.find((cardOffer) => cardOffer.id === offerId);
  if (!offer) {
    return { success: false, error: "Offer not found" };
  }
  const card = data.cards.find((entry) => entry.id === offer.cardId);
  if (!card) {
    return { success: false, error: "Card not found" };
  }

  const purchase: PurchaseOutcome = purchaseCard(economy, cardState, card, config.defaultCardCost);
  if (!purchase.success || !purchase.economy || !purchase.cards) {
    return { success: false, error: purchase.error };
  }

  return {
    success: true,
    economy: purchase.economy,
    cards: purchase.cards,
    cost: purchase.cost,
    state: {
      ...state,
      cardOffers: removeOfferById(state.cardOffers, offerId)
    }
  };
};
