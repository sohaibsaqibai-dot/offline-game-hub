import { makeCanvas, Particles, Floaters, Shake, text, rand, dist, TAU } from "../../hub/js/core/Engine.js";

const W = 680, H = 480, TOTAL = 30;
let api, cv, ctx, fx, fl, shake;
let targets, score, time, over, spawnT, mouse, combo, hits, shots, holes;

function spawn() {
  const r = rand(30, 44);
  const moving = time < TOTAL - 8 && Math.random() < 0.4;
  const gold = Math.random() < 0.08;
  targets.push({ x: rand(r + 10, W - r - 10), y: rand(r + 50, H - r - 10), r, life: gold ? 1.2 : rand(1.6, 2.4), max: 0, vx: moving ? rand(-120, 120) : 0, vy: moving ? rand(-80, 80) : 0, gold, born: 0 });
  targets[targets.length - 1].max = targets[targets.length - 1].life;
}

function shoot(p) {
  if (over) return;
  shots++;
  holes.push({ x: p.x, y: p.y, t: 1.5 });
  for (let i = targets.length - 1; i >= 0; i--) {
    const tg = targets[i];
    const cur = tg.r * Math.max(0.35, tg.life / tg.max);
    const d = dist(p.x, p.y, tg.x, tg.y);
    if (d < cur) {
      const ring = d / cur;
      const base = ring < 0.25 ? 100 : ring < 0.55 ? 50 : 25;
      combo++; hits++;
      const pts = Math.round(base * (tg.gold ? 3 : 1) * (1 + Math.min(combo, 10) * 0.1));
      score += pts; api.setScore(score);
      fl.add(tg.x, tg.y - 10, ring < 0.25 ? `BULLSEYE +${pts}` : `+${pts}`, { color: tg.gold ? "#ffe45c" : ring < 0.25 ? "#ff4d6d" : "#fff", size: ring < 0.25 ? 22 : 18 });
      fx.burst(tg.x, tg.y, { count: 22, colors: tg.gold ? ["#ffe45c", "#fff"] : ["#ff4d6d", "#fff"], speed: 260, life: 0.6, size: 3.5 });
      shake.kick(ring < 0.25 ? 5 : 2);
      ring < 0.25 ? api.sound.coin() : api.sound.pop();
      targets.splice(i, 1);
      return;
    }
  }
  combo = 0; api.sound.hit();
}

function drawTarget(tg, t) {
  const k = Math.max(0.35, tg.life / tg.max);
  const pop = Math.min(1, tg.born * 6);
  const r = tg.r * k * (pop < 1 ? 0.5 + pop * 0.5 + Math.sin(pop * Math.PI) * 0.15 : 1);
  ctx.save(); ctx.translate(tg.x, tg.y);
  ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.beginPath(); ctx.ellipse(4, 6, r, r, 0, 0, TAU); ctx.fill();
  const rings = tg.gold ? ["#fff7cc", "#ffc53d", "#fff7cc", "#ff9f1c", "#fff"] : ["#ffffff", "#ff4d6d", "#ffffff", "#ff4d6d", "#ffe45c"];
  rings.forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, r * (1 - i * 0.2), 0, TAU); ctx.fill(); });
  ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
  // life arc
  ctx.strokeStyle = tg.gold ? "#ffe45c" : "rgba(255,255,255,0.8)"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, r + 6, -Math.PI / 2, -Math.PI / 2 + TAU * (tg.life / tg.max)); ctx.stroke();
  if (tg.gold) { ctx.shadowColor = "#ffe45c"; ctx.shadowBlur = 20 + Math.sin(t / 80) * 8; ctx.stroke(); }
  ctx.restore();
}

function draw(t) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#3b0a1c"); g.addColorStop(1, "#14040b");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); shake.apply(ctx);
  // range backdrop
  ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.lineWidth = 1;
  for (let i = 1; i < 8; i++) { ctx.beginPath(); ctx.arc(W / 2, H / 2, i * 60, 0, TAU); ctx.stroke(); }
  // time bar
  const k = Math.max(0, time / TOTAL);
  ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fillRect(20, 16, W - 40, 10);
  ctx.fillStyle = k < 0.25 ? "#ff4d6d" : "#ffc53d"; ctx.fillRect(20, 16, (W - 40) * k, 10);
  text(ctx, combo > 2 ? `COMBO ×${combo}` : "", W / 2, 40, { size: 13, color: "#ffe45c" });
  for (const h of holes) { ctx.fillStyle = `rgba(0,0,0,${Math.min(0.5, h.t)})`; ctx.beginPath(); ctx.arc(h.x, h.y, 3, 0, TAU); ctx.fill(); }
  for (const tg of targets) drawTarget(tg, t);
  fx.draw(ctx); fl.draw(ctx);
  ctx.restore();
  // crosshair
  if (mouse) {
    ctx.save(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.shadowColor = "#ff4d6d"; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 14, 0, TAU);
    ctx.moveTo(mouse.x - 22, mouse.y); ctx.lineTo(mouse.x - 8, mouse.y); ctx.moveTo(mouse.x + 8, mouse.y); ctx.lineTo(mouse.x + 22, mouse.y);
    ctx.moveTo(mouse.x, mouse.y - 22); ctx.lineTo(mouse.x, mouse.y - 8); ctx.moveTo(mouse.x, mouse.y + 8); ctx.lineTo(mouse.x, mouse.y + 22);
    ctx.stroke(); ctx.fillStyle = "#ff4d6d"; ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 2, 0, TAU); ctx.fill(); ctx.restore();
  }
}

export default {
  init(stage, a) {
    api = a;
    cv = makeCanvas(stage, W, H); ctx = cv.ctx;
    cv.canvas.style.cursor = "none";
    fx = new Particles(); fl = new Floaters(); shake = new Shake();
    targets = []; score = 0; time = TOTAL; over = false; spawnT = 0.3; mouse = null; combo = 0; hits = 0; shots = 0; holes = [];
    api.setScore(0); api.setTimer(TOTAL);
    api.on(cv.canvas, "pointermove", (e) => (mouse = cv.toLocal(e)));
    api.on(cv.canvas, "pointerleave", () => (mouse = null));
    api.on(cv.canvas, "pointerdown", (e) => { mouse = cv.toLocal(e); shoot(mouse); });
    api.loop((dt, t) => {
      if (!over) {
        time -= dt; api.setTimer(Math.max(0, Math.ceil(time)));
        spawnT -= dt;
        if (spawnT <= 0 && targets.length < 5) { spawn(); spawnT = Math.max(0.35, 0.9 - (TOTAL - time) * 0.015); }
        for (const tg of targets) {
          tg.life -= dt; tg.born += dt; tg.x += tg.vx * dt; tg.y += tg.vy * dt;
          if (tg.x < tg.r || tg.x > W - tg.r) tg.vx *= -1; if (tg.y < tg.r + 40 || tg.y > H - tg.r) tg.vy *= -1;
          if (tg.life <= 0) { combo = 0; fx.burst(tg.x, tg.y, { count: 6, color: "#888", speed: 60, life: 0.4 }); }
        }
        targets = targets.filter((tg) => tg.life > 0);
        if (time <= 0) {
          over = true;
          const acc = shots ? Math.round((hits / shots) * 100) : 0;
          api.gameOver({ score, title: "Time's up!", message: `${hits} hits · ${acc}% accuracy` });
        }
      }
      holes.forEach((h) => (h.t -= dt)); holes = holes.filter((h) => h.t > 0);
      fx.update(dt); fl.update(dt); shake.update(dt);
      draw(t);
    });
  }
};
