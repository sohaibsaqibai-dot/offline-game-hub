// Service worker for the web version: caches every game file so the hub
// keeps working offline after the first visit (just like the extension).
const CACHE = "ogh-play-1651b586-v2";
const FILES = ['games/blockdrop/game.js', 'games/brickbreaker/game.js', 'games/bubblepop/game.js', 'games/cloudjumper/game.js', 'games/coincollector/game.js', 'games/colormatch/game.js', 'games/connectfour/game.js', 'games/dodgerunner/game.js', 'games/dotsandboxes/game.js', 'games/fruitcatch/game.js', 'games/jewelswap/game.js', 'games/memorymatch/game.js', 'games/merge2048/game.js', 'games/minesweeper/game.js', 'games/minigolf/game.js', 'games/molebash/game.js', 'games/neonpong/game.js', 'games/patternmemory/game.js', 'games/quickmath/game.js', 'games/reactiontest/game.js', 'games/reversi/game.js', 'games/skyhopper/game.js', 'games/slidingpuzzle/game.js', 'games/snake/game.js', 'games/spaceshooter/game.js', 'games/stacktower/game.js', 'games/sudoku/game.js', 'games/targettap/game.js', 'games/tictactoe/game.js', 'games/typingrush/game.js', 'games/wordscramble/game.js', 'hub/css/style.css', 'hub/index.html', 'hub/js/app.js', 'hub/js/core/Art.js', 'hub/js/core/Engine.js', 'hub/js/core/GameManager.js', 'hub/js/core/GameRegistry.js', 'hub/js/core/ScoreManager.js', 'hub/js/core/SettingsManager.js', 'hub/js/core/SoundManager.js', 'hub/js/core/StorageManager.js', 'icons/icon128.png', 'icons/icon16.png', 'icons/icon32.png', 'icons/icon48.png', 'icons/icon_promo.png'];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => "./" + f))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith("ogh-play-") && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
