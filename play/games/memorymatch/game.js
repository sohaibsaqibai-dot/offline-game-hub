import { el, shuffle } from "../../hub/js/core/Engine.js";

const ICONS = {
  star: ["#ffc53d", `<path d="M32 8l7 15 16 2-12 11 3 16-14-8-14 8 3-16L9 25l16-2z"/>`],
  heart: ["#ff4d6d", `<path d="M32 54C8 38 10 16 23 14c5 0 9 4 9 4s4-4 9-4c13 2 15 24-9 40z"/>`],
  moon: ["#8b5cf6", `<path d="M40 8a24 24 0 1 0 16 36A20 20 0 0 1 40 8z"/>`],
  bolt: ["#ffe45c", `<path d="M36 6L14 36h14l-4 22 24-32H34z"/>`],
  drop: ["#3fa9ff", `<path d="M32 6C22 22 14 30 14 40a18 18 0 0 0 36 0c0-10-8-18-18-34z"/>`],
  leaf: ["#7ee04a", `<path d="M52 10C22 10 10 26 12 52 38 54 54 40 52 10zM16 50L40 24" stroke="#123a00" stroke-width="3"/>`],
  crown: ["#ff9f1c", `<path d="M8 46l4-28 12 14 8-18 8 18 12-14 4 28z"/><rect x="8" y="48" width="48" height="6" rx="2"/>`],
  gem: ["#19d3c5", `<path d="M18 12h28l12 14-26 30L6 26z"/>`],
  note: ["#ff4fa3", `<path d="M26 12l24-6v34a8 8 0 1 1-4-7V16l-16 4v26a8 8 0 1 1-4-7z"/>`],
  planet: ["#fb923c", `<circle cx="32" cy="32" r="14"/><ellipse cx="32" cy="34" rx="28" ry="7" fill="none" stroke-width="4" transform="rotate(-18 32 34)"/>`]
};

const STYLE = `
.mm-grid{--s:min(98px,calc((100vw - 80px)/5.4),calc((100vh - 290px)/4.4));display:grid;grid-template-columns:repeat(5,var(--s));gap:calc(var(--s)*.14);perspective:900px}
.mm-card{width:var(--s);height:calc(var(--s)*1.18);position:relative;cursor:pointer;transform-style:preserve-3d;transition:transform .45s cubic-bezier(.3,1.4,.5,1);border:0;padding:0;background:none}
.mm-card.up,.mm-card.done{transform:rotateY(180deg)}
.mm-card:hover:not(.up):not(.done){transform:translateY(-4px) rotateY(8deg)}
.mm-face{position:absolute;inset:0;border-radius:16px;backface-visibility:hidden;display:grid;place-items:center;box-shadow:0 10px 22px -10px rgba(0,0,0,.7)}
.mm-back{background:radial-gradient(circle at 30% 20%,#8f6bff,#4a22b8 70%);border:2px solid rgba(255,255,255,.18)}
.mm-back::before{content:"";position:absolute;inset:8px;border-radius:10px;border:2px dashed rgba(255,255,255,.25)}
.mm-back::after{content:"?";font-weight:900;font-size:calc(var(--s)*.38);color:rgba(255,255,255,.55)}
.mm-front{transform:rotateY(180deg);background:linear-gradient(160deg,#fff,#ece7ff);border:2px solid #fff}
.mm-front svg{width:62%;height:62%;filter:drop-shadow(0 4px 6px rgba(0,0,0,.25))}
.mm-card.done .mm-front{animation:mmGlow .6s ease;box-shadow:0 0 0 3px var(--c),0 0 26px var(--c)}
.mm-card.shake{animation:mmShake .4s}
@keyframes mmGlow{50%{transform:rotateY(180deg) scale(1.1)}}
@keyframes mmShake{0%,100%{transform:rotateY(180deg)}25%{transform:rotateY(180deg) translateX(-6px)}75%{transform:rotateY(180deg) translateX(6px)}}
`;

let api, open, lock, moves, pairs, total, time;

export default {
  init(stage, a) {
    api = a; open = []; lock = false; moves = 0; pairs = 0; time = 0;
    const keys = Object.keys(ICONS);
    total = keys.length;
    stage.appendChild(el("style", "", STYLE));
    const info = el("div", "g-msg", "Find all 10 pairs");
    const grid = el("div", "mm-grid");
    for (const k of shuffle([...keys, ...keys])) {
      const [color, path] = ICONS[k];
      const card = el("button", "mm-card", `<div class="mm-face mm-back"></div><div class="mm-face mm-front"><svg viewBox="0 0 64 64" fill="${color}" stroke="${color}">${path}</svg></div>`);
      card.dataset.k = k;
      card.style.setProperty("--c", color);
      grid.appendChild(card);
    }
    stage.append(info, grid);
    api.setScore(0); api.setTimer(0);
    api.every(1000, () => { time++; api.setTimer(time); });

    api.on(grid, "click", (e) => {
      const card = e.target.closest(".mm-card");
      if (!card || lock || card.classList.contains("up") || card.classList.contains("done")) return;
      card.classList.add("up");
      api.sound.flip();
      open.push(card);
      if (open.length < 2) return;
      moves++;
      const [x, y] = open;
      if (x.dataset.k === y.dataset.k) {
        open = [];
        pairs++;
        api.after(250, () => { x.classList.add("done"); y.classList.add("done"); api.sound.coin(); });
        const sc = Math.max(0, pairs * 100 - Math.max(0, moves - pairs) * 5);
        api.setScore(sc);
        info.textContent = pairs === total ? "All pairs found!" : `${pairs} / ${total} pairs · ${moves} moves`;
        if (pairs === total) {
          const final = Math.max(100, 2400 - (moves - total) * 40 - time * 8);
          api.setScore(final);
          api.gameOver({ score: final, win: true, title: "Perfect memory!", message: `${moves} moves in ${time}s` });
        }
      } else {
        lock = true;
        info.textContent = `${pairs} / ${total} pairs · ${moves} moves`;
        api.after(650, () => { x.classList.add("shake"); y.classList.add("shake"); api.sound.error(); });
        api.after(1050, () => { x.classList.remove("up", "shake"); y.classList.remove("up", "shake"); open = []; lock = false; });
      }
    });
  }
};
