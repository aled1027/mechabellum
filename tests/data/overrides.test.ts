import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadDataBundle } from "../../src/data/loader.js";
import { applyBalanceOverrides } from "../../src/data/overrides.js";

describe("balance overrides", () => {
  it("applies unit overrides by id", async () => {
    const dataDir = path.join(process.cwd(), "data");
    const bundle = await loadDataBundle(dataDir);
    const updated = applyBalanceOverrides(bundle, {
      units: [{ id: "crawler", cost: 999 }]
    });

    const crawler = updated.units.find((unit) => unit.id === "crawler");
    const mustang = updated.units.find((unit) => unit.id === "mustang");

    expect(crawler?.cost).toBe(999);
    expect(mustang?.cost).toBe(80);
    expect(updated.units).toHaveLength(bundle.units.length);
  });
});
