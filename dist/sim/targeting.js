const distance = (a, b) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
};
const threatScore = (unit) => {
    const threat = unit.stats.damage * unit.stats.attackSpeed;
    return threat / (threat + 50);
};
export const scoreTarget = (attacker, target) => {
    const dist = distance(attacker.position, target.position);
    const hpPercent = target.hp / Math.max(1, target.stats.maxHp);
    const threat = threatScore(target);
    const marked = target.statusEffects.some((status) => status.type === "mark") ? -0.3 : 0;
    return dist * 0.5 + hpPercent * 0.3 + threat * 0.2 + marked;
};
export const selectTarget = (attacker, candidates) => {
    let best;
    let bestScore = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
        const score = scoreTarget(attacker, candidate);
        if (score < bestScore) {
            best = candidate;
            bestScore = score;
        }
    }
    return best;
};
