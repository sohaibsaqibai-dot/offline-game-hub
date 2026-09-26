import { makeCanvas, Particles, Floaters, text, TAU } from "../../hub/js/core/Engine.js";

const W = 460, H = 680, BH = 22, CX = W / 2, BASEY = H * 0.6, RANGE = 190, SC = 0.64;
let api, cv, ctx, fx, fl;
let stack, mover, falling, camY, over, perfect, hue0, ripples, t0;

const col = (i, l = 62) => `hsl(${(hue0 + i * 7) % 360}, 75%, ${l}%)`;
function P(x, z, h) { return [CX + (x - z) * 0.866 * SC, BASEY + (x + z) * 0.5 * SC - h + camY]; }
function poly(pts, fill) { ctx.fillStyle = fill; ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill(); }
function prism(b, h, i, alpha = 1, bh = BH) {
  ctx.save(); ctx.globalAlpha = alpha;
  poly([P(b.x0, b.z1, h), P(b.x1, b.z1, h), P(b.x1, b.z1, h - bh), P(b.x0, b.z1, h - bh)], col(i, 48));
  poly([P(b.x1, b.z0, h), P(b.x1, b.z1, h), P(b.x1, b.z1, h - bh), P(b.x1, b.z0, h - bh)], col(i, 38));
  poly([P(b.x0, b.z0, h), P(b.x1, b.z0, h), P(b.x1, b.z1, h), P(b.x0, b.z1, h)], col(i, 66));
  // top highlight edge
  ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1;
  ctx.beginPath(); const a = P(b.x0, b.z1, h), c = P(b.x0, b.z0, h), d = P(b.x1, b.z0, h); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.stroke();
  ctx.restore();
}

function newMover() {
  const top = stack[stack.length - 1];
  const axis = stack.length % 2 ? "x" : "z";
  const m = { ...top, axis, dir: 1, speed: 190 + Math.min(220, stack.length * 7) };
  const w = axis === "x" ? top.x1 - top.x0 : top.z1 - top.z0;
  if (axis === "x") { m.x0 = -RANGE - w / 2; m.x1 = m.x0 + w; } else { m.z0 = -RANGE - w / 2; m.z1 = m.z0 + w; }
  mover = m;
}

function drop() {
  if (over || !mover) return;
  const top = stack[stack.length - 1];
  const a = mover.axis, lo = a + "0", hi = a + "1";
  const off = mover[lo] - top[lo];
  const size = top[hi] - top[lo];
  const level = stack.length;
  if (Math.abs(off) >= size) {
    falling.push({ b: { ...mover }, h: (level + 1) * BH, vy: 0, i: level, a: 1 });
    mover = null; over = true;
    api.sound.explode();
    api.gameOver({ score: level - 1, message: `Your tower reached ${level - 1} blocks high!` });
    return;
  }
  let nb = { x0: mover.x0, x1: mover.x1, z0: mover.z0, z1: mover.z1 };
  const [mx, my] = P((nb.x0 + nb.x1) / 2, (nb.z0 + nb.z1) / 2, (level + 1) * BH);
  if (Math.abs(off) < 5) {
    nb[lo] = top[lo]; nb[hi] = top[hi];
    perfect++;
    if (perfect >= 3) { const grow = Math.min(10, 200 - size); nb[lo] -= grow / 2; nb[hi] += grow / 2; }
    ripples.push({ b: { ...nb }, h: (level + 1) * BH - BH, t: 0 });
    api.sound.note(Math.min(9, 3 + perfect));
    fl.add(mx, my - 40, perfect > 1 ? `PERFECT ×${perfect}` : "PERFECT!", { color: "#fff", size: 20 });
    fx.burst(mx, my, { count: 20, colors: ["#fff", col(level, 70)], speed: 200, life: 0.6 });
  } else {
    perfect = 0;
    const cut = { ...nb };
    if (off > 0) { nb[hi] = top[hi]; cut[lo] = top[hi]; } else { nb[lo] = top[lo]; cut[hi] = top[lo]; }
    falling.push({ b: cut, h: (level + 1) * BH, vy: 0, i: level, a: 1 });
    api.sound.hit();
  }
  stack.push(nb);
  api.setScore(stack.length - 1);
  if ((stack.length - 1) % 10 === 0) { api.sound.levelUp(); fx.confetti(W / 2, 120, 50); }
  newMover();
}

function draw(t, dt) {
  const k = stack.length;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, `hsl(${(hue0 + k * 7 + 180) % 360}, 45%, 18%)`);
  g.addColorStop(1, `hsl(${(hue0 + k * 7 + 210) % 360}, 55%, 8%)`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // floating particles
  for (let i = 0; i < 25; i++) {
    const y = (i * 83 - t / 30) % H; const yy = y < 0 ? y + H : y;
    ctx.fillStyle = `rgba(255,255,255,${0.05 + (i % 4) * 0.03})`; ctx.beginPath(); ctx.arc((i * 131) % W, yy, 1 + (i % 3), 0, TAU); ctx.fill();
  }
  camY += ((Math.max(0, k - 5) * BH) - camY) * Math.min(1, dt * 5);
  // base pillar
  const base = stack[0];
  prism(base, BH, 0, 1, 400);
  for (let i = 1; i < stack.length; i++) prism(stack[i], (i + 1) * BH, i);
  for (const r of ripples) {
    r.t += dt;
    const e = r.t * 60;
    ctx.save(); ctx.globalAlpha = Math.max(0, 1 - r.t * 1.6); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
    const q = [P(r.b.x0 - e, r.b.z0 - e, r.h + BH), P(r.b.x1 + e, r.b.z0 - e, r.h + BH), P(r.b.x1 + e, r.b.z1 + e, r.h + BH), P(r.b.x0 - e, r.b.z1 + e, r.h + BH)];
    ctx.beginPath(); q.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.stroke(); ctx.restore();
  }
  ripples = ripples.filter((r) => r.t < 0.7);
  for (const f of falling) { f.vy += 1400 * dt; f.h -= f.vy * dt; f.a -= dt * 0.8; prism(f.b, f.h, f.i, Math.max(0, f.a)); }
  falling = falling.filter((f) => f.a > 0);
  if (mover) prism(mover, (stack.length + 1) * BH, stack.length);
  fx.draw(ctx); fl.draw(ctx);
  text(ctx, String(stack.length - 1), W / 2, 90, { size: 72, weight: 900, color: "rgba(255,255,255,0.92)", glow: 20, glowColor: col(k, 60) });
  if (t - t0 < 2500 && stack.length === 1) text(ctx, "Tap / Space to drop", W / 2, 150, { size: 18, color: "rgba(255,255,255,0.8)" });
}

export default {
  init(stage, a) {
    api = a;
    cv = makeCanvas(stage, W, H); ctx = cv.ctx;
    fx = new Particles(); fl = new Floaters();
    hue0 = Math.floor(Math.random() * 360);
    stack = [{ x0: -80, x1: 80, z0: -80, z1: 80 }];
    falling = []; ripples = []; camY = 0; over = false; perfect = 0; t0 = performance.now();
    newMover();
    api.setScore(0);
    api.on(cv.canvas, "pointerdown", drop);
    api.on(window, "keydown", (e) => { if ((e.key === " " || e.key === "Enter" || e.key === "ArrowDown") && !e.repeat) drop(); });
    api.loop((dt, t) => {
      if (mover) {
        const a2 = mover.axis, lo = a2 + "0", hi = a2 + "1", w = mover[hi] - mover[lo];
        mover[lo] += mover.dir * mover.speed * dt;
        if (mover[lo] > RANGE - w / 2) { mover[lo] = RANGE - w / 2; mover.dir = -1; }
        if (mover[lo] < -RANGE - w / 2) { mover[lo] = -RANGE - w / 2; mover.dir = 1; }
        mover[hi] = mover[lo] + w;
      }
      fx.update(dt); fl.update(dt);
      draw(t, dt);
    });
  }
};
