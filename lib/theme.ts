export const THEME_STORAGE_KEY = "mine-pile-viz-theme";

export const APP_THEMES = ["dark", "light"] as const;

export type AppTheme = (typeof APP_THEMES)[number];

export const DEFAULT_APP_THEME: AppTheme = "dark";

export function isAppTheme(value: unknown): value is AppTheme {
  return typeof value === "string" && APP_THEMES.includes(value as AppTheme);
}

export function resolveStoredTheme(value: unknown): AppTheme {
  return isAppTheme(value) ? value : DEFAULT_APP_THEME;
}

export const THEME_INIT_SCRIPT = `
(() => {
  const storageKey = ${JSON.stringify(THEME_STORAGE_KEY)};
  const defaultTheme = ${JSON.stringify(DEFAULT_APP_THEME)};
  const root = document.documentElement;

  try {
    const storedTheme = window.localStorage.getItem(storageKey);
    const theme = storedTheme === "light" || storedTheme === "dark"
      ? storedTheme
      : defaultTheme;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  } catch {
    root.dataset.theme = defaultTheme;
    root.style.colorScheme = defaultTheme;
  }
})();
`.trim();

export function getThemeCanvasPalette(theme: AppTheme) {
  if (theme === "light") {
    return {
      sceneBackground: "#edf4fa",
      sceneGround: "#d9e6f1",
      sceneGridMajor: "#95b2cd",
      sceneGridMinor: "#b6c9dc",
      diagramGrid: "rgba(43, 114, 196, 0.09)",
      diagramMinimapBackground: "rgba(255, 255, 255, 0.95)",
      diagramMinimapBorder: "rgba(92, 122, 153, 0.22)",
      diagramStageMinimap: "rgba(188, 213, 235, 0.88)",
      diagramNodeMinimap: "rgba(63, 131, 212, 0.78)",
      edgeActive: "rgba(17, 128, 184, 0.84)",
      edgeMuted: "rgba(122, 146, 171, 0.32)",
      edgeLabelActive: "#102033",
      edgeLabelMuted: "#72859a",
      stageBaseIdle: "#dfeaf4",
      stageBaseActive: "#bfd7ea",
      stageTopIdle: "#f2f7fb",
      stageTopActive: "#d5e7f4",
    };
  }

  return {
    sceneBackground: "#08101a",
    sceneGround: "#102033",
    sceneGridMajor: "#1f3c5a",
    sceneGridMinor: "#153149",
    diagramGrid: "rgba(91, 140, 255, 0.12)",
    diagramMinimapBackground: "rgba(8, 18, 31, 0.92)",
    diagramMinimapBorder: "rgba(124, 164, 201, 0.14)",
    diagramStageMinimap: "rgba(23, 59, 91, 0.36)",
    diagramNodeMinimap: "rgba(91, 140, 255, 0.56)",
    edgeActive: "rgba(89, 221, 255, 0.84)",
    edgeMuted: "rgba(124, 164, 201, 0.22)",
    edgeLabelActive: "#edf4ff",
    edgeLabelMuted: "#6f849f",
    stageBaseIdle: "#0d2237",
    stageBaseActive: "#173b5b",
    stageTopIdle: "#163149",
    stageTopActive: "#255d8a",
  };
}
