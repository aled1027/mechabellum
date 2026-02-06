import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadDataBundle } from "../../src/data/loader.js";

const requiredUnits = [
  "crawler",
  "fang",
  "mustang",
  "arclight",
  "marksman",
  "sledgehammer",
  "steel_ball",
  "stormcaller",
  "hound",
  "scorpion",
  "vulcan",
  "rhino",
  "hacker",
  "tarantula",
  "fortress",
  "melting_point",
  "sandworm",
  "raiden",
  "overlord",
  "war_factory",
  "wasp",
  "phoenix",
  "phantom_ray",
  "wraith",
  "sabertooth",
  "typhoon",
  "fire_badger",
  "farseer",
  "larva"
];

describe("content catalog", () => {
  it("loads the full unit roster", async () => {
    const dataDir = path.join(process.cwd(), "data");
    const bundle = await loadDataBundle(dataDir);
    const unitIds = bundle.units.map((unit) => unit.id);

    for (const id of requiredUnits) {
      expect(unitIds).toContain(id);
    }
    expect(new Set(unitIds).size).toBe(unitIds.length);
  });

  it("contains tech and card catalogs", async () => {
    const dataDir = path.join(process.cwd(), "data");
    const bundle = await loadDataBundle(dataDir);
    expect(bundle.techs.length).toBeGreaterThan(10);
    expect(bundle.cards.length).toBeGreaterThan(5);
    expect(new Set(bundle.techs.map((tech) => tech.id)).size).toBe(bundle.techs.length);
    expect(new Set(bundle.cards.map((card) => card.id)).size).toBe(bundle.cards.length);
  });
});
