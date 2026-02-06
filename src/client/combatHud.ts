import type { DataBundle } from "../data/schemas.js";
import type { PlayerSide } from "../grid/grid.js";
import type { RoundPhaseState } from "../game/roundFlow.js";
import type { SimState } from "../sim/types.js";

export type HudPriority = "primary" | "secondary" | "tertiary";
export type HudRegion = "top_bar" | "left_panel" | "right_panel" | "bottom_bar" | "center_overlay";

export interface CombatHudLayoutItem {
  id: string;
  label: string;
  region: HudRegion;
  priority: HudPriority;
  description: string;
  visibleInPhases: Array<"combat" | "resolution" | "planning">;
}

export interface CombatHudTeamStatus {
  side: PlayerSide;
  unitsAlive: number;
  hpPercent: number;
  totalValue: number;
}

export interface CombatHudState {
  round: number;
  phase: string;
  remainingMs: number;
  friendly: CombatHudTeamStatus;
  enemy: CombatHudTeamStatus;
  layout: CombatHudLayoutItem[];
}

export interface CombatHudBuildInput {
  roundFlow: RoundPhaseState;
  simState: SimState;
  data: DataBundle;
  playerSide: PlayerSide;
  layout?: CombatHudLayoutItem[];
}

export const COMBAT_HUD_LAYOUT: CombatHudLayoutItem[] = [
  {
    id: "round_timer",
    label: "Round Timer",
    region: "top_bar",
    priority: "primary",
    description: "Countdown until combat timeout; primary urgency indicator.",
    visibleInPhases: ["combat"]
  },
  {
    id: "round_number",
    label: "Round",
    region: "top_bar",
    priority: "primary",
    description: "Shows the current round for quick context.",
    visibleInPhases: ["combat", "resolution"]
  },
  {
    id: "team_health",
    label: "Team Durability Bars",
    region: "top_bar",
    priority: "primary",
    description: "Friendly vs enemy remaining durability (HP + shields) as percent.",
    visibleInPhases: ["combat", "resolution"]
  },
  {
    id: "team_counts",
    label: "Unit Counts",
    region: "top_bar",
    priority: "secondary",
    description: "Remaining unit counts per side to clarify battlefield advantage.",
    visibleInPhases: ["combat", "resolution"]
  },
  {
    id: "focused_unit",
    label: "Focused Unit Detail",
    region: "right_panel",
    priority: "secondary",
    description: "Shows detailed stats/tech for a hovered or selected unit.",
    visibleInPhases: ["combat", "resolution"]
  },
  {
    id: "combat_log",
    label: "Combat Highlights",
    region: "left_panel",
    priority: "tertiary",
    description: "Optional event feed for key moments (giant deaths, card triggers).",
    visibleInPhases: ["combat", "resolution"]
  },
  {
    id: "replay_controls",
    label: "Replay Controls",
    region: "bottom_bar",
    priority: "tertiary",
    description: "Only visible in replay; controls timeline and speed.",
    visibleInPhases: ["combat", "resolution"]
  }
];

const summarizeSide = (
  state: SimState,
  data: DataBundle,
  side: PlayerSide
): CombatHudTeamStatus => {
  let current = 0;
  let max = 0;
  let value = 0;
  let unitsAlive = 0;
  for (const unit of state.units) {
    if (unit.side !== side) {
      continue;
    }
    unitsAlive += 1;
    current += unit.hp + unit.shield;
    max += unit.stats.maxHp + unit.stats.maxShield;
    const definition = data.units.find((entry) => entry.id === unit.definitionId);
    value += definition?.cost ?? 0;
  }
  const hpPercent = max > 0 ? current / max : 0;
  return { side, unitsAlive, hpPercent, totalValue: value };
};

export const buildCombatHudState = (input: CombatHudBuildInput): CombatHudState => {
  const { roundFlow, simState, data, playerSide, layout = COMBAT_HUD_LAYOUT } = input;
  const friendly = summarizeSide(simState, data, playerSide);
  const enemySide: PlayerSide = playerSide === "north" ? "south" : "north";
  const enemy = summarizeSide(simState, data, enemySide);

  return {
    round: roundFlow.getRound(),
    phase: roundFlow.getPhase(),
    remainingMs: roundFlow.getRemainingMs(),
    friendly,
    enemy,
    layout: [...layout]
  };
};
