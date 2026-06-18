// Theme menu metadata. The actual colour values live as CSS custom-property
// blocks in index.css (html[data-theme="<id>"]), so switching is just setting
// document.documentElement.dataset.theme. Borrowed from the curator-board
// project, with "world-time" added as the default (the app's original look).
export const DEFAULT_THEME_ID = "world-time";
export const THEME_STORAGE_KEY = "world-time:theme";

export type Theme = { id: string; group: "dark" | "light"; label: string };

export const THEMES: Theme[] = [
  { id: "world-time", group: "dark", label: "world time" },
  { id: "mobayilo", group: "dark", label: "mobayilo" },
  { id: "vesper", group: "dark", label: "vesper" },
  { id: "catppuccin", group: "dark", label: "catppuccin" },
  { id: "tokyo-night", group: "dark", label: "tokyo night" },
  { id: "gruvbox", group: "dark", label: "gruvbox" },
  { id: "nord", group: "dark", label: "nord" },
  { id: "osaka-jade", group: "dark", label: "osaka jade" },
  { id: "catppuccin-latte", group: "light", label: "catppuccin latte" },
  { id: "solarized-light", group: "light", label: "solarized light" },
  { id: "rose-pine-dawn", group: "light", label: "rose pine dawn" },
];

export function getThemeById(id: string | undefined | null): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
