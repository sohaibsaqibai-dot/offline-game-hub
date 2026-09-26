import { makeCanvas, Particles, Floaters, Shake, text, orb, rand, clamp, heldKeys, dist, TAU, fillRR } from "../../hub/js/core/Engine.js";

const W = 600, H = 520, M = 24;
let api, cv, ctx, fx, fl, shake, keys;
let p, coins, bombs, score, lives, inv, over, time, coinT, bombT, pointer, combo, comboT, flash, trail;

function addCoin() {
  const gem = Math.random() < 0.12;
  coins.push({ x: rand(M + 20, W - M - 20), y: rand(M + 20, H - M - 20), life: gem ? 4 : 6, max: gem ? 4 : 6, gem, born: 0 });
}
function addBomb() {
  const side = Math.floor(rand(0, 4));
  const x = side === 0 ? M : side === 1 ? W - M : rand(M, W - M), y = side === 2 ? M : side === 3 ? H - M : rand(M, H - M);
  const a = Math.atan2(H / 2 - y, W / 2 - x) + rand(-0.6, 0.6), sp = rand(90, 140) + time * 1.5;
  bombs.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 15, fuse: rand(0, TAU), born: 0 });
}

function update(dt) {
  time += dt;
  let dx = 0, dy = 0;
  if (keys.has("ArrowLeft") || keys.has("a")) dx--;
  if (keys.has("ArrowRight") || keys.has("d")) dx++;
  if (keys.has("ArrowUp") || keys.has("w")) dy--;
  if (keys.has("ArrowDown") || keys.has("s")) dy++;
  const acc = 1800;
  if (dx || dy) { const l = Math.hypot(dx, dy); p.vx += (dx / l) * acc * dt; p.vy += (dy / l) * acc * dt; pointer = null; }
  else if (pointer) { const ddx = pointer.x - p.x, ddy = pointer.y - p.y, l = Math.hypot(ddx, ddy); if (l > 4) { p.vx += (ddx / l) * acc * dt * Math.min(1, l / 60); p.vy += (ddy / l) * acc * dt * Math.min(1, l / 60); } }
  const fr = Math.pow(0.02, dt);
  p.vx *= fr; p.vy *= fr;
  const sp = Math.hypot(p.vx, p.vy), max = 330;
  if (sp > max) { p.vx *= max / sp; p.vy *= max / sp; }
  p.x = clamp(p.x + p.vx * dt, M + p.r, W - M - p.r); p.y = clamp(p.y + p.vy * dt, M + p.r, H - M - p.r);
  trail.push({ x: p.x, y: p.y }); if (trail.length > 14) trail.shift();

  inv = Math.max(0, inv - dt); flash = Math.max(0, flash - dt);
  comboT -= dt; if (comboT <= 0) combo = 0;
  coinT -= dt; if (coinT <= 0) { coinT = Math.max(0.45, 1.1 - time * 0.006); if (coins.length < 7) addCoin(); }
  bombT -= dt; if (bombT <= 0) { bombT = Math.max(1.3, 4.2 - time * 0.04); if (bombs.length < 3 + Math.floor(time / 15)) addBomb(); }

  for (const c of coins) {
    c.life -= dt; c.born += dt;
    if (dist(c.x, c.y, p.x, p.y) < p.r + 13) {
      c.dead = true; combo++; comboT = 1.4;
      const pts = (c.gem ? 50 : 10) * Math.min(5, combo);
      score += pts; api.setScore(score);
      c.gem ? api.sound.levelUp() : api.sound.coin();
      fx.burst(c.x, c.y, { count: c.gem ? 22 : 12, color: c.gem ? "#19d3c5" : "#ffe45c", speed: 200, life: 0.6 });
      fl.add(c.x, c.y - 14, combo > 1 ? `+${pts} x${Math.min(5, combo)}` : `+${pts}`, { color: c.gem ? "#19d3c5" : "#ffe45c", size: 16 + Math.min(combo, 5) * 2 });
    }
  }
  coins = coins.filter((c) => !c.dead && c.life > 0);
  for (const b of bombs) {
    b.born += dt; b.fuse += dt * 10;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < M + b.r || b.x > W - M - b.r) { b.vx *= -1; b.x = clamp(b.x, M + b.r, W - M - b.r); }
    if (b.y < M + b.r || b.y > H - M - b.r) { b.vy *= -1; b.y = clamp(b.y, M + b.r, H - M - b.r); }
    if (b.born > 0.8 && inv <= 0 && dist(b.x, b.y, p.x, p.y) < p.r + b.r - 3) {
      b.dead = true; lives--; api.setLives(lives); inv = 1.5; flash = 0.4; shake.kick(12); combo = 0;
      api.sound.explode();
      fx.burst(b.x, b.y, { count: 40, colors: ["#ff9f1c", "#ff4d6d", "#ffe45c", "#fff"], speed: 320, life: 0.8, size: 4.5 });
      if (lives <= 0) { over = true; api.gameOver({ score, message: `You survived ${Math.floor(time)} seconds.` }); }
    }
  }
  bombs = bombs.filter((b) => !b.dead);
}

function draw(t, dt) {
  const g = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, W * 0.7);
  g.addColorStop(0, "#5a2a12"); g.addColorStop(1, "#1f0b04");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); shake.apply(ctx);
  // arena floor tiles
  fillRR(ctx, M - 6, M - 6, W - 2 * M + 12, H - 2 * M + 12, 20, "rgba(255,190,90,0.08)");
  for (let x = M; x < W - M; x += 48) for (let y = M; y < H - M; y += 48) {
    ctx.fillStyle = ((x + y) / 48) % 2 ? "rgba(255,200,120,0.05)" : "rgba(0,0,0,0.08)";
    ctx.fillRect(x, y, 48, 48);
  }
  ctx.strokeStyle = "rgba(255,200,120,0.4)"; ctx.lineWidth = 3; ctx.strokeRect(M, M, W - 2 * M, H - 2 * M);
  // coins
  for (const c of coins) {
    const pop = Math.min(1, c.born * 5);
    const blink = c.life < 1.5 && Math.floor(t / 100) % 2;
    if (blink) continue;
    ctx.save(); ctx.translate(c.x, c.y + Math.sin(t / 200 + c.x) * 3); ctx.scale(pop, pop);
    // life ring
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 19, -Math.PI / 2, -Math.PI / 2 + TAU * (c.life / c.max)); ctx.stroke();
    if (c.gem) {
      ctx.rotate(t / 400); ctx.shadowColor = "#19d3c5"; ctx.shadowBlur = 20;
      const gg = ctx.createLinearGradient(-12, -12, 12, 12); gg.addColorStop(0, "#b9fff7"); gg.addColorStop(1, "#0f9c90");
      ctx.fillStyle = gg; ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(12, 0); ctx.lineTo(0, 13); ctx.lineTo(-12, 0); ctx.fill();
    } else {
      const sx = Math.abs(Math.cos(t / 250 + c.x));
      ctx.scale(Math.max(0.15, sx), 1); ctx.shadowColor = "#ffc53d"; ctx.shadowBlur = 16;
      ctx.fillStyle = "#e0a020"; ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fill();
      ctx.fillStyle = "#ffd84d"; ctx.beginPath(); ctx.arc(0, 0, 10, 0, TAU); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = "#b87800"; ctx.font = "900 13px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("$", 0, 1);
    }
    ctx.restore();
  }
  // bombs
  for (const b of bombs) {
    const warm = b.born < 0.8;
    ctx.save(); ctx.globalAlpha = warm ? 0.4 + 0.3 * Math.sin(t / 50) : 1;
    ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(b.x + 3, b.y + b.r - 2, b.r, 5, 0, 0, TAU); ctx.fill();
    orb(ctx, b.x, b.y, b.r, "#2b2b3d");
    ctx.strokeStyle = "#a07040"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(b.x + 6, b.y - 12); ctx.quadraticCurveTo(b.x + 12, b.y - 22, b.x + 16, b.y - 18); ctx.stroke();
    const f = 3 + Math.sin(b.fuse) * 1.5;
    ctx.shadowColor = "#ffb13d"; ctx.shadowBlur = 16; ctx.fillStyle = "#ffe45c"; ctx.beginPath(); ctx.arc(b.x + 16, b.y - 18, f, 0, TAU); ctx.fill();
    ctx.restore();
    if (Math.random() < 0.3) fx.burst(b.x + 16, b.y - 18, { count: 1, color: "#ffb13d", speed: 60, life: 0.3, size: 2 });
  }
  // player
  trail.forEach((q, i) => { ctx.fillStyle = `rgba(63,169,255,${(i / trail.length) * 0.25})`; ctx.beginPath(); ctx.arc(q.x, q.y, p.r * (i / trail.length), 0, TAU); ctx.fill(); });
  if (!(inv > 0 && Math.floor(t / 80) % 2)) {
    orb(ctx, p.x, p.y, p.r, "#3fa9ff", 20);
    const lx = p.vx / 330 * 4, ly = p.vy / 330 * 4;
    for (const s of [-1, 1]) { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(p.x + s * 6 + lx, p.y - 3 + ly, 4.5, 0, TAU); ctx.fill(); ctx.fillStyle = "#10203a"; ctx.beginPath(); ctx.arc(p.x + s * 6 + lx * 1.5, p.y - 3 + ly * 1.5, 2.2, 0, TAU); ctx.fill(); }
  }
  fx.draw(ctx); fl.draw(ctx);
  if (combo > 1) text(ctx, `COMBO x${Math.min(5, combo)}`, W / 2, 12, { size: 13, color: "#ffe45c", weight: 900 });
  ctx.restore();
  if (flash > 0) { ctx.fillStyle = `rgba(255,60,90,${flash})`; ctx.fillRect(0, 0, W, H); }
  void dt;
}

export default {
  init(stage, a) {
    api = a;
    cv = makeCanvas(stage, W, H); ctx = cv.ctx;
    fx = new Particles(); fl = new Floaters(); shake = new Shake(); keys = heldKeys(api);
    p = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: 18 };
    coins = []; bombs = []; score = 0; lives = 3; inv = 1; over = false; time = 0; coinT = 0.3; bombT = 3; pointer = null; combo = 0; comboT = 0; flash = 0; trail = [];
    api.setScore(0); api.setLives(3);
    api.on(cv.canvas, "pointermove", (e) => { if (e.buttons || e.pointerType === "mouse") pointer = cv.toLocal(e); });
    api.on(cv.canvas, "pointerdown", (e) => (pointer = cv.toLocal(e)));
    api.loop((dt, t) => {
      if (!over) update(dt);
      fx.update(dt); fl.update(dt); shake.update(dt);
      draw(t, dt);
    });
  }
};
