import type { EffectDefinition, UnitClass } from "../data/schemas.js";
import type { PlayerEconomyState } from "./economy.js";

export interface UnitStatModifier {
  stat: string;
  mode: "add" | "mul";
  amount: number;
  targetTag?: string;
  targetClass?: UnitClass;
  sourceId?: string;
}

export interface EffectContext {
  economy: PlayerEconomyState;
  modifiers: UnitStatModifier[];
}

export const createEffectContext = (economy: PlayerEconomyState): EffectContext => ({
  economy: { ...economy },
  modifiers: []
});

export const applyEffect = (
  context: EffectContext,
  effect: EffectDefinition,
  sourceId?: string
): EffectContext => {
  if (effect.kind === "credits") {
    return {
      ...context,
      economy: {
        ...context.economy,
        credits: context.economy.credits + effect.amount
      }
    };
  }

  if (effect.kind === "unit-stat") {
    return {
      ...context,
      modifiers: [
        ...context.modifiers,
        {
          stat: effect.stat ?? "",
          mode: effect.mode ?? "add",
          amount: effect.amount,
          targetTag: effect.targetTag,
          targetClass: effect.targetClass,
          sourceId
        }
      ]
    };
  }

  return context;
};

export const applyEffects = (
  context: EffectContext,
  effects: EffectDefinition[],
  sourceId?: string
): EffectContext => {
  return effects.reduce((current, effect) => applyEffect(current, effect, sourceId), context);
};
