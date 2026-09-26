import { makeCanvas, Particles, Floaters, text, rand, heldKeys, TAU, fillRR } from "../../hub/js/core/Engine.js";

const W = 420, H = 680, G = 1300, JUMP = 720;
let api, cv, ctx, fx, fl, keys;
let bonus, pl, plats, camY, maxH, score, over, pointerX, stars, lastY, t0;

function makePlat(y) {
  const hgt = -y;
  const r = Math.random();
  let kind = "normal";
  if (hgt > 800 && r < Math.min(0.22, hgt / 20000)) kind = "break";
  else if (hgt > 400 && r < 0.4 && r > 0.22) kind = "move";
  const p = { x: rand(10, W - 90), y, w: kind === "break" ? 76 : 80, kind, vx: kind === "move" ? rand(50, 110) * (Math.random() < 0.5 ? -1 : 1) : 0, spring: kind === "normal" && Math.random() < 0.09, broken: false, bob: rand(0, TAU) };
  if (Math.random() < 0.18) stars.push({ x: p.x + p.w / 2, y: y - 40, got: false });
  return p;
}

function update(dt) {
  let dir = 0;
  if (keys.has("ArrowLeft") || keys.has("a")) dir--;
  if (keys.has("ArrowRight") || keys.has("d")) dir++;
  if (dir) { pl.vx += dir * 2600 * dt; pointerX = null; }
  else if (pointerX != null) { const dx = pointerX - pl.x; pl.vx = Math.max(-420, Math.min(420, dx * 7)); }
  else pl.vx *= Math.pow(0.002, dt);
  pl.vx = Math.max(-420, Math.min(420, pl.vx));
  pl.x += pl.vx * dt;
  if (pl.x < -20) pl.x = W + 20; if (pl.x > W + 20) pl.x = -20;
  lastY = pl.y;
  pl.vy += G * dt; pl.y += pl.vy * dt;
  pl.squash = Math.max(0, pl.squash - dt * 4);
  if (Math.abs(pl.vx) > 20) pl.face = Math.sign(pl.vx);

  for (const p of plats) {
    if (p.kind === "move") { p.x += p.vx * dt; if (p.x < 0 || p.x + p.w > W) p.vx *= -1; }
    if (p.broken) { p.fall = (p.fall || 0) + dt; p.y += 400 * dt * p.fall * 3; continue; }
    if (pl.vy > 0 && lastY + 18 <= p.y + 4 && pl.y + 18 >= p.y && pl.x > p.x - 14 && pl.x < p.x + p.w + 14) {
      if (p.kind === "break") { p.broken = true; api.sound.hit(); fx.burst(pl.x, p.y, { count: 14, color: "#b8b0d8", speed: 150, life: 0.6, gravity: 500, shape: "rect", glow: false }); continue; }
      pl.y = p.y - 18;
      const spring = p.spring && Math.abs(pl.x - (p.x + p.w / 2)) < 22;
      pl.vy = spring ? -JUMP * 1.7 : -JUMP;
      pl.squash = 1;
      if (spring) { p.sprung = 0.3; api.sound.levelUp(); fx.burst(pl.x, p.y, { count: 20, colors: ["#ff4d6d", "#ffe45c"], speed: 220, life: 0.6 }); }
      else { api.sound.jump(); fx.burst(pl.x, p.y, { count: 6, color: "#ffffff", speed: 90, life: 0.4, angle: -Math.PI / 2, spread: 2.4 }); }
    }
    if (p.sprung) p.sprung = Math.max(0, p.sprung - dt);
  }
  for (const s of stars) if (!s.got && Math.hypot(s.x - pl.x, s.y - pl.y) < 26) {
    s.got = true; bonus += 25; api.sound.coin();
    fx.burst(s.x, s.y, { count: 16, color: "#ffe45c", speed: 200, life: 0.6 });
    fl.add(s.x, s.y - 10, "+25", { color: "#ffe45c", size: 18 });
  }
  // camera
  const target = pl.y - H * 0.42;
  if (target < camY) camY += (target - camY) * Math.min(1, dt * 8);
  maxH = Math.max(maxH, -pl.y + H * 0.6);
  score = Math.max(0, Math.floor(maxH / 10)) + bonus;
  api.setScore(score);
  // recycle
  plats = plats.filter((p) => p.y < camY + H + 60);
  stars = stars.filter((s) => s.y < camY + H + 60);
  let top = Math.min(...plats.map((p) => p.y));
  const gap = Math.min(150, 70 + (-camY) / 90);
  while (top > camY - 100) { top -= rand(gap * 0.6, gap); plats.push(makePlat(top)); }
  if (pl.y > camY + H + 40) { over = true; api.sound.whoosh(); api.gameOver({ score, message: `You bounced ${score} m into the sky!` }); }
}

function cloudShape(x, y, w, color, shadow) {
  ctx.fillStyle = shadow; ctx.beginPath(); ctx.ellipse(x + w / 2, y + 12, w / 2, 7, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + w * 0.25, y + 2, 12, 0, TAU); ctx.arc(x + w * 0.5, y - 4, 16, 0, TAU); ctx.arc(x + w * 0.76, y + 2, 12, 0, TAU);
  ctx.fill();
  fillRR(ctx, x, y, w, 14, 7, color);
}

function draw(t) {
  const hk = Math.min(1, -camY / 12000);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, `hsl(${210 + hk * 50}, ${70 - hk * 20}%, ${70 - hk * 55}%)`);
  g.addColorStop(1, `hsl(${195 + hk * 60}, 80%, ${88 - hk * 60}%)`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // parallax background clouds / stars
  for (let i = 0; i < 8; i++) {
    const y = ((i * 170 - camY * 0.3) % (H + 200) + H + 200) % (H + 200) - 100;
    ctx.fillStyle = `rgba(255,255,255,${0.18 - hk * 0.12})`;
    ctx.beginPath(); ctx.ellipse((i * 137) % W, y, 70, 22, 0, 0, TAU); ctx.fill();
  }
  if (hk > 0.3) for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(255,255,255,${(hk - 0.3) * 1.2 * (0.4 + (i % 3) * 0.2)})`; ctx.fillRect((i * 97) % W, ((i * 61 - camY * 0.1) % H + H) % H, 2, 2); }

  ctx.save(); ctx.translate(0, -camY);
  for (const p of plats) {
    const y = p.y + (p.kind === "normal" ? Math.sin(t / 600 + p.bob) * 1.5 : 0);
    if (p.kind === "break") {
      ctx.save(); if (p.broken) { ctx.globalAlpha = Math.max(0, 1 - (p.fall || 0) * 2); }
      cloudShape(p.x, y, p.w, "#c9c2e6", "rgba(60,40,120,0.15)");
      ctx.strokeStyle = "rgba(90,70,150,0.6)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x + p.w * 0.4, y - 6); ctx.lineTo(p.x + p.w * 0.5, y + 4); ctx.lineTo(p.x + p.w * 0.45, y + 12); ctx.stroke();
      ctx.restore();
    } else cloudShape(p.x, y, p.w, p.kind === "move" ? "#bfe6ff" : "#ffffff", "rgba(60,90,160,0.18)");
    if (p.spring) {
      const sx = p.x + p.w / 2, ext = p.sprung ? 12 : 0;
      ctx.strokeStyle = "#8a8fa8"; ctx.lineWidth = 3; ctx.beginPath();
      for (let i = 0; i < 4; i++) { ctx.moveTo(sx - 8, y - 4 - i * (4 + ext / 4)); ctx.lineTo(sx + 8, y - 6 - i * (4 + ext / 4)); }
      ctx.stroke();
      fillRR(ctx, sx - 12, y - 22 - ext, 24, 7, 3, "#ff4d6d");
    }
  }
  for (const s of stars) {
    if (s.got) continue;
    ctx.save(); ctx.translate(s.x, s.y + Math.sin(t / 250 + s.x) * 4); ctx.rotate(t / 700);
    ctx.fillStyle = "#ffd23a"; ctx.shadowColor = "#ffe45c"; ctx.shadowBlur = 16;
    ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 5 : 12; ctx.lineTo(Math.cos(i * TAU / 10 - Math.PI / 2) * r, Math.sin(i * TAU / 10 - Math.PI / 2) * r); } ctx.fill();
    ctx.restore();
  }
  // player (yellow buddy)
  ctx.save(); ctx.translate(pl.x, pl.y);
  const sq = pl.squash * 0.25, stretch = pl.vy < -400 ? 0.1 : 0;
  ctx.scale((1 + sq - stretch) * pl.face, 1 - sq + stretch);
  const bg2 = ctx.createLinearGradient(0, -20, 0, 20);
  bg2.addColorStop(0, "#fff08a"); bg2.addColorStop(1, "#ffb000");
  ctx.shadowColor = "rgba(0,0,0,0.2)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
  fillRR(ctx, -16, -20, 32, 38, 14, bg2);
  ctx.shadowColor = "transparent";
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-3, -8, 6, 0, TAU); ctx.arc(9, -8, 6, 0, TAU); ctx.fill();
  ctx.fillStyle = "#1c1640"; ctx.beginPath(); ctx.arc(-1, -7, 3, 0, TAU); ctx.arc(11, -7, 3, 0, TAU); ctx.fill();
  ctx.strokeStyle = "#8a4a00"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(5, 2, 5, 0.2, Math.PI - 0.2); ctx.stroke();
  ctx.fillStyle = "rgba(255,110,110,0.5)"; ctx.beginPath(); ctx.arc(-9, 2, 3, 0, TAU); ctx.fill();
  ctx.fillStyle = "#ff9f1c"; fillRR(ctx, -13, 16, 10, 6, 3, "#e07b00"); fillRR(ctx, 3, 16, 10, 6, 3, "#e07b00");
  ctx.restore();
  fx.draw(ctx); fl.draw(ctx);
  ctx.restore();
  text(ctx, `${score}`, 16, 28, { size: 22, weight: 900, align: "left", color: "#fff", stroke: { color: "rgba(20,40,90,0.35)", width: 5 } });
  if (performance.now() - t0 < 2500) text(ctx, "Use arrow keys or move the mouse", W / 2, H - 40, { size: 16, color: "#1c3a7a", weight: 800 });
}

export default {
  init(stage, a) {
    api = a;
    cv = makeCanvas(stage, W, H); ctx = cv.ctx;
    fx = new Particles(); fl = new Floaters(); keys = heldKeys(api);
    pl = { x: W / 2, y: H - 120, vx: 0, vy: -JUMP, squash: 0, face: 1 };
    stars = []; plats = [{ x: W / 2 - 50, y: H - 80, w: 100, kind: "normal", vx: 0, spring: false, bob: 0 }];
    for (let y = H - 160; y > -200; y -= rand(60, 95)) plats.push(makePlat(y));
    camY = 0; maxH = 0; bonus = 0; score = 0; over = false; pointerX = null; lastY = pl.y; t0 = performance.now();
    api.setScore(0);
    api.on(cv.canvas, "pointermove", (e) => (pointerX = cv.toLocal(e).x));
    api.on(cv.canvas, "pointerdown", (e) => (pointerX = cv.toLocal(e).x));
    api.on(cv.canvas, "pointerleave", () => (pointerX = null));
    api.loop((dt, t) => {
      if (!over) update(dt);
      fx.update(dt); fl.update(dt);
      draw(t);
    });
  }
};
