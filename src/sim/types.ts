import type { GridPosition, Orientation, PlayerSide } from "../grid/grid.js";

export interface UnitInstance {
  id: string;
  definitionId: string;
  side: PlayerSide;
  position: GridPosition;
  orientation: Orientation;
  hp: number;
}

export interface SimState {
  tick: number;
  units: UnitInstance[];
}

export interface SimEvent {
  tick: number;
  type: string;
  payload?: Record<string, unknown>;
}

export interface SimInput {
  round: number;
  placements: Array<{
    unitId: string;
    side: PlayerSide;
    position: GridPosition;
    orientation: Orientation;
  }>;
}
