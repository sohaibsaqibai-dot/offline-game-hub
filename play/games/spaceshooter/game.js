import { makeCanvas, Particles, Floaters, Shake, text, orb, rand, randInt, clamp, heldKeys, makeStars, drawStars, TAU, dist } from "../../hub/js/core/Engine.js";

const W = 480, H = 680;
let api, cv, ctx, fx, fl, shake, keys, stars, stars2;
let ship, bullets, ebullets, enemies, pickups, score, lives, over, fireT, spawnT, time, triple, shield, inv, pointer, flash, wave;

function rockShape(n) { return Array.from({ length: n }, (_, i) => ({ a: (i / n) * TAU, r: rand(0.72, 1.05) })); }
function spawnRock(size = rand(22, 38), x = rand(30, W - 30), y = -40, vx = rand(-40, 40), vy = rand(70, 120) + time * 1.2) {
  enemies.push({ type: "rock", x, y, vx, vy, r: size, hp: Math.ceil(size / 14), rot: rand(0, TAU), vr: rand(-2, 2), shape: rockShape(9) });
}
function spawnDrone() {
  enemies.push({ type: "drone", x: rand(40, W - 40), y: -30, vx: 0, vy: 90 + time, r: 20, hp: 3, t: rand(0, 6), fire: rand(1, 2.5), color: ["#ff4fa3", "#ffc53d", "#19d3c5"][randInt(0, 2)] });
}

function shoot() {
  const mk = (dx, ang) => bullets.push({ x: ship.x + dx, y: ship.y - 22, vx: Math.sin(ang) * 720, vy: -Math.cos(ang) * 720 });
  mk(0, 0);
  if (triple > 0) { mk(-10, -0.16); mk(10, 0.16); }
  api.sound.shoot();
}

function kill(e) {
  e.dead = true;
  const pts = e.type === "drone" ? 50 : Math.round(e.r);
  score += pts; api.setScore(score);
  fl.add(e.x, e.y, `+${pts}`, { color: e.type === "drone" ? e.color : "#ffd0a0", size: 16 });
  fx.burst(e.x, e.y, { count: e.type === "drone" ? 26 : 18, colors: e.type === "drone" ? [e.color, "#fff"] : ["#ffb36b", "#ff7a59", "#fff1c9"], speed: 280, life: 0.8, size: 3.5 });
  shake.kick(e.type === "drone" ? 5 : 3);
  api.sound.explode();
  if (e.type === "rock" && e.r > 26) for (let i = 0; i < 2; i++) spawnRock(e.r * 0.55, e.x, e.y, rand(-120, 120), rand(60, 140));
  if (Math.random() < (e.type === "drone" ? 0.3 : 0.06)) pickups.push({ x: e.x, y: e.y, kind: Math.random() < 0.6 ? "triple" : "shield" });
}

function hurt() {
  if (inv > 0) return;
  if (shield > 0) { shield = 0; inv = 1; api.sound.hit(); fx.burst(ship.x, ship.y, { count: 30, color: "#19d3c5", speed: 260, life: 0.6 }); return; }
  lives--; api.setLives(lives); inv = 2; flash = 0.4; shake.kick(12);
  api.sound.explode();
  fx.burst(ship.x, ship.y, { count: 40, colors: ["#fff", "#6fd0ff", "#ffb13d"], speed: 320, life: 1, size: 4 });
  if (lives <= 0) { over = true; ship.dead = true; api.gameOver({ score, message: `You survived ${Math.floor(time)} seconds.` }); }
}

function update(dt) {
  time += dt;
  // movement
  let dx = 0, dy = 0;
  if (keys.has("ArrowLeft") || keys.has("a")) dx--;
  if (keys.has("ArrowRight") || keys.has("d")) dx++;
  if (keys.has("ArrowUp") || keys.has("w")) dy--;
  if (keys.has("ArrowDown") || keys.has("s")) dy++;
  if (dx || dy) { ship.x += dx * 380 * dt; ship.y += dy * 320 * dt; pointer = null; }
  else if (pointer) { ship.x += (pointer.x - ship.x) * Math.min(1, dt * 12); ship.y += (pointer.y - 40 - ship.y) * Math.min(1, dt * 12); }
  ship.tilt += ((dx || (pointer ? clamp((pointer.x - ship.x) / 60, -1, 1) : 0)) * 0.35 - ship.tilt) * Math.min(1, dt * 10);
  ship.x = clamp(ship.x, 24, W - 24); ship.y = clamp(ship.y, H * 0.45, H - 40);

  fireT -= dt; if (fireT <= 0) { fireT = 0.16; shoot(); }
  spawnT -= dt;
  if (spawnT <= 0) {
    wave = 1 + Math.floor(time / 20);
    spawnT = Math.max(0.35, 1.2 - time * 0.012);
    Math.random() < Math.min(0.45, 0.12 + time * 0.005) ? spawnDrone() : spawnRock();
    api.hud({ level: wave });
  }
  triple = Math.max(0, triple - dt); inv = Math.max(0, inv - dt); flash = Math.max(0, flash - dt);

  for (const b of bullets) { b.x += b.vx * dt; b.y += b.vy * dt; }
  bullets = bullets.filter((b) => b.y > -20 && !b.dead);
  for (const b of ebullets) { b.x += b.vx * dt; b.y += b.vy * dt; if (!ship.dead && dist(b.x, b.y, ship.x, ship.y) < 16) { b.dead = true; hurt(); } }
  ebullets = ebullets.filter((b) => b.y < H + 20 && !b.dead);

  for (const e of enemies) {
    if (e.type === "drone") {
      e.t += dt; e.x += Math.sin(e.t * 2) * 90 * dt; e.y += e.vy * dt * (e.y > 160 ? 0.45 : 1);
      e.fire -= dt;
      if (e.fire <= 0 && e.y > 0) { e.fire = rand(1.4, 2.6); const a = Math.atan2(ship.y - e.y, ship.x - e.x); ebullets.push({ x: e.x, y: e.y + 10, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240 }); }
    } else { e.x += e.vx * dt; e.y += e.vy * dt; e.rot += e.vr * dt; if (e.x < e.r || e.x > W - e.r) e.vx *= -1; }
    for (const b of bullets) {
      if (!b.dead && dist(b.x, b.y, e.x, e.y) < e.r + 4) {
        b.dead = true; e.hp--; e.hitT = 0.08;
        fx.burst(b.x, b.y, { count: 4, color: "#fff", speed: 120, life: 0.25, size: 2 });
        if (e.hp <= 0 && !e.dead) kill(e); else api.sound.hit();
      }
    }
    if (e.hitT) e.hitT -= dt;
    if (!e.dead && !ship.dead && dist(e.x, e.y, ship.x, ship.y) < e.r + 14) { kill(e); hurt(); }
  }
  enemies = enemies.filter((e) => !e.dead && e.y < H + 60);

  for (const p of pickups) {
    p.y += 110 * dt;
    if (dist(p.x, p.y, ship.x, ship.y) < 30) {
      p.dead = true; api.sound.coin();
      if (p.kind === "triple") { triple = 9; fl.add(ship.x, ship.y - 40, "TRIPLE SHOT", { color: "#ffe45c", size: 16 }); }
      else { shield = 1; fl.add(ship.x, ship.y - 40, "SHIELD", { color: "#19d3c5", size: 16 }); }
    }
  }
  pickups = pickups.filter((p) => !p.dead && p.y < H + 20);
}

function drawShip(t) {
  if (ship.dead) return;
  if (inv > 0 && Math.floor(t / 80) % 2) return;
  ctx.save(); ctx.translate(ship.x, ship.y); ctx.rotate(ship.tilt * 0.4);
  // flame
  const fl2 = 14 + Math.sin(t / 30) * 5;
  const fg = ctx.createLinearGradient(0, 14, 0, 14 + fl2 + 10);
  fg.addColorStop(0, "#fff6c9"); fg.addColorStop(0.4, "#ffb13d"); fg.addColorStop(1, "rgba(255,80,60,0)");
  ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(-8, 14); ctx.lineTo(0, 24 + fl2); ctx.lineTo(8, 14); ctx.fill();
  // wings
  ctx.shadowColor = "#6fd0ff"; ctx.shadowBlur = 18;
  const wg = ctx.createLinearGradient(-26, 0, 26, 0);
  wg.addColorStop(0, "#4a3ad9"); wg.addColorStop(0.5, "#8b7bff"); wg.addColorStop(1, "#4a3ad9");
  ctx.fillStyle = wg; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(26, 14); ctx.lineTo(18, 18); ctx.lineTo(0, 10); ctx.lineTo(-18, 18); ctx.lineTo(-26, 14); ctx.closePath(); ctx.fill();
  // body
  const bgd = ctx.createLinearGradient(-10, 0, 10, 0);
  bgd.addColorStop(0, "#cfd6ff"); bgd.addColorStop(0.5, "#ffffff"); bgd.addColorStop(1, "#aab4f0");
  ctx.fillStyle = bgd; ctx.beginPath(); ctx.moveTo(0, -26); ctx.quadraticCurveTo(12, -4, 9, 16); ctx.lineTo(-9, 16); ctx.quadraticCurveTo(-12, -4, 0, -26); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#3fd0ff"; ctx.beginPath(); ctx.ellipse(0, -6, 4.5, 8, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#ff4fa3"; ctx.fillRect(-22, 12, 4, 6); ctx.fillRect(18, 12, 4, 6);
  if (shield > 0) { ctx.strokeStyle = `rgba(25,211,197,${0.5 + Math.sin(t / 120) * 0.3})`; ctx.lineWidth = 3; ctx.shadowColor = "#19d3c5"; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(0, 0, 34, 0, TAU); ctx.stroke(); }
  ctx.restore();
}

function draw(t, dt) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0b0626"); g.addColorStop(1, "#1a0b3a");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // nebula
  for (const [x, y, r, c] of [[100, 200, 180, "rgba(139,92,246,0.18)"], [380, 480, 200, "rgba(255,79,163,0.12)"], [300, 100, 120, "rgba(25,211,197,0.1)"]]) {
    const ng = ctx.createRadialGradient(x, (y + t * 0.01) % (H + 200) - 100, 0, x, (y + t * 0.01) % (H + 200) - 100, r);
    ng.addColorStop(0, c); ng.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = ng; ctx.fillRect(0, 0, W, H);
  }
  drawStars(ctx, stars, W, H, dt, 40, t);
  drawStars(ctx, stars2, W, H, dt, 160, t);
  ctx.save(); shake.apply(ctx);
  for (const p of pickups) {
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(t / 300);
    const c = p.kind === "triple" ? "#ffe45c" : "#19d3c5";
    ctx.shadowColor = c; ctx.shadowBlur = 20; ctx.strokeStyle = c; ctx.lineWidth = 3;
    ctx.beginPath(); for (let i = 0; i < 6; i++) ctx.lineTo(Math.cos(i * TAU / 6) * 13, Math.sin(i * TAU / 6) * 13); ctx.closePath(); ctx.stroke();
    ctx.restore();
    text(ctx, p.kind === "triple" ? "3" : "S", p.x, p.y + 1, { size: 12, weight: 900, color: p.kind === "triple" ? "#ffe45c" : "#19d3c5" });
  }
  for (const e of enemies) {
    ctx.save(); ctx.translate(e.x, e.y);
    if (e.type === "rock") {
      ctx.rotate(e.rot);
      const rg = ctx.createRadialGradient(-e.r * 0.3, -e.r * 0.3, 2, 0, 0, e.r);
      rg.addColorStop(0, e.hitT > 0 ? "#fff" : "#b99a88"); rg.addColorStop(1, e.hitT > 0 ? "#ffd0d0" : "#5a4038");
      ctx.fillStyle = rg; ctx.beginPath();
      e.shape.forEach((p) => ctx.lineTo(Math.cos(p.a) * e.r * p.r, Math.sin(p.a) * e.r * p.r)); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.beginPath(); ctx.arc(e.r * 0.25, e.r * 0.1, e.r * 0.2, 0, TAU); ctx.arc(-e.r * 0.3, e.r * 0.35, e.r * 0.12, 0, TAU); ctx.fill();
    } else {
      ctx.shadowColor = e.color; ctx.shadowBlur = 20;
      ctx.fillStyle = e.hitT > 0 ? "#fff" : e.color;
      ctx.beginPath(); ctx.moveTo(0, 18); ctx.lineTo(22, -6); ctx.lineTo(10, -14); ctx.lineTo(-10, -14); ctx.lineTo(-22, -6); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = "#1a0b3a"; ctx.beginPath(); ctx.ellipse(0, -3, 8, 6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(Math.sin(e.t * 3) * 3, -3, 3, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  for (const b of bullets) { ctx.fillStyle = "#7ee04a"; ctx.shadowColor = "#7ee04a"; ctx.shadowBlur = 12; ctx.fillRect(b.x - 2, b.y - 10, 4, 18); }
  for (const b of ebullets) orb(ctx, b.x, b.y, 5, "#ff4d6d", 14);
  ctx.restore();
  drawShip(t);
  fx.draw(ctx); fl.draw(ctx);
  if (triple > 0) text(ctx, `TRIPLE ${Math.ceil(triple)}s`, W - 14, 22, { size: 12, color: "#ffe45c", align: "right" });
  ctx.restore();
  if (flash > 0) { ctx.fillStyle = `rgba(255,60,90,${flash})`; ctx.fillRect(0, 0, W, H); }
}

export default {
  init(stage, a) {
    api = a;
    cv = makeCanvas(stage, W, H); ctx = cv.ctx;
    fx = new Particles(900); fl = new Floaters(); shake = new Shake(); keys = heldKeys(api);
    stars = makeStars(70, W, H); stars2 = makeStars(18, W, H);
    ship = { x: W / 2, y: H - 90, tilt: 0 };
    bullets = []; ebullets = []; enemies = []; pickups = [];
    score = 0; lives = 3; over = false; fireT = 0; spawnT = 1; time = 0; triple = 0; shield = 0; inv = 1.5; pointer = null; flash = 0; wave = 1;
    api.setScore(0); api.setLives(3); api.hud({ level: 1 });
    api.on(cv.canvas, "pointermove", (e) => (pointer = cv.toLocal(e)));
    api.on(cv.canvas, "pointerdown", (e) => (pointer = cv.toLocal(e)));
    api.loop((dt, t) => {
      if (!over) update(dt);
      else { for (const e of enemies) { e.y += (e.vy || 60) * dt; } }
      fx.update(dt); fl.update(dt); shake.update(dt);
      draw(t, dt);
    });
  }
};
