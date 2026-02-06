export const defaultLimits = {
  maxPlacementsPerRound: 8,
  maxSquads: 20,
  maxGiants: 8,
  maxAirSquads: 16
};
export const validatePlacement = (grid, request, state, unit, limits = defaultLimits) => {
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
