export const createEffectContext = (economy) => ({
    economy: { ...economy },
    modifiers: []
});
export const applyEffect = (context, effect, sourceId) => {
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
export const applyEffects = (context, effects, sourceId) => {
    return effects.reduce((current, effect) => applyEffect(current, effect, sourceId), context);
};
