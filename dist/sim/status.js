export const addStatusEffect = (target, effect, sourceId, events, tick) => {
    const existing = target.statusEffects.find((status) => status.type === effect.type);
    if (existing) {
        existing.remainingTicks = Math.max(existing.remainingTicks, effect.durationTicks);
        existing.magnitude = Math.max(existing.magnitude, effect.magnitude);
    }
    else {
        target.statusEffects.push({
            type: effect.type,
            remainingTicks: effect.durationTicks,
            magnitude: effect.magnitude,
            sourceId
        });
    }
    events.push({
        tick,
        type: "status_apply",
        payload: { targetId: target.id, status: effect.type, duration: effect.durationTicks }
    });
};
export const tickStatusEffects = (unit, events, tick) => {
    for (const status of unit.statusEffects) {
        status.remainingTicks = Math.max(0, status.remainingTicks - 1);
        if (status.type === "emp") {
            unit.shield = 0;
        }
        if (status.type === "burn" && status.remainingTicks > 0) {
            const burnDamage = 2 * status.magnitude;
            unit.hp = Math.max(0, unit.hp - burnDamage);
            events.push({
                tick,
                type: "burn",
                payload: { targetId: unit.id, damage: burnDamage, remainingHp: unit.hp }
            });
        }
    }
    unit.statusEffects = unit.statusEffects.filter((status) => status.remainingTicks > 0);
};
export const hasStatus = (unit, type) => unit.statusEffects.some((status) => status.type === type);
export const getMoveSpeedMultiplier = (unit) => {
    const slow = unit.statusEffects.find((status) => status.type === "slow");
    if (!slow) {
        return 1;
    }
    return Math.max(0.4, 1 - 0.2 * slow.magnitude);
};
export const getArmorMultiplier = (unit) => {
    const burn = unit.statusEffects.find((status) => status.type === "burn");
    if (!burn) {
        return 1;
    }
    return 0.8;
};
