import { makeCanvas, Particles, Floaters, Shake, text, orb, clamp, heldKeys, rand, TAU, fillRR } from "../../hub/js/core/Engine.js";

const W = 680, H = 460, PH = 86, PW = 12, WIN = 7;
let api, cv, ctx, fx, fl, shake, keys;
let me, ai, ball, sMe, sAi, serveT, over, pointerY, trail, rally, aiErr;

function serve(dir) {
  ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, r: 9, sp: 380 };
  serveT = 1.1;
  ball.dir = dir;
  rally = 0;
  aiErr = rand(-30, 30);
}

function paddleHit(p, side) {
  const rel = clamp((ball.y - p.y) / (PH / 2), -1, 1);
  ball.sp = Math.min(900, ball.sp * 1.06 + 12);
  const ang = rel * 0.95 + p.vy * 0.0006;
  ball.vx = Math.cos(ang) * ball.sp * side;
  ball.vy = Math.sin(ang) * ball.sp;
  rally++;
  aiErr = rand(-38, 38) * (1 + ball.sp / 900);
  fx.burst(ball.x, ball.y, { count: 14, color: side > 0 ? "#3fa9ff" : "#ff4fa3", speed: 260, life: 0.5, angle: side > 0 ? 0 : Math.PI, spread: 1.8 });
  shake.kick(3);
  api.sound.bounce();
  if (rally > 0 && rally % 5 === 0) fl.add(W / 2, 60, `RALLY ${rally}!`, { color: "#ffe45c", size: 20 });
}

function point(forMe) {
  forMe ? sMe++ : sAi++;
  shake.kick(10);
  fx.burst(ball.x, ball.y, { count: 40, color: forMe ? "#3fa9ff" : "#ff4fa3", speed: 360, life: 0.9, size: 4 });
  forMe ? api.sound.coin() : api.sound.error();
  api.setScore(sMe * 100);
  if (sMe >= WIN || sAi >= WIN) {
    over = true;
    const win = sMe > sAi;
    const score = sMe * 100 + (win ? 500 + (WIN - sAi) * 50 : 0);
    api.setScore(score);
    api.gameOver({ score, win, title: win ? "You win the match!" : "The computer wins", message: `Final score ${sMe} – ${sAi}` });
    return;
  }
  serve(forMe ? 1 : -1);
}

function update(dt) {
  // player
  const prevY = me.y;
  let dir = 0;
  if (keys.has("ArrowUp") || keys.has("w")) dir--;
  if (keys.has("ArrowDown") || keys.has("s")) dir++;
  if (dir) { me.y += dir * 560 * dt; pointerY = null; }
  else if (pointerY != null) me.y += (pointerY - me.y) * Math.min(1, dt * 20);
  me.y = clamp(me.y, PH / 2 + 8, H - PH / 2 - 8);
  me.vy = (me.y - prevY) / Math.max(dt, 0.001);
  // AI: tracks predicted ball with speed cap + error
  const prevA = ai.y;
  const tgt = ball.vx > 0 ? ball.y + aiErr : H / 2;
  const maxSp = 340 + Math.min(200, sMe * 25);
  ai.y += clamp(tgt - ai.y, -maxSp * dt, maxSp * dt);
  ai.y = clamp(ai.y, PH / 2 + 8, H - PH / 2 - 8);
  ai.vy = (ai.y - prevA) / Math.max(dt, 0.001);

  if (serveT > 0) {
    serveT -= dt;
    if (serveT <= 0) { const a = rand(-0.4, 0.4); ball.vx = Math.cos(a) * ball.sp * ball.dir; ball.vy = Math.sin(a) * ball.sp; api.sound.whoosh(); }
    return;
  }
  const steps = 3;
  for (let i = 0; i < steps; i++) {
    ball.x += (ball.vx * dt) / steps; ball.y += (ball.vy * dt) / steps;
    if (ball.y < ball.r + 6) { ball.y = ball.r + 6; ball.vy *= -1; api.sound.tick(); }
    if (ball.y > H - ball.r - 6) { ball.y = H - ball.r - 6; ball.vy *= -1; api.sound.tick(); }
    if (ball.vx < 0 && ball.x - ball.r < me.x + PW / 2 && ball.x > me.x - PW && Math.abs(ball.y - me.y) < PH / 2 + ball.r) { ball.x = me.x + PW / 2 + ball.r; paddleHit(me, 1); }
    if (ball.vx > 0 && ball.x + ball.r > ai.x - PW / 2 && ball.x < ai.x + PW && Math.abs(ball.y - ai.y) < PH / 2 + ball.r) { ball.x = ai.x - PW / 2 - ball.r; paddleHit(ai, -1); }
  }
  trail.push({ x: ball.x, y: ball.y }); if (trail.length > 16) trail.shift();
  if (ball.x < -30) point(false);
  else if (ball.x > W + 30) point(true);
}

function paddle(p, color) {
  ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = 26;
  const g = ctx.createLinearGradient(p.x - PW / 2, 0, p.x + PW / 2, 0);
  g.addColorStop(0, color); g.addColorStop(0.5, "#fff"); g.addColorStop(1, color);
  fillRR(ctx, p.x - PW / 2, p.y - PH / 2, PW, PH, 6, g);
  ctx.restore();
}

function draw(t, dt) {
  ctx.fillStyle = "#07051a"; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * 0.6);
  g.addColorStop(0, "rgba(139,92,246,0.18)"); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); shake.apply(ctx);
  // court
  ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 2; ctx.strokeRect(6, 6, W - 12, H - 12);
  ctx.setLineDash([12, 14]); ctx.beginPath(); ctx.moveTo(W / 2, 14); ctx.lineTo(W / 2, H - 14); ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(W / 2, H / 2, 60, 0, TAU); ctx.stroke();
  text(ctx, String(sMe), W / 2 - 70, 64, { size: 64, weight: 900, color: "rgba(63,169,255,0.9)", glow: 24 });
  text(ctx, String(sAi), W / 2 + 70, 64, { size: 64, weight: 900, color: "rgba(255,79,163,0.9)", glow: 24 });
  text(ctx, "YOU", W / 2 - 70, 108, { size: 12, color: "rgba(255,255,255,0.4)" });
  text(ctx, "CPU", W / 2 + 70, 108, { size: 12, color: "rgba(255,255,255,0.4)" });
  paddle(me, "#3fa9ff"); paddle(ai, "#ff4fa3");
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  trail.forEach((p, i) => { const k = i / trail.length; ctx.fillStyle = `rgba(255,255,255,${k * 0.25})`; ctx.beginPath(); ctx.arc(p.x, p.y, ball.r * k, 0, TAU); ctx.fill(); });
  ctx.restore();
  if (serveT > 0) {
    const k = serveT / 1.1;
    ctx.strokeStyle = `rgba(255,255,255,${k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ball.x, ball.y, 14 + (1 - k) * 30, 0, TAU); ctx.stroke();
  }
  orb(ctx, ball.x, ball.y, ball.r, "#ffffff", 24);
  fx.draw(ctx); fl.draw(ctx);
  ctx.restore();
  void t; void dt;
}

export default {
  init(stage, a) {
    api = a;
    cv = makeCanvas(stage, W, H); ctx = cv.ctx;
    fx = new Particles(); fl = new Floaters(); shake = new Shake(); keys = heldKeys(api);
    me = { x: 30, y: H / 2, vy: 0 }; ai = { x: W - 30, y: H / 2, vy: 0 };
    sMe = 0; sAi = 0; over = false; pointerY = null; trail = [];
    serve(1);
    api.setScore(0);
    api.on(cv.canvas, "pointermove", (e) => (pointerY = cv.toLocal(e).y));
    api.on(cv.canvas, "pointerdown", (e) => (pointerY = cv.toLocal(e).y));
    api.loop((dt, t) => {
      if (!over) update(dt);
      fx.update(dt); fl.update(dt); shake.update(dt);
      draw(t, dt);
    });
  }
};
