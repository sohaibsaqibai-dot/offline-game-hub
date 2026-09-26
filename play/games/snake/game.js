import { makeCanvas, Particles, Floaters, Shake, bg, grid, text, orb, lerp, randInt, directions, TAU, C } from "../../hub/js/core/Engine.js";

const N = 20, CELL = 24, W = N * CELL, H = N * CELL;
let api, cv, ctx, fx, fl, shake;
let snake, prev, dir, queue, food, bonus, score, eaten, stepMs, acc, dead, t0;

function place() {
  let p;
  do { p = { x: randInt(0, N - 1), y: randInt(0, N - 1) }; }
  while (snake.some((s) => s.x === p.x && s.y === p.y) || (food && food.x === p.x && food.y === p.y));
  return p;
}

function turn(d) {
  const v = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[d];
  const last = queue.length ? queue[queue.length - 1] : dir;
  if (v[0] === -last[0] && v[1] === -last[1]) return;
  if (v[0] === last[0] && v[1] === last[1]) return;
  if (queue.length < 3) queue.push(v);
}

function step() {
  if (queue.length) dir = queue.shift();
  const head = { x: snake[0].x + dir[0], y: snake[0].y + dir[1] };
  prev = snake.map((s) => ({ ...s }));
  if (head.x < 0 || head.y < 0 || head.x >= N || head.y >= N || snake.slice(0, -1).some((s) => s.x === head.x && s.y === head.y)) return die();
  snake.unshift(head);
  prev.unshift({ ...snake[1] });
  let grow = false;
  if (head.x === food.x && head.y === food.y) {
    grow = true; eaten++; score += 10;
    burst(food, C.rose, "+10");
    food = place();
    api.sound.coin();
    if (eaten % 5 === 0) { api.hud({ level: 1 + eaten / 5 }); api.sound.levelUp(); if (!bonus) bonus = { ...place(), life: 7 }; }
    stepMs = Math.max(62, 140 - eaten * 2.4);
  }
  if (bonus && head.x === bonus.x && head.y === bonus.y) {
    grow = true; score += 50;
    burst(bonus, C.amber, "+50");
    api.sound.levelUp();
    bonus = null;
  }
  if (!grow) { snake.pop(); prev.pop(); }
  api.setScore(score);
}

function burst(p, color, label) {
  const x = p.x * CELL + CELL / 2, y = p.y * CELL + CELL / 2;
  fx.burst(x, y, { count: 22, color, speed: 220, life: 0.6, size: 3.5 });
  fl.add(x, y - 10, label, { color, size: 18 });
}

function die() {
  dead = true;
  shake.kick(12);
  api.sound.explode();
  snake.forEach((s, i) => fx.burst(s.x * CELL + CELL / 2, s.y * CELL + CELL / 2, { count: 5, color: i === 0 ? "#d9ff8a" : C.lime, speed: 200 + i * 4, life: 0.9, size: 3 }));
  api.gameOver({ score, message: `You grew to ${snake.length} segments.` });
}

function draw(t) {
  ctx.save();
  shake.apply(ctx);
  bg(ctx, W, H, "#0f2418", "#07140d");
  grid(ctx, W, H, CELL, "rgba(126,224,74,0.06)");
  // arena border glow
  ctx.strokeStyle = "rgba(126,224,74,0.35)"; ctx.lineWidth = 2; ctx.strokeRect(1, 1, W - 2, H - 2);

  const k = dead ? 1 : Math.min(1, acc / stepMs);
  // food
  const pulse = 1 + Math.sin(t / 180) * 0.12;
  const fx0 = food.x * CELL + CELL / 2, fy0 = food.y * CELL + CELL / 2;
  ctx.save(); ctx.globalAlpha = 0.25; orb(ctx, fx0, fy0, CELL * 0.75 * pulse, C.rose); ctx.restore();
  orb(ctx, fx0, fy0, CELL * 0.36 * pulse, C.rose, 22);
  if (bonus) {
    const bx = bonus.x * CELL + CELL / 2, by = bonus.y * CELL + CELL / 2;
    ctx.save(); ctx.globalAlpha = bonus.life < 2 ? 0.4 + 0.6 * Math.abs(Math.sin(t / 80)) : 1;
    ctx.translate(bx, by); ctx.rotate(t / 400);
    ctx.fillStyle = C.amber; ctx.shadowColor = C.amber; ctx.shadowBlur = 20;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 5 : 11; ctx.lineTo(Math.cos((i * TAU) / 10) * r, Math.sin((i * TAU) / 10) * r); }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  // snake body as a smooth, glowing tube
  const pts = snake.map((s, i) => {
    const p = prev[i] || s;
    return { x: lerp(p.x, s.x, k) * CELL + CELL / 2, y: lerp(p.y, s.y, k) * CELL + CELL / 2 };
  });
  if (!dead) {
    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (let i = pts.length - 1; i > 0; i--) {
      const a = pts[i], b = pts[i - 1];
      const f = 1 - i / (pts.length + 4);
      ctx.strokeStyle = `hsl(${100 - f * 10}, 80%, ${38 + f * 22}%)`;
      ctx.lineWidth = CELL * (0.55 + f * 0.25);
      ctx.shadowColor = C.lime; ctx.shadowBlur = i < 3 ? 16 : 6;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    // highlight stripe
    ctx.shadowBlur = 0; ctx.strokeStyle = "rgba(220,255,180,0.35)"; ctx.lineWidth = 3;
    ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y - 3) : ctx.moveTo(p.x, p.y - 3))); ctx.stroke();
    // head
    const h = pts[0];
    orb(ctx, h.x, h.y, CELL * 0.48, "#9ef06a", 18);
    const [dx, dy] = dir;
    const ex = -dy, ey = dx;
    for (const s of [-1, 1]) {
      const x = h.x + dx * 4 + ex * 5 * s, y = h.y + dy * 4 + ey * 5 * s;
      ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, 3.6, 0, TAU); ctx.fill();
      ctx.fillStyle = "#0b1f10"; ctx.beginPath(); ctx.arc(x + dx * 1.3, y + dy * 1.3, 1.9, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  fx.draw(ctx); fl.draw(ctx);
  if (t - t0 < 1400) text(ctx, "GO!", W / 2, H / 2, { size: 64, color: "#d9ff8a", glow: 30, weight: 900 });
  ctx.restore();
}

export default {
  init(stage, a) {
    api = a;
    cv = makeCanvas(stage, W, H); ctx = cv.ctx;
    fx = new Particles(); fl = new Floaters(); shake = new Shake();
    snake = [{ x: 6, y: 10 }, { x: 5, y: 10 }, { x: 4, y: 10 }, { x: 3, y: 10 }];
    prev = snake.map((s) => ({ ...s }));
    dir = [1, 0]; queue = []; food = null; food = place(); bonus = null;
    score = 0; eaten = 0; stepMs = 140; acc = 0; dead = false; t0 = performance.now();
    api.setScore(0); api.hud({ level: 1 });
    directions(api, cv.canvas, turn, { minSwipe: 16 });
    api.loop((dt, t) => {
      if (!dead) {
        acc += dt * 1000;
        while (acc >= stepMs && !dead) { acc -= stepMs; step(); }
        if (bonus) { bonus.life -= dt; if (bonus.life <= 0) bonus = null; }
      }
      fx.update(dt); fl.update(dt); shake.update(dt);
      draw(t);
    });
  }
};
