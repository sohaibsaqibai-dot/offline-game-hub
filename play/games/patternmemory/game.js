import { el, randInt } from "../../hub/js/core/Engine.js";

const PADS = [["#22c55e", 2], ["#ff4d6d", 4], ["#facc15", 6], ["#3fa9ff", 8]];
const STYLE = `
.pm-ring{--s:min(380px,calc(100vw - 60px),calc(100vh - 260px));width:var(--s);height:var(--s);position:relative;border-radius:50%;padding:calc(var(--s)*.04);
  background:radial-gradient(circle,#2a1440,#12061f);box-shadow:0 30px 60px -20px rgba(0,0,0,.8),0 0 0 6px rgba(255,255,255,.05),0 0 90px -20px #fa709a;display:grid;grid-template-columns:1fr 1fr;gap:calc(var(--s)*.035)}
.pm-pad{border:0;cursor:pointer;opacity:.38;transition:opacity .12s,transform .12s,filter .12s;box-shadow:inset 0 -8px 0 rgba(0,0,0,.25),inset 0 6px 0 rgba(255,255,255,.25)}
.pm-pad:nth-child(1){border-radius:100% 12px 12px 12px}.pm-pad:nth-child(2){border-radius:12px 100% 12px 12px}
.pm-pad:nth-child(3){border-radius:12px 12px 12px 100%}.pm-pad:nth-child(4){border-radius:12px 12px 100% 12px}
.pm-pad.lit{opacity:1;filter:brightness(1.25);transform:scale(1.03);box-shadow:0 0 50px var(--c),inset 0 -8px 0 rgba(0,0,0,.2),inset 0 6px 0 rgba(255,255,255,.4)}
.pm-pad:active{transform:scale(.97)}
.pm-core{position:absolute;left:50%;top:50%;width:34%;height:34%;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle at 35% 30%,#3a1d5c,#12061f);
  box-shadow:0 0 0 8px #12061f,0 10px 30px rgba(0,0,0,.6);display:grid;place-items:center;text-align:center;color:#fff;pointer-events:none}
.pm-core b{font-size:calc(var(--s)*.11);font-weight:900;line-height:1}.pm-core span{font-size:12px;letter-spacing:.12em;text-transform:uppercase;opacity:.7;font-weight:800}
.pm-ring.fail{animation:pmFail .45s}@keyframes pmFail{25%{transform:translateX(-10px)}75%{transform:translateX(10px)}}
`;

let api, pads, seq, idx, accepting, round, msg, core;

function flash(i, ms) {
  pads[i].classList.add("lit");
  api.sound.note(PADS[i][1]);
  api.after(ms, () => pads[i].classList.remove("lit"));
}

function playSeq() {
  accepting = false; idx = 0;
  msg.textContent = "Watch…";
  const speed = Math.max(260, 620 - round * 25);
  seq.forEach((p, k) => api.after(700 + k * speed, () => flash(p, speed * 0.7)));
  api.after(700 + seq.length * speed, () => { accepting = true; msg.textContent = "Your turn!"; });
}

function nextRound() {
  round++;
  core.innerHTML = `<div><span>Round</span><b>${round}</b></div>`;
  seq.push(randInt(0, 3));
  playSeq();
}

function press(i) {
  if (!accepting) return;
  flash(i, 220);
  if (seq[idx] !== i) {
    accepting = false;
    pads[0].parentElement.classList.add("fail");
    api.sound.error();
    msg.textContent = "Oops — wrong pad!";
    api.gameOver({ score: (round - 1) * 10, message: `You remembered ${round - 1} step${round === 2 ? "" : "s"}.` });
    return;
  }
  idx++;
  if (idx === seq.length) {
    accepting = false;
    api.setScore(round * 10);
    msg.textContent = "Nice! ✨";
    if (round % 5 === 0) api.sound.levelUp();
    api.after(600, nextRound);
  }
}

export default {
  init(stage, a) {
    api = a; seq = []; round = 0; accepting = false;
    stage.appendChild(el("style", "", STYLE));
    msg = el("div", "g-msg", "Get ready…");
    const ring = el("div", "pm-ring");
    pads = PADS.map(([c], i) => {
      const p = el("button", "pm-pad");
      p.style.background = `linear-gradient(145deg, ${c}, color-mix(in srgb, ${c} 60%, #000))`;
      p.style.setProperty("--c", c);
      api.on(p, "pointerdown", () => press(i));
      ring.appendChild(p);
      return p;
    });
    core = el("div", "pm-core");
    ring.appendChild(core);
    stage.append(msg, ring, el("div", "g-sub", "Keys 1 2 / 3 4 match the pads"));
    api.on(window, "keydown", (e) => { const n = "1234".indexOf(e.key); if (n >= 0) press(n); });
    api.setScore(0);
    nextRound();
  }
};
