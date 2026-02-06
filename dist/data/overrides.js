const applyListOverrides = (base, overrides) => {
  if (!overrides || overrides.length === 0) {
    return base;
  }
  const map = new Map(base.map((item) => [item.id, item]));
  for (const patch of overrides) {
    const existing = map.get(patch.id);
    if (existing) {
      map.set(patch.id, { ...existing, ...patch });
    }
  }
  return Array.from(map.values());
};
export const applyBalanceOverrides = (bundle, overrides) => {
  return {
    units: applyListOverrides(bundle.units, overrides.units),
    techs: applyListOverrides(bundle.techs, overrides.techs),
    cards: applyListOverrides(bundle.cards, overrides.cards),
    specialists: applyListOverrides(bundle.specialists, overrides.specialists)
  };
};
