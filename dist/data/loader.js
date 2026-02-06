import { readFile } from "node:fs/promises";
import { watch } from "node:fs";
import path from "node:path";
import { DataBundleSchema } from "./schemas.js";
export const loadDataBundle = async (dataDir) => {
    const filePath = path.join(dataDir, "bundle.json");
    const raw = await readFile(filePath, "utf-8");
    const parsed = JSON.parse(raw);
    return DataBundleSchema.parse(parsed);
};
export class DataStore {
    data;
    listeners = [];
    constructor(initial) {
        this.data = initial;
    }
    getSnapshot() {
        return this.data;
    }
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            const idx = this.listeners.indexOf(listener);
            if (idx >= 0) {
                this.listeners.splice(idx, 1);
            }
        };
    }
    update(data) {
        this.data = data;
        for (const listener of this.listeners) {
            listener(this.data);
        }
    }
}
export const createDataStore = async (options) => {
    const initial = await loadDataBundle(options.dataDir);
    const store = new DataStore(initial);
    if (options.enableHotReload) {
        const bundlePath = path.join(options.dataDir, "bundle.json");
        watch(bundlePath, async () => {
            try {
                const updated = await loadDataBundle(options.dataDir);
                store.update(updated);
            }
            catch (error) {
                console.error("Failed to hot-reload data bundle", error);
            }
        });
    }
    return store;
};
