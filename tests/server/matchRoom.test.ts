import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadBundleWithOverrides } from "../../src/data/index.js";
import { MatchRoom } from "../../src/server/matchRoom.js";
import { InMemoryReplayStorage } from "../../src/sim/replay.js";

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
    expect(snapshot.combat?.checksum).toBeDefined();
    expect(snapshot.replay?.rounds).toHaveLength(1);
    expect(snapshot.replay?.rounds[0]?.input.placements[0]?.side).toBe("north");
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

  it("captures combat snapshots for resync", async () => {
    const dataDir = path.join(process.cwd(), "data");
    const bundle = await loadBundleWithOverrides(dataDir);

    const room = new MatchRoom(bundle, 1337, {
      tickMs: 50,
      maxTicks: 4,
      planningMs: 1000,
      combatMs: 1000,
      replayVersion: "1",
      snapshotInterval: 2,
      snapshotLimit: 2
    });
    room.addPlayer({ id: "north-player", side: "north" });
    room.addPlayer({ id: "south-player", side: "south" });
    room.startRound(1);

    room.submitPlanningInput("north-player", [placements[0]]);
    room.submitPlanningInput("south-player", [placements[1]]);

    const snapshot = room.getSnapshot();
    expect(snapshot.combat?.snapshots.length).toBeGreaterThan(0);
    expect(snapshot.combat?.snapshots.length).toBeLessThanOrEqual(2);
  });

  it("orders placements deterministically", async () => {
    const dataDir = path.join(process.cwd(), "data");
    const bundle = await loadBundleWithOverrides(dataDir);

    const room = new MatchRoom(bundle, 1337, {
      tickMs: 50,
      maxTicks: 1,
      planningMs: 1000,
      combatMs: 1000,
      replayVersion: "1"
    });
    room.addPlayer({ id: "north-player", side: "north" });
    room.addPlayer({ id: "south-player", side: "south" });
    room.startRound(1);

    room.submitPlanningInput("north-player", [
      { unitId: "mustang", side: "north", position: { x: 5, y: 1 }, orientation: 0 },
      { unitId: "crawler", side: "north", position: { x: 1, y: 1 }, orientation: 0 }
    ]);
    room.submitPlanningInput("south-player", [
      { unitId: "crawler", side: "south", position: { x: 6, y: 6 }, orientation: 180 }
    ]);

    const snapshot = room.getSnapshot();
    const placements = snapshot.replay?.rounds[0]?.input.placements ?? [];
    expect(placements[0]?.unitId).toBe("crawler");
    expect(placements[1]?.unitId).toBe("mustang");
    expect(placements[2]?.side).toBe("south");
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
    expect(snapshot.revision).toBe(1);
  });

  it("persists replay payloads when storage is configured", async () => {
    const dataDir = path.join(process.cwd(), "data");
    const bundle = await loadBundleWithOverrides(dataDir);
    const storage = new InMemoryReplayStorage();

    const room = new MatchRoom(bundle, 1337, {
      tickMs: 50,
      maxTicks: 3,
      planningMs: 1000,
      combatMs: 1000,
      replayVersion: "1",
      replayId: "match-1",
      replayStorage: storage
    });
    room.addPlayer({ id: "north-player", side: "north" });
    room.addPlayer({ id: "south-player", side: "south" });
    room.startRound(1);

    room.submitPlanningInput("north-player", [placements[0]]);
    room.submitPlanningInput("south-player", [placements[1]]);

    const stored = await storage.loadReplay("match-1");
    expect(stored?.rounds).toHaveLength(1);
  });

  it("provides resync snapshots with reason", async () => {
    const dataDir = path.join(process.cwd(), "data");
    const bundle = await loadBundleWithOverrides(dataDir);

    const room = new MatchRoom(bundle, 99, {
      tickMs: 50,
      maxTicks: 1,
      planningMs: 1000,
      combatMs: 1000,
      replayVersion: "1"
    });
    room.addPlayer({ id: "north-player", side: "north" });
    room.startRound(1);

    const resync = room.resync("north-player", "desync");
    expect(resync.reason).toBe("desync");
    expect(resync.snapshot.round).toBe(1);
  });
});
