import type { GridPosition } from "../grid/grid.js";
import type { UnitBehaviorDefinition } from "../data/schemas.js";
import type { SimEvent, UnitInstance } from "./types.js";
import { applyDamage } from "./damage.js";
import { addStatusEffect, getArmorMultiplier } from "./status.js";

const distance = (a: GridPosition, b: GridPosition): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const getBehavior = <T extends UnitBehaviorDefinition["type"]>(
  unit: UnitInstance,
  type: T
): Extract<UnitBehaviorDefinition, { type: T }> | undefined =>
  unit.behaviors.find((behavior) => behavior.type === type) as
    | Extract<UnitBehaviorDefinition, { type: T }>
    | undefined;

export const isTargetable = (attacker: UnitInstance, target: UnitInstance): boolean => {
  const cloak = getBehavior(target, "cloak");
  if (!cloak) {
    return true;
  }
  return distance(attacker.position, target.position) <= cloak.revealRange;
};

export const applyChainLightning = (
  source: UnitInstance,
  primaryTarget: UnitInstance,
  units: UnitInstance[],
  events: SimEvent[],
  tick: number
): void => {
  const chain = getBehavior(source, "chain_lightning");
  if (!chain || chain.chainCount <= 0) {
    return;
  }

  const hitIds = new Set<string>([primaryTarget.id]);
  let origin = primaryTarget;

  for (let hop = 0; hop < chain.chainCount; hop += 1) {
    const candidates = units
      .filter((unit) => unit.side !== source.side && unit.hp > 0 && !hitIds.has(unit.id))
      .filter((unit) => distance(origin.position, unit.position) <= chain.chainRange)
      .sort((a, b) => {
        const distDelta =
          distance(origin.position, a.position) - distance(origin.position, b.position);
        if (distDelta !== 0) {
          return distDelta;
        }
        return a.id.localeCompare(b.id);
      });

    const nextTarget = candidates[0];
    if (!nextTarget) {
      break;
    }

    const falloff = Math.pow(chain.damageFalloff, hop + 1);
    const damage = Math.max(1, Math.round(source.stats.damage * falloff));

    applyDamage(
      nextTarget,
      damage,
      source.stats.attackType,
      events,
      tick,
      getArmorMultiplier(nextTarget)
    );
    for (const effect of source.stats.onHitEffects) {
      addStatusEffect(nextTarget, effect, source.id, events, tick);
    }

    events.push({
      tick,
      type: "chain_lightning",
      payload: { sourceId: source.id, targetId: nextTarget.id, hop: hop + 1 }
    });

    hitIds.add(nextTarget.id);
    origin = nextTarget;
  }
};

export const getReviveBehavior = (
  unit: UnitInstance
): Extract<UnitBehaviorDefinition, { type: "revive" }> | undefined => getBehavior(unit, "revive");
