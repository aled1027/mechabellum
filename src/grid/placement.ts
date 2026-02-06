import type { UnitDefinition } from "../data/schemas.js";
import type { GridPosition, Orientation, PlayerSide } from "./grid.js";
import { GridModel } from "./grid.js";

export interface PlacementRequest {
  unitId: string;
  position: GridPosition;
  orientation: Orientation;
}

export interface PlacementLimits {
  maxPlacementsPerRound: number;
  maxSquads: number;
  maxGiants: number;
  maxAirSquads: number;
}

export interface PlayerPlacementState {
  side: PlayerSide;
  credits: number;
  placementsThisRound: number;
  unitCounts: {
    squad: number;
    giant: number;
    air: number;
  };
}

export interface PlacementResult {
  valid: boolean;
  error?: string;
}

export const defaultLimits: PlacementLimits = {
  maxPlacementsPerRound: 8,
  maxSquads: 20,
  maxGiants: 8,
  maxAirSquads: 16
};

export const validatePlacement = (
  grid: GridModel,
  request: PlacementRequest,
  state: PlayerPlacementState,
  unit: UnitDefinition,
  limits: PlacementLimits = defaultLimits
): PlacementResult => {
  if (!grid.isInBounds(request.position)) {
    return { valid: false, error: "Position out of bounds" };
  }

  if (!grid.ownsTile(state.side, request.position)) {
    return { valid: false, error: "Tile not owned by player" };
  }

  if (state.placementsThisRound >= limits.maxPlacementsPerRound) {
    return { valid: false, error: "Placement limit reached" };
  }

  if (state.credits < unit.cost) {
    return { valid: false, error: "Insufficient credits" };
  }

  if (unit.class === "squad" && state.unitCounts.squad >= limits.maxSquads) {
    return { valid: false, error: "Squad cap reached" };
  }

  if (unit.class === "giant" && state.unitCounts.giant >= limits.maxGiants) {
    return { valid: false, error: "Giant cap reached" };
  }

  if (unit.class === "air" && state.unitCounts.air >= limits.maxAirSquads) {
    return { valid: false, error: "Air squad cap reached" };
  }

  if (![0, 90, 180, 270].includes(request.orientation)) {
    return { valid: false, error: "Invalid orientation" };
  }

  return { valid: true };
};
