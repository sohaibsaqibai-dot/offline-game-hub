import { makeCanvas, Particles, Floaters, Shake, bg, orb, text, randInt, TAU, C } from "../../hub/js/core/Engine.js";

const COLS = 10, ROWS = 12, S = 44, PAD = 10, W = COLS * S + PAD * 2, H = ROWS * S + PAD * 2;
const COLORS = [C.pink, C.amber, C.sky, C.lime, C.violet];
let api, cv, ctx, fx, fl, shake, grid, score, hover, over, pops;

// grid[c][r] with r=0 at bottom. Each cell: { k, x, y } where x,y are animated display positions.
function cellXY(c, r) { return { x: PAD + c * S + S / 2, y: H - PAD - r * S - S / 2 }; }

function group(c, r) {
  const col = grid[c] && grid[c][r];
  if (!col) return [];
  const out = [], seen = new Set([c + "," + r]), st = [[c, r]];
  while (st.length) {
    const [x, y] = st.pop(); out.push([x, y]);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, key = nx + "," + ny;
      if (seen.has(key) || !grid[nx] || !grid[nx][ny] || grid[nx][ny].k !== col.k) continue;
      seen.add(key); st.push([nx, ny]);
    }
  }
  return out;
}

function anyMoves() {
  for (let c = 0; c < grid.length; c++) for (let r = 0; r < grid[c].length; r++) if (group(c, r).length > 1) return true;
  return false;
}

function pick(p) {
  const c = Math.floor((p.x - PAD) / S), r = Math.floor((H - PAD - p.y) / S);
  return grid[c] && grid[c][r] ? [c, r] : null;
}

function pop(c, r) {
  const g = group(c, r);
  if (g.length < 2) { api.sound.error(); return; }
  const color = COLORS[grid[c][r].k];
  const pts = g.length * (g.length - 1) * 5;
  score += pts;
  let cx = 0, cy = 0;
  for (const [x, y] of g) {
    const b = grid[x][y];
    cx += b.x; cy += b.y;
    fx.burst(b.x, b.y, { count: 10, color, speed: 240, life: 0.6, size: 4 });
    grid[x][y] = null;
  }
  fl.add(cx / g.length, cy / g.length, `+${pts}`, { color, size: 16 + Math.min(20, g.length * 1.5) });
  if (g.length >= 8) { shake.kick(6); api.sound.levelUp(); } else api.sound.pop();
  pops++;
  // gravity + remove empty columns
  grid = grid.map((col) => col.filter(Boolean)).filter((col) => col.length);
  api.setScore(score);
  if (!grid.length) {
    score += 1000; api.setScore(score);
    fl.add(W / 2, H / 2, "BOARD CLEAR +1000", { color: C.amber, size: 30, life: 1.6 });
    fx.confetti(W / 2, H / 2, 90);
  }
  if (!anyMoves()) {
    over = true;
    const left = grid.reduce((n, col) => n + col.length, 0);
    api.gameOver({ score, win: left === 0, title: left === 0 ? "Board cleared!" : "No more groups", message: left ? `${left} bubbles left on the board.` : "Every bubble popped!" });
  }
}

function draw(t, dt) {
  bg(ctx, W, H, "#2b0f3f", "#120722");
  // soft background bokeh
  for (let i = 0; i < 6; i++) {
    const x = (i * 97 + t / 60) % (W + 80) - 40, y = 80 + ((i * 131) % (H - 100));
    ctx.fillStyle = `rgba(255,79,163,${0.04 + (i % 3) * 0.015})`;
    ctx.beginPath(); ctx.arc(x, y, 40 + i * 8, 0, TAU); ctx.fill();
  }
  const hg = hover && !over ? group(hover[0], hover[1]) : [];
  const hs = new Set(hg.length > 1 ? hg.map(([a, b]) => a + "," + b) : []);
  const k = 1 - Math.pow(0.0005, dt);
  for (let c = 0; c < grid.length; c++) {
    for (let r = 0; r < grid[c].length; r++) {
      const b = grid[c][r];
      const tgt = cellXY(c, r);
      b.x += (tgt.x - b.x) * k; b.y += (tgt.y - b.y) * Math.min(1, k * 1.3);
      const hl = hs.has(c + "," + r);
      const wob = hl ? 1 + Math.sin(t / 90 + c + r) * 0.05 : 1;
      orb(ctx, b.x, b.y, (S / 2 - 3) * wob, COLORS[b.k], hl ? 18 : 0);
      if (hl) { ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, S / 2 - 1, 0, TAU); ctx.stroke(); }
    }
  }
  if (hs.size) {
    const pts = hs.size * (hs.size - 1) * 5;
    text(ctx, `${hs.size} bubbles · +${pts}`, W / 2, 22, { size: 15, color: "#fff", stroke: { color: "rgba(0,0,0,.5)", width: 4 } });
  }
  fx.draw(ctx); fl.draw(ctx);
}

export default {
  init(stage, a) {
    api = a; score = 0; hover = null; over = false; pops = 0;
    cv = makeCanvas(stage, W, H); ctx = cv.ctx;
    fx = new Particles(); fl = new Floaters(); shake = new Shake();
    grid = [];
    for (let c = 0; c < COLS; c++) {
      grid.push([]);
      for (let r = 0; r < ROWS; r++) {
        const p = cellXY(c, r);
        grid[c].push({ k: randInt(0, COLORS.length - 1), x: p.x, y: p.y - H - r * 30 - c * 12 });
      }
    }
    api.setScore(0);
    api.on(cv.canvas, "pointermove", (e) => { hover = pick(cv.toLocal(e)); });
    api.on(cv.canvas, "pointerleave", () => { hover = null; });
    api.on(cv.canvas, "pointerdown", (e) => { const p = pick(cv.toLocal(e)); if (p && !over) { pop(p[0], p[1]); hover = pick(cv.toLocal(e)); } });
    api.loop((dt, t) => {
      fx.update(dt); fl.update(dt); shake.update(dt);
      ctx.save(); shake.apply(ctx); draw(t, dt); ctx.restore();
    });
  }
};
