import { applyEffects, createEffectContext } from "./effects.js";
export const defaultSpecialistConfig = {
    maxActiveSpecialists: 3
};
export const createSpecialistState = () => ({ specialists: [] });
export const addSpecialist = (state, specialistId) => {
    if (state.specialists.some((entry) => entry.id === specialistId)) {
        return state;
    }
    return {
        ...state,
        specialists: [
            ...state.specialists,
            { id: specialistId, level: 1, activeCooldownMs: 0, activationsThisRound: 0 }
        ]
    };
};
export const resetSpecialistRound = (state) => ({
    ...state,
    specialists: state.specialists.map((entry) => ({ ...entry, activationsThisRound: 0 }))
});
export const tickSpecialistCooldowns = (state, deltaMs) => ({
    ...state,
    specialists: state.specialists.map((entry) => ({
        ...entry,
        activeCooldownMs: Math.max(0, entry.activeCooldownMs - deltaMs)
    }))
});
const getUnlockedLevel = (definition, round) => {
    const levels = definition.levels
        .filter((level) => level.unlockRound <= round)
        .map((level) => level.level);
    if (levels.length === 0) {
        return 0;
    }
    return Math.max(...levels);
};
export const updateSpecialistLevels = (state, specialists, round) => {
    return {
        ...state,
        specialists: state.specialists.map((entry) => {
            const definition = specialists.find((spec) => spec.id === entry.id);
            if (!definition) {
                return entry;
            }
            const unlocked = getUnlockedLevel(definition, round);
            return { ...entry, level: Math.max(entry.level, unlocked) };
        })
    };
};
export const processSpecialistTrigger = (economy, state, trigger, specialists, config = defaultSpecialistConfig) => {
    let context = createEffectContext(economy);
    const entries = [...state.specialists].sort((a, b) => a.id.localeCompare(b.id));
    let activeCount = 0;
    const updated = entries.map((entry) => {
        const definition = specialists.find((spec) => spec.id === entry.id);
        if (!definition) {
            return entry;
        }
        const availableLevels = definition.levels.filter((level) => level.level <= entry.level);
        for (const level of availableLevels) {
            for (const passive of level.passives ?? []) {
                if (passive.trigger !== trigger) {
                    continue;
                }
                context = applyEffects(context, passive.effects, entry.id);
            }
            if (level.active && level.active.trigger === trigger) {
                if (activeCount >= config.maxActiveSpecialists) {
                    continue;
                }
                if (entry.activeCooldownMs > 0) {
                    continue;
                }
                if (entry.activationsThisRound >= level.active.maxActivationsPerRound) {
                    continue;
                }
                context = applyEffects(context, level.active.effects, entry.id);
                activeCount += 1;
                return {
                    ...entry,
                    activeCooldownMs: level.active.cooldownMs,
                    activationsThisRound: entry.activationsThisRound + 1
                };
            }
        }
        return entry;
    });
    return {
        success: true,
        state: { specialists: updated },
        context
    };
};
