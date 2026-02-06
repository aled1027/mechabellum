import { applyEffects, createEffectContext } from "./effects.js";
export const defaultCardCooldownConfig = {
  defaultCooldowns: {
    common: 0,
    rare: 1,
    epic: 2,
    legendary: 3
  }
};
const getCooldownGroup = (card) => {
  return card.cooldownGroup ?? card.rarity;
};
const getCooldownRounds = (card, config) => {
  return card.cooldownRounds ?? config.defaultCooldowns[card.rarity] ?? 0;
};
const addCooldown = (state, card, config) => {
  const group = getCooldownGroup(card);
  const duration = getCooldownRounds(card, config);
  if (duration <= 0) {
    return state;
  }
  return {
    ...state,
    cooldowns: {
      ...state.cooldowns,
      [group]: Math.max(state.cooldowns[group] ?? 0, duration)
    }
  };
};
export const advanceCardCooldowns = (state) => {
  const updated = {};
  for (const [group, remaining] of Object.entries(state.cooldowns)) {
    const next = Math.max(0, remaining - 1);
    if (next > 0) {
      updated[group] = next;
    }
  }
  return {
    ...state,
    cooldowns: updated
  };
};
export const tickActiveCards = (state, deltaMs) => {
  if (state.activeCards.length === 0) {
    return state;
  }
  const active = state.activeCards
    .map((instance) => {
      if (instance.remainingMs === undefined) {
        return instance;
      }
      return { ...instance, remainingMs: Math.max(0, instance.remainingMs - deltaMs) };
    })
    .filter((instance) => instance.remainingMs === undefined || instance.remainingMs > 0);
  return { ...state, activeCards: active };
};
export const canActivateCard = (state, card) => {
  const group = getCooldownGroup(card);
  const remaining = state.cooldowns[group] ?? 0;
  if (remaining > 0) {
    return { success: false, error: "Card on cooldown" };
  }
  return { success: true };
};
export const activateCard = (economy, state, card, config = defaultCardCooldownConfig) => {
  const cooldownCheck = canActivateCard(state, card);
  if (!cooldownCheck.success) {
    return cooldownCheck;
  }
  let context = createEffectContext(economy);
  if (card.type === "instant" || card.type === "timed") {
    context = applyEffects(context, card.effects, card.id);
  }
  let nextState = addCooldown(state, card, config);
  if (card.type === "timed") {
    nextState = {
      ...nextState,
      activeCards: [
        ...nextState.activeCards,
        {
          id: `${card.id}-${nextState.activeCards.length + 1}`,
          cardId: card.id,
          remainingMs: card.durationMs ?? 0,
          trigger: card.trigger,
          activationsThisRound: 0
        }
      ]
    };
  }
  if (card.type === "triggered") {
    nextState = {
      ...nextState,
      activeCards: [
        ...nextState.activeCards,
        {
          id: `${card.id}-${nextState.activeCards.length + 1}`,
          cardId: card.id,
          trigger: card.trigger,
          activationsThisRound: 0
        }
      ]
    };
  }
  return { success: true, state: nextState, context };
};
export const processCardTriggers = (economy, state, trigger, cards) => {
  let context = createEffectContext(economy);
  let updatedState = { ...state };
  const remaining = [];
  for (const instance of state.activeCards) {
    if (instance.trigger !== trigger) {
      remaining.push(instance);
      continue;
    }
    const card = cards.find((entry) => entry.id === instance.cardId);
    if (!card) {
      continue;
    }
    context = applyEffects(context, card.effects, card.id);
    if (card.type === "timed") {
      remaining.push({ ...instance, activationsThisRound: instance.activationsThisRound + 1 });
    }
  }
  updatedState = { ...updatedState, activeCards: remaining };
  return { success: true, state: updatedState, context };
};
