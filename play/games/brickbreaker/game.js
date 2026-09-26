import { makeCanvas, Particles, Floaters, Shake, bg, block, orb, text, fillRR, clamp, choice, heldKeys, makeStars, drawStars, TAU } from "../../hub/js/core/Engine.js";

const W = 480, H = 660, BW = 42, BH = 18, GAP = 4, COLS = 10, TOPY = 80;
const ROWC = ["#ff4d6d", "#ff9f1c", "#ffc53d", "#7ee04a", "#19d3c5", "#3fa9ff", "#a66bff"];
const LAYOUTS = [
  (r, c) => r < 6,
  (r, c) => r < 7 && (c + r) % 2 === 0 || r === 0,
  (r, c) => r < 8 && Math.abs(c - 4.5) < 5 - Math.abs(r - 3.5) * 0.9,
  (r, c) => r < 8 && (c < 3 || c > 6 || r % 3 === 0),
  (r, c) => r < 8 && !(r > 1 && r < 6 && c > 1 && c < 8) || (r === 3 || r === 4) && (c === 4 || c === 5)
];

let api, cv, ctx, fx, fl, shake, keys, stars;
let paddle, balls, bricks, drops, lives, score, level, stuck, over, pointerX, widen, slowT, flash;

function buildLevel() {
  bricks = [];
  const lay = LAYOUTS[(level - 1) % LAYOUTS.length];
  const x0 = (W - (COLS * BW + (COLS - 1) * GAP)) / 2;
  for (let r = 0; r < 9; r++) for (let c = 0; c < COLS; c++) {
    if (!lay(r, c)) continue;
    const hp = level > 2 && r < 2 ? 3 : level > 1 && r < 4 ? 2 : 1;
    bricks.push({ x: x0 + c * (BW + GAP), y: TOPY + r * (BH + GAP), w: BW, h: BH, hp, max: hp, color: ROWC[r % ROWC.length], hit: 0 });
  }
}
function resetBall() {
  stuck = true;
  balls = [{ x: paddle.x, y: paddle.y - 12, vx: 0, vy: 0, r: 8, trail: [] }];
}
function launch() {
  if (!stuck) return;
  stuck = false;
  const sp = 380 + level * 20;
  balls[0].vx = sp * 0.35 * (Math.random() < 0.5 ? -1 : 1); balls[0].vy = -sp * 0.94;
  api.sound.jump();
}

function hitBrick(b, ball) {
  b.hp--; b.hit = 0.15;
  if (b.hp <= 0) {
    score += 10 * b.max * level;
    fx.burst(b.x + b.w / 2, b.y + b.h / 2, { count: 16, color: b.color, speed: 240, life: 0.7, size: 3.5, gravity: 300 });
    shake.kick(2.5);
    api.sound.pop();
    if (Math.random() < 0.14) drops.push({ x: b.x + b.w / 2, y: b.y, kind: choice(["wide", "multi", "slow", "life", "multi", "wide"]) });
  } else { score += 5; api.sound.hit(); }
  api.setScore(score);
  void ball;
}

function stepBall(ball, dt) {
  ball.x += ball.vx * dt; ball.y += ball.vy * dt;
  if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); api.sound.bounce(); }
  if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); api.sound.bounce(); }
  if (ball.y < ball.r + 50) { ball.y = ball.r + 50; ball.vy = Math.abs(ball.vy); api.sound.bounce(); }
  // paddle
  const pw = paddle.w;
  if (ball.vy > 0 && ball.y + ball.r >= paddle.y - 7 && ball.y < paddle.y + 8 && ball.x > paddle.x - pw / 2 - ball.r && ball.x < paddle.x + pw / 2 + ball.r) {
    const rel = clamp((ball.x - paddle.x) / (pw / 2), -1, 1);
    const sp = Math.hypot(ball.vx, ball.vy) * 1.01;
    const ang = rel * 1.05;
    ball.vx = Math.sin(ang) * sp; ball.vy = -Math.cos(ang) * sp;
    ball.y = paddle.y - 8 - ball.r;
    fx.burst(ball.x, paddle.y - 8, { count: 6, color: "#9fe8ff", speed: 120, life: 0.35, angle: -Math.PI / 2, spread: 1.5 });
    api.sound.bounce();
  }
  // bricks
  for (const b of bricks) {
    if (b.hp <= 0) continue;
    const nx = clamp(ball.x, b.x, b.x + b.w), ny = clamp(ball.y, b.y, b.y + b.h);
    const dx = ball.x - nx, dy = ball.y - ny;
    if (dx * dx + dy * dy > ball.r * ball.r) continue;
    const ox = Math.min(ball.x + ball.r - b.x, b.x + b.w - (ball.x - ball.r));
    const oy = Math.min(ball.y + ball.r - b.y, b.y + b.h - (ball.y - ball.r));
    if (ox < oy) { ball.vx = ball.x < b.x + b.w / 2 ? -Math.abs(ball.vx) : Math.abs(ball.vx); }
    else { ball.vy = ball.y < b.y + b.h / 2 ? -Math.abs(ball.vy) : Math.abs(ball.vy); }
    hitBrick(b, ball);
    break;
  }
}

function update(dt) {
  // paddle movement
  const target = pointerX ?? paddle.x;
  let dir = 0;
  if (keys.has("ArrowLeft") || keys.has("a")) dir -= 1;
  if (keys.has("ArrowRight") || keys.has("d")) dir += 1;
  if (dir) { paddle.x += dir * 620 * dt; pointerX = null; }
  else if (pointerX != null) paddle.x += (target - paddle.x) * Math.min(1, dt * 22);
  paddle.w += ((widen > 0 ? 130 : 86) - paddle.w) * Math.min(1, dt * 8);
  paddle.x = clamp(paddle.x, paddle.w / 2, W - paddle.w / 2);
  if (widen > 0) widen -= dt;
  if (slowT > 0) slowT -= dt;
  if (flash > 0) flash -= dt;

  if (stuck) { balls[0].x = paddle.x; balls[0].y = paddle.y - 16; return; }
  const k = slowT > 0 ? 0.6 : 1;
  for (const ball of balls) {
    for (let s = 0; s < 4; s++) stepBall(ball, (dt * k) / 4);
    ball.trail.push({ x: ball.x, y: ball.y }); if (ball.trail.length > 10) ball.trail.shift();
  }
  const before = balls.length;
  balls = balls.filter((b) => b.y < H + 20);
  if (balls.length < before && balls.length === 0) {
    lives--; api.setLives(lives); shake.kick(10); api.sound.error(); flash = 0.3;
    if (lives <= 0) { over = true; api.gameOver({ score, message: `You reached level ${level}.` }); return; }
    resetBall();
  }
  // drops
  for (const d of drops) {
    d.y += 150 * dt;
    if (d.y > paddle.y - 14 && d.y < paddle.y + 10 && Math.abs(d.x - paddle.x) < paddle.w / 2 + 12) {
      d.dead = true; api.sound.coin();
      const label = { wide: "WIDE PADDLE", multi: "MULTI-BALL", slow: "SLOW-MO", life: "+1 LIFE" }[d.kind];
      fl.add(d.x, paddle.y - 30, label, { color: "#ffe45c", size: 16 });
      if (d.kind === "wide") widen = 12;
      if (d.kind === "slow") slowT = 8;
      if (d.kind === "life") { lives++; api.setLives(lives); }
      if (d.kind === "multi") {
        const src = balls[0];
        const sp = Math.hypot(src.vx, src.vy) || 400;
        for (const a of [-0.5, 0.5]) balls.push({ x: src.x, y: src.y, vx: Math.sin(a) * sp, vy: -Math.cos(a) * sp, r: 8, trail: [] });
      }
    }
  }
  drops = drops.filter((d) => !d.dead && d.y < H + 20);
  bricks.forEach((b) => (b.hit = Math.max(0, b.hit - dt)));
  if (bricks.every((b) => b.hp <= 0)) {
    level++; api.hud({ level });
    score += 250; api.setScore(score);
    fl.add(W / 2, H / 2, `LEVEL ${level}!`, { color: "#19d3c5", size: 38, life: 1.6 });
    fx.confetti(W / 2, H / 2, 80);
    api.sound.levelUp();
    buildLevel(); drops = []; resetBall();
  }
}

const DROPC = { wide: "#3fa9ff", multi: "#ff4fa3", slow: "#19d3c5", life: "#ff4d6d" };
const DROPT = { wide: "W", multi: "M", slow: "S", life: "♥" };

function draw(t, dt) {
  bg(ctx, W, H, "#2a0f3d", "#0b0620");
  drawStars(ctx, stars, W, H, dt, 12, t);
  ctx.save(); shake.apply(ctx);
  // top bar
  fillRR(ctx, 0, 0, W, 48, 0, "rgba(0,0,0,0.25)");
  for (let i = 0; i < lives; i++) orb(ctx, 22 + i * 22, 24, 7, "#ff4d6d");
  text(ctx, `LEVEL ${level}`, W / 2, 25, { size: 16, weight: 900, color: "#fff" });
  text(ctx, String(score), W - 18, 25, { size: 18, weight: 900, color: "#ffe45c", align: "right" });
  if (slowT > 0) text(ctx, "SLOW-MO", W / 2 + 90, 25, { size: 11, color: "#19d3c5" });

  for (const b of bricks) {
    if (b.hp <= 0) continue;
    const c = b.hp === 3 ? "#c7c7d9" : b.hp === 2 ? b.color : b.color;
    ctx.save();
    if (b.hit > 0) ctx.translate(0, Math.sin(b.hit * 60) * 1.5);
    block(ctx, b.x, b.y, b.w, b.h, 5, b.hit > 0 ? "#ffffff" : c, { glow: 8 });
    if (b.max > 1) {
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      for (let i = 0; i < b.hp; i++) ctx.fillRect(b.x + b.w / 2 - (b.hp * 6) / 2 + i * 6, b.y + b.h - 6, 4, 3);
    }
    ctx.restore();
  }
  for (const d of drops) {
    ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(Math.sin(t / 200) * 0.2);
    block(ctx, -16, -10, 32, 20, 10, DROPC[d.kind], { glow: 16 });
    text(ctx, DROPT[d.kind], 0, 1, { size: 13, weight: 900 });
    ctx.restore();
  }
  // paddle
  const pg = ctx.createLinearGradient(paddle.x - paddle.w / 2, 0, paddle.x + paddle.w / 2, 0);
  pg.addColorStop(0, "#19d3c5"); pg.addColorStop(0.5, "#9ff5ff"); pg.addColorStop(1, "#3fa9ff");
  ctx.save(); ctx.shadowColor = "#19d3c5"; ctx.shadowBlur = 24;
  fillRR(ctx, paddle.x - paddle.w / 2, paddle.y - 7, paddle.w, 14, 7, pg); ctx.restore();
  fillRR(ctx, paddle.x - paddle.w / 2 + 6, paddle.y - 5, paddle.w - 12, 4, 2, "rgba(255,255,255,0.6)");
  // balls
  for (const ball of balls) {
    ball.trail.forEach((p, i) => { ctx.fillStyle = `rgba(255,120,200,${(i / ball.trail.length) * 0.35})`; ctx.beginPath(); ctx.arc(p.x, p.y, ball.r * (i / ball.trail.length), 0, TAU); ctx.fill(); });
    orb(ctx, ball.x, ball.y, ball.r, "#ffffff", 20);
  }
  if (stuck && !over) text(ctx, "Click or press Space to launch", W / 2, H - 120, { size: 16, color: "rgba(255,255,255,0.8)", weight: 700 });
  fx.draw(ctx); fl.draw(ctx);
  ctx.restore();
  if (flash > 0) { ctx.fillStyle = `rgba(255,60,90,${flash})`; ctx.fillRect(0, 0, W, H); }
}

export default {
  init(stage, a) {
    api = a;
    cv = makeCanvas(stage, W, H); ctx = cv.ctx;
    fx = new Particles(); fl = new Floaters(); shake = new Shake(); keys = heldKeys(api); stars = makeStars(60, W, H);
    paddle = { x: W / 2, y: H - 50, w: 86 };
    lives = 3; score = 0; level = 1; over = false; pointerX = null; widen = 0; slowT = 0; drops = []; flash = 0;
    buildLevel(); resetBall();
    api.setScore(0); api.setLives(3); api.hud({ level: 1 });
    api.on(cv.canvas, "pointermove", (e) => (pointerX = cv.toLocal(e).x));
    api.on(cv.canvas, "pointerdown", (e) => { pointerX = cv.toLocal(e).x; launch(); });
    api.on(window, "keydown", (e) => { if (e.key === " " || e.key === "ArrowUp") launch(); });
    api.loop((dt, t) => {
      fx.update(dt); fl.update(dt); shake.update(dt);
      if (!over) update(dt);
      draw(t, dt);
    });
  }
};
