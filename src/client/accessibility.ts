export type ColorblindMode = "normal" | "protanopia" | "deuteranopia" | "tritanopia";

export interface AccessibilitySettings {
  colorblindMode: ColorblindMode;
  fontScale: number;
  reducedVfx: boolean;
  highContrast: boolean;
}

export interface ColorPalette {
  north: string;
  south: string;
  neutral: string;
  highlight: string;
  warning: string;
  success: string;
}

export const defaultAccessibilitySettings: AccessibilitySettings = {
  colorblindMode: "normal",
  fontScale: 1,
  reducedVfx: false,
  highContrast: false
};

const paletteByMode: Record<ColorblindMode, ColorPalette> = {
  normal: {
    north: "#3f7bff",
    south: "#ff5b5b",
    neutral: "#8c8c8c",
    highlight: "#ffc857",
    warning: "#ffb347",
    success: "#5bd17a"
  },
  protanopia: {
    north: "#2f75b5",
    south: "#d17b58",
    neutral: "#7c7c7c",
    highlight: "#e6b955",
    warning: "#e6a957",
    success: "#4fbf9a"
  },
  deuteranopia: {
    north: "#3366cc",
    south: "#cc6f4c",
    neutral: "#808080",
    highlight: "#e6b955",
    warning: "#e6a957",
    success: "#4fa6bf"
  },
  tritanopia: {
    north: "#3b7bdc",
    south: "#d35b73",
    neutral: "#7f7f7f",
    highlight: "#e6b955",
    warning: "#e6a957",
    success: "#4fbd7e"
  }
};

export const clampFontScale = (scale: number, min: number = 0.8, max: number = 1.4): number => {
  if (Number.isNaN(scale)) {
    return 1;
  }
  return Math.min(max, Math.max(min, scale));
};

export const resolveAccessibilitySettings = (
  partial: Partial<AccessibilitySettings> = {}
): AccessibilitySettings => ({
  ...defaultAccessibilitySettings,
  ...partial,
  fontScale: clampFontScale(partial.fontScale ?? defaultAccessibilitySettings.fontScale)
});

export const getColorPalette = (mode: ColorblindMode): ColorPalette => paletteByMode[mode];

export interface AccessibilityTheme {
  palette: ColorPalette;
  fontScale: number;
  reducedVfx: boolean;
  highContrast: boolean;
}

export const buildAccessibilityTheme = (
  settings: AccessibilitySettings = defaultAccessibilitySettings
): AccessibilityTheme => ({
  palette: getColorPalette(settings.colorblindMode),
  fontScale: clampFontScale(settings.fontScale),
  reducedVfx: settings.reducedVfx,
  highContrast: settings.highContrast
});
