import type { PlayerEconomyState } from "../game/economy.js";
import type { PlayerRosterState, PlayerCardState } from "../game/roster.js";
import type { PlayerSpecialistState } from "../game/specialists.js";
import type { ShopState } from "../game/shop.js";
import type { RoundPhaseState } from "../game/roundFlow.js";

export interface PlanningHudRosterSummary {
  totalUnits: number;
  supply: number;
  squads: number;
  giants: number;
  air: number;
}

export interface PlanningHudState {
  round: number;
  phase: string;
  remainingMs: number;
  credits: number;
  roster: PlanningHudRosterSummary;
  shop: ShopState;
  specialists: PlayerSpecialistState;
  cards: PlayerCardState;
}

export interface PlanningHudBuildInput {
  roundFlow: RoundPhaseState;
  economy: PlayerEconomyState;
  roster: PlayerRosterState;
  shop: ShopState;
  specialists: PlayerSpecialistState;
  cards: PlayerCardState;
}

export const buildPlanningHudState = (input: PlanningHudBuildInput): PlanningHudState => {
  const { roster, economy, shop, roundFlow, specialists, cards } = input;
  return {
    round: roundFlow.getRound(),
    phase: roundFlow.getPhase(),
    remainingMs: roundFlow.getRemainingMs(),
    credits: economy.credits,
    roster: {
      totalUnits: roster.units.length,
      supply: roster.supply,
      squads: roster.unitCounts.squad,
      giants: roster.unitCounts.giant,
      air: roster.unitCounts.air
    },
    shop,
    specialists,
    cards
  };
};
