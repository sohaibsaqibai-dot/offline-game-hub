import { makeCanvas, Particles, Floaters, text, fillRR, TAU } from "../../hub/js/core/Engine.js";

const N = 8, S = 64, PAD = 22, TOP = 70, W = N * S + PAD * 2, H = TOP + N * S + PAD * 2;
const WEIGHTS = [
  [120, -20, 20, 5, 5, 20, -20, 120], [-20, -40, -5, -5, -5, -5, -40, -20], [20, -5, 15, 3, 3, 15, -5, 20], [5, -5, 3, 3, 3, 3, -5, 5],
  [5, -5, 3, 3, 3, 3, -5, 5], [20, -5, 15, 3, 3, 15, -5, 20], [-20, -40, -5, -5, -5, -5, -40, -20], [120, -20, 20, 5, 5, 20, -20, 120]
];
const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
let api, cv, ctx, fx, fl;
let b, flip, turn, over, hover, lock, lastMove, msg;

function flipsFor(bd, r, c, p) {
  if (bd[r][c]) return [];
  const out = [];
  for (const [dr, dc] of DIRS) {
    const line = [];
    let rr = r + dr, cc = c + dc;
    while (rr >= 0 && rr < N && cc >= 0 && cc < N && bd[rr][cc] === 3 - p) { line.push([rr, cc]); rr += dr; cc += dc; }
    if (line.length && rr >= 0 && rr < N && cc >= 0 && cc < N && bd[rr][cc] === p) out.push(...line);
  }
  return out;
}
function movesFor(bd, p) { const m = []; for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const f = flipsFor(bd, r, c, p); if (f.length) m.push({ r, c, f }); } return m; }
function count(bd, p) { return bd.flat().filter((v) => v === p).length; }
function evalB(bd) {
  let s = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (bd[r][c] === 2) s += WEIGHTS[r][c]; else if (bd[r][c] === 1) s -= WEIGHTS[r][c];
  return s + (movesFor(bd, 2).length - movesFor(bd, 1).length) * 4;
}
function apply(bd, m, p) { const n = bd.map((row) => row.slice()); n[m.r][m.c] = p; m.f.forEach(([r, c]) => (n[r][c] = p)); return n; }
function search(bd, depth, p, alpha, beta) {
  const ms = movesFor(bd, p);
  if (depth === 0 || !ms.length) return evalB(bd);
  if (p === 2) { let v = -Infinity; for (const m of ms) { v = Math.max(v, search(apply(bd, m, 2), depth - 1, 1, alpha, beta)); alpha = Math.max(alpha, v); if (alpha >= beta) break; } return v; }
  let v = Infinity; for (const m of ms) { v = Math.min(v, search(apply(bd, m, 1), depth - 1, 2, alpha, beta)); beta = Math.min(beta, v); if (alpha >= beta) break; } return v;
}
function aiPick() {
  const ms = movesFor(b, 2);
  let best = -Infinity, pick = ms[0];
  for (const m of ms) { const v = search(apply(b, m, 2), 2, 1, -Infinity, Infinity) + Math.random() * 3; if (v > best) { best = v; pick = m; } }
  return pick;
}

function place(m, p) {
  b[m.r][m.c] = p;
  flip[m.r][m.c] = { t: 1, pop: true };
  m.f.forEach(([r, c], i) => { b[r][c] = p; flip[r][c] = { t: 0, delay: i * 0.04 + 0.05 }; });
  lastMove = [m.r, m.c];
  api.sound.flip();
  if (m.f.length >= 5) fl.add(PAD + m.c * S + S / 2, TOP + PAD + m.r * S, `×${m.f.length}!`, { color: p === 1 ? "#fff" : "#9aa", size: 20 });
  api.setScore(count(b, 1) * 10);
  lock = true;
  api.after(260 + m.f.length * 40, () => { lock = false; nextTurn(3 - p); });
}

function nextTurn(p) {
  if (over) return;
  const mine = movesFor(b, p), theirs = movesFor(b, 3 - p);
  if (!mine.length && !theirs.length) return finish();
  if (!mine.length) { msg = p === 1 ? "No moves — you pass" : "Computer passes"; fl.add(W / 2, H / 2, "PASS", { color: "#ffe45c", size: 30 }); api.sound.error(); turn = 3 - p; if (turn === 2) api.after(700, () => place(aiPick(), 2)); return; }
  turn = p;
  msg = p === 1 ? "Your move (black)" : "Computer is thinking…";
  if (p === 2) { lock = true; api.after(450, () => { lock = false; place(aiPick(), 2); }); }
}

function finish() {
  over = true;
  const me = count(b, 1), cpu = count(b, 2);
  const win = me > cpu;
  const score = me * 10 + (win ? 300 : 0);
  api.setScore(score);
  if (win) fx.confetti(W / 2, H / 2, 90);
  api.gameOver({ score, win, title: win ? "You win!" : me === cpu ? "It's a tie!" : "The computer wins", message: `Discs: ${me} black – ${cpu} white` });
}

function disc(x, y, r, p, sx) {
  ctx.save(); ctx.translate(x, y); ctx.scale(Math.max(0.05, Math.abs(sx)), 1);
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(2, 4, r, r, 0, 0, TAU); ctx.fill();
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, 1, 0, 0, r);
  if (p === 1) { g.addColorStop(0, "#5a5a70"); g.addColorStop(1, "#0b0b14"); } else { g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#c9cde0"); }
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = p === 1 ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * 0.7, 0, TAU); ctx.stroke();
  ctx.restore();
}

function draw(t, dt) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0b3d2c"); g.addColorStop(1, "#04160f");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const me = count(b, 1), cpu = count(b, 2);
  fillRR(ctx, PAD, 14, 170, 42, 14, turn === 1 && !over ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)");
  disc(PAD + 22, 35, 11, 1, 1); text(ctx, "You", PAD + 42, 35, { size: 15, align: "left" }); text(ctx, String(me), PAD + 156, 35, { size: 22, align: "right", weight: 900 });
  fillRR(ctx, W - PAD - 170, 14, 170, 42, 14, turn === 2 && !over ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.06)");
  disc(W - PAD - 148, 35, 11, 2, 1); text(ctx, "CPU", W - PAD - 128, 35, { size: 15, align: "left" }); text(ctx, String(cpu), W - PAD - 14, 35, { size: 22, align: "right", weight: 900 });
  // board
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 24;
  fillRR(ctx, PAD - 10, TOP + PAD - 10, N * S + 20, N * S + 20, 18, "#5a3a1a"); ctx.restore();
  const fg = ctx.createLinearGradient(0, TOP, 0, TOP + N * S);
  fg.addColorStop(0, "#22a060"); fg.addColorStop(1, "#157a47");
  ctx.fillStyle = fg; ctx.fillRect(PAD, TOP + PAD, N * S, N * S);
  ctx.strokeStyle = "rgba(0,40,20,0.55)"; ctx.lineWidth = 1.5;
  for (let i = 0; i <= N; i++) {
    ctx.beginPath(); ctx.moveTo(PAD + i * S, TOP + PAD); ctx.lineTo(PAD + i * S, TOP + PAD + N * S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PAD, TOP + PAD + i * S); ctx.lineTo(PAD + N * S, TOP + PAD + i * S); ctx.stroke();
  }
  for (const [r, c] of [[2, 2], [2, 6], [6, 2], [6, 6]]) { ctx.fillStyle = "rgba(0,40,20,0.7)"; ctx.beginPath(); ctx.arc(PAD + c * S, TOP + PAD + r * S, 4, 0, TAU); ctx.fill(); }
  const legal = turn === 1 && !lock && !over ? movesFor(b, 1) : [];
  for (const m of legal) {
    const x = PAD + m.c * S + S / 2, y = TOP + PAD + m.r * S + S / 2;
    const isH = hover && hover[0] === m.r && hover[1] === m.c;
    if (isH) { ctx.save(); ctx.globalAlpha = 0.5; disc(x, y, S * 0.4, 1, 1); ctx.restore(); m.f.forEach(([r, c]) => { ctx.strokeStyle = "rgba(255,228,92,0.8)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(PAD + c * S + S / 2, TOP + PAD + r * S + S / 2, S * 0.43, 0, TAU); ctx.stroke(); }); }
    else { ctx.fillStyle = `rgba(255,255,255,${0.25 + Math.sin(t / 250) * 0.1})`; ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill(); }
  }
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (!b[r][c]) continue;
    const f = flip[r][c];
    let sx = 1, shown = b[r][c], sc = 1;
    if (f) {
      if (f.pop) { f.t = Math.max(0, f.t - dt * 5); sc = 1 + f.t * 0.3; if (f.t <= 0) flip[r][c] = null; }
      else if (f.delay > 0) { f.delay -= dt; shown = 3 - b[r][c]; }
      else { f.t += dt * 4; sx = Math.cos(f.t * Math.PI); shown = f.t < 0.5 ? 3 - b[r][c] : b[r][c]; if (f.t >= 1) flip[r][c] = null; }
    }
    disc(PAD + c * S + S / 2, TOP + PAD + r * S + S / 2, S * 0.4 * sc, shown, sx);
  }
  if (lastMove) { ctx.fillStyle = "#ff4d6d"; ctx.beginPath(); ctx.arc(PAD + lastMove[1] * S + S / 2, TOP + PAD + lastMove[0] * S + S / 2, 4, 0, TAU); ctx.fill(); }
  if (!over) text(ctx, msg, W / 2, H - 12, { size: 13, color: "rgba(255,255,255,0.7)", weight: 700 });
  fx.draw(ctx); fl.draw(ctx);
}

export default {
  init(stage, a) {
    api = a;
    cv = makeCanvas(stage, W, H); ctx = cv.ctx;
    fx = new Particles(); fl = new Floaters();
    b = Array.from({ length: N }, () => Array(N).fill(0));
    flip = Array.from({ length: N }, () => Array(N).fill(null));
    b[3][3] = 2; b[4][4] = 2; b[3][4] = 1; b[4][3] = 1;
    turn = 1; over = false; hover = null; lock = false; lastMove = null; msg = "Your move (black)";
    api.setScore(20);
    const cell = (e) => { const p = cv.toLocal(e); const c = Math.floor((p.x - PAD) / S), r = Math.floor((p.y - TOP - PAD) / S); return r >= 0 && r < N && c >= 0 && c < N ? [r, c] : null; };
    api.on(cv.canvas, "pointermove", (e) => (hover = cell(e)));
    api.on(cv.canvas, "pointerdown", (e) => {
      if (over || lock || turn !== 1) return;
      const p = cell(e); if (!p) return;
      const f = flipsFor(b, p[0], p[1], 1);
      if (!f.length) { api.sound.error(); return; }
      place({ r: p[0], c: p[1], f }, 1);
    });
    api.loop((dt, t) => { fx.update(dt); fl.update(dt); draw(t, dt); });
  }
};
