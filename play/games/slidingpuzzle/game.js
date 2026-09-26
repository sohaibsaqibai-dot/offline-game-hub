import { el, randInt, directions } from "../../hub/js/core/Engine.js";

const N = 4;
// Original sunset-mountain picture used as the puzzle image (inline SVG, no files).
const PIC = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 400'>
<defs><linearGradient id='s' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#3b1d8f'/><stop offset='.45' stop-color='#ff4fa3'/><stop offset='.8' stop-color='#ffb13d'/></linearGradient>
<linearGradient id='w' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#ff7ab8'/><stop offset='1' stop-color='#2a1066'/></linearGradient></defs>
<rect width='400' height='400' fill='url(#s)'/>
<circle cx='200' cy='210' r='80' fill='#ffe45c'/><g fill='#ff9f1c' opacity='.8'><rect x='110' y='200' width='180' height='8'/><rect x='110' y='222' width='180' height='10'/><rect x='110' y='246' width='180' height='12'/></g>
<g fill='#fff' opacity='.9'><circle cx='60' cy='60' r='2'/><circle cx='330' cy='40' r='2.5'/><circle cx='260' cy='90' r='1.5'/><circle cx='120' cy='110' r='1.5'/><circle cx='360' cy='120' r='2'/></g>
<path d='M0 300 L70 200 L120 250 L190 160 L260 250 L310 190 L400 290 L400 400 L0 400Z' fill='#5a1f8f'/>
<path d='M0 330 L90 250 L160 310 L240 240 L330 310 L400 270 L400 400 L0 400Z' fill='#2a1066'/>
<rect y='330' width='400' height='70' fill='url(#w)'/><g stroke='#ffe45c' stroke-width='4' opacity='.6'><path d='M150 350h100M170 368h60M185 384h30'/></g>
</svg>`;
const PIC_URL = `url("data:image/svg+xml,${encodeURIComponent(PIC)}")`;

const STYLE = `
.sp-board{--t:min(100px,calc((100vw - 80px)/4.4),calc((100vh - 300px)/4.4));--g:6px;position:relative;width:calc(var(--t)*4 + var(--g)*5);height:calc(var(--t)*4 + var(--g)*5);
  border-radius:22px;background:linear-gradient(145deg,#132a4a,#0a1830);box-shadow:0 30px 60px -24px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,255,255,.1),0 0 80px -30px #43cea2}
.sp-tile{position:absolute;left:var(--g);top:var(--g);width:var(--t);height:var(--t);border-radius:12px;border:0;padding:0;cursor:pointer;
  background-image:${PIC_URL};background-size:calc(var(--t)*4) calc(var(--t)*4);transition:transform .14s ease,filter .2s;box-shadow:0 6px 14px -6px rgba(0,0,0,.7),inset 0 0 0 2px rgba(255,255,255,.22)}
.sp-tile:hover{filter:brightness(1.12)}
.sp-tile b{position:absolute;left:6px;top:6px;min-width:24px;height:24px;border-radius:8px;display:grid;place-items:center;font-size:13px;font-weight:900;color:#1c1640;background:rgba(255,255,255,.9)}
.sp-tile.ok{box-shadow:0 6px 14px -6px rgba(0,0,0,.7),inset 0 0 0 3px #7ee04a}
.sp-board.solved .sp-tile{box-shadow:none;border-radius:0}
.sp-board.solved{animation:spWin .8s ease}
.sp-prev{width:84px;height:84px;border-radius:12px;background-image:${PIC_URL};background-size:cover;box-shadow:0 8px 20px -8px rgba(0,0,0,.7);border:2px solid rgba(255,255,255,.3)}
@keyframes spWin{50%{transform:scale(1.04)}}
`;

let api, board, pos, empty, moves, time, done, nodes, info;

function draw() {
  for (let i = 1; i < N * N; i++) {
    const p = pos[i], n = nodes[i];
    const r = Math.floor(p / N), c = p % N;
    n.style.transform = `translate(calc(${c} * (var(--t) + var(--g))), calc(${r} * (var(--t) + var(--g))))`;
    n.classList.toggle("ok", p === i - 1);
  }
}

function slide(tile, silent) {
  const p = pos[tile];
  const pr = Math.floor(p / N), pc = p % N, er = Math.floor(empty / N), ec = empty % N;
  if (Math.abs(pr - er) + Math.abs(pc - ec) !== 1) return false;
  pos[tile] = empty; empty = p;
  if (!silent) { moves++; api.sound.move(); }
  return true;
}

function tileAt(p) { for (let i = 1; i < N * N; i++) if (pos[i] === p) return i; return 0; }

function clickTile(t) {
  if (done) return;
  const p = pos[t], pr = Math.floor(p / N), pc = p % N, er = Math.floor(empty / N), ec = empty % N;
  // slide an entire row/column segment toward the gap
  if (pr === er || pc === ec) {
    const step = pr === er ? (pc < ec ? -1 : 1) : (pr < er ? -N : N);
    while (empty !== p) slide(tileAt(empty + step));
  }
  after();
}

function after() {
  draw();
  info.textContent = `${moves} moves`;
  api.setScore(moves);
  let solved = true;
  for (let i = 1; i < N * N; i++) if (pos[i] !== i - 1) { solved = false; break; }
  if (solved) {
    done = true;
    board.classList.add("solved");
    const score = Math.max(100, 3000 - moves * 8 - time * 3);
    api.setScore(score);
    api.gameOver({ score, win: true, title: "Picture complete!", message: `${moves} moves in ${time}s` });
  }
}

export default {
  init(stage, a) {
    api = a; moves = 0; time = 0; done = false;
    stage.appendChild(el("style", "", STYLE));
    pos = []; for (let i = 1; i < N * N; i++) pos[i] = i - 1;
    empty = N * N - 1;
    // Shuffle with random legal moves -> always solvable.
    let last = -1;
    for (let k = 0; k < 300; k++) {
      const er = Math.floor(empty / N), ec = empty % N;
      const opts = [];
      if (er > 0) opts.push(empty - N); if (er < N - 1) opts.push(empty + N);
      if (ec > 0) opts.push(empty - 1); if (ec < N - 1) opts.push(empty + 1);
      const choices = opts.filter((o) => o !== last);
      const pick = choices[randInt(0, choices.length - 1)];
      last = empty;
      slide(tileAt(pick), true);
    }
    board = el("div", "sp-board");
    nodes = [];
    for (let i = 1; i < N * N; i++) {
      const r = Math.floor((i - 1) / N), c = (i - 1) % N;
      const n = el("button", "sp-tile", `<b>${i}</b>`);
      n.style.backgroundPosition = `calc(${-c} * var(--t)) calc(${-r} * var(--t))`;
      n.dataset.t = i;
      nodes[i] = n; board.appendChild(n);
    }
    info = el("div", "g-msg", "0 moves");
    const row = el("div", "g-row");
    row.append(el("div", "sp-prev"), el("div", "g-sub", "Rebuild this picture.<br>Tiles glow green when placed right."));
    stage.append(info, board, row);
    draw();
    api.setScore(0); api.setTimer(0);
    api.every(1000, () => { if (!done) { time++; api.setTimer(time); } });
    api.on(board, "click", (e) => { const n = e.target.closest(".sp-tile"); if (n) clickTile(+n.dataset.t); });
    directions(api, board, (d) => {
      if (done) return;
      // arrow = direction the tile moves into the gap
      const off = { left: 1, right: -1, up: N, down: -N }[d];
      const src = empty + off;
      const er = Math.floor(empty / N), sr = Math.floor(src / N);
      if (src < 0 || src >= N * N || ((d === "left" || d === "right") && er !== sr)) return;
      if (slide(tileAt(src))) after();
    }, { minSwipe: 9999 });
  }
};
