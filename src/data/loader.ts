import { readFile } from "node:fs/promises";
import { watch } from "node:fs";
import path from "node:path";
import { DataBundleSchema, type DataBundle } from "./schemas.js";

export interface DataLoaderOptions {
  dataDir: string;
  enableHotReload?: boolean;
}

export const loadDataBundle = async (dataDir: string): Promise<DataBundle> => {
  const filePath = path.join(dataDir, "bundle.json");
  const raw = await readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw);
  return DataBundleSchema.parse(parsed);
};

export class DataStore {
  private data: DataBundle;
  private readonly listeners: Array<(data: DataBundle) => void> = [];

  constructor(initial: DataBundle) {
    this.data = initial;
  }

  getSnapshot(): DataBundle {
    return this.data;
  }

  subscribe(listener: (data: DataBundle) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx >= 0) {
        this.listeners.splice(idx, 1);
      }
    };
  }

  update(data: DataBundle): void {
    this.data = data;
    for (const listener of this.listeners) {
      listener(this.data);
    }
  }
}

export const createDataStore = async (options: DataLoaderOptions): Promise<DataStore> => {
  const initial = await loadDataBundle(options.dataDir);
  const store = new DataStore(initial);

  if (options.enableHotReload) {
    const bundlePath = path.join(options.dataDir, "bundle.json");
    watch(bundlePath, async () => {
      try {
        const updated = await loadDataBundle(options.dataDir);
        store.update(updated);
      } catch (error) {
        console.error("Failed to hot-reload data bundle", error);
      }
    });
  }

  return store;
};
