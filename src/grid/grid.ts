export type PlayerSide = "north" | "south";
export type Orientation = 0 | 90 | 180 | 270;

export interface GridPosition {
  x: number;
  y: number;
}

export interface DeploymentZone {
  side: PlayerSide;
  tiles: GridPosition[];
}

export class GridModel {
  static readonly width = 12;
  static readonly height = 8;

  isInBounds(position: GridPosition): boolean {
    return (
      position.x >= 0 &&
      position.x < GridModel.width &&
      position.y >= 0 &&
      position.y < GridModel.height
    );
  }

  getDeploymentZone(side: PlayerSide): DeploymentZone {
    const rows = side === "north" ? [0, 1, 2, 3] : [4, 5, 6, 7];
    const tiles: GridPosition[] = [];
    for (const y of rows) {
      for (let x = 0; x < GridModel.width; x += 1) {
        tiles.push({ x, y });
      }
    }
    return { side, tiles };
  }

  ownsTile(side: PlayerSide, position: GridPosition): boolean {
    if (!this.isInBounds(position)) {
      return false;
    }
    if (side === "north") {
      return position.y <= 3;
    }
    return position.y >= 4;
  }

  orientFacing(side: PlayerSide, orientation: Orientation): Orientation {
    if (side === "north") {
      return orientation;
    }
    return ((orientation + 180) % 360) as Orientation;
  }
}
