import { el, shuffle } from "../../hub/js/core/Engine.js";

const COLS = 12, ROWS = 12, MINES = 22;
const NUMC = ["", "#3fa9ff", "#22c55e", "#ff4d6d", "#8b5cf6", "#ff9f1c", "#19d3c5", "#ff4fa3", "#fff"];
const STYLE = `
.ms-grid{--s:min(38px,calc((100vw - 70px)/12.6),calc((100vh - 300px)/12.6));display:grid;grid-template-columns:repeat(${COLS},var(--s));gap:3px;padding:12px;border-radius:20px;
  background:linear-gradient(145deg,#15325e,#0b1a36);box-shadow:0 30px 60px -24px rgba(0,0,0,.8),0 0 80px -30px #2f80ed;user-select:none;touch-action:manipulation}
.ms-c{width:var(--s);height:var(--s);border-radius:8px;border:0;padding:0;font-weight:900;font-size:calc(var(--s)*.5);display:grid;place-items:center;cursor:pointer;
  background:linear-gradient(160deg,#6fb6ff,#3d7fe0);box-shadow:inset 0 2px 0 rgba(255,255,255,.4),inset 0 -3px 0 rgba(0,0,0,.2);transition:transform .1s,filter .15s}
.ms-c:hover{filter:brightness(1.15);transform:translateY(-1px)}
.ms-c.open{background:#e3f1ff;box-shadow:inset 0 1px 3px rgba(0,40,100,.25);cursor:default;animation:msOpen .25s ease both}
.ms-c.open:hover{filter:none;transform:none}
.ms-c.flag::after{content:"";width:55%;height:55%;background:no-repeat center/contain url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath d='M5 2v17' stroke='%23fff' stroke-width='2'/%3E%3Cpath d='M6 2l11 4-11 4z' fill='%23ff4d6d'/%3E%3C/svg%3E");animation:msOpen .2s}
.ms-c.mine{background:radial-gradient(circle,#ff6b6b,#b3172f);animation:msBoom .35s ease both}
.ms-c.mine::after{content:"";width:58%;height:58%;border-radius:50%;background:radial-gradient(circle at 35% 35%,#666,#111 60%);box-shadow:0 0 0 3px rgba(0,0,0,.25)}
.ms-c.safeflag{background:linear-gradient(160deg,#7ee04a,#3f9a1c)}
@keyframes msOpen{from{transform:scale(.6);opacity:.3}}@keyframes msBoom{0%{transform:scale(.4)}60%{transform:scale(1.2)}}
.ms-bar{display:flex;gap:10px;align-items:center;justify-content:center}
.ms-pill{padding:8px 14px;border-radius:12px;background:rgba(255,255,255,.08);font-weight:800}
`;

let api, cells, mines, first, over, time, flags, opened, grid, flagMode, minesLeft;

function nb(i) {
  const r = Math.floor(i / COLS), c = i % COLS, out = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const rr = r + dr, cc = c + dc;
    if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS) out.push(rr * COLS + cc);
  }
  return out;
}

function layMines(safe) {
  const banned = new Set([safe, ...nb(safe)]);
  const pool = shuffle([...Array(ROWS * COLS).keys()].filter((i) => !banned.has(i)));
  mines = new Set(pool.slice(0, MINES));
}
const count = (i) => nb(i).filter((j) => mines.has(j)).length;

function reveal(start) {
  // BFS flood fill with a ripple delay by distance
  const q = [[start, 0]], seen = new Set([start]);
  let n = 0;
  while (q.length) {
    const [i, d] = q.shift();
    const node = cells[i];
    if (node.classList.contains("open") || flags.has(i)) continue;
    const k = count(i);
    node.classList.add("open");
    node.style.animationDelay = d * 25 + "ms";
    node.textContent = k || "";
    node.style.color = NUMC[k];
    opened++; n++;
    if (k === 0) for (const j of nb(i)) if (!seen.has(j)) { seen.add(j); q.push([j, d + 1]); }
  }
  return n;
}

function click(i) {
  if (over) return;
  if (flagMode) return toggleFlag(i);
  if (flags.has(i) || cells[i].classList.contains("open")) return chord(i);
  if (first) { layMines(i); first = false; }
  if (mines.has(i)) return lose(i);
  const n = reveal(i);
  n > 3 ? api.sound.whoosh() : api.sound.pop();
  update();
}

// Clicking an opened number with the right amount of flags opens its neighbors.
function chord(i) {
  if (!cells[i].classList.contains("open")) return;
  const k = count(i), around = nb(i);
  if (around.filter((j) => flags.has(j)).length !== k) return;
  for (const j of around) {
    if (flags.has(j) || cells[j].classList.contains("open")) continue;
    if (mines.has(j)) return lose(j);
    reveal(j);
  }
  api.sound.pop();
  update();
}

function toggleFlag(i) {
  if (over || cells[i].classList.contains("open")) return;
  if (flags.has(i)) flags.delete(i); else flags.add(i);
  cells[i].classList.toggle("flag");
  api.sound.tick();
  minesLeft.textContent = `💣 ${MINES - flags.size}`;
}

function update() {
  api.setScore(opened * 10);
  if (opened === ROWS * COLS - MINES) {
    over = true;
    mines.forEach((m) => cells[m].classList.add("flag", "safeflag"));
    const score = opened * 10 + Math.max(0, 600 - time * 3);
    api.setScore(score);
    api.gameOver({ score, win: true, title: "Field cleared!", message: `Cleared in ${time}s` });
  }
}

function lose(i) {
  over = true;
  api.sound.explode();
  grid.animate([{ transform: "translate(0,0)" }, { transform: "translate(-8px,4px)" }, { transform: "translate(8px,-4px)" }, { transform: "translate(0,0)" }], { duration: 300 });
  const list = [i, ...[...mines].filter((m) => m !== i)];
  list.forEach((m, k) => api.after(k * 45, () => { cells[m].classList.remove("flag"); cells[m].classList.add("mine"); if (k % 4 === 0) api.sound.hit(); }));
  api.gameOver({ score: opened * 10, message: `You cleared ${opened} safe cells.` });
}

export default {
  init(stage, a) {
    api = a; first = true; over = false; time = 0; flags = new Set(); opened = 0; flagMode = false; mines = new Set();
    stage.appendChild(el("style", "", STYLE));
    const bar = el("div", "ms-bar");
    minesLeft = el("span", "ms-pill", `💣 ${MINES}`);
    const flagBtn = el("button", "g-btn", "🚩 Flag mode: off");
    bar.append(minesLeft, flagBtn);
    grid = el("div", "ms-grid");
    cells = [];
    for (let i = 0; i < ROWS * COLS; i++) { const b = el("button", "ms-c"); b.dataset.i = i; cells.push(b); grid.appendChild(b); }
    stage.append(bar, grid, el("div", "g-sub", "Right-click or long-press to flag · click a number to open around it"));
    api.setScore(0); api.setTimer(0);
    api.every(1000, () => { if (!first && !over) { time++; api.setTimer(time); } });

    api.on(flagBtn, "click", () => { flagMode = !flagMode; flagBtn.textContent = `🚩 Flag mode: ${flagMode ? "on" : "off"}`; flagBtn.classList.toggle("on", flagMode); });
    let press = null, longFired = false;
    api.on(grid, "pointerdown", (e) => {
      const c = e.target.closest(".ms-c"); if (!c || e.button === 2) return;
      longFired = false;
      press = setTimeout(() => { longFired = true; toggleFlag(+c.dataset.i); }, 420);
    });
    const cancel = () => clearTimeout(press);
    api.on(grid, "pointerup", cancel); api.on(grid, "pointerleave", cancel);
    api.on(grid, "click", (e) => { const c = e.target.closest(".ms-c"); if (c && !longFired) click(+c.dataset.i); });
    api.on(grid, "contextmenu", (e) => { e.preventDefault(); const c = e.target.closest(".ms-c"); if (c) toggleFlag(+c.dataset.i); });
  },
  destroy() { /* timers auto-cleaned */ }
};
