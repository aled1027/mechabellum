import type { PlayerSide } from "../grid/grid.js";
import type { SimState, StatusEffectType } from "../sim/types.js";

export interface CombatOverlayConfig {
  lowHealthThreshold: number;
}

export interface CombatUnitOverlay {
  unitId: string;
  side: PlayerSide;
  hpPercent: number;
  shieldPercent: number;
  statusEffects: StatusEffectType[];
  lowHealth: boolean;
}

export interface CombatOverlayState {
  tick: number;
  units: CombatUnitOverlay[];
}

export const defaultCombatOverlayConfig: CombatOverlayConfig = {
  lowHealthThreshold: 0.25
};

const clampPercent = (value: number): number => Math.max(0, Math.min(1, value));

export const buildCombatOverlayState = (
  state: SimState,
  config: CombatOverlayConfig = defaultCombatOverlayConfig
): CombatOverlayState => ({
  tick: state.tick,
  units: state.units.map((unit) => {
    const maxHp = unit.stats.maxHp;
    const maxShield = unit.stats.maxShield;
    const hpPercent = maxHp > 0 ? clampPercent(unit.hp / maxHp) : 0;
    const shieldPercent = maxShield > 0 ? clampPercent(unit.shield / maxShield) : 0;
    const statusEffects = unit.statusEffects.map((effect) => effect.type);
    return {
      unitId: unit.id,
      side: unit.side,
      hpPercent,
      shieldPercent,
      statusEffects,
      lowHealth: hpPercent > 0 && hpPercent <= config.lowHealthThreshold
    };
  })
});
