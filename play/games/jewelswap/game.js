import { makeCanvas, Particles, Floaters, Shake, bg, text, fillRR, shade, randInt, TAU } from "../../hub/js/core/Engine.js";

const N = 8, S = 58, PAD = 16, TOP = 56, W = N * S + PAD * 2, H = TOP + N * S + PAD * 2;
const GEMS = [
  { c: "#ff4d6d", s: "circle" }, { c: "#ffc53d", s: "diamond" }, { c: "#3fa9ff", s: "square" },
  { c: "#7ee04a", s: "hex" }, { c: "#b07bff", s: "tri" }, { c: "#ff9f1c", s: "star" }
];
const TOTAL = 90;

let api, cv, ctx, fx, fl, shake, g, phase, sel, swapA, swapB, combo, score, time, over, idleT, hint, drag;

function gem(k, x, y) { return { k: k ?? randInt(0, GEMS.length - 1), x, y, sc: 1, dying: 0 }; }
function cx(c) { return PAD + c * S + S / 2; }
function cy(r) { return TOP + PAD + r * S + S / 2; }

function matches() {
  const out = new Set();
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const k = g[r][c]?.k;
    if (k === undefined) continue;
    if (c <= N - 3 && g[r][c + 1]?.k === k && g[r][c + 2]?.k === k) { let e = c; while (e < N && g[r][e]?.k === k) out.add(r * N + e++); }
    if (r <= N - 3 && g[r + 1][c]?.k === k && g[r + 2][c]?.k === k) { let e = r; while (e < N && g[e][c]?.k === k) out.add(e++ * N + c); }
  }
  return out;
}
function swapCells(a, b) { const t = g[a[0]][a[1]]; g[a[0]][a[1]] = g[b[0]][b[1]]; g[b[0]][b[1]] = t; }
function findMove() {
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) for (const [dr, dc] of [[0, 1], [1, 0]]) {
    const r2 = r + dr, c2 = c + dc;
    if (r2 >= N || c2 >= N) continue;
    swapCells([r, c], [r2, c2]);
    const m = matches().size;
    swapCells([r, c], [r2, c2]);
    if (m) return [[r, c], [r2, c2]];
  }
  return null;
}
function fill() {
  g = Array.from({ length: N }, (_, r) => Array.from({ length: N }, (_, c) => gem(null, c, r - N - 2 - c * 0.3)));
  // remove starting matches
  let m;
  while ((m = matches()).size) m.forEach((i) => (g[Math.floor(i / N)][i % N].k = randInt(0, GEMS.length - 1)));
  if (!findMove()) fill();
}
function settled() {
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const q = g[r][c]; if (q && (Math.abs(q.x - c) > 0.01 || Math.abs(q.y - r) > 0.01)) return false; }
  return true;
}

function trySwap(a, b) {
  if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) !== 1) return false;
  swapA = a; swapB = b; swapCells(a, b); phase = "swap"; sel = null; hint = null; idleT = 0;
  api.sound.flip();
  return true;
}

function resolve() {
  const m = matches();
  if (!m.size) {
    combo = 0;
    if (!findMove()) { fl.add(W / 2, H / 2, "No moves — shuffling!", { color: "#fff", size: 22, life: 1.4 }); fill(); phase = "fall"; return; }
    phase = "idle"; return;
  }
  combo++;
  const pts = m.size * 10 * combo + (m.size >= 4 ? 30 : 0) + (m.size >= 5 ? 60 : 0);
  score += pts; api.setScore(score);
  let sx = 0, sy = 0;
  m.forEach((i) => {
    const q = g[Math.floor(i / N)][i % N];
    q.dying = 0.001; sx += cx(q.x); sy += cy(q.y);
    fx.burst(cx(q.x), cy(q.y), { count: 10, color: GEMS[q.k].c, speed: 260, life: 0.6, size: 3.5 });
  });
  fl.add(sx / m.size, sy / m.size, combo > 1 ? `${combo}× COMBO +${pts}` : `+${pts}`, { color: combo > 1 ? "#ffe45c" : "#fff", size: combo > 1 ? 24 : 20 });
  if (combo > 1) { time = Math.min(TOTAL, time + 2); shake.kick(2 + combo); }
  api.sound.note(Math.min(9, combo + 2));
  if (m.size >= 5) api.sound.levelUp();
  phase = "pop";
}

function collapse() {
  for (let c = 0; c < N; c++) {
    const col = [];
    for (let r = N - 1; r >= 0; r--) if (g[r][c] && !g[r][c].dying) col.push(g[r][c]);
    let missing = N - col.length;
    for (let r = N - 1; r >= 0; r--) {
      const q = col.shift();
      g[r][c] = q || gem(null, c, -1 - (missing - r) - 0.5);
    }
    void missing;
  }
  phase = "fall";
}

function drawGem(q, x, y, r, t, hl) {
  const { c, s } = GEMS[q.k];
  ctx.save();
  ctx.translate(x, y);
  const sc = q.sc * (q.dying ? Math.max(0, 1 - q.dying * 5) * (1 + q.dying * 3) : 1);
  ctx.scale(sc, sc);
  if (hl) ctx.rotate(Math.sin(t / 120) * 0.12);
  const grd = ctx.createLinearGradient(-r, -r, r, r);
  grd.addColorStop(0, shade(c, 0.5)); grd.addColorStop(0.5, c); grd.addColorStop(1, shade(c, -0.4));
  ctx.fillStyle = grd; ctx.shadowColor = c; ctx.shadowBlur = hl ? 24 : 10;
  ctx.beginPath();
  if (s === "circle") ctx.arc(0, 0, r * 0.9, 0, TAU);
  else if (s === "diamond") { ctx.moveTo(0, -r); ctx.lineTo(r * 0.85, 0); ctx.lineTo(0, r); ctx.lineTo(-r * 0.85, 0); }
  else if (s === "square") { const k = r * 0.78; ctx.roundRect ? ctx.roundRect(-k, -k, k * 2, k * 2, 8) : ctx.rect(-k, -k, k * 2, k * 2); }
  else if (s === "hex") for (let i = 0; i < 6; i++) ctx.lineTo(Math.cos(i * TAU / 6) * r * 0.92, Math.sin(i * TAU / 6) * r * 0.92);
  else if (s === "tri") { ctx.moveTo(0, -r); ctx.lineTo(r * 0.95, r * 0.75); ctx.lineTo(-r * 0.95, r * 0.75); }
  else for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r; ctx.lineTo(Math.cos(i * TAU / 10 - Math.PI / 2) * rr, Math.sin(i * TAU / 10 - Math.PI / 2) * rr); }
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  // facets / shine
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath(); ctx.ellipse(-r * 0.28, -r * 0.35, r * 0.28, r * 0.14, -0.6, 0, TAU); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
}

function draw(t) {
  bg(ctx, W, H, "#2b0f5c", "#0f0626");
  ctx.save(); shake.apply(ctx);
  // time bar
  fillRR(ctx, PAD, 16, W - PAD * 2, 14, 7, "rgba(255,255,255,0.08)");
  const k = Math.max(0, time / TOTAL);
  const tg = ctx.createLinearGradient(PAD, 0, W - PAD, 0); tg.addColorStop(0, "#ff4fa3"); tg.addColorStop(1, "#8b5cf6");
  fillRR(ctx, PAD, 16, (W - PAD * 2) * k, 14, 7, time < 10 ? (Math.floor(t / 250) % 2 ? "#ff4d6d" : "#ff9f1c") : tg);
  text(ctx, combo > 1 ? `COMBO ×${combo}` : "", W / 2, 44, { size: 13, color: "#ffe45c", weight: 900 });
  // board
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) fillRR(ctx, PAD + c * S + 2, TOP + PAD + r * S + 2, S - 4, S - 4, 10, (r + c) % 2 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.09)");
  ctx.save(); ctx.beginPath(); ctx.rect(0, TOP + PAD - 2, W, N * S + 4); ctx.clip();
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const q = g[r][c]; if (!q) continue;
    const isSel = sel && sel[0] === r && sel[1] === c;
    const isHint = hint && ((hint[0][0] === r && hint[0][1] === c) || (hint[1][0] === r && hint[1][1] === c));
    if (isSel) fillRR(ctx, cx(q.x) - S / 2 + 2, cy(q.y) - S / 2 + 2, S - 4, S - 4, 10, "rgba(255,255,255,0.25)");
    drawGem(q, cx(q.x), cy(q.y), S * 0.36, t, isSel || isHint);
  }
  ctx.restore();
  fx.draw(ctx); fl.draw(ctx);
  ctx.restore();
}

function cellAt(p) {
  const c = Math.floor((p.x - PAD) / S), r = Math.floor((p.y - TOP - PAD) / S);
  return r >= 0 && r < N && c >= 0 && c < N ? [r, c] : null;
}

export default {
  init(stage, a) {
    api = a;
    cv = makeCanvas(stage, W, H); ctx = cv.ctx;
    fx = new Particles(); fl = new Floaters(); shake = new Shake();
    score = 0; time = TOTAL; over = false; combo = 0; sel = null; idleT = 0; hint = null; drag = null;
    fill(); phase = "fall";
    api.setScore(0); api.setTimer(TOTAL);
    api.on(cv.canvas, "pointerdown", (e) => {
      if (phase !== "idle" || over) return;
      const p = cellAt(cv.toLocal(e)); if (!p) return;
      drag = { p, start: cv.toLocal(e) };
      if (sel && trySwap(sel, p)) return;
      sel = sel && sel[0] === p[0] && sel[1] === p[1] ? null : p;
      api.sound.tick();
    });
    api.on(cv.canvas, "pointermove", (e) => {
      if (!drag || !e.buttons || phase !== "idle") return;
      const q = cv.toLocal(e), dx = q.x - drag.start.x, dy = q.y - drag.start.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < S * 0.4) return;
      const [r, c] = drag.p;
      const tgt = Math.abs(dx) > Math.abs(dy) ? [r, c + Math.sign(dx)] : [r + Math.sign(dy), c];
      drag = null;
      if (tgt[0] >= 0 && tgt[0] < N && tgt[1] >= 0 && tgt[1] < N) trySwap([r, c], tgt);
    });
    api.on(window, "pointerup", () => (drag = null));

    let popT = 0;
    api.loop((dt, t) => {
      fx.update(dt); fl.update(dt); shake.update(dt);
      if (!over) {
        time -= dt; api.setTimer(Math.max(0, Math.ceil(time)));
        if (time <= 0 && phase === "idle") { over = true; api.gameOver({ score, title: "Time's up!", message: "Sparkling work!" }); }
      }
      // animate positions
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const q = g[r][c]; if (!q) continue;
        const sp = dt * (phase === "fall" ? 14 : 9);
        q.x += Math.sign(c - q.x) * Math.min(Math.abs(c - q.x), sp);
        q.y += Math.sign(r - q.y) * Math.min(Math.abs(r - q.y), sp);
        if (q.dying) q.dying += dt;
      }
      if (phase === "swap" && settled()) {
        if (matches().size) resolve();
        else { swapCells(swapA, swapB); phase = "unswap"; api.sound.error(); }
      } else if (phase === "unswap" && settled()) phase = "idle";
      else if (phase === "fall" && settled()) resolve();
      else if (phase === "pop") { popT += dt; if (popT > 0.2) { popT = 0; collapse(); } }
      if (phase === "idle" && !over) { idleT += dt; if (idleT > 6 && !hint) hint = findMove(); }
      draw(t);
    });
  }
};
