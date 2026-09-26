import { StorageManager } from "./StorageManager.js";

const DEFAULTS = { theme: "dark", animations: "full", soundOn: true };

export const SettingsManager = {
  async getAll() {
    return {
      theme: await StorageManager.get("ogh_theme", DEFAULTS.theme),
      animations: await StorageManager.get("ogh_animations", DEFAULTS.animations),
      soundOn: await StorageManager.get("ogh_sound_on", DEFAULTS.soundOn)
    };
  },
  async setTheme(theme) { await StorageManager.set("ogh_theme", theme); applyTheme(theme); },
  async setAnimations(mode) { await StorageManager.set("ogh_animations", mode); document.documentElement.dataset.animations = mode; },
  async applySavedTheme() {
    applyTheme(await StorageManager.get("ogh_theme", DEFAULTS.theme));
    document.documentElement.dataset.animations = await StorageManager.get("ogh_animations", DEFAULTS.animations);
  }
};

function applyTheme(theme) {
  let resolved = theme;
  if (theme === "system") resolved = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  document.documentElement.dataset.theme = resolved;
}
