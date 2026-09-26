import { makeCanvas, Particles, Floaters, text, fillRR, clamp, TAU } from "../../hub/js/core/Engine.js";

const W = 640, H = 480, B = 20, BR = 7, HR = 12;
const HOLES = [
  { par: 2, start: [110, 240], hole: [530, 240], walls: [], sand: [], water: [], bump: [] },
  { par: 3, start: [100, 390], hole: [540, 100], walls: [[300, 110, 28, 260]], sand: [], water: [], bump: [] },
  { par: 3, start: [80, 240], hole: [560, 240], walls: [[180, 20, 20, 150], [180, 310, 20, 150]], sand: [[270, 150, 150, 180]], water: [], bump: [] },
  { par: 3, start: [90, 400], hole: [555, 85], walls: [], sand: [], water: [[280, 20, 80, 170], [280, 300, 80, 160]], bump: [] },
  { par: 4, start: [80, 420], hole: [560, 60], walls: [[190, 20, 22, 300], [400, 160, 22, 300]], sand: [[450, 20, 60, 80]], water: [], bump: [] },
  { par: 3, start: [80, 240], hole: [545, 240], walls: [[480, 170, 124, 16], [480, 296, 124, 16], [588, 170, 16, 142], [300, 205, 50, 70]], sand: [], water: [], bump: [] },
  { par: 3, start: [80, 240], hole: [570, 240], walls: [], sand: [], water: [], bump: [[320, 150, 32], [320, 330, 32], [220, 240, 26], [430, 240, 26], [500, 150, 18], [500, 330, 18]] },
  { par: 3, start: [80, 400], hole: [540, 110], walls: [], sand: [[450, 50, 150, 110]], water: [[200, 170, 230, 130]], bump: [[140, 150, 22]] },
  { par: 5, start: [70, 420], hole: [570, 420], walls: [[150, 20, 22, 330], [290, 130, 22, 330], [430, 20, 22, 330]], sand: [[312, 20, 118, 60]], water: [], bump: [] }
];
let api, cv, ctx, fx, fl;
let idx, lv, ball, strokes, total, card, aiming, aimP, state, safe, sinkT, t0;

function load(i) {
  idx = i; lv = HOLES[i];
  ball = { x: lv.start[0], y: lv.start[1], vx: 0, vy: 0, s: 1 };
  safe = { x: ball.x, y: ball.y };
  strokes = 0; state = "play"; sinkT = 0; t0 = performance.now();
  api.hud({ level: `${i + 1}/9` });
}
const inRect = (x, y, [rx, ry, rw, rh]) => x > rx && x < rx + rw && y > ry && y < ry + rh;
const moving = () => Math.hypot(ball.vx, ball.vy) > 4;

function physics(dt) {
  const sand = lv.sand.some((r) => inRect(ball.x, ball.y, r));
  const fr = Math.pow(sand ? 0.12 : 0.55, dt);
  ball.vx *= fr; ball.vy *= fr;
  const steps = 4;
  for (let s = 0; s < steps; s++) {
    ball.x += (ball.vx * dt) / steps; ball.y += (ball.vy * dt) / steps;
    // borders
    if (ball.x < B + BR) { ball.x = B + BR; ball.vx = Math.abs(ball.vx) * 0.8; api.sound.bounce(); }
    if (ball.x > W - B - BR) { ball.x = W - B - BR; ball.vx = -Math.abs(ball.vx) * 0.8; api.sound.bounce(); }
    if (ball.y < B + BR) { ball.y = B + BR; ball.vy = Math.abs(ball.vy) * 0.8; api.sound.bounce(); }
    if (ball.y > H - B - BR) { ball.y = H - B - BR; ball.vy = -Math.abs(ball.vy) * 0.8; api.sound.bounce(); }
    for (const [rx, ry, rw, rh] of lv.walls) {
      const nx = clamp(ball.x, rx, rx + rw), ny = clamp(ball.y, ry, ry + rh);
      const dx = ball.x - nx, dy = ball.y - ny, d = Math.hypot(dx, dy);
      if (d < BR && d > 0) {
        const ux = dx / d, uy = dy / d;
        ball.x = nx + ux * BR; ball.y = ny + uy * BR;
        const dot = ball.vx * ux + ball.vy * uy;
        if (dot < 0) { ball.vx -= 1.8 * dot * ux; ball.vy -= 1.8 * dot * uy; api.sound.bounce(); }
      } else if (d === 0) { ball.vx *= -1; ball.vy *= -1; }
    }
    for (const [bx, by, br] of lv.bump) {
      const dx = ball.x - bx, dy = ball.y - by, d = Math.hypot(dx, dy);
      if (d < br + BR) {
        const ux = dx / d, uy = dy / d;
        ball.x = bx + ux * (br + BR); ball.y = by + uy * (br + BR);
        const dot = ball.vx * ux + ball.vy * uy;
        if (dot < 0) { ball.vx -= 2.1 * dot * ux; ball.vy -= 2.1 * dot * uy; api.sound.bounce(); fx.burst(ball.x, ball.y, { count: 6, color: "#ff4fa3", speed: 120, life: 0.3 }); }
      }
    }
  }
  // hole
  const hd = Math.hypot(ball.x - lv.hole[0], ball.y - lv.hole[1]);
  const sp = Math.hypot(ball.vx, ball.vy);
  if (hd < HR && sp < 420) { sink(); return; }
  if (hd < HR + 6 && sp < 420) { ball.vx += (lv.hole[0] - ball.x) * 6 * dt; ball.vy += (lv.hole[1] - ball.y) * 6 * dt; }
  // water
  if (lv.water.some((r) => inRect(ball.x, ball.y, r))) {
    fx.burst(ball.x, ball.y, { count: 20, color: "#6fd0ff", speed: 150, life: 0.6 });
    fl.add(ball.x, ball.y - 20, "SPLASH! +1", { color: "#6fd0ff", size: 18 });
    api.sound.whoosh();
    strokes++;
    ball.x = safe.x; ball.y = safe.y; ball.vx = 0; ball.vy = 0;
  }
  if (!moving()) { ball.vx = 0; ball.vy = 0; }
}

function sink() {
  state = "sunk"; sinkT = 0;
  ball.vx = 0; ball.vy = 0; ball.x = lv.hole[0]; ball.y = lv.hole[1];
  total += strokes;
  card.push(strokes);
  const diff = strokes - lv.par;
  const name = strokes === 1 ? "HOLE IN ONE!" : diff <= -2 ? "EAGLE!" : diff === -1 ? "BIRDIE!" : diff === 0 ? "PAR" : diff === 1 ? "BOGEY" : `+${diff}`;
  fl.add(W / 2, H / 2 - 30, name, { color: diff < 0 ? "#ffe45c" : "#fff", size: 40, life: 1.6, vy: -20 });
  diff < 0 ? (fx.confetti(lv.hole[0], lv.hole[1], 60), api.sound.win()) : api.sound.levelUp();
  const parSoFar = HOLES.slice(0, card.length).reduce((s, h) => s + h.par, 0);
  api.setScore(Math.max(0, 450 + (parSoFar - total) * 50));
  api.after(1700, () => {
    if (idx + 1 >= HOLES.length) {
      const totalPar = HOLES.reduce((s, h) => s + h.par, 0);
      const score = Math.max(50, 900 + (totalPar - total) * 60);
      api.setScore(score);
      const rel = total - totalPar;
      api.gameOver({ score, win: rel <= 0, title: rel < 0 ? "Under par — amazing!" : rel === 0 ? "Right on par!" : "Round complete!", message: `${total} strokes (par ${totalPar}, ${rel > 0 ? "+" : ""}${rel})` });
    } else load(idx + 1);
  });
}

function draw(t) {
  ctx.fillStyle = "#1b3a1f"; ctx.fillRect(0, 0, W, H);
  // course
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 20;
  fillRR(ctx, B - 10, B - 10, W - 2 * B + 20, H - 2 * B + 20, 22, "#7a4a22"); ctx.restore();
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#5fcf5a"); g.addColorStop(1, "#3fae42");
  fillRR(ctx, B, B, W - 2 * B, H - 2 * B, 14, g);
  ctx.save(); ctx.beginPath(); ctx.rect(B, B, W - 2 * B, H - 2 * B); ctx.clip();
  for (let x = B; x < W; x += 40) { ctx.fillStyle = "rgba(255,255,255,0.04)"; ctx.fillRect(x, B, 20, H); }
  for (const [rx, ry, rw, rh] of lv.sand) { fillRR(ctx, rx, ry, rw, rh, 26, "#f2d98a"); ctx.fillStyle = "rgba(180,140,60,0.25)"; for (let i = 0; i < 20; i++) ctx.fillRect(rx + ((i * 37) % rw), ry + ((i * 53) % rh), 2, 2); }
  for (const [rx, ry, rw, rh] of lv.water) {
    const wg = ctx.createLinearGradient(rx, ry, rx, ry + rh); wg.addColorStop(0, "#3fa9ff"); wg.addColorStop(1, "#1f6fd0");
    fillRR(ctx, rx, ry, rw, rh, 14, wg);
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) { const yy = ry + 20 + i * (rh / 4); ctx.beginPath(); for (let x = rx + 8; x < rx + rw - 8; x += 4) ctx.lineTo(x, yy + Math.sin(x / 10 + t / 300) * 3); ctx.stroke(); }
  }
  ctx.restore();
  for (const [rx, ry, rw, rh] of lv.walls) {
    ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
    fillRR(ctx, rx, ry, rw, rh, 6, "#9a6234"); ctx.restore();
    fillRR(ctx, rx + 3, ry + 3, rw - 6, Math.min(8, rh - 6), 4, "rgba(255,255,255,0.18)");
  }
  for (const [bx, by, br] of lv.bump) {
    ctx.save(); ctx.shadowColor = "#ff4fa3"; ctx.shadowBlur = 16;
    const bg2 = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.3, 2, bx, by, br);
    bg2.addColorStop(0, "#ffb3d9"); bg2.addColorStop(1, "#d6247a");
    ctx.fillStyle = bg2; ctx.beginPath(); ctx.arc(bx, by, br, 0, TAU); ctx.fill(); ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bx, by, br * 0.6, 0, TAU); ctx.stroke();
  }
  // hole + flag
  const [hx, hy] = lv.hole;
  ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.beginPath(); ctx.ellipse(hx, hy + 2, HR + 5, HR + 3, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#0e1f0e"; ctx.beginPath(); ctx.arc(hx, hy, HR, 0, TAU); ctx.fill();
  if (state !== "sunk" || sinkT < 0.3) {
    ctx.fillStyle = "#f4f4f4"; ctx.fillRect(hx - 1.5, hy - 56, 3, 56);
    const wave = Math.sin(t / 200) * 4;
    ctx.fillStyle = "#ff4d6d"; ctx.beginPath(); ctx.moveTo(hx + 1.5, hy - 56); ctx.quadraticCurveTo(hx + 16, hy - 50 + wave, hx + 28, hy - 46); ctx.lineTo(hx + 1.5, hy - 36); ctx.fill();
  }
  // aim guide
  if (aiming && aimP && state === "play" && !moving()) {
    const dx = ball.x - aimP.x, dy = ball.y - aimP.y, pw = Math.min(1, Math.hypot(dx, dy) / 140);
    const ang = Math.atan2(dy, dx);
    ctx.save(); ctx.translate(ball.x, ball.y); ctx.rotate(ang);
    for (let i = 1; i <= 8; i++) { ctx.fillStyle = `rgba(255,255,255,${0.7 - i * 0.07})`; ctx.beginPath(); ctx.arc(i * 14 * (0.5 + pw), 0, 3, 0, TAU); ctx.fill(); }
    ctx.restore();
    const col = pw < 0.5 ? "#7ee04a" : pw < 0.8 ? "#ffc53d" : "#ff4d6d";
    fillRR(ctx, ball.x - 30, ball.y + 16, 60, 8, 4, "rgba(0,0,0,0.35)");
    fillRR(ctx, ball.x - 30, ball.y + 16, 60 * pw, 8, 4, col);
  }
  // ball
  if (state !== "sunk" || sinkT < 0.3) {
    const sc = state === "sunk" ? Math.max(0, 1 - sinkT / 0.3) : 1;
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(ball.x + 2, ball.y + 4, BR * sc, BR * 0.6 * sc, 0, 0, TAU); ctx.fill();
    const bg3 = ctx.createRadialGradient(ball.x - 2, ball.y - 3, 1, ball.x, ball.y, BR * sc);
    bg3.addColorStop(0, "#fff"); bg3.addColorStop(1, "#cfd6e6");
    ctx.fillStyle = bg3; ctx.beginPath(); ctx.arc(ball.x, ball.y, BR * sc, 0, TAU); ctx.fill();
  }
  // HUD strip
  fillRR(ctx, W / 2 - 150, 0, 300, 26, 10, "rgba(0,0,0,0.45)");
  text(ctx, `HOLE ${idx + 1}/9 · PAR ${lv.par} · STROKES ${strokes}`, W / 2, 13, { size: 12.5, color: "#fff" });
  if (performance.now() - t0 < 2200 && idx === 0 && strokes === 0) text(ctx, "Drag back from the ball, release to putt", W / 2, H - 40, { size: 15, color: "#fff", stroke: { color: "rgba(0,0,0,0.4)", width: 5 } });
  fx.draw(ctx); fl.draw(ctx);
}

export default {
  init(stage, a) {
    api = a;
    cv = makeCanvas(stage, W, H); ctx = cv.ctx;
    fx = new Particles(); fl = new Floaters();
    total = 0; card = []; aiming = false; aimP = null;
    load(0);
    api.setScore(0);
    api.on(cv.canvas, "pointerdown", (e) => { if (state !== "play" || moving()) return; aiming = true; aimP = cv.toLocal(e); cv.canvas.setPointerCapture?.(e.pointerId); });
    api.on(cv.canvas, "pointermove", (e) => { if (aiming) aimP = cv.toLocal(e); });
    api.on(cv.canvas, "pointerup", (e) => {
      if (!aiming) return; aiming = false;
      const p = cv.toLocal(e);
      const dx = ball.x - p.x, dy = ball.y - p.y, d = Math.hypot(dx, dy);
      if (d < 8) return;
      const pw = Math.min(1, d / 140) * 820;
      safe = { x: ball.x, y: ball.y };
      ball.vx = (dx / d) * pw; ball.vy = (dy / d) * pw;
      strokes++;
      api.sound.hit();
      if (strokes >= 10) { fl.add(ball.x, ball.y - 20, "Max strokes", { color: "#ff4d6d" }); }
    });
    api.loop((dt, t) => {
      if (state === "play") {
        physics(dt);
        if (state === "play" && strokes >= 10 && !moving()) { strokes = lv.par + 4; state = "sunk"; sink(); }
      } else sinkT += dt;
      fx.update(dt); fl.update(dt);
      draw(t);
    });
  }
};
