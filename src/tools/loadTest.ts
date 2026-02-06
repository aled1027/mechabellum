import path from "node:path";
import { loadBundleWithOverrides } from "../data/index.js";
import { MatchRoom } from "../server/matchRoom.js";
import { DeterministicRng } from "../core/rng.js";
import type { GridPosition } from "../grid/grid.js";

export interface LoadTestConfig {
  matches: number;
  rounds: number;
  seed: number;
  tickMs: number;
  maxTicks: number;
  planningMs: number;
  combatMs: number;
}

export interface LoadTestResult {
  matches: number;
  rounds: number;
  totalCombats: number;
  totalTicks: number;
}

const defaultConfig: LoadTestConfig = {
  matches: 10,
  rounds: 3,
  seed: 42,
  tickMs: 50,
  maxTicks: 20,
  planningMs: 1000,
  combatMs: 1000
};

const pickPositions = (rng: DeterministicRng): { north: GridPosition; south: GridPosition } => {
  const north: GridPosition = { x: rng.nextRange(0, 12), y: rng.nextRange(0, 4) };
  const south: GridPosition = { x: rng.nextRange(0, 12), y: rng.nextRange(4, 8) };
  return { north, south };
};

export const runLoadTest = async (
  config: Partial<LoadTestConfig> = {}
): Promise<LoadTestResult> => {
  const resolved = { ...defaultConfig, ...config };
  const bundle = await loadBundleWithOverrides(path.join(process.cwd(), "data"));
  const rng = new DeterministicRng(resolved.seed);
  let totalTicks = 0;
  let totalCombats = 0;

  for (let match = 0; match < resolved.matches; match += 1) {
    const room = new MatchRoom(bundle, rng.nextUint32(), {
      tickMs: resolved.tickMs,
      maxTicks: resolved.maxTicks,
      planningMs: resolved.planningMs,
      combatMs: resolved.combatMs,
      replayVersion: "1"
    });
    room.addPlayer({ id: `north-${match}`, side: "north" });
    room.addPlayer({ id: `south-${match}`, side: "south" });

    for (let round = 1; round <= resolved.rounds; round += 1) {
      room.startRound(round);
      const positions = pickPositions(rng);
      room.submitPlanningInput(`north-${match}`, [
        { unitId: "crawler", side: "north", position: positions.north, orientation: 0 }
      ]);
      room.submitPlanningInput(`south-${match}`, [
        { unitId: "mustang", side: "south", position: positions.south, orientation: 180 }
      ]);
      const snapshot = room.getSnapshot();
      totalCombats += 1;
      totalTicks += snapshot.combat?.state.tick ?? 0;
    }
  }

  return {
    matches: resolved.matches,
    rounds: resolved.rounds,
    totalCombats,
    totalTicks
  };
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await runLoadTest();
  console.log(JSON.stringify(result, null, 2));
}
