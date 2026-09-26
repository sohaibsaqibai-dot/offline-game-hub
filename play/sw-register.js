// Registers the offline cache for the web version (not used inside the extension).
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("../sw.js", { scope: "../" }).catch(() => {}));
}
