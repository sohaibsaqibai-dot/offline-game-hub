import { el, randInt, shuffle } from "../../hub/js/core/Engine.js";

const TOTAL = 60;
const STYLE = `
.qm-card{width:min(520px,calc(100vw - 40px));padding:26px;border-radius:28px;background:linear-gradient(160deg,rgba(0,176,155,.18),rgba(9,108,94,.1));border:1px solid rgba(255,255,255,.14);box-shadow:0 30px 60px -24px rgba(0,0,0,.8);display:flex;flex-direction:column;gap:18px;align-items:center}
.qm-ring{position:relative;width:86px;height:86px}.qm-ring svg{transform:rotate(-90deg)}
.qm-ring circle{fill:none;stroke-width:8}.qm-ring .bgc{stroke:rgba(255,255,255,.1)}.qm-ring .fg{stroke:#7ee04a;stroke-linecap:round;transition:stroke-dashoffset .2s linear,stroke .3s}
.qm-ring b{position:absolute;inset:0;display:grid;place-items:center;font-size:26px;font-weight:900}
.qm-eq{font-size:clamp(40px,9vw,64px);font-weight:900;letter-spacing:-.02em;text-shadow:0 6px 30px rgba(126,224,74,.35);animation:qmIn .3s cubic-bezier(.3,1.5,.5,1)}
.qm-ans{display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%}
.qm-b{padding:18px 10px;border-radius:18px;border:0;font-size:28px;font-weight:900;color:#0b3b12;cursor:pointer;background:linear-gradient(180deg,#fff,#dff7e8);box-shadow:0 6px 0 #9bd3b0,0 12px 22px -8px rgba(0,0,0,.6);position:relative;transition:transform .08s}
.qm-b small{position:absolute;left:12px;top:8px;font-size:11px;opacity:.45}
.qm-b:active{transform:translateY(4px);box-shadow:0 2px 0 #9bd3b0}
.qm-b.ok{background:linear-gradient(180deg,#b8ff8a,#5ed12e);box-shadow:0 6px 0 #3f9a1c}.qm-b.no{background:linear-gradient(180deg,#ffb3c0,#ff4d6d);color:#fff;box-shadow:0 6px 0 #b3172f;animation:qmNo .3s}
.qm-streak{font-weight:900;color:#ffe45c;min-height:22px}
@keyframes qmIn{from{transform:scale(.7);opacity:0}}@keyframes qmNo{25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
`;

let api, eqEl, ansEl, fg, tEl, streakEl, answer, score, streak, time, over, solved, busy;

function makeQ() {
  const lvl = Math.min(10, Math.floor(solved / 4));
  const ops = lvl < 2 ? ["+", "−"] : lvl < 4 ? ["+", "−", "×"] : ["+", "−", "×", "÷"];
  const op = ops[randInt(0, ops.length - 1)];
  let a, b2, ans;
  const hi = 10 + lvl * 8;
  if (op === "+") { a = randInt(2, hi); b2 = randInt(2, hi); ans = a + b2; }
  else if (op === "−") { a = randInt(5, hi + 5); b2 = randInt(1, a); ans = a - b2; }
  else if (op === "×") { a = randInt(2, 5 + lvl); b2 = randInt(2, 9 + Math.floor(lvl / 2)); ans = a * b2; }
  else { b2 = randInt(2, 9); ans = randInt(2, 6 + lvl); a = b2 * ans; }
  answer = ans;
  const opts = new Set([ans]);
  while (opts.size < 4) { const d = randInt(1, Math.max(3, Math.ceil(ans * 0.25))); opts.add(Math.max(0, ans + (Math.random() < 0.5 ? -d : d))); }
  eqEl.textContent = `${a} ${op} ${b2} = ?`;
  eqEl.style.animation = "none"; void eqEl.offsetWidth; eqEl.style.animation = "";
  ansEl.innerHTML = "";
  shuffle([...opts]).forEach((v, i) => { const b = el("button", "qm-b", `<small>${i + 1}</small>${v}`); b.dataset.v = v; ansEl.appendChild(b); });
  busy = false;
}

function pick(btn) {
  if (busy || over || !btn) return;
  busy = true;
  if (+btn.dataset.v === answer) {
    btn.classList.add("ok");
    streak++; solved++;
    const mult = Math.min(5, 1 + Math.floor(streak / 3));
    score += 10 * mult; time = Math.min(TOTAL, time + 1.5);
    api.setScore(score);
    streakEl.textContent = streak >= 3 ? `🔥 Streak ${streak} · ×${mult} points` : "";
    streak % 3 === 0 ? api.sound.levelUp() : api.sound.coin();
    api.after(220, makeQ);
  } else {
    btn.classList.add("no");
    [...ansEl.children].find((b) => +b.dataset.v === answer)?.classList.add("ok");
    streak = 0; time -= 4; streakEl.textContent = "−4 seconds";
    api.sound.error();
    api.after(650, makeQ);
  }
}

export default {
  init(stage, a) {
    api = a; score = 0; streak = 0; time = TOTAL; over = false; solved = 0; busy = false;
    stage.appendChild(el("style", "", STYLE));
    const card = el("div", "qm-card");
    const ring = el("div", "qm-ring", `<svg viewBox="0 0 86 86" width="86" height="86"><circle class="bgc" cx="43" cy="43" r="37"/><circle class="fg" cx="43" cy="43" r="37" stroke-dasharray="232.5" stroke-dashoffset="0"/></svg><b>60</b>`);
    fg = ring.querySelector(".fg"); tEl = ring.querySelector("b");
    eqEl = el("div", "qm-eq"); ansEl = el("div", "qm-ans"); streakEl = el("div", "qm-streak");
    card.append(ring, eqEl, ansEl, streakEl);
    stage.append(card, el("div", "g-sub", "Keys 1–4 to answer · streaks multiply points"));
    makeQ();
    api.setScore(0);
    api.on(ansEl, "click", (e) => pick(e.target.closest(".qm-b")));
    api.on(window, "keydown", (e) => { const n = "1234".indexOf(e.key); if (n >= 0) pick(ansEl.children[n]); });
    api.loop((dt) => {
      if (over) return;
      time -= dt;
      const k = Math.max(0, time / TOTAL);
      fg.style.strokeDashoffset = 232.5 * (1 - k);
      fg.style.stroke = k < 0.2 ? "#ff4d6d" : k < 0.45 ? "#ffc53d" : "#7ee04a";
      tEl.textContent = Math.max(0, Math.ceil(time));
      api.setTimer(Math.max(0, Math.ceil(time)));
      if (time <= 0) { over = true; busy = true; api.gameOver({ score, title: "Time's up!", message: `You solved ${solved} equation${solved === 1 ? "" : "s"}.` }); }
    });
  }
};
