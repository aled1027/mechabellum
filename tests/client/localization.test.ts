import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadBundleWithOverrides } from "../../src/data/index.js";
import {
  LocalizationManager,
  createDefaultLocalizationBundle
} from "../../src/client/localization.js";

describe("localization", () => {
  it("resolves keys from the data bundle", async () => {
    const bundle = await loadBundleWithOverrides(path.join(process.cwd(), "data"));
    const localization = new LocalizationManager({ defaultLocale: "en-US" });
    localization.registerBundle(createDefaultLocalizationBundle(bundle));

    const unitName = localization.t("unit.crawler.name");
    expect(unitName).toBe("Crawler");
    expect(localization.t("ui.shop.title")).toBe("Shop");
  });

  it("falls back to the key when missing", () => {
    const localization = new LocalizationManager({ defaultLocale: "en-US" });
    localization.registerBundle({ locale: "en-US", entries: {} });
    expect(localization.t("ui.unknown")).toBe("ui.unknown");
  });
});
