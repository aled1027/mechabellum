import type { GridPosition } from "../grid/grid.js";
import { GridModel } from "../grid/grid.js";

interface Node {
  position: GridPosition;
  g: number;
  f: number;
  parent?: Node;
}

const key = (pos: GridPosition): string => `${pos.x},${pos.y}`;

const heuristic = (a: GridPosition, b: GridPosition): number =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const neighbors = (pos: GridPosition): GridPosition[] => {
  const options = [
    { x: pos.x + 1, y: pos.y },
    { x: pos.x - 1, y: pos.y },
    { x: pos.x, y: pos.y + 1 },
    { x: pos.x, y: pos.y - 1 }
  ];
  return options.filter(
    (candidate) =>
      candidate.x >= 0 &&
      candidate.x < GridModel.width &&
      candidate.y >= 0 &&
      candidate.y < GridModel.height
  );
};

export const findPath = (
  start: GridPosition,
  goal: GridPosition,
  isBlocked: (position: GridPosition) => boolean
): GridPosition[] => {
  if (start.x === goal.x && start.y === goal.y) {
    return [start];
  }

  const open = new Map<string, Node>();
  const closed = new Set<string>();
  const startNode: Node = {
    position: start,
    g: 0,
    f: heuristic(start, goal)
  };
  open.set(key(start), startNode);

  while (open.size > 0) {
    let current: Node | undefined;
    for (const node of open.values()) {
      if (
        !current ||
        node.f < current.f ||
        (node.f === current.f && key(node.position) < key(current.position))
      ) {
        current = node;
      }
    }

    if (!current) {
      break;
    }

    open.delete(key(current.position));
    closed.add(key(current.position));

    if (current.position.x === goal.x && current.position.y === goal.y) {
      const path: GridPosition[] = [];
      let cursor: Node | undefined = current;
      while (cursor) {
        path.unshift(cursor.position);
        cursor = cursor.parent;
      }
      return path;
    }

    for (const neighbor of neighbors(current.position)) {
      const neighborKey = key(neighbor);
      if (closed.has(neighborKey) || isBlocked(neighbor)) {
        continue;
      }
      const g = current.g + 1;
      const existing = open.get(neighborKey);
      if (!existing || g < existing.g) {
        open.set(neighborKey, {
          position: neighbor,
          g,
          f: g + heuristic(neighbor, goal),
          parent: current
        });
      }
    }
  }

  return [start];
};
