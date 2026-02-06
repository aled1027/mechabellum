import { purchaseCard, purchaseTech, purchaseUnit } from "./roster.js";
const pickWeightedIndex = (items, weights, rng) => {
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
const pickUnique = (items, count, rng) => {
  if (items.length === 0 || count <= 0) {
    return [];
  }
  let pool = [...items];
  const chosen = [];
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
const pickWeightedUnits = (units, count, rng, weights) => {
  if (units.length === 0 || count <= 0) {
    return [];
  }
  let pool = [...units];
  const chosen = [];
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
const pickWeightedCards = (cards, count, rng, weights) => {
  if (cards.length === 0 || count <= 0) {
    return [];
  }
  let pool = [...cards];
  const chosen = [];
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
export const defaultShopConfig = {
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
export const generateShopOffers = (data, rng, config = defaultShopConfig, lockedUnitOffer) => {
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
export const createShopState = (data, rng, config = defaultShopConfig, lockedUnitOffer) => {
  const offers = generateShopOffers(data, rng, config, lockedUnitOffer);
  return { ...offers, rerollsUsed: 0 };
};
export const rerollShop = (data, rng, state, economy, config = defaultShopConfig) => {
  if (state.rerollsUsed >= config.rerollLimit) {
    return { success: false, error: "Reroll limit reached" };
  }
  if (economy.credits < config.rerollCost) {
    return { success: false, error: "Insufficient credits" };
  }
  const nextEconomy = {
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
export const lockUnitOffer = (state, economy, offerId, config = defaultShopConfig) => {
  const offer = state.unitOffers.find((unitOffer) => unitOffer.id === offerId);
  if (!offer) {
    return { success: false, error: "Offer not found" };
  }
  if (economy.credits < config.lockCost) {
    return { success: false, error: "Insufficient credits" };
  }
  const nextEconomy = {
    ...economy,
    credits: economy.credits - config.lockCost
  };
  return {
    success: true,
    economy: nextEconomy,
    state: { ...state, lockedUnitOffer: offer }
  };
};
const removeOfferById = (offers, offerId) => offers.filter((offer) => offer.id !== offerId);
export const purchaseUnitOffer = (data, state, economy, roster, offerId, supplyConfig) => {
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
  data,
  state,
  economy,
  roster,
  offerId,
  unitId,
  config = defaultShopConfig
) => {
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
  data,
  state,
  economy,
  cardState,
  offerId,
  config = defaultShopConfig
) => {
  const offer = state.cardOffers.find((cardOffer) => cardOffer.id === offerId);
  if (!offer) {
    return { success: false, error: "Offer not found" };
  }
  const card = data.cards.find((entry) => entry.id === offer.cardId);
  if (!card) {
    return { success: false, error: "Card not found" };
  }
  const purchase = purchaseCard(economy, cardState, card, config.defaultCardCost);
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
