import type { SimState } from "./types.js";
import { computeStateChecksum } from "./qa.js";

export interface SimSnapshot {
  tick: number;
  state: SimState;
  checksum: string;
}

export interface SnapshotConfig {
  interval: number;
  maxSnapshots: number;
}

export class SnapshotBuffer {
  private readonly snapshots: SimSnapshot[] = [];

  constructor(private readonly config: SnapshotConfig) {
    if (!Number.isInteger(config.interval) || config.interval <= 0) {
      throw new Error("snapshot interval must be a positive integer");
    }
    if (!Number.isInteger(config.maxSnapshots) || config.maxSnapshots <= 0) {
      throw new Error("maxSnapshots must be a positive integer");
    }
  }

  record(state: SimState): void {
    if (state.tick % this.config.interval !== 0) {
      return;
    }
    const snapshot: SimState = JSON.parse(JSON.stringify(state)) as SimState;
    const checksum = computeStateChecksum(snapshot);
    this.snapshots.push({ tick: state.tick, state: snapshot, checksum });
    if (this.snapshots.length > this.config.maxSnapshots) {
      this.snapshots.shift();
    }
  }

  getSnapshots(): SimSnapshot[] {
    return [...this.snapshots];
  }

  clear(): void {
    this.snapshots.length = 0;
  }
}
