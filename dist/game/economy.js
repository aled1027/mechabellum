export const defaultEconomyConfig = {
    baseIncome: 20,
    winBonus: 6,
    lossBonusPerStack: 2,
    lossBonusCap: 8,
    interestRate: 0.1,
    interestCap: 10
};
export const defaultSupplyConfig = {
    supplyCap: 200,
    costScaling: 0.01
};
export const calculateInterest = (credits, config = defaultEconomyConfig) => {
    const interest = Math.floor(credits * config.interestRate);
    return Math.min(interest, config.interestCap);
};
export const updateStreaks = (economy, result) => {
    if (result === "win") {
        return { ...economy, winStreak: economy.winStreak + 1, lossStreak: 0 };
    }
    if (result === "loss") {
        return { ...economy, winStreak: 0, lossStreak: economy.lossStreak + 1 };
    }
    return { ...economy, winStreak: 0, lossStreak: 0 };
};
export const applyEndOfRoundEconomy = (economy, result, config = defaultEconomyConfig) => {
    const nextEconomy = updateStreaks(economy, result);
    const winBonus = result === "win" ? config.winBonus : 0;
    const lossBonus = result === "loss"
        ? Math.min(nextEconomy.lossStreak * config.lossBonusPerStack, config.lossBonusCap)
        : 0;
    const interest = calculateInterest(economy.credits, config);
    const total = config.baseIncome + winBonus + lossBonus + interest;
    return {
        economy: {
            ...nextEconomy,
            credits: economy.credits + total
        },
        payout: {
            baseIncome: config.baseIncome,
            winBonus,
            lossBonus,
            interest,
            total
        }
    };
};
export const calculateSupplyAdjustedCost = (baseCost, currentSupply, config = defaultSupplyConfig) => {
    const overage = Math.max(0, currentSupply - config.supplyCap);
    const multiplier = 1 + overage * config.costScaling;
    const scaled = baseCost * multiplier;
    const cost = Math.max(0, Math.ceil(scaled - 1e-6));
    return { baseCost, overage, multiplier, cost };
};
