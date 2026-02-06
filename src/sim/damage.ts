import type { AttackType } from "../data/schemas.js";
import type { SimEvent, UnitInstance } from "./types.js";
import type { RngStream } from "../core/rng.js";

interface DamageResult {
  hit: boolean;
  damage: number;
}

const getResistance = (unit: UnitInstance, attackType: AttackType): number => {
  return unit.stats.resistances?.[attackType] ?? 0;
};

export const rollHit = (unit: UnitInstance, rng: RngStream, accuracyOverride?: number): boolean => {
  const accuracy = Math.min(1, Math.max(0, accuracyOverride ?? unit.stats.accuracy));
  return rng.nextFloat() <= accuracy;
};

export const applyDamage = (
  target: UnitInstance,
  baseDamage: number,
  attackType: AttackType,
  events: SimEvent[],
  tick: number,
  armorMultiplier = 1
): DamageResult => {
  const resistance = getResistance(target, attackType);
  const modified = baseDamage * (1 - Math.min(0.9, Math.max(0, resistance)));
  const armorReduction = Math.max(0, target.stats.armor * armorMultiplier);
  const afterArmor = Math.max(0, modified - armorReduction);
  let remaining = afterArmor;

  if (target.shield > 0) {
    const shieldDamage = Math.min(target.shield, remaining);
    target.shield -= shieldDamage;
    remaining -= shieldDamage;
  }

  if (remaining > 0) {
    target.hp = Math.max(0, target.hp - remaining);
  }

  events.push({
    tick,
    type: "damage",
    payload: {
      targetId: target.id,
      damage: afterArmor,
      remainingHp: target.hp,
      remainingShield: target.shield
    }
  });

  return { hit: true, damage: afterArmor };
};
