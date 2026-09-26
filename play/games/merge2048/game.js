import { directions, el, randInt } from "../../hub/js/core/Engine.js";

const N = 4;
const STYLE = `
.m2-wrap{--t:min(96px,calc((100vw - 90px)/4.6),calc((100vh - 260px)/4.6));--g:calc(var(--t)*.125);position:relative;padding:var(--g);border-radius:22px;
  background:linear-gradient(145deg,#2a1f5c,#17113a);box-shadow:0 30px 60px -24px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,255,255,.12),0 0 80px -30px #ff8a5c;touch-action:none;user-select:none}
.m2-bg{display:grid;grid-template-columns:repeat(4,var(--t));gap:var(--g)}
.m2-bg i{width:var(--t);height:var(--t);border-radius:14px;background:rgba(255,255,255,.06);box-shadow:inset 0 2px 6px rgba(0,0,0,.3)}
.m2-tile{position:absolute;left:var(--g);top:var(--g);width:var(--t);height:var(--t);border-radius:14px;display:grid;place-items:center;
  font-weight:900;letter-spacing:-.03em;transition:transform .11s ease-in-out;will-change:transform;z-index:2}
.m2-tile span{display:grid;place-items:center;width:100%;height:100%;border-radius:14px;box-shadow:inset 0 -5px 0 rgba(0,0,0,.18),inset 0 2px 0 rgba(255,255,255,.35),0 8px 18px -8px var(--gl)}
.m2-new span{animation:m2in .2s ease .08s both}.m2-pop span{animation:m2pop .22s ease .1s}
@keyframes m2in{from{transform:scale(0)}}@keyframes m2pop{50%{transform:scale(1.2)}}
.m2-info{display:flex;gap:10px;justify-content:center;align-items:center}
.m2-banner{font-weight:900;font-size:18px;background:linear-gradient(90deg,#ffe45c,#ff9f1c);-webkit-background-clip:text;background-clip:text;color:transparent;min-height:26px;text-align:center}
`;
const PAL = {
  2: ["#fff7e6", "#6b4a1f"], 4: ["#ffe7b8", "#6b4a1f"], 8: ["#ffb86b", "#fff"], 16: ["#ff9052", "#fff"], 32: ["#ff6b5a", "#fff"],
  64: ["#ff3d5a", "#fff"], 128: ["#ffd84d", "#5a3a00"], 256: ["#ffc53d", "#5a3a00"], 512: ["#7ee04a", "#123a00"],
  1024: ["#19d3c5", "#003a36"], 2048: ["#8b5cf6", "#fff"], 4096: ["#ff4fa3", "#fff"]
};

let api, wrap, tiles, nextId, score, busy, won, banner;

function at(r, c) { return tiles.find((t) => !t.dead && t.r === r && t.c === c); }
function spawn() {
  const empty = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!at(r, c)) empty.push([r, c]);
  if (!empty.length) return;
  const [r, c] = empty[randInt(0, empty.length - 1)];
  tiles.push({ id: nextId++, v: Math.random() < 0.9 ? 2 : 4, r, c, isNew: true });
}

function line(dir, i) {
  const idx = [0, 1, 2, 3];
  if (dir === "left") return idx.map((c) => [i, c]);
  if (dir === "right") return idx.map((c) => [i, 3 - c]);
  if (dir === "up") return idx.map((r) => [r, i]);
  return idx.map((r) => [3 - r, i]);
}

function move(dir) {
  if (busy) return;
  tiles = tiles.filter((t) => !t.dead);
  tiles.forEach((t) => { t.merged = false; t.isNew = false; t.pop = false; });
  let moved = false, gained = 0;
  for (let i = 0; i < N; i++) {
    const cells = line(dir, i);
    let target = 0, last = null;
    for (const [r, c] of cells) {
      const t = at(r, c);
      if (!t) continue;
      if (last && last.v === t.v && !last.merged) {
        t.r = last.r; t.c = last.c; t.dead = true;
        last.v *= 2; last.merged = true; last.pop = true;
        gained += last.v; moved = true;
      } else {
        const [nr, nc] = cells[target++];
        if (nr !== t.r || nc !== t.c) moved = true;
        t.r = nr; t.c = nc; last = t;
      }
    }
  }
  if (!moved) return;
  score += gained;
  api.setScore(score);
  gained ? api.sound.pop() : api.sound.move();
  busy = true;
  render();
  api.after(115, () => {
    tiles.filter((t) => t.dead).forEach((t) => t.node && t.node.remove());
    tiles = tiles.filter((t) => !t.dead);
    spawn();
    render();
    busy = false;
    const max = Math.max(...tiles.map((t) => t.v));
    if (max >= 2048 && !won) { won = true; banner.textContent = "🎉 2048! Keep going for a bigger score!"; api.sound.win(); api.saveProgress(score); }
    if (!canMove()) api.gameOver({ score, win: won, title: won ? "Legendary run!" : "No more moves", message: `Biggest tile: ${max}` });
  });
}

function canMove() {
  if (tiles.length < N * N) return true;
  for (const t of tiles) {
    const r = at(t.r, t.c + 1), d = at(t.r + 1, t.c);
    if ((r && r.v === t.v) || (d && d.v === t.v)) return true;
  }
  return false;
}

function render() {
  for (const t of tiles) {
    if (!t.node) {
      t.node = el("div", "m2-tile", "<span></span>");
      wrap.appendChild(t.node);
    }
    const [bgc, fg] = PAL[t.v] || ["#1b1446", "#fff"];
    const s = t.node.firstChild;
    const digits = String(t.v).length;
    t.node.style.transform = `translate(calc(${t.c} * (var(--t) + var(--g))), calc(${t.r} * (var(--t) + var(--g))))`;
    t.node.style.zIndex = t.dead ? 1 : 2;
    t.node.style.setProperty("--gl", bgc);
    t.node.className = "m2-tile" + (t.isNew ? " m2-new" : "") + (t.pop ? " m2-pop" : "");
    s.style.background = `linear-gradient(160deg, ${bgc}, color-mix(in srgb, ${bgc} 75%, #000))`;
    s.style.color = fg;
    s.style.fontSize = `calc(var(--t) * ${digits <= 2 ? 0.44 : digits === 3 ? 0.36 : 0.28})`;
    if (!t.dead) s.textContent = t.v;
  }
}

export default {
  init(stage, a) {
    api = a; tiles = []; nextId = 1; score = 0; busy = false; won = false;
    stage.appendChild(el("style", "", STYLE));
    banner = el("div", "m2-banner", "");
    wrap = el("div", "m2-wrap");
    const bgGrid = el("div", "m2-bg");
    for (let i = 0; i < N * N; i++) bgGrid.appendChild(el("i"));
    wrap.appendChild(bgGrid);
    stage.append(banner, wrap, el("div", "g-sub", "Swipe or use arrow keys · merge matching numbers"));
    spawn(); spawn(); render();
    api.setScore(0);
    directions(api, wrap, move);
  }
};
