import type { GridPosition, Orientation } from "../grid/grid.js";

const rotate = (point: GridPosition, orientation: Orientation): GridPosition => {
  switch (orientation) {
    case 90:
      return { x: -point.y, y: point.x };
    case 180:
      return { x: -point.x, y: -point.y };
    case 270:
      return { x: point.y, y: -point.x };
    default:
      return point;
  }
};

export const buildSquadOffsets = (
  squadSize: number,
  collisionSize: number,
  orientation: Orientation
): GridPosition[] => {
  const count = Math.max(1, squadSize);
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  const spacing = collisionSize * 1.2;
  const offsets: GridPosition[] = [];
  const xStart = -((columns - 1) * spacing) / 2;
  const yStart = -((rows - 1) * spacing) / 2;

  for (let index = 0; index < count; index += 1) {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const offset = rotate({ x: xStart + col * spacing, y: yStart + row * spacing }, orientation);
    offsets.push(offset);
  }

  return offsets;
};
