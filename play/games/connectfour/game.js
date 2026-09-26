import { makeCanvas, Particles, Floaters, text, orb, fillRR, TAU } from "../../hub/js/core/Engine.js";

const C = 7, R = 6, S = 76, PAD = 20, TOP = 90, W = C * S + PAD * 2, H = TOP + R * S + PAD * 2;
const COLORS = { 1: "#ff4d6d", 2: "#ffd23a" };
let api, cv, ctx, fx, fl;
let g, turn, hover, anim, over, winLine, moves, thinking;

function drop(board, c, p) { for (let r = R - 1; r >= 0; r--) if (!board[r][c]) { board[r][c] = p; return r; } return -1; }
function lines() {
  const out = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
    const cells = [0, 1, 2, 3].map((k) => [r + dr * k, c + dc * k]);
    if (cells.every(([rr, cc]) => rr >= 0 && rr < R && cc >= 0 && cc < C)) out.push(cells);
  }
  return out;
}
const LINES = lines();
function winnerOf(b) { for (const l of LINES) { const v = b[l[0][0]][l[0][1]]; if (v && l.every(([r, c]) => b[r][c] === v)) return { p: v, l }; } return null; }
function evalBoard(b) {
  let s = 0;
  for (let r = 0; r < R; r++) { if (b[r][3] === 2) s += 3; else if (b[r][3] === 1) s -= 3; }
  for (const l of LINES) {
    let a = 0, h = 0;
    for (const [r, c] of l) { if (b[r][c] === 2) a++; else if (b[r][c] === 1) h++; }
    if (a && h) continue;
    if (a === 3) s += 5; else if (a === 2) s += 2;
    if (h === 3) s -= 6; else if (h === 2) s -= 2;
  }
  return s;
}
function negamax(b, depth, alpha, beta, p) {
  const w = winnerOf(b);
  if (w) return w.p === p ? 10000 + depth : -10000 - depth;
  if (depth === 0) return (p === 2 ? 1 : -1) * evalBoard(b);
  let best = -Infinity, any = false;
  for (const c of [3, 2, 4, 1, 5, 0, 6]) {
    const r = drop(b, c, p); if (r < 0) continue;
    any = true;
    const v = -negamax(b, depth - 1, -beta, -alpha, 3 - p);
    b[r][c] = 0;
    if (v > best) best = v;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return any ? best : 0;
}
function aiMove() {
  let best = -Infinity, pick = 3;
  for (const c of [3, 2, 4, 1, 5, 0, 6]) {
    const r = drop(g, c, 2); if (r < 0) continue;
    const v = -negamax(g, 4, -Infinity, Infinity, 1) + Math.random() * 0.5;
    g[r][c] = 0;
    if (v > best) { best = v; pick = c; }
  }
  return pick;
}

function play(c) {
  if (over || anim || g[0][c]) return;
  const r = drop(g, c, turn);
  g[r][c] = 0; // placed after animation
  anim = { c, r, p: turn, y: TOP - S / 2, vy: 0, bounces: 0 };
  api.sound.whoosh();
}

function landed() {
  const { c, r, p } = anim;
  g[r][c] = p; anim = null; moves++;
  api.sound.hit();
  fx.burst(PAD + c * S + S / 2, TOP + PAD + r * S + S / 2, { count: 10, color: COLORS[p], speed: 140, life: 0.4 });
  const w = winnerOf(g);
  if (w) {
    over = true; winLine = w.l;
    const win = w.p === 1;
    const score = win ? 500 + (42 - moves) * 10 : 0;
    api.setScore(score);
    winLine.forEach(([rr, cc], i) => api.after(i * 120, () => { api.sound.note(4 + i); fx.burst(PAD + cc * S + S / 2, TOP + PAD + rr * S + S / 2, { count: 20, color: COLORS[w.p], speed: 220, life: 0.7 }); }));
    if (win) api.after(500, () => fx.confetti(W / 2, H / 2, 90));
    api.gameOver({ score, win, title: win ? "Four in a row!" : "The computer connects four", message: win ? `Won in ${Math.ceil(moves / 2)} moves` : "So close — try again!" });
    return;
  }
  if (g[0].every(Boolean)) { over = true; api.setScore(100); api.gameOver({ score: 100, title: "It's a draw!", message: "The board is full." }); return; }
  turn = 3 - turn;
  if (turn === 2) { thinking = true; api.after(350, () => { thinking = false; play(aiMove()); }); }
}

function draw(t, dt) {
  const bgG = ctx.createLinearGradient(0, 0, 0, H);
  bgG.addColorStop(0, "#0e2a5c"); bgG.addColorStop(1, "#06122e");
  ctx.fillStyle = bgG; ctx.fillRect(0, 0, W, H);
  // header: status
  const msg = over ? "" : turn === 1 ? "Your turn — drop a red disc" : "Computer is thinking…";
  text(ctx, msg, W / 2, 26, { size: 16, color: "#cfe0ff", weight: 800 });
  // hover disc
  if (!over && !anim && turn === 1 && hover != null) {
    const x = PAD + hover * S + S / 2;
    ctx.save(); ctx.globalAlpha = 0.9; orb(ctx, x, TOP - S / 2 + 12 + Math.sin(t / 200) * 3, S * 0.38, COLORS[1], 16); ctx.restore();
    ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fillRect(PAD + hover * S, TOP + PAD, S, R * S);
  }
  // discs behind board
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (g[r][c]) {
    const x = PAD + c * S + S / 2, y = TOP + PAD + r * S + S / 2;
    const win = winLine && winLine.some(([a, b2]) => a === r && b2 === c);
    orb(ctx, x, y, S * 0.4 * (win ? 1 + Math.sin(t / 120) * 0.06 : 1), COLORS[g[r][c]], win ? 30 : 0);
    ctx.strokeStyle = "rgba(0,0,0,0.18)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, S * 0.28, 0, TAU); ctx.stroke();
  }
  if (anim) {
    const target = TOP + PAD + anim.r * S + S / 2;
    anim.vy += 2600 * dt; anim.y += anim.vy * dt;
    if (anim.y >= target) {
      anim.y = target;
      if (anim.vy > 500 && anim.bounces < 2) { anim.vy *= -0.3; anim.bounces++; api.sound.tick(); } else landed();
    }
    if (anim) orb(ctx, PAD + anim.c * S + S / 2, anim.y, S * 0.4, COLORS[anim.p]);
  }
  // board with holes
  ctx.save();
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(PAD - 8, TOP + PAD - 8, C * S + 16, R * S + 16, 22) : ctx.rect(PAD - 8, TOP + PAD - 8, C * S + 16, R * S + 16);
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { const x = PAD + c * S + S / 2, y = TOP + PAD + r * S + S / 2; ctx.moveTo(x + S * 0.4, y); ctx.arc(x, y, S * 0.4, 0, TAU, true); }
  const bg2 = ctx.createLinearGradient(0, TOP, 0, H);
  bg2.addColorStop(0, "#2f6ff0"); bg2.addColorStop(1, "#1a45b8");
  ctx.fillStyle = bg2; ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 20; ctx.fill("evenodd");
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 2;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { ctx.beginPath(); ctx.arc(PAD + c * S + S / 2, TOP + PAD + r * S + S / 2, S * 0.4, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
  fillRR(ctx, PAD - 20, H - PAD + 2, C * S + 40, 12, 6, "#123a8f");
  for (let c = 0; c < C; c++) text(ctx, String(c + 1), PAD + c * S + S / 2, TOP + 4, { size: 11, color: "rgba(255,255,255,0.25)" });
  fx.draw(ctx); fl.draw(ctx);
}

export default {
  init(stage, a) {
    api = a;
    cv = makeCanvas(stage, W, H); ctx = cv.ctx;
    fx = new Particles(); fl = new Floaters();
    g = Array.from({ length: R }, () => Array(C).fill(0));
    turn = 1; hover = 3; anim = null; over = false; winLine = null; moves = 0; thinking = false;
    api.setScore(0);
    const col = (e) => Math.max(0, Math.min(C - 1, Math.floor((cv.toLocal(e).x - PAD) / S)));
    api.on(cv.canvas, "pointermove", (e) => (hover = col(e)));
    api.on(cv.canvas, "pointerdown", (e) => { hover = col(e); if (turn === 1 && !thinking) play(hover); });
    api.on(window, "keydown", (e) => {
      if (/^[1-7]$/.test(e.key) && turn === 1) { hover = +e.key - 1; play(hover); }
      if (e.key === "ArrowLeft") hover = Math.max(0, (hover ?? 3) - 1);
      if (e.key === "ArrowRight") hover = Math.min(C - 1, (hover ?? 3) + 1);
      if ((e.key === "ArrowDown" || e.key === " ") && turn === 1) play(hover ?? 3);
    });
    api.loop((dt, t) => { fx.update(dt); fl.update(dt); draw(t, dt); });
  }
};
