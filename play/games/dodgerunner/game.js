import { makeCanvas, Particles, Floaters, Shake, text, rand, randInt, choice, TAU } from "../../hub/js/core/Engine.js";

const W = 480, H = 680, HOR = 250, PY = H - 90, K = 2600, D0 = K / (PY - HOR), FAR = 120;
const LANES = [-1, 0, 1];
let api, cv, ctx, fx, fl, shake;
let lane, laneX, objs, speed, distv, score, coins, lives, inv, over, spawnD, flash, mountains;

const yOf = (d) => HOR + K / (d + D0);
const sOf = (d) => (yOf(d) - HOR) / (PY - HOR);
const xOf = (l, d) => W / 2 + l * sOf(d) * 150;

function move(dir) {
  if (over) return;
  const nl = Math.max(-1, Math.min(1, lane + dir));
  if (nl !== lane) { lane = nl; api.sound.whoosh(); }
}

function spawn() {
  const free = LANES.slice();
  const n = Math.random() < Math.min(0.55, 0.15 + distv / 6000) ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const l = free.splice(randInt(0, free.length - 1), 1)[0];
    objs.push({ l, d: FAR, kind: Math.random() < 0.3 ? "barrier" : "car", color: choice(["#ff4d6d", "#ffc53d", "#19d3c5", "#a66bff"]) });
  }
  if (Math.random() < 0.6) {
    const l = free[randInt(0, free.length - 1)];
    for (let k = 0; k < 4; k++) objs.push({ l, d: FAR + 6 + k * 5, kind: "coin" });
  }
}

function update(dt) {
  speed = Math.min(95, 38 + distv / 90);
  distv += speed * dt;
  score = Math.floor(distv / 4) + coins * 25;
  api.setScore(score);
  laneX += (lane - laneX) * Math.min(1, dt * 14);
  inv = Math.max(0, inv - dt); flash = Math.max(0, flash - dt);
  spawnD -= speed * dt;
  if (spawnD <= 0) { spawn(); spawnD = Math.max(20, 42 - distv / 400); }
  for (const o of objs) {
    o.d -= speed * dt;
    if (o.hit || o.d > 3 || o.d < -3) continue;
    if (Math.abs(o.l - laneX) < 0.45) {
      o.hit = true;
      if (o.kind === "coin") {
        coins++; api.sound.coin();
        fx.burst(xOf(o.l, 0), PY - 30, { count: 10, color: "#ffe45c", speed: 180, life: 0.5 });
        fl.add(xOf(o.l, 0), PY - 60, "+25", { color: "#ffe45c", size: 18 });
      } else if (inv <= 0) {
        lives--; api.setLives(lives); inv = 1.6; flash = 0.4; shake.kick(14);
        api.sound.explode();
        fx.burst(xOf(o.l, 0), PY - 20, { count: 30, colors: [o.color || "#ffc53d", "#fff", "#ff9f1c"], speed: 320, life: 0.8, size: 4 });
        if (lives <= 0) { over = true; api.gameOver({ score, message: `${Math.floor(distv / 10)} m travelled · ${coins} coins` }); }
      }
    }
  }
  objs = objs.filter((o) => o.d > -12 && !(o.kind === "coin" && o.hit));
}

function drawCar(x, y, s, color, isPlayer, t) {
  const w = 70 * s, h = 44 * s;
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.beginPath(); ctx.ellipse(0, 2, w * 0.6, h * 0.16, 0, 0, TAU); ctx.fill();
  ctx.shadowColor = color; ctx.shadowBlur = 20 * s;
  const g = ctx.createLinearGradient(0, -h, 0, 0);
  g.addColorStop(0, color); g.addColorStop(1, "#1a0b3a");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2, -h * 0.5); ctx.lineTo(-w * 0.32, -h); ctx.lineTo(w * 0.32, -h); ctx.lineTo(w / 2, -h * 0.5); ctx.lineTo(w / 2, 0); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(160,220,255,0.55)"; ctx.fillRect(-w * 0.26, -h * 0.92, w * 0.52, h * 0.3);
  const lightC = isPlayer ? "#ff4d6d" : "#fff6c9";
  ctx.fillStyle = lightC; ctx.shadowColor = lightC; ctx.shadowBlur = 14 * s;
  ctx.fillRect(-w * 0.44, -h * 0.4, w * 0.2, h * 0.12); ctx.fillRect(w * 0.24, -h * 0.4, w * 0.2, h * 0.12);
  ctx.restore();
  void t;
}

function draw(t, dt) {
  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, HOR);
  sky.addColorStop(0, "#12022e"); sky.addColorStop(0.6, "#4a0f5c"); sky.addColorStop(1, "#ff4fa3");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, HOR);
  // stars
  for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(255,255,255,${0.3 + (i % 5) * 0.12})`; ctx.fillRect((i * 97) % W, (i * 53) % (HOR - 80), 1.5, 1.5); }
  // synthwave sun
  ctx.save();
  const sg = ctx.createLinearGradient(0, HOR - 170, 0, HOR);
  sg.addColorStop(0, "#ffe45c"); sg.addColorStop(1, "#ff4f8b");
  ctx.fillStyle = sg; ctx.shadowColor = "#ff4fa3"; ctx.shadowBlur = 50;
  ctx.beginPath(); ctx.arc(W / 2, HOR - 20, 110, Math.PI, 0); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = "#4a0f5c";
  for (let i = 0; i < 6; i++) ctx.fillRect(W / 2 - 120, HOR - 60 + i * 9 - ((t / 60) % 9), 240, 2 + i * 0.8);
  ctx.restore();
  // mountains
  ctx.fillStyle = "#1c0636";
  ctx.beginPath(); ctx.moveTo(0, HOR);
  mountains.forEach((m, i) => ctx.lineTo((i / (mountains.length - 1)) * W, HOR - m));
  ctx.lineTo(W, HOR); ctx.fill();
  ctx.strokeStyle = "rgba(255,79,163,0.6)"; ctx.lineWidth = 1.5; ctx.beginPath();
  mountains.forEach((m, i) => ctx.lineTo((i / (mountains.length - 1)) * W, HOR - m)); ctx.stroke();
  // ground
  const gg = ctx.createLinearGradient(0, HOR, 0, H);
  gg.addColorStop(0, "#1a0433"); gg.addColorStop(1, "#07010f");
  ctx.fillStyle = gg; ctx.fillRect(0, HOR, W, H - HOR);
  ctx.save(); shake.apply(ctx);
  // grid floor lines
  ctx.strokeStyle = "rgba(139,92,246,0.35)"; ctx.lineWidth = 1;
  for (let d = FAR; d > -5; d -= 8) {
    const dd = d - (distv % 8);
    const y = yOf(dd); if (y > H) continue;
    ctx.globalAlpha = Math.min(1, sOf(dd) * 2); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  for (let i = -8; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 6, HOR); ctx.lineTo(W / 2 + i * 150, H + 40); ctx.stroke(); }
  // road
  const top = yOf(FAR), bot = yOf(-5), sb = sOf(-5);
  ctx.fillStyle = "rgba(10,2,24,0.85)";
  ctx.beginPath(); ctx.moveTo(xOf(-1.5, FAR), top); ctx.lineTo(xOf(1.5, FAR), top); ctx.lineTo(W / 2 + 1.5 * sb * 150, bot); ctx.lineTo(W / 2 - 1.5 * sb * 150, bot); ctx.fill();
  for (const side of [-1.5, 1.5]) {
    ctx.strokeStyle = "#19d3c5"; ctx.shadowColor = "#19d3c5"; ctx.shadowBlur = 14; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(xOf(side, FAR), top); ctx.lineTo(W / 2 + side * sb * 150, bot); ctx.stroke();
  }
  ctx.shadowBlur = 0;
  // lane dashes
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  for (const lx of [-0.5, 0.5]) for (let d = FAR; d > -5; d -= 10) {
    const d1 = d - (distv % 10), d2 = d1 - 4;
    if (d2 < -5) continue;
    const s1 = sOf(d1), s2 = sOf(d2);
    ctx.beginPath();
    ctx.moveTo(xOf(lx, d1) - 2 * s1, yOf(d1)); ctx.lineTo(xOf(lx, d1) + 2 * s1, yOf(d1));
    ctx.lineTo(xOf(lx, d2) + 2 * s2, yOf(d2)); ctx.lineTo(xOf(lx, d2) - 2 * s2, yOf(d2)); ctx.fill();
  }
  // objects far→near
  const list = objs.filter((o) => !o.hit || o.kind !== "coin").sort((a, b) => b.d - a.d);
  for (const o of list) {
    if (o.d < -6) continue;
    const s = sOf(o.d), x = xOf(o.l, o.d), y = yOf(o.d);
    ctx.globalAlpha = Math.min(1, (FAR - o.d) / 20);
    if (o.kind === "coin") {
      const sx = Math.abs(Math.cos(t / 150 + o.d));
      ctx.save(); ctx.translate(x, y - 26 * s); ctx.scale(sx, 1); ctx.shadowColor = "#ffe45c"; ctx.shadowBlur = 16 * s;
      ctx.fillStyle = "#ffc93a"; ctx.beginPath(); ctx.arc(0, 0, 14 * s, 0, TAU); ctx.fill();
      ctx.fillStyle = "#fff09a"; ctx.beginPath(); ctx.arc(0, 0, 9 * s, 0, TAU); ctx.fill(); ctx.restore();
    } else if (o.kind === "barrier") {
      const w = 84 * s, h = 34 * s;
      ctx.save(); ctx.shadowColor = "#ff9f1c"; ctx.shadowBlur = 16 * s;
      ctx.fillStyle = "#2a0f3d"; ctx.fillRect(x - w / 2, y - h, w, h);
      ctx.beginPath(); ctx.rect(x - w / 2, y - h, w, h); ctx.clip();
      ctx.fillStyle = "#ff9f1c";
      for (let i = -2; i < 8; i++) { ctx.beginPath(); ctx.moveTo(x - w / 2 + i * 16 * s, y); ctx.lineTo(x - w / 2 + (i * 16 + 8) * s, y); ctx.lineTo(x - w / 2 + (i * 16 + 20) * s, y - h); ctx.lineTo(x - w / 2 + (i * 16 + 12) * s, y - h); ctx.fill(); }
      ctx.restore();
    } else drawCar(x, y, s, o.color, false, t);
    ctx.globalAlpha = 1;
  }
  // player
  if (!(inv > 0 && Math.floor(t / 90) % 2)) {
    const px = W / 2 + laneX * 150;
    drawCar(px, PY, 1.05, "#3fa9ff", true, t);
    if (!over) fx.burst(px + rand(-20, 20), PY + 2, { count: 1, color: "#ff4fa3", speed: 40, life: 0.4, size: 2.5, angle: Math.PI / 2, spread: 0.6 });
  }
  fx.draw(ctx); fl.draw(ctx);
  // speed lines
  if (speed > 60) { ctx.strokeStyle = "rgba(255,255,255,0.15)"; for (let i = 0; i < 6; i++) { const x = (i * 83 + t) % W; ctx.beginPath(); ctx.moveTo(x, H - 200 + (i * 37) % 100); ctx.lineTo(x + (x - W / 2) * 0.1, H - 150 + (i * 37) % 100); ctx.stroke(); } }
  text(ctx, `${Math.floor(distv / 10)} m`, 16, 26, { size: 16, align: "left", color: "#fff" });
  text(ctx, `🪙 ${coins}`, W - 16, 26, { size: 16, align: "right", color: "#ffe45c" });
  ctx.restore();
  if (flash > 0) { ctx.fillStyle = `rgba(255,60,90,${flash})`; ctx.fillRect(0, 0, W, H); }
  void dt;
}

export default {
  init(stage, a) {
    api = a;
    cv = makeCanvas(stage, W, H); ctx = cv.ctx;
    fx = new Particles(); fl = new Floaters(); shake = new Shake();
    lane = 0; laneX = 0; objs = []; speed = 38; distv = 0; score = 0; coins = 0; lives = 3; inv = 0; over = false; spawnD = 30; flash = 0;
    mountains = Array.from({ length: 16 }, (_, i) => 20 + Math.abs(Math.sin(i * 1.7)) * 50 + (i % 3) * 12);
    api.setScore(0); api.setLives(3);
    api.on(window, "keydown", (e) => {
      if (e.repeat) return;
      if (e.key === "ArrowLeft" || e.key === "a") move(-1);
      if (e.key === "ArrowRight" || e.key === "d") move(1);
    });
    let sx = null;
    api.on(cv.canvas, "pointerdown", (e) => { sx = e.clientX; });
    api.on(cv.canvas, "pointerup", (e) => {
      if (sx === null) return;
      const dx = e.clientX - sx; sx = null;
      if (Math.abs(dx) > 30) move(Math.sign(dx));
      else { const p = cv.toLocal(e); move(p.x < W / 2 ? -1 : 1); }
    });
    api.loop((dt, t) => {
      if (!over) update(dt);
      fx.update(dt); fl.update(dt); shake.update(dt);
      draw(t, dt);
    });
  }
};
