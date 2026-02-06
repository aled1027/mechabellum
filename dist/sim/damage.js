const getResistance = (unit, attackType) => {
    return unit.stats.resistances?.[attackType] ?? 0;
};
export const rollHit = (unit, rng, accuracyOverride) => {
    const accuracy = Math.min(1, Math.max(0, accuracyOverride ?? unit.stats.accuracy));
    return rng.nextFloat() <= accuracy;
};
export const applyDamage = (target, baseDamage, attackType, events, tick, armorMultiplier = 1) => {
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
