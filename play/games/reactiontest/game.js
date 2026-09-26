import { el, rand } from "../../hub/js/core/Engine.js";

const ROUNDS = 5;
const STYLE = `
.rt-pad{width:min(640px,calc(100vw - 40px));height:min(400px,calc(100vh - 320px));min-height:240px;border-radius:30px;display:grid;place-items:center;text-align:center;cursor:pointer;user-select:none;position:relative;overflow:hidden;
  transition:background .12s;box-shadow:0 30px 60px -24px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,255,255,.2)}
.rt-pad h3{margin:0;font-size:clamp(34px,7vw,60px);font-weight:900;letter-spacing:-.02em;color:#fff;text-shadow:0 6px 24px rgba(0,0,0,.3)}
.rt-pad p{margin:6px 0 0;color:rgba(255,255,255,.85);font-weight:700}
.rt-wait{background:radial-gradient(circle at 50% 40%,#ff5d73,#a3122f)}
.rt-go{background:radial-gradient(circle at 50% 40%,#5ef08a,#0f8a3c)}
.rt-go::after{content:"";position:absolute;inset:0;border-radius:30px;animation:rtPulse .6s ease-out infinite;box-shadow:inset 0 0 0 0 rgba(255,255,255,.6)}
.rt-early{background:radial-gradient(circle at 50% 40%,#ffb13d,#b35a00)}
.rt-res{background:radial-gradient(circle at 50% 40%,#5a8dff,#2a3da8)}
.rt-icon{font-size:56px;line-height:1;margin-bottom:6px}
.rt-chips{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.rt-chip{min-width:84px;padding:8px 12px;border-radius:14px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);text-align:center;font-weight:900}
.rt-chip em{display:block;font-style:normal;font-size:10px;letter-spacing:.12em;opacity:.6}
.rt-chip.now{border-color:#fff}
@keyframes rtPulse{to{box-shadow:inset 0 0 0 40px rgba(255,255,255,0)}}
`;

let api, pad, chips, state, round, goAt, times, waitT;

function rating(ms) { return ms < 200 ? "⚡ Lightning!" : ms < 260 ? "🔥 Super fast" : ms < 330 ? "👍 Nice" : ms < 450 ? "🙂 Not bad" : "🐢 Keep practicing"; }

function renderChips() {
  chips.innerHTML = Array.from({ length: ROUNDS }, (_, i) => `<div class="rt-chip ${i === round ? "now" : ""}"><em>ROUND ${i + 1}</em>${times[i] != null ? times[i] + " ms" : "—"}</div>`).join("");
}
function set(cls, html) { pad.className = "rt-pad " + cls; pad.innerHTML = `<div>${html}</div>`; }

function arm() {
  state = "wait";
  set("rt-wait", `<div class="rt-icon">✋</div><h3>Wait for green…</h3><p>Round ${round + 1} of ${ROUNDS}</p>`);
  waitT = api.after(rand(1300, 3800), () => { state = "go"; goAt = performance.now(); set("rt-go", `<div class="rt-icon">⚡</div><h3>TAP!</h3>`); api.sound.tick(); });
}

function tap() {
  if (state === "wait") {
    api.cancel(waitT);
    state = "early";
    api.sound.error();
    set("rt-early", `<div class="rt-icon">😬</div><h3>Too soon!</h3><p>Tap to retry this round</p>`);
  } else if (state === "go") {
    const ms = Math.round(performance.now() - goAt);
    times[round] = ms;
    round++;
    renderChips();
    api.sound.coin();
    const score = times.reduce((s, t) => s + Math.max(0, 600 - t), 0);
    api.setScore(score);
    if (round >= ROUNDS) {
      state = "done";
      const avg = Math.round(times.reduce((s, t) => s + t, 0) / ROUNDS);
      set("rt-res", `<div class="rt-icon">🏁</div><h3>${avg} ms average</h3><p>${rating(avg)}</p>`);
      api.gameOver({ score, win: avg < 300, title: rating(avg), message: `Average reaction: ${avg} ms · best ${Math.min(...times)} ms` });
    } else {
      state = "res";
      set("rt-res", `<div class="rt-icon">⏱</div><h3>${ms} ms</h3><p>${rating(ms)} · tap for next round</p>`);
    }
  } else if (state === "early" || state === "res") arm();
}

export default {
  init(stage, a) {
    api = a; round = 0; times = []; state = "idle";
    stage.appendChild(el("style", "", STYLE));
    pad = el("div", "rt-pad");
    chips = el("div", "rt-chips");
    stage.append(pad, chips, el("div", "g-sub", "Click, tap or press Space"));
    renderChips();
    api.setScore(0);
    api.on(pad, "pointerdown", tap);
    api.on(window, "keydown", (e) => { if (e.key === " " && !e.repeat) { e.preventDefault(); tap(); } });
    arm();
  }
};
