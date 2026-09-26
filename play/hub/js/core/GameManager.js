import { getGame } from "./GameRegistry.js";
import { ScoreManager } from "./ScoreManager.js";
import { SoundManager } from "./SoundManager.js";
import { coverFor } from "./Art.js";

// Game module interface (games/<id>/game.js):
//   export default { init(stage, api), destroy?(), pause?(), resume?() }
// The manager owns the lifecycle: listeners, loops and timers registered through
// `api` are cleaned up automatically on restart / exit, and freeze while paused.
//
// api:
//   api.stage, api.sound, api.meta
//   api.hud({ score, lives, timer, level })  (+ setScore / setLives / setTimer)
//   api.best()                 -> stored best score
//   api.loop(fn(dt, t))        -> per-frame callback (paused-aware)
//   api.on(target, type, fn, opts)  -> auto-removed listener (ignored while paused unless opts.always)
//   api.after(ms, fn) / api.every(ms, fn)  -> paused-aware timers
//   api.gameOver({ score, win, title, message })
//   api.saveProgress(score)    -> save a best mid-game (endless games)
//   api.isPaused(), api.alive()

const $ = (s) => document.querySelector(s);

class GameManagerClass {
  constructor() {
    this.current = null;
    this.paused = false;
    this.over = false;
    this.session = 0;
    this._raf = null;
  }

  async load(gameId, rootEl) {
    this.unload();
    const meta = getGame(gameId);
    if (!meta) return;
    this.root = rootEl;
    this.meta = meta;
    rootEl.innerHTML = "";

    const stage = document.createElement("div");
    stage.className = "game-stage";
    rootEl.appendChild(stage);
    this.stage = stage;

    this.best = await ScoreManager.getBest(gameId);
    this._hud({ score: 0, best: this.best, lives: null, timer: null, level: null });

    try {
      const url = new URL(`../../../games/${gameId}/game.js`, import.meta.url).href;
      const mod = await import(url);
      this.current = { id: gameId, mod: mod.default };
    } catch (e) {
      console.error(e);
      stage.innerHTML = `<div class="game-load-error">Couldn't load this game.</div>`;
      return;
    }

    this._onVis = () => { if (document.hidden) this.pause(); };
    document.addEventListener("visibilitychange", this._onVis);
    this._onKey = (e) => {
      if (!this.current) return;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key) && !/INPUT|TEXTAREA/.test(document.activeElement?.tagName || "")) e.preventDefault();
      if ((e.key === "Escape" || ((e.key === "p" || e.key === "P") && !this.meta.typing)) && this.started && !this.over) { e.preventDefault(); this.togglePause(); }
      if ((e.key === "Enter" || e.key === " ") && this.overlay && !e.repeat) { e.preventDefault(); this.overlay.querySelector(".ov-primary")?.click(); }
    };
    window.addEventListener("keydown", this._onKey);

    this.started = false;
    this._showStart();
  }

  // ---------- lifecycle ----------
  _begin() {
    this._closeOverlay();
    this.session++;
    const sid = this.session;
    this.stage.innerHTML = "";
    this.stage.className = "game-stage";
    this.paused = false;
    this.over = false;
    this.started = true;
    this.loops = [];
    this.timers = [];
    this.listeners = [];
    this._hud({ score: 0, best: this.best, lives: null, timer: null, level: null });
    window.dispatchEvent(new CustomEvent("ogh:paused", { detail: { paused: false } }));
    ScoreManager.recordPlay(this.current.id);
    SoundManager.start();
    const api = this._makeApi(sid);
    this.api = api;
    this._startRaf();
    try {
      this.current.mod.init(this.stage, api);
    } catch (e) {
      console.error(e);
    }
  }

  _teardown() {
    if (this.current && this.started) {
      try { this.current.mod.destroy && this.current.mod.destroy(); } catch (e) { console.error(e); }
    }
    (this.listeners || []).forEach(([t, ty, f, o]) => t.removeEventListener(ty, f, o));
    this.listeners = []; this.loops = []; this.timers = [];
    this.session++;
    cancelAnimationFrame(this._raf); this._raf = null;
  }

  _startRaf() {
    cancelAnimationFrame(this._raf);
    let last = 0;
    const frame = (t) => {
      const dt = last ? Math.min((t - last) / 1000, 1 / 20) : 0;
      last = t;
      if (!this.paused) {
        const ms = dt * 1000;
        for (const tm of this.timers.slice()) {
          if (tm.dead) continue;
          tm.left -= ms;
          if (tm.left <= 0) {
            try { tm.fn(); } catch (e) { console.error(e); }
            if (tm.every) tm.left += tm.every; else tm.dead = true;
          }
        }
        this.timers = this.timers.filter((x) => !x.dead);
        for (const fn of this.loops.slice()) {
          try { fn(dt, t); } catch (e) { console.error(e); }
        }
      }
      this._raf = requestAnimationFrame(frame);
    };
    this._raf = requestAnimationFrame(frame);
  }

  _makeApi(sid) {
    const self = this;
    const alive = () => self.session === sid;
    const api = {
      stage: self.stage,
      sound: SoundManager,
      meta: self.meta,
      difficulty: self.meta.difficulty,
      alive,
      isPaused: () => self.paused,
      best: () => self.best,
      getBest: () => self.best,
      hud(patch) { if (alive()) self._hud(patch); },
      setScore(n) { api.hud({ score: n }); },
      setLives(n) { api.hud({ lives: n }); },
      setTimer(s) { api.hud({ timer: s }); },
      setLevel(n) { api.hud({ level: n }); },
      loop(fn) { if (alive()) self.loops.push(fn); return () => { self.loops = self.loops.filter((f) => f !== fn); }; },
      on(target, type, fn, opts = {}) {
        if (!alive()) return;
        const wrapped = (e) => { if (!alive()) return; if (!opts.always && (self.paused || self.over)) return; fn(e); };
        const o = { passive: opts.passive ?? false };
        target.addEventListener(type, wrapped, o);
        self.listeners.push([target, type, wrapped, o]);
      },
      after(ms, fn) { if (!alive()) return {}; const t = { left: ms, fn }; self.timers.push(t); return t; },
      every(ms, fn) { if (!alive()) return {}; const t = { left: ms, fn, every: ms }; self.timers.push(t); return t; },
      cancel(t) { if (t) t.dead = true; },
      restart() { if (alive()) setTimeout(() => self.restart(), 0); },
      async saveProgress(score) {
        if (!alive()) return;
        const r = await ScoreManager.submitScore(self.current.id, score);
        if (r.isNewBest) { self.best = r.best; self._hud({ best: r.best }); }
      },
      async gameOver({ score = 0, win = false, title, message } = {}) {
        if (!alive() || self.over) return;
        self.over = true;
        const r = await ScoreManager.submitScore(self.current.id, score);
        if (win) await ScoreManager.recordWin();
        const wasBest = self.best;
        self.best = r.best;
        self._hud({ score, best: r.best });
        if (win) SoundManager.win(); else SoundManager.gameOver();
        setTimeout(() => {
          if (!alive()) return;
          self._showOver({ score, win, title, message, isNewBest: r.isNewBest && score > 0, prev: wasBest });
        }, 700);
      }
    };
    return api;
  }

  // ---------- overlays ----------
  _overlay(html, cls = "") {
    this._closeOverlay();
    const ov = document.createElement("div");
    ov.className = "game-overlay " + cls;
    ov.innerHTML = `<div class="ov-card">${html}</div>`;
    this.root.appendChild(ov);
    this.overlay = ov;
    requestAnimationFrame(() => ov.classList.add("show"));
    return ov;
  }
  _closeOverlay() { if (this.overlay) { this.overlay.remove(); this.overlay = null; } }

  _showStart() {
    const m = this.meta;
    const controls = (m.controls || []).map((c) => `<span class="kbd">${c}</span>`).join("");
    const ov = this._overlay(`
      <div class="ov-cover">${coverFor(m)}</div>
      <div class="ov-kicker"><span class="chip cat-${m.category.toLowerCase()}">${m.category}</span><span class="diff diff-${m.difficulty.toLowerCase()}">${m.difficulty}</span></div>
      <h2 class="ov-title">${m.title}</h2>
      <p class="ov-text">${m.how || m.description}</p>
      <div class="ov-controls">${controls}</div>
      ${this.best ? `<div class="ov-best">🏆 Your best: <b>${this.best}</b></div>` : ""}
      <button class="primary-btn big ov-primary">▶ Play</button>
      <div class="ov-hint">Press <span class="kbd sm">Enter</span> to start · <span class="kbd sm">Esc</span> to pause</div>
    `, "ov-start");
    ov.querySelector(".ov-primary").addEventListener("click", () => this._begin());
  }

  _showOver({ score, win, title, message, isNewBest, prev }) {
    const heading = title || (win ? "You win!" : "Game over");
    const ov = this._overlay(`
      <div class="ov-emoji">${isNewBest ? "🏆" : win ? "🎉" : "💫"}</div>
      <h2 class="ov-title">${heading}</h2>
      ${message ? `<p class="ov-text">${message}</p>` : ""}
      <div class="ov-scores">
        <div class="ov-score"><span>Score</span><b class="count-up" data-to="${score}">0</b></div>
        <div class="ov-score best"><span>Best</span><b>${Math.max(score, prev)}</b></div>
      </div>
      ${isNewBest ? `<div class="new-best">New personal best!</div>` : ""}
      <div class="ov-actions">
        <button class="ghost-btn ov-exit">⌂ Hub</button>
        <button class="primary-btn big ov-primary">↻ Play again</button>
      </div>
    `, "ov-over" + (isNewBest || win ? " celebrate" : ""));
    ov.querySelector(".ov-primary").addEventListener("click", () => { SoundManager.click(); this.restart(); });
    ov.querySelector(".ov-exit").addEventListener("click", () => { location.hash = ""; });
    const b = ov.querySelector(".count-up");
    const to = Number(b.dataset.to) || 0;
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 700);
      b.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1 && ov.isConnected) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    if (isNewBest || win) this._confetti(ov);
  }

  _confetti(ov) {
    const colors = ["#ff4fa3", "#ffc53d", "#7ee04a", "#19d3c5", "#3fa9ff", "#8b5cf6"];
    const box = document.createElement("div");
    box.className = "confetti";
    for (let i = 0; i < 70; i++) {
      const p = document.createElement("i");
      p.style.left = Math.random() * 100 + "%";
      p.style.background = colors[i % colors.length];
      p.style.animationDelay = Math.random() * 0.6 + "s";
      p.style.animationDuration = 1.8 + Math.random() * 1.6 + "s";
      p.style.setProperty("--rx", (Math.random() * 2 - 1).toFixed(2));
      box.appendChild(p);
    }
    ov.appendChild(box);
  }

  _showPause() {
    const ov = this._overlay(`
      <div class="ov-emoji">⏸</div>
      <h2 class="ov-title">Paused</h2>
      <p class="ov-text">Take a breather. Your game is waiting.</p>
      <div class="ov-actions">
        <button class="ghost-btn ov-restart">↻ Restart</button>
        <button class="primary-btn big ov-primary">▶ Resume</button>
      </div>
    `, "ov-pause");
    ov.querySelector(".ov-primary").addEventListener("click", () => this.resume());
    ov.querySelector(".ov-restart").addEventListener("click", () => this.restart());
  }

  _hud(patch) { window.dispatchEvent(new CustomEvent("ogh:hud", { detail: patch })); }

  // ---------- public controls ----------
  pause() {
    if (!this.current || !this.started || this.paused || this.over) return;
    this.paused = true;
    try { this.current.mod.pause && this.current.mod.pause(); } catch (e) { console.error(e); }
    this._showPause();
    window.dispatchEvent(new CustomEvent("ogh:paused", { detail: { paused: true } }));
  }
  resume() {
    if (!this.current || !this.paused) return;
    this.paused = false;
    this._closeOverlay();
    try { this.current.mod.resume && this.current.mod.resume(); } catch (e) { console.error(e); }
    window.dispatchEvent(new CustomEvent("ogh:paused", { detail: { paused: false } }));
  }
  togglePause() { this.paused ? this.resume() : this.pause(); }

  restart() {
    if (!this.current) return;
    this._teardown();
    this._begin();
  }

  unload() {
    if (this._onVis) document.removeEventListener("visibilitychange", this._onVis);
    if (this._onKey) window.removeEventListener("keydown", this._onKey);
    this._onVis = this._onKey = null;
    this._teardown();
    this._closeOverlay();
    this.current = null;
    this.started = false;
    this.paused = false;
    if (this.root) this.root.innerHTML = "";
  }
}

export const GameManager = new GameManagerClass();
