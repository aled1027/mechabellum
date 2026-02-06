import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadBundleWithOverrides } from "../../src/data/index.js";
import { MatchRoom } from "../../src/server/matchRoom.js";

const placements = [
  { unitId: "crawler", side: "north", position: { x: 2, y: 1 }, orientation: 0 },
  { unitId: "mustang", side: "south", position: { x: 8, y: 6 }, orientation: 180 }
];

describe("MatchRoom", () => {
  it("runs combat when both players submit inputs", async () => {
    const dataDir = path.join(process.cwd(), "data");
    const bundle = await loadBundleWithOverrides(dataDir);

    const room = new MatchRoom(bundle, 1337, {
      tickMs: 50,
      maxTicks: 3,
      planningMs: 1000,
      combatMs: 1000,
      replayVersion: "1"
    });
    room.addPlayer({ id: "north-player", side: "north" });
    room.addPlayer({ id: "south-player", side: "south" });
    room.startRound(1);

    room.submitPlanningInput("north-player", [placements[0]]);
    room.submitPlanningInput("south-player", [placements[1]]);

    const snapshot = room.getSnapshot();
    expect(snapshot.phase).toBe("resolution");
    expect(snapshot.combat?.state.tick).toBe(3);
    expect(snapshot.replay?.rounds).toHaveLength(1);
  });

  it("rejects invalid planning inputs", async () => {
    const dataDir = path.join(process.cwd(), "data");
    const bundle = await loadBundleWithOverrides(dataDir);

    const room = new MatchRoom(bundle, 1337, {
      tickMs: 50,
      maxTicks: 3,
      planningMs: 1000,
      combatMs: 1000,
      replayVersion: "1"
    });
    room.addPlayer({ id: "north-player", side: "north" });
    room.startRound(1);

    const result = room.submitPlanningInput("north-player", [
      { unitId: "crawler", side: "north", position: { x: 20, y: 1 }, orientation: 0 }
    ]);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Position out of bounds");
  });

  it("returns a snapshot on reconnect", async () => {
    const dataDir = path.join(process.cwd(), "data");
    const bundle = await loadBundleWithOverrides(dataDir);

    const room = new MatchRoom(bundle, 42, {
      tickMs: 50,
      maxTicks: 1,
      planningMs: 1000,
      combatMs: 1000,
      replayVersion: "1"
    });
    room.addPlayer({ id: "north-player", side: "north" });
    room.startRound(1);

    const snapshot = room.reconnect("north-player");
    expect(snapshot.round).toBe(1);
    expect(snapshot.phase).toBe("planning");
  });
});
