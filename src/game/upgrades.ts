import type { TechDefinition, UnitDefinition } from "../data/schemas.js";

export type UpgradeLevel = 0 | 1 | 2 | 3;

export interface UpgradeLevelConfig {
  hp: number;
  damage: number;
  attackSpeed: number;
}

export interface UpgradeConfig {
  levels: Record<UpgradeLevel, UpgradeLevelConfig>;
  costs: Record<Exclude<UpgradeLevel, 0>, number>;
}

export interface TechSelectionResult {
  valid: boolean;
  error?: string;
}

export const defaultUpgradeConfig: UpgradeConfig = {
  levels: {
    0: { hp: 1, damage: 1, attackSpeed: 1 },
    1: { hp: 1.2, damage: 1.1, attackSpeed: 1 },
    2: { hp: 1.3, damage: 1.15, attackSpeed: 1.05 },
    3: { hp: 1.4, damage: 1.2, attackSpeed: 1.1 }
  },
  costs: {
    1: 25,
    2: 50,
    3: 75
  }
};

export const applyUpgradeModifiers = (
  stats: UnitDefinition["stats"],
  level: UpgradeLevel,
  config: UpgradeConfig = defaultUpgradeConfig
): UnitDefinition["stats"] => {
  const modifiers = config.levels[level] ?? config.levels[0];
  return {
    ...stats,
    hp: Math.round(stats.hp * modifiers.hp),
    damage: Math.round(stats.damage * modifiers.damage),
    attackSpeed: Number((stats.attackSpeed * modifiers.attackSpeed).toFixed(3))
  };
};

export const applyTechModifiers = (
  stats: UnitDefinition["stats"],
  techs: TechDefinition[]
): UnitDefinition["stats"] => {
  let next = { ...stats };
  for (const tech of techs) {
    for (const [key, value] of Object.entries(tech.modifiers)) {
      if (key in next) {
        const current = (next as Record<string, unknown>)[key];
        if (typeof current === "number") {
          next = { ...next, [key]: current + value };
        }
      }
    }
  }
  return next;
};

export const canAddTech = (
  currentTechIds: string[],
  candidate: TechDefinition,
  allTechs: TechDefinition[],
  maxTechs = 2
): TechSelectionResult => {
  if (currentTechIds.includes(candidate.id)) {
    return { valid: false, error: "Tech already equipped" };
  }
  if (currentTechIds.length >= maxTechs) {
    return { valid: false, error: "Tech limit reached" };
  }
  const candidateBranch = candidate.branch ?? candidate.id;
  const branches = new Set(
    currentTechIds.map((techId) => allTechs.find((tech) => tech.id === techId)?.branch ?? techId)
  );
  if (branches.has(candidateBranch)) {
    return { valid: false, error: "Tech branch already selected" };
  }
  return { valid: true };
};
