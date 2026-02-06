import type { GridPosition } from "../grid/grid.js";

export interface InterpolatedState {
  position: GridPosition;
}

export const lerp = (start: number, end: number, alpha: number): number => {
  return start + (end - start) * alpha;
};

export const interpolatePosition = (
  previous: GridPosition,
  next: GridPosition,
  alpha: number
): GridPosition => {
  return {
    x: lerp(previous.x, next.x, alpha),
    y: lerp(previous.y, next.y, alpha)
  };
};
