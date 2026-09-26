import { makeCanvas, Particles, Floaters, Shake, text, rand, TAU, shade } from "../../hub/js/core/Engine.js";

const W = 420, H = 640, GROUND = 90, PW = 70;
let api, cv, ctx, fx, fl, shake;
let bird, pipes, clouds, hills, score, started, dead, dist, spawnX, flash, gapBase;

function flap() {
  if (dead) return;
  if (!started) started = true;
  bird.vy = -330;
  bird.flapT = 0.25;
  api.sound.jump();
  fx.burst(bird.x - 14, bird.y + 6, { count: 4, color: "#ffffff", speed: 70, life: 0.4, size: 2.5, angle: Math.PI * 0.8, spread: 1 });
}

function addPipe(x) {
  const gap = Math.max(138, gapBase - score * 1.8);
  const top = rand(70, H - GROUND - gap - 70);
  pipes.push({ x, top, gap, passed: false, coin: Math.random() < 0.35 });
}

function die() {
  if (dead) return;
  dead = true; flash = 0.6; shake.kick(12);
  api.sound.hit(); api.after(120, () => api.sound.explode());
  fx.burst(bird.x, bird.y, { count: 26, colors: ["#ffd23a", "#ff9f1c", "#fff"], speed: 260, life: 1, size: 4, gravity: 500, shape: "rect", glow: false });
  api.gameOver({ score, message: `You flew through ${score} pillar${score === 1 ? "" : "s"}.` });
}

function update(dt) {
  const speed = 150 + Math.min(80, score * 3);
  if (!started) { bird.y = H * 0.42 + Math.sin(performance.now() / 250) * 8; return; }
  if (!dead) dist += speed * dt;
  bird.vy += 980 * dt;
  bird.y += bird.vy * dt;
  bird.flapT = Math.max(0, bird.flapT - dt);
  if (!dead) {
    for (const p of pipes) {
      p.x -= speed * dt;
      if (!p.passed && p.x + PW < bird.x) {
        p.passed = true; score++; api.setScore(score); api.sound.score();
        fl.add(bird.x, bird.y - 30, "+1", { color: "#fff", size: 18 });
        if (score % 10 === 0) { api.sound.levelUp(); fx.confetti(W / 2, 80, 40); }
      }
      if (p.coin && !p.coinTaken && Math.hypot(bird.x - (p.x + PW / 2), bird.y - (p.top + p.gap / 2)) < 24) {
        p.coinTaken = true; score += 2; api.setScore(score); api.sound.coin();
        fl.add(p.x + PW / 2, p.top + p.gap / 2 - 20, "+2", { color: "#ffe45c", size: 18 });
        fx.burst(p.x + PW / 2, p.top + p.gap / 2, { count: 12, color: "#ffe45c", speed: 160, life: 0.5 });
      }
      const r = 13;
      if (bird.x + r > p.x && bird.x - r < p.x + PW && (bird.y - r < p.top || bird.y + r > p.top + p.gap)) die();
    }
    pipes = pipes.filter((p) => p.x > -PW - 10);
    const last = pipes[pipes.length - 1];
    if (!last || last.x < W - spawnX) addPipe(W + 20);
    if (bird.y < -30) bird.y = -30;
  }
  if (bird.y > H - GROUND - 12) { bird.y = H - GROUND - 12; bird.vy = 0; die(); }
  for (const c of clouds) { c.x -= c.s * dt * (dead ? 0.2 : 1); if (c.x < -120) { c.x = W + rand(20, 120); c.y = rand(30, 260); } }
}

function drawPipe(x, y, h, flip) {
  const g = ctx.createLinearGradient(x, 0, x + PW, 0);
  g.addColorStop(0, "#1f9d55"); g.addColorStop(0.35, "#5ef08a"); g.addColorStop(1, "#157a3f");
  ctx.fillStyle = g; ctx.fillRect(x + 4, y, PW - 8, h);
  const capY = flip ? y + h - 26 : y;
  const cg = ctx.createLinearGradient(x, 0, x + PW, 0);
  cg.addColorStop(0, "#23b563"); cg.addColorStop(0.35, "#7dffa6"); cg.addColorStop(1, "#16803f");
  ctx.fillStyle = cg;
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 2, capY, PW + 4, 26, 6) : ctx.rect(x - 2, capY, PW + 4, 26); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.fillRect(x + 12, y, 6, h);
  ctx.strokeStyle = "rgba(0,60,20,0.5)"; ctx.lineWidth = 2; ctx.strokeRect(x - 2, capY, PW + 4, 26);
}

function draw(t, dt) {
  // sky shifts from day to sunset as score climbs
  const k = Math.min(1, score / 40);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, `hsl(${205 - k * 180}, 80%, ${62 - k * 20}%)`);
  sky.addColorStop(1, `hsl(${190 - k * 160}, 90%, ${82 - k * 10}%)`);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  ctx.save(); shake.apply(ctx);
  // sun
  ctx.save(); ctx.shadowColor = "#fff6b0"; ctx.shadowBlur = 60; ctx.fillStyle = "#fff6c9";
  ctx.beginPath(); ctx.arc(W - 90, 120 + k * 60, 42, 0, TAU); ctx.fill(); ctx.restore();
  // clouds
  for (const c of clouds) {
    ctx.fillStyle = `rgba(255,255,255,${0.55 + c.s / 200})`;
    ctx.beginPath(); ctx.arc(c.x, c.y, 22 * c.z, 0, TAU); ctx.arc(c.x + 26 * c.z, c.y - 10 * c.z, 28 * c.z, 0, TAU); ctx.arc(c.x + 56 * c.z, c.y, 22 * c.z, 0, TAU); ctx.fill();
  }
  // hills parallax
  const hillOff = (dist * 0.25) % 240;
  ctx.fillStyle = shade("#6bcf8e", -k * 0.4);
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = -hillOff - 240; x < W + 240; x += 240) ctx.quadraticCurveTo(x + 120, H - GROUND - 140, x + 240, H - GROUND);
  ctx.lineTo(W, H); ctx.fill();
  ctx.fillStyle = shade("#3fae6a", -k * 0.4);
  const hillOff2 = (dist * 0.5) % 160;
  ctx.beginPath(); ctx.moveTo(0, H);
  for (let x = -hillOff2 - 160; x < W + 160; x += 160) ctx.quadraticCurveTo(x + 80, H - GROUND - 70, x + 160, H - GROUND);
  ctx.lineTo(W, H); ctx.fill();

  for (const p of pipes) {
    drawPipe(p.x, -10, p.top + 10, true);
    drawPipe(p.x, p.top + p.gap, H - GROUND - p.top - p.gap, false);
    if (p.coin && !p.coinTaken) {
      const cx = p.x + PW / 2, cy = p.top + p.gap / 2, sx = Math.abs(Math.cos(t / 200));
      ctx.save(); ctx.translate(cx, cy); ctx.scale(sx, 1); ctx.shadowColor = "#ffe45c"; ctx.shadowBlur = 16;
      ctx.fillStyle = "#ffc93a"; ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.fill();
      ctx.fillStyle = "#ffe98a"; ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill(); ctx.restore();
    }
  }
  // ground
  const gg = ctx.createLinearGradient(0, H - GROUND, 0, H);
  gg.addColorStop(0, "#e8c27a"); gg.addColorStop(1, "#b88a44");
  ctx.fillStyle = gg; ctx.fillRect(0, H - GROUND, W, GROUND);
  ctx.fillStyle = "#5ad17d"; ctx.fillRect(0, H - GROUND, W, 14);
  ctx.fillStyle = "#3fae6a";
  const go = dist % 28;
  for (let x = -go; x < W; x += 28) { ctx.beginPath(); ctx.moveTo(x, H - GROUND + 14); ctx.lineTo(x + 14, H - GROUND + 14); ctx.lineTo(x + 7, H - GROUND + 22); ctx.fill(); }

  // bird
  ctx.save(); ctx.translate(bird.x, bird.y);
  ctx.rotate(started ? Math.max(-0.5, Math.min(1.3, bird.vy / 500)) : 0);
  ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.beginPath(); ctx.ellipse(2, 16, 14, 4, 0, 0, TAU); ctx.fill();
  const bgd = ctx.createRadialGradient(-5, -6, 2, 0, 0, 20);
  bgd.addColorStop(0, "#fff08a"); bgd.addColorStop(0.6, "#ffd23a"); bgd.addColorStop(1, "#f0a500");
  ctx.fillStyle = bgd; ctx.beginPath(); ctx.ellipse(0, 0, 18, 15, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = "#fff4c2"; ctx.beginPath(); ctx.ellipse(-2, 6, 10, 6, 0, 0, TAU); ctx.fill();
  const wing = bird.flapT > 0 ? -0.9 : Math.sin(t / 70) * 0.3;
  ctx.save(); ctx.translate(-6, 2); ctx.rotate(wing);
  ctx.fillStyle = "#ffae00"; ctx.beginPath(); ctx.ellipse(-4, 0, 10, 6, 0, 0, TAU); ctx.fill(); ctx.restore();
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(8, -5, 6, 0, TAU); ctx.fill();
  ctx.fillStyle = "#1c1640"; ctx.beginPath(); ctx.arc(10, -5, dead ? 1 : 3, 0, TAU); ctx.fill();
  ctx.fillStyle = "#ff7a2a"; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(26, 3); ctx.lineTo(14, 7); ctx.fill();
  ctx.fillStyle = "rgba(255,110,110,0.5)"; ctx.beginPath(); ctx.arc(4, 4, 3, 0, TAU); ctx.fill();
  ctx.restore();

  fx.draw(ctx); fl.draw(ctx);
  text(ctx, String(score), W / 2, 70, { size: 54, weight: 900, color: "#fff", stroke: { color: "rgba(0,0,0,0.35)", width: 8 } });
  if (!started) text(ctx, "Tap / Space to flap", W / 2, H * 0.58, { size: 20, weight: 800, color: "#fff", stroke: { color: "rgba(0,0,0,0.3)", width: 6 } });
  ctx.restore();
  if (flash > 0) { ctx.fillStyle = `rgba(255,255,255,${flash})`; ctx.fillRect(0, 0, W, H); flash -= dt * 2; }
}

export default {
  init(stage, a) {
    api = a;
    cv = makeCanvas(stage, W, H); ctx = cv.ctx;
    fx = new Particles(); fl = new Floaters(); shake = new Shake();
    bird = { x: 120, y: H * 0.42, vy: 0, flapT: 0 };
    pipes = []; score = 0; started = false; dead = false; dist = 0; flash = 0; spawnX = 230; gapBase = 180;
    clouds = Array.from({ length: 5 }, (_, i) => ({ x: i * 110 + rand(0, 60), y: rand(30, 260), s: rand(10, 30), z: rand(0.6, 1.2) }));
    api.setScore(0);
    api.on(cv.canvas, "pointerdown", flap);
    api.on(window, "keydown", (e) => { if ((e.key === " " || e.key === "ArrowUp" || e.key === "w") && !e.repeat) flap(); });
    api.loop((dt, t) => {
      update(dt); fx.update(dt); fl.update(dt); shake.update(dt);
      draw(t, dt);
    });
  }
};
