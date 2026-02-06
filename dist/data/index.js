import { readFile } from "node:fs/promises";
import path from "node:path";
import { createDataStore, loadDataBundle } from "./loader.js";
import { applyBalanceOverrides } from "./overrides.js";
export const loadBundleWithOverrides = async (dataDir, overridesPath = "overrides.json") => {
    const bundle = await loadDataBundle(dataDir);
    const raw = await readFile(path.join(dataDir, overridesPath), "utf-8");
    const overrides = JSON.parse(raw);
    return applyBalanceOverrides(bundle, overrides);
};
export { createDataStore };
