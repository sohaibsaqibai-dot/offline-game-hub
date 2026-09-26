import { GAMES, CATEGORIES, getGame } from "./core/GameRegistry.js";
import { ScoreManager, AchievementsAPI } from "./core/ScoreManager.js";
import { SoundManager } from "./core/SoundManager.js";
import { SettingsManager } from "./core/SettingsManager.js";
import { GameManager } from "./core/GameManager.js";
import { coverFor } from "./core/Art.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

const state = { filter: "All", query: "", sort: "featured", favorites: [], recent: [], best: {}, stats: null, achievements: [] };

// Featured game rotates daily (stable within a day).
const dayIndex = Math.floor(Date.now() / 86400000);
const FEATURED = GAMES[(dayIndex * 7) % GAMES.length];
const FEATURED_ORDER = [...GAMES.filter((g) => g.isNew), ...GAMES.filter((g) => !g.isNew)];

(async function boot() {
  await SettingsManager.applySavedTheme();
  await SoundManager.init();
  syncSoundIcon();
  $("#brand-sub").textContent = `${GAMES.length} mini-games · always offline`;
  await refresh();
  renderTabs();
  renderAll();
  bindUI();
  window.addEventListener("hashchange", route);
  route();
})();

async function refresh() {
  [state.favorites, state.recent, state.best, state.stats, state.achievements] = await Promise.all([
    ScoreManager.getFavorites(), ScoreManager.getRecent(), ScoreManager.getAllBest(), ScoreManager.getStats(), AchievementsAPI.getUnlocked()
  ]);
}

// ---------- routing ----------
function route() {
  const hash = location.hash.replace("#", "");
  if (hash.startsWith("game/")) openGame(hash.split("/")[1]);
  else closeGame();
}

async function openGame(id) {
  const game = getGame(id);
  if (!game) { location.hash = ""; return; }
  $("#view-launcher").classList.add("hidden");
  $("#view-game").classList.remove("hidden");
  $("#game-title").textContent = game.title;
  $("#game-cat").textContent = `${game.category} · ${game.difficulty}`;
  $("#game-thumb").innerHTML = coverFor(game);
  ["#stat-lives", "#stat-timer", "#stat-level"].forEach((s) => ($(s).hidden = true));
  $("#pause-btn").textContent = "⏸";
  window.scrollTo(0, 0);
  await GameManager.load(id, $("#game-root"));
}

async function closeGame() {
  GameManager.unload();
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  $("#view-game").classList.add("hidden");
  $("#view-launcher").classList.remove("hidden");
  await refresh();
  renderAll();
}

// ---------- rendering ----------
function renderAll() {
  renderFeatured();
  renderStats();
  renderContinue();
  renderTabCounts();
  renderGrid();
}

function renderFeatured() {
  const g = FEATURED;
  const fav = state.favorites.includes(g.id);
  $("#featured").innerHTML = `
    <div class="fx-art"><div class="fx-bgart">${coverFor(g)}</div><div class="fx-fg">${coverFor(g).replace("xMidYMid slice", "xMidYMid meet")}</div></div>
    <div class="fx-body">
      <span class="fx-badge">⭐ Featured today</span>
      <h2 class="fx-title">${g.title}</h2>
      <p class="fx-desc">${g.how}</p>
      <div class="fx-meta">
        <button class="primary-btn big" data-play="${g.id}">▶ Play now</button>
        <button class="fav-btn ${fav ? "active" : ""}" data-fav="${g.id}" title="Favorite">${fav ? "♥" : "♡"}</button>
        <span class="chip">${g.category}</span>
        ${state.best[g.id] ? `<span class="chip">🏆 ${state.best[g.id]}</span>` : ""}
      </div>
    </div>`;
}

function renderStats() {
  const s = state.stats || {};
  const topScores = Object.values(state.best).filter((v) => v > 0).length;
  const total = Object.keys(AchievementsAPI.DEFS).length;
  $("#stats-grid").innerHTML = `
    <div class="stat-box"><b>${s.totalPlays || 0}</b><span>Games played</span></div>
    <div class="stat-box"><b>${topScores}/${GAMES.length}</b><span>High scores set</span></div>
    <div class="stat-box"><b>${state.achievements.length}/${total}</b><span>Achievements</span></div>
    <div class="stat-box"><b>${state.favorites.length}</b><span>Favorites</span></div>`;
}

function renderContinue() {
  const items = state.recent.map((r) => ({ g: getGame(r.gameId), ts: r.ts })).filter((x) => x.g).slice(0, 3);
  $("#continue-list").innerHTML = items.length
    ? items.map(({ g, ts }) => `
      <button class="cont-item" data-play="${g.id}">
        <span class="cont-thumb">${coverFor(g)}</span>
        <span><b>${g.title}</b><small>${timeAgo(ts)} · best ${state.best[g.id] || 0}</small></span>
        <span class="go">▶</span>
      </button>`).join("")
    : `<p class="cont-empty">Your recently played games will show up here. Pick anything below to get started!</p>`;
}

function renderTabs() {
  const tabs = ["All", "New", ...CATEGORIES, "Favorites", "Recent"];
  const label = { All: "All games", New: "✨ New", Favorites: "♥ Favorites", Recent: "🕘 Recent" };
  $("#category-tabs").innerHTML = tabs.map((t) => `<button class="tab ${t === state.filter ? "active" : ""}" data-filter="${t}">${label[t] || t}<span class="n" data-count="${t}"></span></button>`).join("");
}

function renderTabCounts() {
  const counts = {
    All: GAMES.length,
    New: GAMES.filter((g) => g.isNew).length,
    Favorites: state.favorites.length,
    Recent: state.recent.filter((r) => getGame(r.gameId)).length
  };
  CATEGORIES.forEach((c) => (counts[c] = GAMES.filter((g) => g.category === c).length));
  $$("[data-count]").forEach((n) => (n.textContent = counts[n.dataset.count] ?? ""));
}

function filtered() {
  let list = GAMES.slice();
  const f = state.filter;
  if (f === "Favorites") list = list.filter((g) => state.favorites.includes(g.id));
  else if (f === "New") list = list.filter((g) => g.isNew);
  else if (f === "Recent") {
    const order = state.recent.map((r) => r.gameId);
    list = list.filter((g) => order.includes(g.id)).sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  } else if (f !== "All") list = list.filter((g) => g.category === f);

  const q = state.query.trim().toLowerCase();
  if (q) list = list.filter((g) => [g.title, g.description, g.category].some((s) => s.toLowerCase().includes(q)));

  if (f !== "Recent") {
    const order = state.recent.map((r) => r.gameId);
    const sorters = {
      featured: (a, b) => FEATURED_ORDER.indexOf(a) - FEATURED_ORDER.indexOf(b),
      az: (a, b) => a.title.localeCompare(b.title),
      score: (a, b) => (state.best[b.id] || 0) - (state.best[a.id] || 0),
      favorites: (a, b) => Number(state.favorites.includes(b.id)) - Number(state.favorites.includes(a.id)),
      recent: (a, b) => {
        const ia = order.indexOf(a.id), ib = order.indexOf(b.id);
        if (ia === -1 && ib === -1) return a.title.localeCompare(b.title);
        if (ia === -1) return 1; if (ib === -1) return -1; return ia - ib;
      }
    };
    list.sort(sorters[state.sort] || sorters.featured);
  }
  return list;
}

function renderGrid() {
  const list = filtered();
  $("#lib-count").textContent = list.length;
  const empty = list.length === 0;
  $("#empty-state").classList.toggle("hidden", !empty);
  if (empty) {
    $("#empty-text").textContent = state.filter === "Favorites" ? "No favorites yet — tap the ♡ on any game to pin it here."
      : state.filter === "Recent" ? "Nothing played yet. Your history will appear here." : "No games match your search.";
  }
  $("#game-grid").innerHTML = list.map((g, i) => {
    const fav = state.favorites.includes(g.id);
    const best = state.best[g.id] || 0;
    const rec = state.recent.find((r) => r.gameId === g.id);
    return `
    <article class="game-card" data-play="${g.id}" tabindex="0" style="animation-delay:${Math.min(i, 16) * 25}ms" aria-label="Play ${g.title}">
      <div class="card-art">
        ${coverFor(g)}
        ${g.isNew ? `<span class="badge-new">NEW</span>` : ""}
        <button class="card-fav ${fav ? "active" : ""}" data-fav="${g.id}" title="${fav ? "Unfavorite" : "Favorite"}" aria-label="Favorite">${fav ? "♥" : "♡"}</button>
        <span class="play-fab" aria-hidden="true">▶</span>
      </div>
      <div class="card-body">
        <h3 class="card-title">${g.title}</h3>
        <p class="card-desc">${g.description}</p>
        ${rec ? `<span class="card-last">Played ${timeAgo(rec.ts)}</span>` : ""}
        <div class="card-foot">
          <span class="chip cat-${g.category.toLowerCase()}">${g.category}</span>
          <span class="diff diff-${g.difficulty.toLowerCase()}" title="Difficulty: ${g.difficulty}"></span>
          <span class="card-best">🏆 <b>${best}</b></span>
        </div>
      </div>
    </article>`;
  }).join("");
}

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ---------- UI bindings ----------
function bindUI() {
  // Keep keyboard focus off buttons during play so Space/Enter go to the game.
  document.addEventListener("click", (e) => { const b = e.target.closest("#view-game button"); if (b) b.blur(); });
  // Delegated clicks for play / favorite anywhere in the launcher.
  $("#view-launcher").addEventListener("click", async (e) => {
    const fav = e.target.closest("[data-fav]");
    if (fav) {
      e.stopPropagation();
      SoundManager.click();
      state.favorites = await ScoreManager.toggleFavorite(fav.dataset.fav);
      renderFeatured(); renderStats(); renderTabCounts(); renderGrid();
      const again = document.querySelector(`.card-fav[data-fav="${fav.dataset.fav}"]`);
      if (again) again.classList.add("pop");
      return;
    }
    const tab = e.target.closest(".tab");
    if (tab) {
      SoundManager.click();
      state.filter = tab.dataset.filter;
      $$(".tab").forEach((t) => t.classList.toggle("active", t === tab));
      renderGrid();
      return;
    }
    const play = e.target.closest("[data-play]");
    if (play) { SoundManager.click(); location.hash = `game/${play.dataset.play}`; }
  });
  $("#game-grid").addEventListener("keydown", (e) => {
    const card = e.target.closest(".game-card");
    if (card && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); location.hash = `game/${card.dataset.play}`; }
  });
  $("#game-grid").addEventListener("mouseover", (e) => {
    const card = e.target.closest(".game-card");
    if (card && card !== bindUI._last) { bindUI._last = card; SoundManager.hover(); }
  });

  $("#search-input").addEventListener("input", (e) => { state.query = e.target.value; renderGrid(); });
  $("#sort-select").addEventListener("change", (e) => { state.sort = e.target.value; renderGrid(); });
  window.addEventListener("keydown", (e) => {
    if (e.key === "/" && !$("#view-launcher").classList.contains("hidden") && document.activeElement !== $("#search-input")) {
      e.preventDefault(); $("#search-input").focus();
    }
  });

  const toggleSound = async () => { const on = await SoundManager.toggle(); syncSoundIcon(); if (on) SoundManager.click(); };
  $("#sound-toggle").addEventListener("click", toggleSound);
  $("#game-sound-btn").addEventListener("click", toggleSound);

  $("#back-btn").addEventListener("click", () => { SoundManager.click(); location.hash = ""; });
  $("#pause-btn").addEventListener("click", () => GameManager.togglePause());
  $("#restart-btn").addEventListener("click", () => { SoundManager.click(); GameManager.restart(); });
  $("#fs-btn").addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else $("#view-game").requestFullscreen?.().catch(() => {});
  });

  let lastScore = null;
  window.addEventListener("ogh:hud", (e) => {
    const { score, best, lives, timer, level } = e.detail;
    if (score !== undefined) {
      $("#score-val").textContent = score;
      if (lastScore !== null && score > lastScore) bump("#score-val");
      lastScore = score;
    }
    if (best !== undefined) $("#best-val").textContent = best;
    const show = (id, val, sel) => {
      if (val === undefined) return;
      $(id).hidden = val === null;
      if (val !== null) $(sel).textContent = val;
    };
    show("#stat-lives", lives, "#lives-val");
    show("#stat-timer", timer, "#timer-val");
    show("#stat-level", level, "#level-val");
  });
  window.addEventListener("ogh:paused", (e) => ($("#pause-btn").textContent = e.detail.paused ? "▶" : "⏸"));
  window.addEventListener("ogh:achievement", (e) => {
    const def = AchievementsAPI.DEFS[e.detail.id];
    if (def) { SoundManager.achievement(); showToast(`${def.icon} Achievement unlocked: ${def.title}`); }
  });

  // Achievements
  $("#trophy-btn").addEventListener("click", openAchievements);
  $("#close-ach").addEventListener("click", () => $("#ach-modal").classList.add("hidden"));
  $("#ach-modal").addEventListener("click", (e) => { if (e.target.id === "ach-modal") $("#ach-modal").classList.add("hidden"); });

  // Settings
  $("#settings-btn").addEventListener("click", openSettings);
  $("#close-settings").addEventListener("click", () => $("#settings-modal").classList.add("hidden"));
  $("#settings-modal").addEventListener("click", (e) => { if (e.target.id === "settings-modal") $("#settings-modal").classList.add("hidden"); });
  $("#theme-control").addEventListener("click", async (e) => { const b = e.target.closest(".seg-btn"); if (!b) return; await SettingsManager.setTheme(b.dataset.val); syncSettingsUI(); });
  $("#animation-control").addEventListener("click", async (e) => { const b = e.target.closest(".seg-btn"); if (!b) return; await SettingsManager.setAnimations(b.dataset.val); syncSettingsUI(); });
  $("#sound-control").addEventListener("click", async (e) => { const b = e.target.closest(".seg-btn"); if (!b) return; await SoundManager.setEnabled(b.dataset.val === "on"); syncSoundIcon(); syncSettingsUI(); });

  const reset = (title, body, fn, msg) => confirmAction(title, body, async () => { await fn(); await refresh(); renderAll(); showToast(msg); });
  $("#reset-scores").addEventListener("click", () => reset("Reset all scores?", "Every best score will be permanently deleted.", () => ScoreManager.resetScores(), "Scores reset."));
  $("#reset-favorites").addEventListener("click", () => reset("Reset favorites?", "Your favorites list will be cleared.", () => ScoreManager.resetFavorites(), "Favorites reset."));
  $("#reset-all").addEventListener("click", () => reset("Reset ALL local data?", "This deletes scores, favorites, history, stats and achievements. This can't be undone.", () => ScoreManager.resetAll(), "All local data reset."));
  window.addEventListener("keydown", (e) => { if (e.key === "Escape") $$(".modal").forEach((m) => m.classList.add("hidden")); });
}

function bump(sel) {
  const pill = $(sel).closest(".hud-pill");
  pill.classList.remove("bump"); void pill.offsetWidth; pill.classList.add("bump");
}

async function openAchievements() {
  state.achievements = await AchievementsAPI.getUnlocked();
  const defs = Object.entries(AchievementsAPI.DEFS);
  $("#ach-count").textContent = `${state.achievements.length}/${defs.length}`;
  $("#ach-list").innerHTML = defs.map(([id, d]) => {
    const got = state.achievements.includes(id);
    return `<div class="ach ${got ? "" : "locked"}"><div class="ach-icon">${d.icon}</div><div><b>${d.title}</b><small>${d.desc}</small></div>${got ? `<span class="tick">✓</span>` : ""}</div>`;
  }).join("");
  $("#ach-modal").classList.remove("hidden");
}

async function openSettings() { await syncSettingsUI(); $("#settings-modal").classList.remove("hidden"); }
async function syncSettingsUI() {
  const s = await SettingsManager.getAll();
  $$("#theme-control .seg-btn").forEach((b) => b.classList.toggle("active", b.dataset.val === s.theme));
  $$("#animation-control .seg-btn").forEach((b) => b.classList.toggle("active", b.dataset.val === s.animations));
  $$("#sound-control .seg-btn").forEach((b) => b.classList.toggle("active", (b.dataset.val === "on") === SoundManager.enabled));
}
function syncSoundIcon() {
  const icon = SoundManager.enabled ? "🔊" : "🔇";
  $("#sound-toggle").textContent = icon;
  $("#game-sound-btn").textContent = icon;
}

let toastTimer = null;
function showToast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  t.style.animation = "none"; void t.offsetWidth; t.style.animation = "";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add("hidden"), 2800);
}

function confirmAction(title, body, onConfirm) {
  $("#confirm-title").textContent = title;
  $("#confirm-body").textContent = body;
  $("#confirm-modal").classList.remove("hidden");
  const ok = $("#confirm-ok"), cancel = $("#confirm-cancel");
  const cleanup = () => { $("#confirm-modal").classList.add("hidden"); ok.removeEventListener("click", onOk); cancel.removeEventListener("click", onCancel); };
  const onOk = () => { cleanup(); onConfirm(); };
  const onCancel = () => cleanup();
  ok.addEventListener("click", onOk);
  cancel.addEventListener("click", onCancel);
}
