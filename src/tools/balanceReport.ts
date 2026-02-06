import { writeFile } from "node:fs/promises";
import path from "node:path";
import { loadBundleWithOverrides } from "../data/index.js";

const run = async (): Promise<void> => {
  const dataDir = path.join(process.cwd(), "data");
  const bundle = await loadBundleWithOverrides(dataDir);

  const report = {
    generatedAt: new Date().toISOString(),
    units: bundle.units.map((unit) => ({
      id: unit.id,
      name: unit.name,
      tier: unit.tier,
      role: unit.role,
      class: unit.class,
      cost: unit.cost,
      stats: unit.stats
    })),
    techs: bundle.techs.map((tech) => ({
      id: tech.id,
      name: tech.name,
      branch: tech.branch,
      cost: tech.cost,
      modifiers: tech.modifiers
    })),
    cards: bundle.cards.map((card) => ({
      id: card.id,
      name: card.name,
      rarity: card.rarity,
      type: card.type,
      cost: card.cost
    }))
  };

  const outputDir = path.join(dataDir, "balance");
  await writeFile(path.join(outputDir, "tuning.json"), JSON.stringify(report, null, 2));
  console.log(`Balance tuning sheet written to ${path.join(outputDir, "tuning.json")}`);
};

run().catch((error) => {
  console.error("Failed to generate balance report", error);
  process.exit(1);
});
