import { makeCanvas, Particles, Floaters, Shake, text, orb, rand, clamp, choice, heldKeys, TAU } from "../../hub/js/core/Engine.js";

const W = 480, H = 660, BY = H - 70;
const FRUITS = ["apple", "orange", "grape", "cherry", "lemon", "melon"];
let api, cv, ctx, fx, fl, shake, keys;
let basket, items, score, lives, over, spawnT, time, pointerX, flash, caught, clouds;

function spawn() {
  const r = Math.random();
  const kind = r < 0.14 + Math.min(0.12, time / 400) ? "bomb" : r < 0.2 ? "star" : choice(FRUITS);
  items.push({ kind, x: rand(30, W - 30), y: -30, vy: rand(150, 200) + time * 3, rot: rand(0, TAU), vr: rand(-2, 2), sway: rand(0, TAU) });
}

function drawFruit(k, x, y, rot, t) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  if (k === "apple") { orb(ctx, 0, 2, 18, "#ff3b4e"); ctx.fillStyle = "#6b3b12"; ctx.fillRect(-1.5, -22, 3, 10); ctx.fillStyle = "#5ed12e"; ctx.beginPath(); ctx.ellipse(8, -18, 8, 4, -0.5, 0, TAU); ctx.fill(); }
  else if (k === "orange") { orb(ctx, 0, 0, 18, "#ff9f1c"); ctx.fillStyle = "#3f9a1c"; ctx.beginPath(); ctx.ellipse(3, -17, 6, 3, 0.3, 0, TAU); ctx.fill(); }
  else if (k === "grape") { for (const [gx, gy] of [[-7, -8], [7, -8], [0, -2], [-8, 4], [8, 4], [0, 10], [0, -14]]) orb(ctx, gx, gy, 7.5, "#8b5cf6"); ctx.fillStyle = "#3f9a1c"; ctx.fillRect(-1.5, -26, 3, 8); }
  else if (k === "cherry") { ctx.strokeStyle = "#3f7a12"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-8, 4); ctx.quadraticCurveTo(-4, -18, 4, -22); ctx.moveTo(9, 6); ctx.quadraticCurveTo(8, -12, 4, -22); ctx.stroke(); orb(ctx, -9, 8, 10, "#e0103a"); orb(ctx, 9, 10, 10, "#e0103a"); }
  else if (k === "lemon") { ctx.save(); ctx.scale(1.25, 0.95); orb(ctx, 0, 0, 16, "#ffe45c"); ctx.restore(); }
  else if (k === "melon") { ctx.fillStyle = "#2f9a3a"; ctx.beginPath(); ctx.arc(0, -4, 22, 0, Math.PI); ctx.fill(); ctx.fillStyle = "#f4ffd9"; ctx.beginPath(); ctx.arc(0, -4, 18, 0, Math.PI); ctx.fill(); ctx.fillStyle = "#ff4d6d"; ctx.beginPath(); ctx.arc(0, -4, 15, 0, Math.PI); ctx.fill(); ctx.fillStyle = "#1c1c1c"; for (const sx of [-8, 0, 8]) { ctx.beginPath(); ctx.ellipse(sx, 3, 1.5, 3, 0, 0, TAU); ctx.fill(); } }
  else if (k === "star") { ctx.shadowColor = "#ffe45c"; ctx.shadowBlur = 20; ctx.fillStyle = "#ffd23a"; ctx.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 8 : 19; ctx.lineTo(Math.cos(i * TAU / 10 - Math.PI / 2) * r, Math.sin(i * TAU / 10 - Math.PI / 2) * r); } ctx.fill(); }
  else if (k === "bomb") { orb(ctx, 0, 2, 17, "#2b2b3d"); ctx.strokeStyle = "#a07040"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(6, -12); ctx.quadraticCurveTo(12, -22, 16, -18); ctx.stroke(); ctx.fillStyle = Math.floor(t / 80) % 2 ? "#ffe45c" : "#ff4d6d"; ctx.beginPath(); ctx.arc(16, -18, 4, 0, TAU); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = "900 14px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("!", 0, 3); }
  ctx.restore();
}

const FC = { apple: "#ff3b4e", orange: "#ff9f1c", grape: "#8b5cf6", cherry: "#e0103a", lemon: "#ffe45c", melon: "#ff4d6d", star: "#ffe45c" };

function update(dt) {
  time += dt;
  let dir = 0;
  if (keys.has("ArrowLeft") || keys.has("a")) dir--;
  if (keys.has("ArrowRight") || keys.has("d")) dir++;
  if (dir) { basket.x += dir * 560 * dt; pointerX = null; }
  else if (pointerX != null) basket.x += (pointerX - basket.x) * Math.min(1, dt * 18);
  const px = basket.x;
  basket.x = clamp(basket.x, 50, W - 50);
  basket.tilt += ((basket.x - px) * 0.02 - basket.tilt) * Math.min(1, dt * 10);
  basket.bounce = Math.max(0, basket.bounce - dt * 4);
  flash = Math.max(0, flash - dt);
  spawnT -= dt;
  if (spawnT <= 0) { spawn(); spawnT = Math.max(0.35, 0.95 - time * 0.01); }
  for (const it of items) {
    it.y += it.vy * dt; it.rot += it.vr * dt; it.sway += dt * 2;
    it.x += Math.sin(it.sway) * 20 * dt;
    if (!it.done && it.y > BY - 26 && it.y < BY + 6 && Math.abs(it.x - basket.x) < 50) {
      it.done = true;
      basket.bounce = 1;
      if (it.kind === "bomb") {
        lives--; api.setLives(lives); shake.kick(14); flash = 0.4; api.sound.explode();
        fx.burst(it.x, it.y, { count: 40, colors: ["#ff9f1c", "#ff4d6d", "#ffe45c"], speed: 320, life: 0.8, size: 4.5 });
        if (lives <= 0) return end();
      } else {
        const pts = it.kind === "star" ? 50 : 10;
        score += pts; caught++; api.setScore(score);
        it.kind === "star" ? api.sound.levelUp() : api.sound.coin();
        fx.burst(it.x, it.y, { count: 14, color: FC[it.kind], speed: 180, life: 0.5, angle: -Math.PI / 2, spread: 2 });
        fl.add(it.x, it.y - 20, `+${pts}`, { color: FC[it.kind], size: 18 });
      }
    }
    if (!it.done && it.y > H + 20) {
      it.done = true;
      if (it.kind !== "bomb" && it.kind !== "star") {
        lives--; api.setLives(lives); api.sound.error(); flash = 0.25;
        fl.add(it.x, H - 30, "MISSED!", { color: "#ff4d6d", size: 16 });
        if (lives <= 0) return end();
      }
    }
  }
  items = items.filter((it) => !it.done && it.y < H + 40);
}
function end() { over = true; api.gameOver({ score, message: `You caught ${caught} fruit${caught === 1 ? "" : "s"}.` }); }

function draw(t, dt) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#8fd3ff"); g.addColorStop(0.6, "#d8f5ff"); g.addColorStop(1, "#bff0a8");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); shake.apply(ctx);
  for (const c of clouds) {
    c.x += c.s * dt; if (c.x > W + 80) c.x = -120;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath(); ctx.arc(c.x, c.y, 20, 0, TAU); ctx.arc(c.x + 24, c.y - 10, 26, 0, TAU); ctx.arc(c.x + 50, c.y, 20, 0, TAU); ctx.fill();
  }
  // trees
  for (const [x, s] of [[40, 1.1], [440, 1.2], [250, 0.8]]) {
    ctx.fillStyle = "#8a5a2b"; ctx.fillRect(x - 8 * s, H - 200 * s, 16 * s, 200 * s);
    ctx.fillStyle = "#4fb85a"; ctx.beginPath(); ctx.arc(x, H - 210 * s, 60 * s, 0, TAU); ctx.arc(x - 40 * s, H - 180 * s, 40 * s, 0, TAU); ctx.arc(x + 40 * s, H - 180 * s, 40 * s, 0, TAU); ctx.fill();
    ctx.fillStyle = "#ff4d6d"; for (const [dx, dy] of [[-20, -20], [25, -5], [0, 10]]) { ctx.beginPath(); ctx.arc(x + dx * s, H - 210 * s + dy * s, 6 * s, 0, TAU); ctx.fill(); }
  }
  ctx.fillStyle = "#6fcf5a"; ctx.fillRect(0, H - 40, W, 40);
  ctx.fillStyle = "#5ab84a"; for (let x = 0; x < W; x += 14) { ctx.beginPath(); ctx.moveTo(x, H - 40); ctx.lineTo(x + 7, H - 50); ctx.lineTo(x + 14, H - 40); ctx.fill(); }
  for (const it of items) drawFruit(it.kind, it.x, it.y, it.rot, t);
  // basket
  ctx.save(); ctx.translate(basket.x, BY + basket.bounce * 5); ctx.rotate(basket.tilt);
  ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.beginPath(); ctx.ellipse(0, 44, 50, 8, 0, 0, TAU); ctx.fill();
  const bg2 = ctx.createLinearGradient(0, -10, 0, 40);
  bg2.addColorStop(0, "#d9894a"); bg2.addColorStop(1, "#8a4a18");
  ctx.fillStyle = bg2; ctx.beginPath(); ctx.moveTo(-52, -8); ctx.lineTo(52, -8); ctx.lineTo(40, 38); ctx.lineTo(-40, 38); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "rgba(90,40,10,0.5)"; ctx.lineWidth = 2;
  for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 14, -8); ctx.lineTo(i * 11, 38); ctx.stroke(); }
  for (const y of [6, 22]) { ctx.beginPath(); ctx.moveTo(-50 + (y + 8) * 0.25, y); ctx.lineTo(50 - (y + 8) * 0.25, y); ctx.stroke(); }
  ctx.fillStyle = "#b86a2a"; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-56, -14, 112, 10, 5) : ctx.rect(-56, -14, 112, 10); ctx.fill();
  ctx.restore();
  fx.draw(ctx); fl.draw(ctx);
  for (let i = 0; i < 3; i++) text(ctx, "♥", 22 + i * 26, 26, { size: 24, color: i < lives ? "#ff4d6d" : "rgba(0,0,0,0.2)" });
  text(ctx, String(score), W - 18, 26, { size: 24, weight: 900, align: "right", color: "#fff", stroke: { color: "rgba(20,60,20,0.4)", width: 5 } });
  ctx.restore();
  if (flash > 0) { ctx.fillStyle = `rgba(255,60,90,${flash})`; ctx.fillRect(0, 0, W, H); }
}

export default {
  init(stage, a) {
    api = a;
    cv = makeCanvas(stage, W, H); ctx = cv.ctx;
    fx = new Particles(); fl = new Floaters(); shake = new Shake(); keys = heldKeys(api);
    basket = { x: W / 2, tilt: 0, bounce: 0 };
    items = []; score = 0; lives = 3; over = false; spawnT = 0.5; time = 0; pointerX = null; flash = 0; caught = 0;
    clouds = [{ x: 40, y: 80, s: 12 }, { x: 260, y: 140, s: 8 }, { x: 400, y: 60, s: 15 }];
    api.setScore(0); api.setLives(3);
    api.on(cv.canvas, "pointermove", (e) => (pointerX = cv.toLocal(e).x));
    api.on(cv.canvas, "pointerdown", (e) => (pointerX = cv.toLocal(e).x));
    api.loop((dt, t) => {
      if (!over) update(dt);
      fx.update(dt); fl.update(dt); shake.update(dt);
      draw(t, dt);
    });
  }
};
