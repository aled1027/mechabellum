import type { CardDefinition, TechDefinition, UnitDefinition } from "../data/schemas.js";
import type { PlacementLimits } from "../grid/placement.js";
import { defaultLimits } from "../grid/placement.js";
import type { PlayerEconomyState, SupplyConfig } from "./economy.js";
import { calculateSupplyAdjustedCost, defaultSupplyConfig } from "./economy.js";
import type { UpgradeConfig, UpgradeLevel } from "./upgrades.js";
import { canAddTech, defaultUpgradeConfig } from "./upgrades.js";

export interface RosterUnit {
  id: string;
  definitionId: string;
  level: UpgradeLevel;
  techs: string[];
}

export interface PlayerRosterState {
  units: RosterUnit[];
  unitCounts: {
    squad: number;
    giant: number;
    air: number;
  };
  supply: number;
}

export interface ActiveCardInstance {
  id: string;
  cardId: string;
  trigger?: string;
  remainingMs?: number;
  activationsThisRound: number;
}

export interface PlayerCardState {
  cards: string[];
  cardsPurchasedThisRound: number;
  cooldowns: Record<string, number>;
  activeCards: ActiveCardInstance[];
}

export interface CardPurchaseConfig {
  maxCardsPerRound: number;
}

export interface PurchaseOutcome {
  success: boolean;
  error?: string;
  economy?: PlayerEconomyState;
  roster?: PlayerRosterState;
  cards?: PlayerCardState;
  cost?: number;
}

export const defaultCardPurchaseConfig: CardPurchaseConfig = {
  maxCardsPerRound: 2
};

export const createRosterState = (): PlayerRosterState => ({
  units: [],
  unitCounts: { squad: 0, giant: 0, air: 0 },
  supply: 0
});

export const createCardState = (): PlayerCardState => ({
  cards: [],
  cardsPurchasedThisRound: 0,
  cooldowns: {},
  activeCards: []
});

export const resetCardPurchases = (state: PlayerCardState): PlayerCardState => ({
  ...state,
  cardsPurchasedThisRound: 0
});

const generateUnitInstanceId = (definitionId: string, index: number): string => {
  return `${definitionId}-${index}`;
};

const canAddUnit = (
  roster: PlayerRosterState,
  unit: UnitDefinition,
  limits: PlacementLimits
): PurchaseOutcome => {
  if (unit.class === "squad" && roster.unitCounts.squad >= limits.maxSquads) {
    return { success: false, error: "Squad cap reached" };
  }
  if (unit.class === "giant" && roster.unitCounts.giant >= limits.maxGiants) {
    return { success: false, error: "Giant cap reached" };
  }
  if (unit.class === "air" && roster.unitCounts.air >= limits.maxAirSquads) {
    return { success: false, error: "Air squad cap reached" };
  }
  return { success: true };
};

export const purchaseUnit = (
  economy: PlayerEconomyState,
  roster: PlayerRosterState,
  unit: UnitDefinition,
  supplyConfig: SupplyConfig = defaultSupplyConfig,
  limits: PlacementLimits = defaultLimits
): PurchaseOutcome => {
  const limitCheck = canAddUnit(roster, unit, limits);
  if (!limitCheck.success) {
    return limitCheck;
  }

  const supplyCost = calculateSupplyAdjustedCost(unit.cost, roster.supply, supplyConfig);
  if (economy.credits < supplyCost.cost) {
    return { success: false, error: "Insufficient credits" };
  }

  const nextEconomy: PlayerEconomyState = {
    ...economy,
    credits: economy.credits - supplyCost.cost
  };

  const index = roster.units.length + 1;
  const nextUnit: RosterUnit = {
    id: generateUnitInstanceId(unit.id, index),
    definitionId: unit.id,
    level: 0,
    techs: []
  };

  const nextRoster: PlayerRosterState = {
    units: [...roster.units, nextUnit],
    unitCounts: {
      ...roster.unitCounts,
      [unit.class]: roster.unitCounts[unit.class] + 1
    },
    supply: roster.supply + unit.cost
  };

  return { success: true, economy: nextEconomy, roster: nextRoster, cost: supplyCost.cost };
};

export const purchaseUpgrade = (
  economy: PlayerEconomyState,
  roster: PlayerRosterState,
  unitId: string,
  upgradeConfig: UpgradeConfig = defaultUpgradeConfig
): PurchaseOutcome => {
  const unitIndex = roster.units.findIndex((unit) => unit.id === unitId);
  if (unitIndex < 0) {
    return { success: false, error: "Unit not found" };
  }
  const unit = roster.units[unitIndex];
  if (unit.level >= 3) {
    return { success: false, error: "Upgrade already maxed" };
  }
  const nextLevel = (unit.level + 1) as Exclude<UpgradeLevel, 0>;
  const cost = upgradeConfig.costs[nextLevel];
  if (economy.credits < cost) {
    return { success: false, error: "Insufficient credits" };
  }

  const nextEconomy: PlayerEconomyState = {
    ...economy,
    credits: economy.credits - cost
  };

  const nextUnits = [...roster.units];
  nextUnits[unitIndex] = { ...unit, level: nextLevel };

  return {
    success: true,
    economy: nextEconomy,
    roster: { ...roster, units: nextUnits },
    cost
  };
};

export const purchaseTech = (
  economy: PlayerEconomyState,
  roster: PlayerRosterState,
  unitId: string,
  tech: TechDefinition,
  allTechs: TechDefinition[],
  fallbackCost: number
): PurchaseOutcome => {
  const unitIndex = roster.units.findIndex((unit) => unit.id === unitId);
  if (unitIndex < 0) {
    return { success: false, error: "Unit not found" };
  }
  const unit = roster.units[unitIndex];
  const selection = canAddTech(unit.techs, tech, allTechs);
  if (!selection.valid) {
    return { success: false, error: selection.error };
  }
  const cost = tech.cost ?? fallbackCost;
  if (economy.credits < cost) {
    return { success: false, error: "Insufficient credits" };
  }

  const nextEconomy: PlayerEconomyState = {
    ...economy,
    credits: economy.credits - cost
  };
  const nextUnits = [...roster.units];
  nextUnits[unitIndex] = { ...unit, techs: [...unit.techs, tech.id] };

  return {
    success: true,
    economy: nextEconomy,
    roster: { ...roster, units: nextUnits },
    cost
  };
};

export const purchaseCard = (
  economy: PlayerEconomyState,
  cardState: PlayerCardState,
  card: CardDefinition,
  fallbackCost: number,
  config: CardPurchaseConfig = defaultCardPurchaseConfig
): PurchaseOutcome => {
  if (cardState.cardsPurchasedThisRound >= config.maxCardsPerRound) {
    return { success: false, error: "Card purchase limit reached" };
  }
  const cost = card.cost ?? fallbackCost;
  if (economy.credits < cost) {
    return { success: false, error: "Insufficient credits" };
  }
  const nextEconomy: PlayerEconomyState = {
    ...economy,
    credits: economy.credits - cost
  };
  const nextCardState: PlayerCardState = {
    ...cardState,
    cards: [...cardState.cards, card.id],
    cardsPurchasedThisRound: cardState.cardsPurchasedThisRound + 1
  };

  return { success: true, economy: nextEconomy, cards: nextCardState, cost };
};
