import { describe, expect, it } from "vitest";
import {
  buildAccessibilityTheme,
  clampFontScale,
  getColorPalette,
  resolveAccessibilitySettings
} from "../../src/client/accessibility.js";

describe("accessibility", () => {
  it("clamps font scale", () => {
    expect(clampFontScale(0.2)).toBe(0.8);
    expect(clampFontScale(2)).toBe(1.4);
  });

  it("builds a palette for each mode", () => {
    const palette = getColorPalette("protanopia");
    expect(palette.north).toBeTruthy();
    expect(palette.south).toBeTruthy();
  });

  it("builds a theme with resolved settings", () => {
    const settings = resolveAccessibilitySettings({ fontScale: 1.6, reducedVfx: true });
    const theme = buildAccessibilityTheme(settings);
    expect(theme.fontScale).toBe(1.4);
    expect(theme.reducedVfx).toBe(true);
  });
});
