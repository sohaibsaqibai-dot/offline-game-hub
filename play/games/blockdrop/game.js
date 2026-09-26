import { makeCanvas, Particles, Floaters, Shake, bg, block, text, fillRR, shuffle, heldKeys } from "../../hub/js/core/Engine.js";

const COLS = 10, ROWS = 20, S = 30, BX = 16, BY = 16, W = BX * 2 + COLS * S + 150, H = BY * 2 + ROWS * S;
const SHAPES = {
  I: [[0, 1], [1, 1], [2, 1], [3, 1]], O: [[1, 0], [2, 0], [1, 1], [2, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]],
  S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]], L: [[2, 0], [0, 1], [1, 1], [2, 1]]
};
const COL = { I: "#19d3c5", O: "#ffc53d", T: "#a66bff", S: "#7ee04a", Z: "#ff4d6d", J: "#3f7bff", L: "#ff9f1c" };
const KICKS = [[0, 0], [-1, 0], [1, 0], [0, -1], [-2, 0], [2, 0], [0, -2]];

let api, cv, ctx, fx, fl, shake, keys;
let board, piece, next, bag, hold, canHold, score, lines, level, fallAcc, lockT, over, clearing, das, lastKey;

function newBag() { return shuffle(Object.keys(SHAPES)); }
function take() { if (!bag.length) bag = newBag(); return bag.pop(); }
function cellsOf(p) {
  const size = p.t === "I" ? 4 : p.t === "O" ? 4 : 3;
  return SHAPES[p.t].map(([x, y]) => {
    for (let i = 0; i < p.r; i++) [x, y] = [size - 1 - y, x];
    return [p.x + x, p.y + y];
  });
}
function fits(p) { return cellsOf(p).every(([x, y]) => x >= 0 && x < COLS && y < ROWS && (y < 0 || !board[y][x])); }
function spawn(t) {
  piece = { t, x: 3, y: -1, r: 0 };
  if (t === "O") piece.x = 3;
  lockT = 0; canHold = true;
  if (!fits(piece)) { piece.y = -2; if (!fits(piece)) end(); }
}
function tryMove(dx, dy) {
  const p = { ...piece, x: piece.x + dx, y: piece.y + dy };
  if (fits(p)) { piece = p; if (dy === 0) lockT = Math.min(lockT, 0.25); return true; }
  return false;
}
function rotate(dir) {
  if (piece.t === "O") return;
  const r = (piece.r + dir + 4) % 4;
  for (const [kx, ky] of KICKS) {
    const p = { ...piece, r, x: piece.x + kx, y: piece.y + ky };
    if (fits(p)) { piece = p; lockT = Math.min(lockT, 0.25); api.sound.flip(); return; }
  }
}
function ghostY() { let p = { ...piece }; while (fits({ ...p, y: p.y + 1 })) p.y++; return p.y; }
function hardDrop() {
  const gy = ghostY();
  const d = gy - piece.y;
  score += d * 2;
  cellsOf(piece).forEach(([x, y]) => fx.burst(BX + x * S + S / 2, BY + y * S + S / 2, { count: 2, color: COL[piece.t], speed: 60, life: 0.4, angle: -Math.PI / 2, spread: 0.6 }));
  piece.y = gy;
  shake.kick(3);
  api.sound.hit();
  lock();
}
function lock() {
  let top = false;
  for (const [x, y] of cellsOf(piece)) { if (y < 0) top = true; else board[y][x] = piece.t; }
  if (top) return end();
  const full = [];
  for (let y = 0; y < ROWS; y++) if (board[y].every(Boolean)) full.push(y);
  if (full.length) {
    clearing = { rows: full, t: 0 };
    const pts = [0, 100, 300, 500, 800][full.length] * level;
    score += pts; lines += full.length;
    full.forEach((y) => { for (let x = 0; x < COLS; x++) fx.burst(BX + x * S + S / 2, BY + y * S + S / 2, { count: 4, color: COL[board[y][x]], speed: 260, life: 0.8, size: 3.5 }); });
    fl.add(BX + (COLS * S) / 2, BY + full[0] * S, full.length === 4 ? "BLOCK BLAST! +" + pts : `+${pts}`, { color: full.length === 4 ? "#ffe45c" : "#fff", size: full.length === 4 ? 28 : 22 });
    shake.kick(full.length * 3);
    full.length >= 4 ? api.sound.levelUp() : api.sound.coin();
    const nl = 1 + Math.floor(lines / 10);
    if (nl !== level) { level = nl; api.hud({ level }); fl.add(BX + (COLS * S) / 2, BY + 260, `LEVEL ${level}`, { color: "#19d3c5", size: 30, life: 1.4 }); }
  } else api.sound.move();
  api.setScore(score);
  spawn(next); next = take();
}
function finishClear() {
  board = board.filter((_, y) => !clearing.rows.includes(y));
  while (board.length < ROWS) board.unshift(Array(COLS).fill(null));
  clearing = null;
}
function doHold() {
  if (!canHold) return;
  const t = piece.t;
  if (hold) spawn(hold); else { spawn(next); next = take(); }
  hold = t; canHold = false; api.sound.whoosh();
}
function end() {
  if (over) return;
  over = true; shake.kick(10); api.sound.explode();
  api.gameOver({ score, message: `${lines} lines cleared · level ${level}` });
}

function drawMini(t, cx, cy, s) {
  if (!t) return;
  const cells = SHAPES[t];
  const xs = cells.map((c) => c[0]), ys = cells.map((c) => c[1]);
  const w = (Math.max(...xs) - Math.min(...xs) + 1) * s, h = (Math.max(...ys) - Math.min(...ys) + 1) * s;
  cells.forEach(([x, y]) => block(ctx, cx - w / 2 + (x - Math.min(...xs)) * s, cy - h / 2 + (y - Math.min(...ys)) * s, s - 2, s - 2, 4, COL[t]));
}

function draw(t) {
  bg(ctx, W, H, "#0a1a3a", "#050b1c");
  ctx.save(); shake.apply(ctx);
  // well
  fillRR(ctx, BX - 6, BY - 6, COLS * S + 12, ROWS * S + 12, 14, "rgba(255,255,255,0.05)");
  ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(BX, BY, COLS * S, ROWS * S);
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  for (let x = 1; x < COLS; x++) { ctx.beginPath(); ctx.moveTo(BX + x * S, BY); ctx.lineTo(BX + x * S, BY + ROWS * S); ctx.stroke(); }
  for (let y = 1; y < ROWS; y++) { ctx.beginPath(); ctx.moveTo(BX, BY + y * S); ctx.lineTo(BX + COLS * S, BY + y * S); ctx.stroke(); }
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const c = board[y][x];
    if (!c) continue;
    if (clearing && clearing.rows.includes(y)) {
      const k = clearing.t / 0.28;
      ctx.save(); ctx.globalAlpha = 1 - k;
      block(ctx, BX + x * S + 1, BY + y * S + 1, S - 2, S - 2, 5, "#ffffff", { glow: 20 });
      ctx.restore();
    } else block(ctx, BX + x * S + 1, BY + y * S + 1, S - 2, S - 2, 5, COL[c]);
  }
  if (piece && !over && !clearing) {
    const gy = ghostY();
    ctx.save(); ctx.globalAlpha = 0.22;
    cellsOf({ ...piece, y: gy }).forEach(([x, y]) => y >= 0 && fillRR(ctx, BX + x * S + 2, BY + y * S + 2, S - 4, S - 4, 5, COL[piece.t]));
    ctx.restore();
    ctx.save(); ctx.strokeStyle = COL[piece.t]; ctx.globalAlpha = 0.6; ctx.lineWidth = 1.5;
    cellsOf({ ...piece, y: gy }).forEach(([x, y]) => y >= 0 && ctx.strokeRect(BX + x * S + 2.5, BY + y * S + 2.5, S - 5, S - 5));
    ctx.restore();
    cellsOf(piece).forEach(([x, y]) => y >= 0 && block(ctx, BX + x * S + 1, BY + y * S + 1, S - 2, S - 2, 5, COL[piece.t], { glow: 14 }));
  }
  // side panel
  const px = BX + COLS * S + 22, pw = W - px - 12;
  const panel = (y, h, label) => { fillRR(ctx, px, y, pw, h, 14, "rgba(255,255,255,0.06)"); text(ctx, label, px + pw / 2, y + 16, { size: 11, color: "#8fa6d6", weight: 800 }); };
  panel(BY, 110, "NEXT"); drawMini(next, px + pw / 2, BY + 66, 22);
  panel(BY + 124, 110, "HOLD  (C)"); ctx.save(); if (!canHold) ctx.globalAlpha = 0.35; drawMini(hold, px + pw / 2, BY + 190, 22); ctx.restore();
  panel(BY + 248, 160, "STATS");
  [["Score", score], ["Lines", lines], ["Level", level]].forEach(([k, v], i) => {
    text(ctx, k, px + 14, BY + 290 + i * 40, { size: 12, color: "#8fa6d6", align: "left", weight: 700 });
    text(ctx, String(v), px + pw - 14, BY + 290 + i * 40, { size: 18, color: "#fff", align: "right", weight: 900 });
  });
  text(ctx, "← → move", px + pw / 2, BY + 440, { size: 12, color: "#6f7fb0", weight: 700 });
  text(ctx, "↑ / X rotate", px + pw / 2, BY + 462, { size: 12, color: "#6f7fb0", weight: 700 });
  text(ctx, "Space drop", px + pw / 2, BY + 484, { size: 12, color: "#6f7fb0", weight: 700 });
  fx.draw(ctx); fl.draw(ctx);
  ctx.restore();
  void t;
}

export default {
  init(stage, a) {
    api = a;
    cv = makeCanvas(stage, W, H); ctx = cv.ctx;
    fx = new Particles(); fl = new Floaters(); shake = new Shake();
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    bag = newBag(); hold = null; score = 0; lines = 0; level = 1; fallAcc = 0; over = false; clearing = null; das = 0; lastKey = null;
    next = take(); spawn(take());
    api.setScore(0); api.hud({ level: 1 });
    keys = heldKeys(api);
    api.on(window, "keydown", (e) => {
      if (over || clearing) return;
      const k = e.key;
      if (e.repeat && ["ArrowLeft", "ArrowRight", "a", "d", " ", "ArrowUp", "x", "w", "z"].includes(k)) return;
      if (k === "ArrowLeft" || k === "a") { tryMove(-1, 0) && api.sound.tick(); das = -0.17; lastKey = k; }
      else if (k === "ArrowRight" || k === "d") { tryMove(1, 0) && api.sound.tick(); das = -0.17; lastKey = k; }
      else if (k === "ArrowUp" || k === "x" || k === "w") rotate(1);
      else if (k === "z") rotate(-1);
      else if (k === " ") { e.preventDefault(); hardDrop(); }
      else if (k === "c" || k === "Shift") doHold();
    });
    // touch: tap = rotate, swipe = move/drop
    let sx = 0, sy = 0, st = 0, moved = 0;
    api.on(cv.canvas, "pointerdown", (e) => { sx = e.clientX; sy = e.clientY; st = performance.now(); moved = 0; });
    api.on(cv.canvas, "pointermove", (e) => {
      if (!e.buttons || over || clearing) return;
      const cell = cv.canvas.getBoundingClientRect().width / W * S;
      const dx = Math.round((e.clientX - sx) / cell);
      while (moved < dx) { if (tryMove(1, 0)) moved++; else break; }
      while (moved > dx) { if (tryMove(-1, 0)) moved--; else break; }
    });
    api.on(cv.canvas, "pointerup", (e) => {
      if (over || clearing) return;
      const dy = e.clientY - sy, dx = e.clientX - sx;
      if (dy > 60 && Math.abs(dy) > Math.abs(dx)) hardDrop();
      else if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && performance.now() - st < 300) rotate(1);
    });
    api.loop((dt, t) => {
      fx.update(dt); fl.update(dt); shake.update(dt);
      if (!over) {
        if (clearing) { clearing.t += dt; if (clearing.t > 0.28) finishClear(); }
        else {
          // auto-repeat for held left/right
          const hl = keys.has("ArrowLeft") || keys.has("a"), hr = keys.has("ArrowRight") || keys.has("d");
          if (hl || hr) { das += dt; while (das > 0.05) { das -= 0.05; tryMove(hl ? -1 : 1, 0); } }
          const soft = keys.has("ArrowDown") || keys.has("s");
          const interval = soft ? 0.035 : Math.max(0.06, 0.8 * Math.pow(0.84, level - 1));
          fallAcc += dt;
          while (fallAcc >= interval && piece && !over && !clearing) {
            fallAcc -= interval;
            if (tryMove(0, 1)) { if (soft) { score += 1; api.setScore(score); } lockT = 0; }
            else break;
          }
          if (piece && !fits({ ...piece, y: piece.y + 1 })) { lockT += dt; if (lockT > 0.5) lock(); }
        }
      }
      draw(t);
    });
  }
};
