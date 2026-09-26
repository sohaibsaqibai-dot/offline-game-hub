// Engine — shared rendering + effects helpers for every game.
// Dependency-free, fully local. Games import what they need.

export const TAU = Math.PI * 2;
export const FONT = '"Segoe UI Variable Display", "Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif';

export const C = {
  violet: "#8b5cf6", purple: "#6d28d9", pink: "#ff4fa3", rose: "#ff4d6d", coral: "#ff7a59",
  amber: "#ffc53d", yellow: "#ffe45c", lime: "#7ee04a", green: "#22c55e", teal: "#19d3c5",
  sky: "#3fa9ff", blue: "#4f7cff", white: "#ffffff", ink: "#0d0b1f", night: "#141033"
};
export const NEON = [C.pink, C.amber, C.lime, C.teal, C.sky, C.violet, C.coral];

// ---------- math ----------
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export const ease = {
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: (t) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1)
};
export function aabb(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
export function circleRect(cx, cy, r, x, y, w, h) {
  const nx = clamp(cx, x, x + w), ny = clamp(cy, y, y + h);
  return (cx - nx) ** 2 + (cy - ny) ** 2 < r * r;
}

// ---------- color ----------
export function shade(hex, amt) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (amt >= 0) { r += (255 - r) * amt; g += (255 - g) * amt; b += (255 - b) * amt; }
  else { r *= 1 + amt; g *= 1 + amt; b *= 1 + amt; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
export function alpha(hex, a) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// ---------- canvas ----------
// Creates a crisp, high-DPI canvas that scales to fit the stage while keeping its aspect ratio.
export function makeCanvas(stage, w, h) {
  const frame = document.createElement("div");
  frame.className = "cv-frame";
  const canvas = document.createElement("canvas");
  const dpr = Math.min((window.devicePixelRatio || 1) * 1.5, 3);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.className = "game-canvas";
  canvas.style.width = "100%";
  canvas.style.aspectRatio = `${w} / ${h}`;
  frame.style.width = `min(100%, ${Math.round(w * 1.45) + 18}px, calc((100vh - 190px - var(--cv-extra, 0px)) * ${(w / h).toFixed(4)} + 18px))`;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  frame.appendChild(canvas);
  stage.appendChild(frame);
  const toLocal = (e) => {
    const r = canvas.getBoundingClientRect();
    const p = e.touches ? e.touches[0] || e.changedTouches[0] : e;
    return { x: ((p.clientX - r.left) * w) / r.width, y: ((p.clientY - r.top) * h) / r.height };
  };
  return { canvas, ctx, w, h, toLocal, frame };
}

export function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
export function fillRR(ctx, x, y, w, h, r, fill) { rr(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); }

// Glossy block: base color with top highlight + bottom shade. Used by tiles/bricks/blocks.
export function block(ctx, x, y, w, h, r, color, { glow = 0, stroke = true } = {}) {
  ctx.save();
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, shade(color, 0.25));
  g.addColorStop(0.55, color);
  g.addColorStop(1, shade(color, -0.25));
  fillRR(ctx, x, y, w, h, r, g);
  ctx.restore();
  ctx.save();
  rr(ctx, x + w * 0.08, y + h * 0.08, w * 0.84, h * 0.3, r * 0.7);
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fill();
  if (stroke) { rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r); ctx.strokeStyle = "rgba(255,255,255,0.18)"; ctx.lineWidth = 1; ctx.stroke(); }
  ctx.restore();
}

export function orb(ctx, x, y, r, color, glow = 0) {
  ctx.save();
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, shade(color, 0.55));
  g.addColorStop(0.5, color);
  g.addColorStop(1, shade(color, -0.35));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.42, r * 0.28, r * 0.17, -0.6, 0, TAU); ctx.fill();
}

export function text(ctx, str, x, y, { size = 20, color = "#fff", align = "center", base = "middle", weight = 800, glow = 0, glowColor, stroke } = {}) {
  ctx.save();
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align; ctx.textBaseline = base;
  if (glow) { ctx.shadowColor = glowColor || color; ctx.shadowBlur = glow; }
  if (stroke) { ctx.lineWidth = stroke.width || 4; ctx.strokeStyle = stroke.color || "#000"; ctx.lineJoin = "round"; ctx.strokeText(str, x, y); }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.restore();
}

export function bg(ctx, w, h, top = "#1b1446", bottom = "#0a0820") {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}
export function vignette(ctx, w, h, a = 0.45) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, `rgba(0,0,0,${a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}
export function grid(ctx, w, h, step, color = "rgba(255,255,255,0.04)", offY = 0) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = 0; x <= w; x += step) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); }
  for (let y = (offY % step) - step; y <= h; y += step) { ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); }
  ctx.stroke(); ctx.restore();
}

// ---------- effects ----------
export class Particles {
  constructor(max = 600) { this.list = []; this.max = max; }
  burst(x, y, { count = 16, color = "#fff", colors = null, speed = 180, spread = TAU, angle = 0, life = 0.7, size = 3, gravity = 0, drag = 0.92, shape = "circle", glow = true } = {}) {
    for (let i = 0; i < count; i++) {
      if (this.list.length >= this.max) this.list.shift();
      const a = angle + (Math.random() - 0.5) * spread;
      const s = speed * (0.35 + Math.random() * 0.65);
      this.list.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * (0.6 + Math.random() * 0.4), max: life,
        size: size * (0.6 + Math.random() * 0.8), color: colors ? choice(colors) : color, gravity, drag, shape,
        rot: Math.random() * TAU, vr: rand(-8, 8), glow
      });
    }
  }
  confetti(x, y, count = 60) {
    this.burst(x, y, { count, colors: NEON, speed: 420, life: 1.6, size: 5, gravity: 520, drag: 0.97, shape: "rect", glow: false, angle: -Math.PI / 2, spread: Math.PI * 1.1 });
  }
  update(dt) {
    const k = Math.pow(0.9, dt * 60);
    for (const p of this.list) {
      p.life -= dt;
      const d = Math.pow(p.drag, dt * 60);
      p.vx *= d; p.vy = p.vy * d + p.gravity * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    }
    this.list = this.list.filter((p) => p.life > 0);
    return k;
  }
  draw(ctx) {
    ctx.save();
    for (const p of this.list) {
      const t = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = t;
      ctx.fillStyle = p.color;
      if (p.shape === "rect") {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size); ctx.restore();
      } else {
        if (p.glow) ctx.globalCompositeOperation = "lighter";
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.4 + t * 0.6), 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = "source-over";
      }
    }
    ctx.restore();
  }
  clear() { this.list = []; }
}

export class Floaters {
  constructor() { this.list = []; }
  add(x, y, str, { color = "#fff", size = 20, life = 0.9, vy = -60 } = {}) { this.list.push({ x, y, str, color, size, life, max: life, vy }); }
  update(dt) { for (const f of this.list) { f.life -= dt; f.y += f.vy * dt; } this.list = this.list.filter((f) => f.life > 0); }
  draw(ctx) {
    for (const f of this.list) {
      const t = f.life / f.max;
      const s = f.size * (t > 0.8 ? 1 + (t - 0.8) * 2 : 1);
      ctx.save(); ctx.globalAlpha = Math.min(1, t * 2);
      text(ctx, f.str, f.x, f.y, { size: s, color: f.color, glow: 12, stroke: { color: "rgba(0,0,0,0.5)", width: 4 } });
      ctx.restore();
    }
  }
}

export class Shake {
  constructor() { this.mag = 0; this.x = 0; this.y = 0; }
  kick(m) { this.mag = Math.max(this.mag, m); }
  update(dt) {
    this.mag = Math.max(0, this.mag - dt * 40);
    this.x = (Math.random() - 0.5) * this.mag * 2;
    this.y = (Math.random() - 0.5) * this.mag * 2;
  }
  apply(ctx) { ctx.translate(this.x, this.y); }
}

export function makeStars(n, w, h) {
  return Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, z: rand(0.2, 1), tw: Math.random() * TAU }));
}
export function drawStars(ctx, stars, w, h, dt, speed = 40, t = 0) {
  for (const s of stars) {
    s.y += speed * s.z * dt;
    if (s.y > h) { s.y -= h; s.x = Math.random() * w; }
    const a = 0.35 + 0.65 * s.z * (0.7 + 0.3 * Math.sin(t / 300 + s.tw));
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    const r = s.z * 1.6;
    ctx.fillRect(s.x - r / 2, s.y - r / 2, r, r * (speed > 150 ? 3 : 1));
  }
}

// ---------- input helpers ----------
// Tracks held keys (lowercase). Arrow keys / space don't scroll the page.
export function heldKeys(api) {
  const set = new Set();
  api.on(window, "keydown", (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
    set.add(k);
  }, { always: true });
  api.on(window, "keyup", (e) => set.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key), { always: true });
  api.on(window, "blur", () => set.clear(), { always: true });
  return set;
}

// Calls cb("left"|"right"|"up"|"down") on swipe gestures and arrow/WASD keys.
export function directions(api, el, cb, { keys = true, minSwipe = 24 } = {}) {
  let sx = 0, sy = 0, active = false;
  api.on(el, "pointerdown", (e) => { sx = e.clientX; sy = e.clientY; active = true; });
  api.on(el, "pointerup", (e) => {
    if (!active) return; active = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < minSwipe) return;
    cb(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
  });
  if (keys) {
    const map = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", a: "left", d: "right", w: "up", s: "down", A: "left", D: "right", W: "up", S: "down" };
    api.on(window, "keydown", (e) => { if (map[e.key]) { e.preventDefault(); cb(map[e.key]); } });
  }
}

// Small DOM helper for DOM-based games.
export function el(tag, cls = "", html = "") {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html) n.innerHTML = html;
  return n;
}
