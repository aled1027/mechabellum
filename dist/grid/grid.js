export class GridModel {
  static width = 12;
  static height = 8;
  isInBounds(position) {
    return (
      position.x >= 0 &&
      position.x < GridModel.width &&
      position.y >= 0 &&
      position.y < GridModel.height
    );
  }
  getDeploymentZone(side) {
    const rows = side === "north" ? [0, 1, 2, 3] : [4, 5, 6, 7];
    const tiles = [];
    for (const y of rows) {
      for (let x = 0; x < GridModel.width; x += 1) {
        tiles.push({ x, y });
      }
    }
    return { side, tiles };
  }
  ownsTile(side, position) {
    if (!this.isInBounds(position)) {
      return false;
    }
    if (side === "north") {
      return position.y <= 3;
    }
    return position.y >= 4;
  }
  orientFacing(side, orientation) {
    if (side === "north") {
      return orientation;
    }
    return (orientation + 180) % 360;
  }
}
