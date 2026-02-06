import { describe, expect, it } from "vitest";
import {
  InMemoryReplayStorage,
  parseReplayPayload,
  serializeReplayPayload,
  type ReplayPayload
} from "../../src/sim/replay.js";

const payload: ReplayPayload = {
  version: "1",
  baseSeed: 42,
  rounds: [
    {
      round: 1,
      seed: 100,
      ticks: 120,
      input: {
        round: 1,
        placements: [
          {
            unitId: "crawler",
            side: "north",
            position: { x: 1, y: 1 },
            orientation: 0
          }
        ]
      }
    }
  ]
};

describe("replay format", () => {
  it("serializes and parses replay payloads", () => {
    const serialized = serializeReplayPayload(payload);
    const parsed = parseReplayPayload(serialized);
    expect(parsed).toEqual(payload);
  });

  it("stores and loads replay payloads", async () => {
    const storage = new InMemoryReplayStorage();
    await storage.saveReplay("match-1", payload);

    const loaded = await storage.loadReplay("match-1");
    expect(loaded).toEqual(payload);
  });
});
