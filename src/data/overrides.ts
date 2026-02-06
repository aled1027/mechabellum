import type { DataBundle, UnitDefinition, TechDefinition, CardDefinition, SpecialistDefinition } from "./schemas.js";

export type OverridePatch<T> = Partial<T> & { id: string };

export interface BalanceOverrides {
  units?: Array<OverridePatch<UnitDefinition>>;
  techs?: Array<OverridePatch<TechDefinition>>;
  cards?: Array<OverridePatch<CardDefinition>>;
  specialists?: Array<OverridePatch<SpecialistDefinition>>;
}

const applyListOverrides = <T extends { id: string }>(
  base: T[],
  overrides: Array<OverridePatch<T>> | undefined
): T[] => {
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

export const applyBalanceOverrides = (bundle: DataBundle, overrides: BalanceOverrides): DataBundle => {
  return {
    units: applyListOverrides(bundle.units, overrides.units),
    techs: applyListOverrides(bundle.techs, overrides.techs),
    cards: applyListOverrides(bundle.cards, overrides.cards),
    specialists: applyListOverrides(bundle.specialists, overrides.specialists)
  };
};
