import type { DataBundle } from "../data/schemas.js";

export type LocaleCode = string;

export interface LocalizationBundle {
  locale: LocaleCode;
  entries: Record<string, string>;
}

export interface LocalizationOptions {
  defaultLocale?: LocaleCode;
  fallbackLocale?: LocaleCode;
}

const defaultUiEntries: Record<string, string> = {
  "ui.shop.title": "Shop",
  "ui.shop.reroll": "Reroll",
  "ui.shop.lock": "Lock",
  "ui.shop.buy": "Buy",
  "ui.round": "Round {round}",
  "ui.phase.planning": "Planning",
  "ui.phase.combat": "Combat",
  "ui.phase.resolution": "Resolution",
  "ui.timer": "{seconds}s",
  "ui.specialists": "Specialists",
  "ui.cards": "Reinforcements",
  "ui.credits": "Credits",
  "ui.supply": "Supply",
  "ui.replay.title": "Replay",
  "ui.replay.speed": "Speed"
};

export class LocalizationManager {
  private readonly bundles = new Map<LocaleCode, LocalizationBundle>();
  private locale: LocaleCode;
  private fallbackLocale: LocaleCode;

  constructor(options: LocalizationOptions = {}) {
    this.locale = options.defaultLocale ?? "en-US";
    this.fallbackLocale = options.fallbackLocale ?? "en-US";
  }

  registerBundle(bundle: LocalizationBundle): void {
    this.bundles.set(bundle.locale, bundle);
  }

  setLocale(locale: LocaleCode): void {
    if (!this.bundles.has(locale)) {
      throw new Error(`Locale not registered: ${locale}`);
    }
    this.locale = locale;
  }

  getLocale(): LocaleCode {
    return this.locale;
  }

  t(key: string, params?: Record<string, string | number>): string {
    const entry =
      this.bundles.get(this.locale)?.entries[key] ??
      this.bundles.get(this.fallbackLocale)?.entries[key];
    if (!entry) {
      return key;
    }
    return formatEntry(entry, params);
  }
}

export const formatEntry = (
  value: string,
  params: Record<string, string | number> = {}
): string => {
  return value.replace(/\{(\w+)\}/g, (match, key) => {
    const replacement = params[key];
    if (replacement === undefined) {
      return match;
    }
    return String(replacement);
  });
};

export const buildDataLocalizationEntries = (bundle: DataBundle): Record<string, string> => {
  const entries: Record<string, string> = { ...defaultUiEntries };

  for (const unit of bundle.units) {
    entries[`unit.${unit.id}.name`] = unit.name;
    entries[`unit.${unit.id}.role`] = unit.role;
  }

  for (const tech of bundle.techs) {
    entries[`tech.${tech.id}.name`] = tech.name;
    entries[`tech.${tech.id}.description`] = tech.description;
  }

  for (const card of bundle.cards) {
    entries[`card.${card.id}.name`] = card.name;
    entries[`card.${card.id}.description`] = card.description;
  }

  for (const specialist of bundle.specialists) {
    entries[`specialist.${specialist.id}.name`] = specialist.name;
    entries[`specialist.${specialist.id}.description`] = specialist.description;
  }

  return entries;
};

export const createDefaultLocalizationBundle = (
  bundle: DataBundle,
  locale: LocaleCode = "en-US"
): LocalizationBundle => ({
  locale,
  entries: buildDataLocalizationEntries(bundle)
});
