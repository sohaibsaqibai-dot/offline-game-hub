import { makeCanvas, Particles, Floaters, text, fillRR, TAU, el } from "../../hub/js/core/Engine.js";

const N = 5, S = 84, PAD = 44, TOP = 70, W = N * S + PAD * 2, H = TOP + N * S + PAD * 2;
const PC = { 1: "#ff4fa3", 2: "#3fa9ff" };
let api, cv, ctx, fx, fl;
let hl, vl, box, turn, scores, hover, over, mode, lock, last, fillAnim, bar;

// hl[r][c]: horizontal line r in 0..N, c in 0..N-1 ; vl[r][c]: vertical r in 0..N-1, c in 0..N
function allLines() {
  const out = [];
  for (let r = 0; r <= N; r++) for (let c = 0; c < N; c++) out.push(["h", r, c]);
  for (let r = 0; r < N; r++) for (let c = 0; c <= N; c++) out.push(["v", r, c]);
  return out;
}
const isSet = ([t, r, c]) => (t === "h" ? hl[r][c] : vl[r][c]);
function sides(r, c) { return (hl[r][c] ? 1 : 0) + (hl[r + 1][c] ? 1 : 0) + (vl[r][c] ? 1 : 0) + (vl[r][c + 1] ? 1 : 0); }
function boxesOf([t, r, c]) {
  const out = [];
  if (t === "h") { if (r > 0) out.push([r - 1, c]); if (r < N) out.push([r, c]); }
  else { if (c > 0) out.push([r, c - 1]); if (c < N) out.push([r, c]); }
  return out;
}

function take(line) {
  const [t, r, c] = line;
  if (isSet(line)) return;
  (t === "h" ? hl : vl)[r][c] = turn;
  last = line;
  api.sound.tick();
  let got = 0;
  for (const [br, bc] of boxesOf(line)) if (sides(br, bc) === 4 && !box[br][bc]) {
    box[br][bc] = turn; got++; scores[turn]++;
    fillAnim.push({ r: br, c: bc, t: 0 });
    const x = PAD + bc * S + S / 2, y = TOP + PAD + br * S + S / 2;
    fx.burst(x, y, { count: 16, color: PC[turn], speed: 180, life: 0.6 });
    fl.add(x, y, "+1", { color: "#fff", size: 18 });
  }
  if (got) api.sound.coin();
  if (scores[1] + scores[2] === N * N) return end();
  if (!got) turn = 3 - turn;
  if (mode === "cpu" && turn === 2) { lock = true; api.after(got ? 350 : 500, () => { lock = false; take(cpuPick()); }); }
  api.setScore(scores[1] * 20);
}

function cpuPick() {
  const free = allLines().filter((l) => !isSet(l));
  // 1) complete a box
  const win = free.find((l) => boxesOf(l).some(([r, c]) => sides(r, c) === 3));
  if (win) return win;
  // 2) safe line: doesn't give a 3rd side
  const safe = free.filter((l) => boxesOf(l).every(([r, c]) => sides(r, c) < 2));
  if (safe.length) return safe[Math.floor(Math.random() * safe.length)];
  // 3) give away the fewest boxes (approximate chain length)
  let best = free[0], bestCost = 99;
  for (const l of free) {
    const [t, r, c] = l; (t === "h" ? hl : vl)[r][c] = 9;
    const cost = boxesOf(l).filter(([br, bc]) => sides(br, bc) === 3).length * 2 + Math.random();
    (t === "h" ? hl : vl)[r][c] = 0;
    if (cost < bestCost) { bestCost = cost; best = l; }
  }
  return best;
}

function end() {
  over = true;
  const win = scores[1] > scores[2], draw = scores[1] === scores[2];
  const score = scores[1] * 20 + (win ? 300 : 0);
  api.setScore(score);
  if (win || mode === "2p") fx.confetti(W / 2, H / 2, 80);
  const who = mode === "cpu" ? (win ? "You win!" : draw ? "It's a tie!" : "The computer wins") : draw ? "It's a tie!" : `Player ${win ? 1 : 2} wins!`;
  api.gameOver({ score, win: mode === "cpu" && win, title: who, message: `Boxes: ${scores[1]} – ${scores[2]}` });
}

function nearest(p) {
  let best = null, bd = 18;
  for (const l of allLines()) {
    if (isSet(l)) continue;
    const [t, r, c] = l;
    const x1 = PAD + c * S, y1 = TOP + PAD + r * S;
    const [mx, my] = t === "h" ? [x1 + S / 2, y1] : [x1, y1 + S / 2];
    const d = t === "h" ? (Math.abs(p.x - mx) < S / 2 ? Math.abs(p.y - my) : 99) : (Math.abs(p.y - my) < S / 2 ? Math.abs(p.x - mx) : 99);
    if (d < bd) { bd = d; best = l; }
  }
  return best;
}

function line(x1, y1, x2, y2, color, w, glow) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = "round"; if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
}

function draw(t, dt) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#3a1030"); g.addColorStop(1, "#140820");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // scoreboard
  const names = mode === "cpu" ? ["You", "CPU"] : ["Player 1", "Player 2"];
  [1, 2].forEach((p, i) => {
    const x = i ? W - PAD - 150 : PAD, active = turn === p && !over;
    fillRR(ctx, x, 14, 150, 44, 14, active ? PC[p] : "rgba(255,255,255,0.07)");
    text(ctx, names[i], x + 16, 36, { size: 15, align: "left", color: active ? "#fff" : "#cbb8e0" });
    text(ctx, String(scores[p]), x + 134, 36, { size: 22, align: "right", weight: 900, color: "#fff" });
  });
  // boxes
  for (const f of fillAnim) f.t = Math.min(1, f.t + dt * 4);
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (box[r][c]) {
    const f = fillAnim.find((q) => q.r === r && q.c === c);
    const k = f ? f.t : 1, pad = 8 + (1 - k) * (S / 2 - 8);
    ctx.save(); ctx.globalAlpha = 0.85;
    fillRR(ctx, PAD + c * S + pad, TOP + PAD + r * S + pad, S - pad * 2, S - pad * 2, 12, PC[box[r][c]]);
    ctx.restore();
    if (k === 1) text(ctx, box[r][c] === 1 ? (mode === "cpu" ? "YOU" : "P1") : mode === "cpu" ? "CPU" : "P2", PAD + c * S + S / 2, TOP + PAD + r * S + S / 2, { size: 13, color: "rgba(255,255,255,0.9)" });
  }
  // lines
  for (let r = 0; r <= N; r++) for (let c = 0; c < N; c++) {
    const x = PAD + c * S, y = TOP + PAD + r * S;
    if (hl[r][c]) line(x + 6, y, x + S - 6, y, PC[hl[r][c]], 6, 12);
    else line(x + 10, y, x + S - 10, y, "rgba(255,255,255,0.08)", 4);
  }
  for (let r = 0; r < N; r++) for (let c = 0; c <= N; c++) {
    const x = PAD + c * S, y = TOP + PAD + r * S;
    if (vl[r][c]) line(x, y + 6, x, y + S - 6, PC[vl[r][c]], 6, 12);
    else line(x, y + 10, x, y + S - 10, "rgba(255,255,255,0.08)", 4);
  }
  if (hover && !over && !lock && !(mode === "cpu" && turn === 2)) {
    const [tt, r, c] = hover, x = PAD + c * S, y = TOP + PAD + r * S;
    ctx.save(); ctx.globalAlpha = 0.5 + Math.sin(t / 120) * 0.2;
    tt === "h" ? line(x + 6, y, x + S - 6, y, PC[turn], 6, 16) : line(x, y + 6, x, y + S - 6, PC[turn], 6, 16);
    ctx.restore();
  }
  if (last) {
    const [tt, r, c] = last, x = PAD + c * S + (tt === "h" ? S / 2 : 0), y = TOP + PAD + r * S + (tt === "v" ? S / 2 : 0);
    ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill();
  }
  // dots
  for (let r = 0; r <= N; r++) for (let c = 0; c <= N; c++) {
    ctx.save(); ctx.shadowColor = "#fff"; ctx.shadowBlur = 10; ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(PAD + c * S, TOP + PAD + r * S, 6, 0, TAU); ctx.fill(); ctx.restore();
  }
  fx.draw(ctx); fl.draw(ctx);
}

export default {
  init(stage, a) {
    api = a; mode = mode || "cpu";
    bar = el("div", "g-row");
    [["cpu", "🤖 vs CPU"], ["2p", "👥 2 Players"]].forEach(([k, l]) => {
      const b = el("button", "g-btn" + (mode === k ? " on" : ""), l);
      api.on(b, "click", () => { if (mode !== k) { mode = k; api.sound.click(); api.restart(); } });
      bar.appendChild(b);
    });
    stage.appendChild(bar);
    stage.style.setProperty("--cv-extra", "56px");
    cv = makeCanvas(stage, W, H); ctx = cv.ctx;
    fx = new Particles(); fl = new Floaters();
    hl = Array.from({ length: N + 1 }, () => Array(N).fill(0));
    vl = Array.from({ length: N }, () => Array(N + 1).fill(0));
    box = Array.from({ length: N }, () => Array(N).fill(0));
    turn = 1; scores = { 1: 0, 2: 0 }; hover = null; over = false; lock = false; last = null; fillAnim = [];
    api.setScore(0);
    api.on(cv.canvas, "pointermove", (e) => (hover = nearest(cv.toLocal(e))));
    api.on(cv.canvas, "pointerdown", (e) => {
      if (over || lock || (mode === "cpu" && turn === 2)) return;
      const l = nearest(cv.toLocal(e));
      if (l) take(l);
      hover = nearest(cv.toLocal(e));
    });
    api.loop((dt, t) => { fx.update(dt); fl.update(dt); draw(t, dt); });
  }
};
