import { makeCanvas, Particles, Floaters, Shake, text, rand, randInt, TAU } from "../../hub/js/core/Engine.js";

const W = 600, H = 560, TOTAL = 45;
const HOLES = [];
for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) HOLES.push({ x: 120 + c * 180, y: 190 + r * 140 });
let api, cv, ctx, fx, fl, shake;
let slots, score, time, over, spawnT, mouse, swing, combo, hits;

function spawn() {
  const free = slots.map((s, i) => (s ? -1 : i)).filter((i) => i >= 0);
  if (!free.length) return;
  const i = free[randInt(0, free.length - 1)];
  const r = Math.random();
  const kind = r < 0.1 ? "gold" : r < 0.24 ? "bunny" : "mole";
  const up = Math.max(0.55, 1.3 - (TOTAL - time) * 0.018);
  slots[i] = { kind, t: 0, up, state: "rise", k: 0, hit: false };
}

function whack(i) {
  if (over) return;
  swing = 0.18;
  const s = slots[i];
  const h = HOLES[i];
  if (!s || s.hit || s.k < 0.35) { combo = 0; api.sound.hit(); fx.burst(h.x, h.y + 10, { count: 6, color: "#8a5a2b", speed: 100, life: 0.4, gravity: 300 }); return; }
  s.hit = true; s.state = "fall";
  shake.kick(4);
  if (s.kind === "bunny") {
    combo = 0; score = Math.max(0, score - 30); api.setScore(score); api.sound.error();
    fl.add(h.x, h.y - 70, "−30 Not the bunny!", { color: "#ff4d6d", size: 18 });
    return;
  }
  combo++; hits++;
  const pts = (s.kind === "gold" ? 30 : 10) * Math.min(4, 1 + Math.floor(combo / 4));
  score += pts; api.setScore(score);
  s.kind === "gold" ? api.sound.levelUp() : api.sound.pop();
  fx.burst(h.x, h.y - 40, { count: 18, colors: s.kind === "gold" ? ["#ffe45c", "#fff"] : ["#ffe45c", "#ffffff", "#ff9f1c"], speed: 240, life: 0.5, size: 3.5 });
  fl.add(h.x, h.y - 80, `+${pts}`, { color: s.kind === "gold" ? "#ffe45c" : "#fff", size: 22 });
}

function drawCritter(s, x, y, t) {
  const rise = s.k * 78;
  ctx.save();
  // clip to above the hole rim
  ctx.beginPath(); ctx.rect(x - 70, y - 140, 140, 140); ctx.ellipse(x, y, 58, 18, 0, 0, Math.PI); ctx.clip();
  ctx.translate(x, y + 70 - rise);
  const dizzy = s.hit;
  if (s.kind === "bunny") {
    ctx.fillStyle = "#f4f0ff";
    ctx.beginPath(); ctx.ellipse(-14, -86, 10, 30, -0.15, 0, TAU); ctx.ellipse(14, -86, 10, 30, 0.15, 0, TAU); ctx.fill();
    ctx.fillStyle = "#ffc2d9"; ctx.beginPath(); ctx.ellipse(-14, -84, 5, 22, -0.15, 0, TAU); ctx.ellipse(14, -84, 5, 22, 0.15, 0, TAU); ctx.fill();
    ctx.fillStyle = "#f4f0ff"; ctx.beginPath(); ctx.ellipse(0, -30, 40, 46, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#1c1640"; ctx.beginPath(); ctx.arc(-13, -40, 5, 0, TAU); ctx.arc(13, -40, 5, 0, TAU); ctx.fill();
    ctx.fillStyle = "#ff7aa2"; ctx.beginPath(); ctx.ellipse(0, -28, 6, 4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,120,160,0.4)"; ctx.beginPath(); ctx.arc(-24, -24, 7, 0, TAU); ctx.arc(24, -24, 7, 0, TAU); ctx.fill();
  } else {
    const gold = s.kind === "gold";
    const body = ctx.createLinearGradient(0, -80, 0, 20);
    body.addColorStop(0, gold ? "#ffe98a" : "#b07a4c"); body.addColorStop(1, gold ? "#d9a200" : "#6b4424");
    ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(0, -26, 44, 54, 0, 0, TAU); ctx.fill();
    if (gold) { ctx.fillStyle = "#ffd23a"; ctx.beginPath(); ctx.moveTo(-20, -74); ctx.lineTo(-14, -94); ctx.lineTo(-4, -80); ctx.lineTo(0, -98); ctx.lineTo(4, -80); ctx.lineTo(14, -94); ctx.lineTo(20, -74); ctx.fill(); }
    ctx.fillStyle = gold ? "#fff4c2" : "#e8c09a"; ctx.beginPath(); ctx.ellipse(0, -20, 24, 18, 0, 0, TAU); ctx.fill();
    if (dizzy) {
      ctx.strokeStyle = "#1c1640"; ctx.lineWidth = 3;
      for (const ex of [-16, 16]) { ctx.beginPath(); ctx.moveTo(ex - 5, -46); ctx.lineTo(ex + 5, -38); ctx.moveTo(ex + 5, -46); ctx.lineTo(ex - 5, -38); ctx.stroke(); }
      for (let i = 0; i < 3; i++) { const a = t / 150 + i * 2.1; text(ctx, "★", Math.cos(a) * 30, -84 + Math.sin(a) * 6, { size: 14, color: "#ffe45c" }); }
    } else {
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(-16, -42, 8, 0, TAU); ctx.arc(16, -42, 8, 0, TAU); ctx.fill();
      ctx.fillStyle = "#1c1640"; ctx.beginPath(); ctx.arc(-15, -41, 4.5, 0, TAU); ctx.arc(17, -41, 4.5, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = "#ff7aa2"; ctx.beginPath(); ctx.ellipse(0, -28, 9, 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillRect(-6, -14, 5, 7); ctx.fillRect(1, -14, 5, 7);
  }
  ctx.restore();
}

function draw(t, dt) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#9be15d"); g.addColorStop(1, "#3f9a2c");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); shake.apply(ctx);
  // grass tufts & flowers
  for (let i = 0; i < 40; i++) { const x = (i * 97) % W, y = 90 + (i * 53) % (H - 90); ctx.fillStyle = "rgba(40,110,30,0.35)"; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 4, y - 10); ctx.lineTo(x + 8, y); ctx.fill(); if (i % 5 === 0) { ctx.fillStyle = ["#ffe45c", "#fff", "#ff7aa2"][i % 3]; ctx.beginPath(); ctx.arc(x + 20, y - 4, 4, 0, TAU); ctx.fill(); } }
  // header
  const k = Math.max(0, time / TOTAL);
  ctx.fillStyle = "rgba(0,0,0,0.18)"; ctx.fillRect(20, 20, W - 40, 12);
  ctx.fillStyle = k < 0.25 ? "#ff4d6d" : "#ffe45c"; ctx.fillRect(20, 20, (W - 40) * k, 12);
  text(ctx, combo >= 4 ? `COMBO ×${Math.min(4, 1 + Math.floor(combo / 4))}` : "Whack the moles!", W / 2, 56, { size: 18, color: "#fff", stroke: { color: "rgba(30,70,20,0.5)", width: 5 } });
  HOLES.forEach((h, i) => {
    // hole
    ctx.fillStyle = "#5a3a1a"; ctx.beginPath(); ctx.ellipse(h.x, h.y + 4, 64, 24, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "#1f1208"; ctx.beginPath(); ctx.ellipse(h.x, h.y, 56, 18, 0, 0, TAU); ctx.fill();
    const s = slots[i];
    if (s) drawCritter(s, h.x, h.y, t);
    // front rim
    ctx.fillStyle = "#7a5230"; ctx.beginPath(); ctx.ellipse(h.x, h.y + 6, 64, 22, 0, 0.15, Math.PI - 0.15); ctx.ellipse(h.x, h.y + 2, 56, 16, 0, Math.PI - 0.1, 0.1, true); ctx.fill();
    text(ctx, String(i + 1), h.x + 58, h.y + 26, { size: 11, color: "rgba(255,255,255,0.5)" });
  });
  fx.draw(ctx); fl.draw(ctx);
  ctx.restore();
  // hammer cursor
  if (mouse) {
    ctx.save(); ctx.translate(mouse.x + 10, mouse.y + 10);
    ctx.rotate(swing > 0 ? -1.1 + (0.18 - swing) * 6 : -0.35);
    ctx.fillStyle = "#8a5a2b"; ctx.fillRect(-4, -8, 8, 60);
    const hg = ctx.createLinearGradient(-26, -30, 26, -10);
    hg.addColorStop(0, "#ff4d6d"); hg.addColorStop(1, "#b3172f");
    ctx.fillStyle = hg; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-28, -34, 56, 30, 8) : ctx.rect(-28, -34, 56, 30); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fillRect(-22, -30, 44, 6);
    ctx.restore();
  }
  void dt;
}

export default {
  init(stage, a) {
    api = a;
    cv = makeCanvas(stage, W, H); ctx = cv.ctx;
    cv.canvas.style.cursor = "none";
    fx = new Particles(); fl = new Floaters(); shake = new Shake();
    slots = Array(9).fill(null); score = 0; time = TOTAL; over = false; spawnT = 0.6; mouse = null; swing = 0; combo = 0; hits = 0;
    api.setScore(0); api.setTimer(TOTAL);
    const holeAt = (p) => HOLES.findIndex((h) => Math.abs(p.x - h.x) < 66 && p.y < h.y + 30 && p.y > h.y - 120);
    api.on(cv.canvas, "pointermove", (e) => (mouse = cv.toLocal(e)));
    api.on(cv.canvas, "pointerleave", () => (mouse = null));
    api.on(cv.canvas, "pointerdown", (e) => { mouse = cv.toLocal(e); const i = holeAt(mouse); if (i >= 0) whack(i); else { swing = 0.18; api.sound.whoosh(); } });
    api.on(window, "keydown", (e) => { const n = "123456789".indexOf(e.key); if (n >= 0) { mouse = { x: HOLES[n].x, y: HOLES[n].y - 40 }; whack(n); } });
    api.loop((dt, t) => {
      swing = Math.max(0, swing - dt);
      if (!over) {
        time -= dt; api.setTimer(Math.max(0, Math.ceil(time)));
        spawnT -= dt;
        if (spawnT <= 0) { spawn(); if (Math.random() < 0.3 + (TOTAL - time) / 90) spawn(); spawnT = Math.max(0.35, rand(0.5, 0.9) - (TOTAL - time) * 0.008); }
        if (time <= 0) { over = true; api.gameOver({ score, title: "Time's up!", message: `You bonked ${hits} mole${hits === 1 ? "" : "s"}!` }); }
      }
      slots.forEach((s, i) => {
        if (!s) return;
        s.t += dt;
        if (s.state === "rise") { s.k = Math.min(1, s.k + dt * 7); if (s.k >= 1) { s.state = "up"; s.t = 0; } }
        else if (s.state === "up") { if (s.t > s.up) { s.state = "fall"; if (s.kind !== "bunny" && !s.hit) combo = 0; } }
        else if (s.state === "fall") { s.k -= dt * (s.hit ? 3.5 : 6); if (s.k <= 0) slots[i] = null; }
      });
      fx.update(dt); fl.update(dt); shake.update(dt);
      draw(t, dt);
    });
  }
};
