import { StorageManager } from "./StorageManager.js";

// Every sound is synthesized on-device with WebAudio — no audio files, no network.
class SoundManagerClass {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this._noise = null;
    this._last = {};
  }

  async init() {
    this.enabled = await StorageManager.get("ogh_sound_on", true);
  }

  _ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.ratio.value = 4;
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(comp).connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
    return this.ctx;
  }

  async setEnabled(on) { this.enabled = on; await StorageManager.set("ogh_sound_on", on); }
  async toggle() { await this.setEnabled(!this.enabled); return this.enabled; }

  // Throttle identical sounds so rapid events don't turn into noise.
  _ok(name, ms = 30) {
    const now = performance.now();
    if (this._last[name] && now - this._last[name] < ms) return false;
    this._last[name] = now;
    return true;
  }

  tone({ freq = 440, duration = 0.12, type = "sine", gain = 0.15, sweepTo = null, delay = 0, attack = 0.005 }) {
    if (!this.enabled) return;
    try {
      const ctx = this._ensure(); if (!ctx) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      const t0 = ctx.currentTime + delay;
      osc.frequency.setValueAtTime(freq, t0);
      if (sweepTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo), t0 + duration);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(g).connect(this.master);
      osc.start(t0);
      osc.stop(t0 + duration + 0.05);
    } catch { /* audio unavailable */ }
  }

  noise({ duration = 0.3, gain = 0.2, filter = 1200, delay = 0, sweepTo = null }) {
    if (!this.enabled) return;
    try {
      const ctx = this._ensure(); if (!ctx) return;
      if (!this._noise) {
        const len = ctx.sampleRate;
        this._noise = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = this._noise.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      const src = ctx.createBufferSource(); src.buffer = this._noise;
      const f = ctx.createBiquadFilter(); f.type = "lowpass";
      const t0 = ctx.currentTime + delay;
      f.frequency.setValueAtTime(filter, t0);
      if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t0 + duration);
      const g = ctx.createGain();
      g.gain.setValueAtTime(gain, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      src.connect(f).connect(g).connect(this.master);
      src.start(t0); src.stop(t0 + duration + 0.05);
    } catch { /* audio unavailable */ }
  }

  _seq(notes, type = "triangle", step = 0.09, gain = 0.14, len = 0.14) {
    notes.forEach((n, i) => this.tone({ freq: n, duration: len, type, gain, delay: i * step }));
  }

  click() { if (this._ok("click", 40)) this.tone({ freq: 620, duration: 0.05, type: "square", gain: 0.05 }); }
  hover() { if (this._ok("hover", 60)) this.tone({ freq: 900, duration: 0.03, type: "sine", gain: 0.025 }); }
  start() { this._seq([392, 523, 659, 784], "triangle", 0.07, 0.12, 0.16); }
  score() { if (this._ok("score")) this.tone({ freq: 740, duration: 0.08, type: "square", gain: 0.07, sweepTo: 980 }); }
  coin() {
    if (!this._ok("coin", 40)) return;
    this.tone({ freq: 988, duration: 0.07, type: "square", gain: 0.07 });
    this.tone({ freq: 1318, duration: 0.14, type: "square", gain: 0.07, delay: 0.06 });
  }
  pop() { if (this._ok("pop", 25)) this.tone({ freq: 880 + Math.random() * 200, duration: 0.08, type: "sine", gain: 0.14, sweepTo: 300 }); }
  flip() { if (this._ok("flip", 30)) this.tone({ freq: 500, duration: 0.06, type: "triangle", gain: 0.1, sweepTo: 820 }); }
  move() { if (this._ok("move", 40)) this.tone({ freq: 330, duration: 0.05, type: "triangle", gain: 0.08 }); }
  tick() { if (this._ok("tick", 30)) this.tone({ freq: 1400, duration: 0.025, type: "square", gain: 0.035 }); }
  jump() { if (this._ok("jump", 50)) this.tone({ freq: 360, duration: 0.14, type: "square", gain: 0.06, sweepTo: 760 }); }
  shoot() { if (this._ok("shoot", 50)) this.tone({ freq: 1200, duration: 0.09, type: "sawtooth", gain: 0.04, sweepTo: 300 }); }
  hit() { if (this._ok("hit", 30)) this.tone({ freq: 220, duration: 0.07, type: "square", gain: 0.1, sweepTo: 140 }); }
  bounce() { if (this._ok("bounce", 30)) this.tone({ freq: 440, duration: 0.06, type: "sine", gain: 0.14, sweepTo: 520 }); }
  explode() { if (this._ok("explode", 60)) this.noise({ duration: 0.45, gain: 0.28, filter: 1800, sweepTo: 120 }); }
  whoosh() { if (this._ok("whoosh", 80)) this.noise({ duration: 0.25, gain: 0.08, filter: 400, sweepTo: 3000 }); }
  error() { if (this._ok("error", 80)) { this.tone({ freq: 196, duration: 0.12, type: "square", gain: 0.07 }); this.tone({ freq: 147, duration: 0.18, type: "square", gain: 0.07, delay: 0.1 }); } }
  levelUp() { this._seq([523, 659, 784, 1046], "triangle", 0.08, 0.13, 0.18); }
  win() { this._seq([523, 659, 784, 1046, 784, 1046, 1318], "triangle", 0.09, 0.13, 0.2); }
  gameOver() { this._seq([440, 370, 311, 220], "triangle", 0.13, 0.13, 0.22); }
  achievement() { this._seq([660, 880, 1100, 1320], "sine", 0.08, 0.13, 0.22); }
  note(i) { const scale = [262, 294, 330, 392, 440, 523, 587, 659, 784, 880]; this.tone({ freq: scale[i % scale.length], duration: 0.32, type: "triangle", gain: 0.16 }); }
}

export const SoundManager = new SoundManagerClass();
