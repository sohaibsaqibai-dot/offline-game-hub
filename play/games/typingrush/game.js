import { makeCanvas, Particles, Floaters, Shake, text, rand, choice, fillRR, makeStars, drawStars, FONT, TAU } from "../../hub/js/core/Engine.js";

const W = 680, H = 560, GROUND = H - 60;
const WORDS = {
  3: ["sun", "sky", "fox", "cat", "run", "zip", "box", "jam", "owl", "map", "red", "arc", "ice", "orb", "win"],
  4: ["star", "moon", "neon", "game", "fire", "wave", "jump", "code", "glow", "rush", "bolt", "gold", "pixel", "fast", "type", "hero", "echo", "nova"],
  5: ["laser", "comet", "orbit", "blaze", "quick", "flash", "pulse", "storm", "rocket", "spark", "power", "magic", "tiger", "cloud", "light"],
  6: ["planet", "galaxy", "turbo", "shield", "rhythm", "wizard", "puzzle", "meteor", "dragon", "cosmic", "sprint", "frozen", "castle"],
  7: ["arcade", "journey", "phoenix", "gravity", "voltage", "crystal", "thunder", "spectrum", "rainbow", "blaster", "fantasy", "victory"]
};
let api, cv, ctx, fx, fl, shake, stars;
let words, target, score, lives, over, spawnT, time, lasers, typed, correct, combo, level, flash;

function spawn() {
  const maxLen = Math.min(7, 4 + Math.floor(time / 25));
  const len = Math.floor(rand(3, maxLen + 0.99));
  const pool = WORDS[len] || WORDS[4];
  let w, tries = 0;
  do { w = choice(pool); tries++; } while (words.some((x) => x.w[0] === w[0]) && tries < 12);
  ctx.font = `800 20px ${FONT}`;
  const tw = ctx.measureText(w).width + 24;
  words.push({ w, x: rand(tw / 2 + 10, W - tw / 2 - 10), y: -20, vy: rand(26, 40) + time * 0.9, tw, done: 0 });
}

function key(ch) {
  if (over) return;
  typed++;
  if (!target) {
    const cands = words.filter((w) => !w.dead && w.w[0] === ch).sort((a, b) => b.y - a.y);
    if (!cands.length) { combo = 0; api.sound.error(); shake.kick(2); return; }
    target = cands[0]; target.done = 0;
  }
  if (target.w[target.done] === ch) {
    target.done++; correct++;
    api.sound.tick();
    lasers.push({ x: target.x - target.tw / 2 + 12 + target.done * 10, y: target.y, t: 0.12 });
    if (target.done === target.w.length) {
      const w = target;
      w.dead = true; combo++;
      const pts = w.w.length * 10 * Math.min(4, 1 + Math.floor(combo / 5));
      score += pts; api.setScore(score);
      fx.burst(w.x, w.y, { count: 30, colors: ["#8e54e9", "#4776e6", "#fff", "#ff4fa3"], speed: 280, life: 0.7, size: 3.5 });
      fl.add(w.x, w.y - 10, `+${pts}`, { color: "#ffe45c", size: 20 });
      api.sound.explode();
      target = null;
      const nl = 1 + Math.floor(score / 400);
      if (nl !== level) { level = nl; api.hud({ level }); api.sound.levelUp(); fl.add(W / 2, H / 2, `LEVEL ${level}`, { color: "#19d3c5", size: 34, life: 1.4 }); }
    }
  } else { combo = 0; api.sound.error(); shake.kick(2); }
}

function update(dt) {
  time += dt;
  spawnT -= dt;
  if (spawnT <= 0) { spawn(); spawnT = Math.max(0.9, 2.6 - time * 0.02); }
  for (const w of words) {
    if (w.dead) continue;
    w.y += w.vy * dt * (w === target ? 0.85 : 1);
    if (w.y > GROUND - 10) {
      w.dead = true; lives--; api.setLives(lives); flash = 0.4; shake.kick(12); combo = 0;
      if (target === w) target = null;
      api.sound.explode();
      fx.burst(w.x, GROUND, { count: 30, colors: ["#ff4d6d", "#ff9f1c"], speed: 300, life: 0.8, angle: -Math.PI / 2, spread: 2.5 });
      if (lives <= 0) {
        over = true;
        const acc = typed ? Math.round((correct / typed) * 100) : 0;
        api.gameOver({ score, message: `Accuracy ${acc}% · reached level ${level}` });
      }
    }
  }
  words = words.filter((w) => !w.dead);
  lasers.forEach((l) => (l.t -= dt)); lasers = lasers.filter((l) => l.t > 0);
  flash = Math.max(0, flash - dt);
}

function draw(t, dt) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#120a3a"); g.addColorStop(1, "#2a1466");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  drawStars(ctx, stars, W, H, dt, 12, t);
  ctx.save(); shake.apply(ctx);
  // city skyline / shield
  ctx.fillStyle = "#0d0726";
  for (let i = 0; i < 18; i++) { const bw = 40, bh = 30 + ((i * 37) % 60); ctx.fillRect(i * bw, GROUND - bh, bw - 4, bh + 60); }
  ctx.fillStyle = "rgba(255,228,92,0.5)";
  for (let i = 0; i < 18; i++) for (let j = 0; j < 3; j++) if ((i + j * 3) % 4) ctx.fillRect(i * 40 + 8 + j * 9, GROUND - 20 - ((i * 7) % 20), 4, 5);
  ctx.save(); ctx.strokeStyle = `rgba(25,211,197,${0.35 + lives * 0.15})`; ctx.shadowColor = "#19d3c5"; ctx.shadowBlur = 16; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, GROUND); ctx.lineTo(W, GROUND); ctx.stroke(); ctx.restore();
  // turret
  const tx = W / 2, ty = H - 20;
  const aim = target ? Math.atan2(target.y - ty, target.x - tx) : -Math.PI / 2;
  ctx.save(); ctx.translate(tx, ty); ctx.rotate(aim + Math.PI / 2);
  fillRR(ctx, -6, -40, 12, 36, 4, "#8e54e9"); ctx.restore();
  ctx.fillStyle = "#4776e6"; ctx.beginPath(); ctx.arc(tx, ty, 20, Math.PI, 0); ctx.fill();
  for (const l of lasers) {
    ctx.save(); ctx.globalAlpha = l.t / 0.12; ctx.strokeStyle = "#ff4fa3"; ctx.shadowColor = "#ff4fa3"; ctx.shadowBlur = 16; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(tx, ty - 20); ctx.lineTo(l.x, l.y); ctx.stroke(); ctx.restore();
  }
  // words
  for (const w of words) {
    const isT = w === target;
    const danger = w.y / GROUND;
    ctx.save();
    if (isT) { ctx.shadowColor = "#ff4fa3"; ctx.shadowBlur = 20; }
    fillRR(ctx, w.x - w.tw / 2, w.y - 16, w.tw, 32, 10, isT ? "rgba(255,255,255,0.95)" : danger > 0.75 ? "rgba(255,77,109,0.85)" : "rgba(255,255,255,0.14)");
    ctx.restore();
    ctx.font = `800 20px ${FONT}`; ctx.textBaseline = "middle"; ctx.textAlign = "left";
    let x = w.x - w.tw / 2 + 12;
    for (let i = 0; i < w.w.length; i++) {
      const ch = w.w[i];
      ctx.fillStyle = isT ? (i < w.done ? "#ff4fa3" : "#2a1466") : "#fff";
      ctx.fillText(ch, x, w.y + 1);
      x += ctx.measureText(ch).width;
    }
  }
  fx.draw(ctx); fl.draw(ctx);
  text(ctx, "SHIELDS", 16, 24, { size: 11, align: "left", color: "rgba(255,255,255,0.6)" });
  for (let i = 0; i < 3; i++) text(ctx, "⬢", 86 + i * 22, 24, { size: 20, color: i < lives ? "#19d3c5" : "rgba(255,255,255,0.15)", glow: i < lives ? 10 : 0 });
  if (combo >= 5) text(ctx, `COMBO ×${Math.min(4, 1 + Math.floor(combo / 5))}`, W - 16, 24, { size: 14, align: "right", color: "#ffe45c" });
  if (time < 3) text(ctx, "Start typing!", W / 2, H / 2, { size: 30, color: "#fff", glow: 20, glowColor: "#8e54e9" });
  ctx.restore();
  if (flash > 0) { ctx.fillStyle = `rgba(255,60,90,${flash})`; ctx.fillRect(0, 0, W, H); }
  void TAU;
}

export default {
  init(stage, a) {
    api = a;
    cv = makeCanvas(stage, W, H); ctx = cv.ctx;
    fx = new Particles(); fl = new Floaters(); shake = new Shake(); stars = makeStars(60, W, H);
    words = []; target = null; score = 0; lives = 3; over = false; spawnT = 0.4; time = 0; lasers = []; typed = 0; correct = 0; combo = 0; level = 1; flash = 0;
    api.setScore(0); api.setLives(3); api.hud({ level: 1 });
    api.on(window, "keydown", (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape") return;
      if (/^[a-zA-Z]$/.test(e.key)) { e.preventDefault(); key(e.key.toLowerCase()); }
      if (e.key === "Backspace") { e.preventDefault(); if (target) { target.done = 0; target = null; } }
    });
    api.loop((dt, t) => {
      if (!over) update(dt);
      fx.update(dt); fl.update(dt); shake.update(dt);
      draw(t, dt);
    });
  }
};
