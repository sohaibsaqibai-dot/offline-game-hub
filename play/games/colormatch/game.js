import { el, randInt } from "../../hub/js/core/Engine.js";

const STYLE = `
.cm-wrap{--s:min(420px,calc(100vw - 60px),calc(100vh - 300px));width:var(--s)}
.cm-bar{height:12px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden;margin-bottom:14px}
.cm-bar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#ff4d6d,#ffc53d,#7ee04a);transition:width .2s linear}
.cm-grid{width:var(--s);height:var(--s);display:grid;gap:8px;padding:12px;border-radius:24px;background:rgba(255,255,255,.05);box-shadow:0 30px 60px -24px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,255,255,.1)}
.cm-t{border:0;border-radius:14px;cursor:pointer;box-shadow:inset 0 -5px 0 rgba(0,0,0,.15),inset 0 3px 0 rgba(255,255,255,.25);transition:transform .12s;animation:cmIn .3s cubic-bezier(.3,1.5,.5,1) both}
.cm-t:hover{transform:scale(1.05)}
.cm-t.right{animation:cmRight .4s ease;box-shadow:0 0 0 4px #fff,0 0 30px #fff}
.cm-t.wrong{animation:cmWrong .35s}
@keyframes cmIn{from{transform:scale(.3);opacity:0}}@keyframes cmRight{50%{transform:scale(1.2)}}
@keyframes cmWrong{25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
`;

let api, grid, level, score, time, bar, msg, oddIdx, over;
const TOTAL = 45;

function build() {
  const n = Math.min(8, 2 + Math.floor(level / 3));
  const h = randInt(0, 359), s = randInt(55, 85), l = randInt(45, 62);
  const diff = Math.max(3.5, 22 - level * 0.9);
  const odd = `hsl(${h}, ${s}%, ${l + (Math.random() < 0.5 ? diff : -diff)}%)`;
  const base = `hsl(${h}, ${s}%, ${l}%)`;
  oddIdx = randInt(0, n * n - 1);
  grid.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
  grid.innerHTML = "";
  for (let i = 0; i < n * n; i++) {
    const t = el("button", "cm-t");
    t.style.background = i === oddIdx ? odd : base;
    t.style.animationDelay = (i % n + Math.floor(i / n)) * 18 + "ms";
    t.style.borderRadius = Math.max(6, 18 - n * 1.5) + "px";
    t.dataset.i = i;
    grid.appendChild(t);
  }
  msg.textContent = `Level ${level + 1}`;
}

export default {
  init(stage, a) {
    api = a; level = 0; score = 0; time = TOTAL; over = false;
    stage.appendChild(el("style", "", STYLE));
    const wrap = el("div", "cm-wrap");
    msg = el("div", "g-msg", "");
    bar = el("div", "cm-bar", "<i></i>");
    grid = el("div", "cm-grid");
    wrap.append(bar, grid);
    stage.append(msg, wrap, el("div", "g-sub", "Correct: +1s · Wrong: −3s"));
    build();
    api.setScore(0); api.setTimer(TOTAL);
    api.loop((dt) => {
      if (over) return;
      time -= dt;
      bar.firstChild.style.width = Math.max(0, (time / TOTAL) * 100) + "%";
      api.setTimer(Math.max(0, Math.ceil(time)));
      if (time <= 0) {
        over = true;
        [...grid.children][oddIdx]?.classList.add("right");
        api.gameOver({ score, title: "Time's up!", message: `You reached level ${level + 1}.` });
      }
    });
    api.on(grid, "pointerdown", (e) => {
      const t = e.target.closest(".cm-t");
      if (!t || over) return;
      if (+t.dataset.i === oddIdx) {
        t.classList.add("right");
        level++;
        score += 10 + level * 2;
        time = Math.min(TOTAL, time + 1);
        api.setScore(score);
        api.sound.coin();
        api.after(180, build);
      } else {
        t.classList.remove("wrong"); void t.offsetWidth; t.classList.add("wrong");
        time -= 3;
        api.sound.error();
      }
    });
  }
};
