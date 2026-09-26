// StorageManager — local only. Uses chrome.storage.local inside the extension,
// and falls back to localStorage when the hub is opened as a plain web page.
const hasChrome = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;

const LS = {
  get(key) { try { const v = localStorage.getItem("ogh:" + key); return v === null ? undefined : JSON.parse(v); } catch { return undefined; } },
  set(key, val) { try { localStorage.setItem("ogh:" + key, JSON.stringify(val)); } catch { /* ignore */ } },
  remove(key) { try { localStorage.removeItem("ogh:" + key); } catch { /* ignore */ } }
};

export const StorageManager = {
  async get(key, fallback = null) {
    if (!hasChrome) { const v = LS.get(key); return v === undefined ? fallback : v; }
    return new Promise((resolve) => chrome.storage.local.get([key], (res) => resolve(key in res ? res[key] : fallback)));
  },
  async set(key, value) {
    if (!hasChrome) { LS.set(key, value); return true; }
    return new Promise((resolve) => chrome.storage.local.set({ [key]: value }, () => resolve(true)));
  },
  async remove(key) {
    if (!hasChrome) { LS.remove(key); return true; }
    return new Promise((resolve) => chrome.storage.local.remove([key], () => resolve(true)));
  }
};
