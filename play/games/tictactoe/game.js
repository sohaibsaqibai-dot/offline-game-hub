import { el } from "../../hub/js/core/Engine.js";

const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const STYLE = `
.tt-top{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap}
.tt-sb{display:flex;gap:10px}
.tt-s{min-width:96px;padding:10px 14px;border-radius:16px;text-align:center;background:rgba(255,255,255,.06);border:2px solid transparent;transition:border-color .2s,transform .2s}
.tt-s.turn{border-color:currentColor;transform:translateY(-2px)}
.tt-s em{display:block;font-style:normal;font-size:11px;letter-spacing:.12em;font-weight:900;opacity:.8}.tt-s b{font-size:26px;font-weight:900}
.tt-x{color:#ffe45c}.tt-o{color:#19d3c5}.tt-d{color:#aba3d6}
.tt-board{--s:min(360px,calc(100vw - 60px),calc(100vh - 330px));position:relative;width:var(--s);height:var(--s);display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:10px;border-radius:26px;
  background:linear-gradient(145deg,#3a1d8f,#1c0e52);box-shadow:0 30px 60px -24px rgba(0,0,0,.8),0 0 90px -30px #8e2de2}
.tt-c{border:0;border-radius:18px;background:rgba(255,255,255,.07);cursor:pointer;display:grid;place-items:center;transition:background .2s,transform .12s;padding:12%}
.tt-c:hover:empty{background:rgba(255,255,255,.14);transform:scale(1.03)}
.tt-c svg{width:100%;height:100%;overflow:visible}
.tt-c path,.tt-c circle{fill:none;stroke-width:13;stroke-linecap:round;stroke-dasharray:200;stroke-dashoffset:200;animation:ttDraw .35s ease forwards}
.tt-c .x2{animation-delay:.15s}
.tt-c.win{background:rgba(255,255,255,.2);animation:ttWin .6s ease}
.tt-line{position:absolute;inset:0;pointer-events:none}
.tt-line line{stroke:#fff;stroke-width:8;stroke-linecap:round;stroke-dasharray:600;stroke-dashoffset:600;animation:ttDraw .45s ease forwards;filter:drop-shadow(0 0 8px #fff)}
@keyframes ttDraw{to{stroke-dashoffset:0}}@keyframes ttWin{50%{transform:scale(1.08)}}
`;
const XSVG = `<svg viewBox="0 0 100 100"><path d="M18 18 L82 82" stroke="#ffe45c" style="filter:drop-shadow(0 0 8px #ffe45c)"/><path class="x2" d="M82 18 L18 82" stroke="#ffe45c" style="filter:drop-shadow(0 0 8px #ffe45c)"/></svg>`;
const OSVG = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="32" stroke="#19d3c5" style="filter:drop-shadow(0 0 8px #19d3c5)" transform="rotate(-90 50 50)"/></svg>`;

let roundId = 0, api, b, turn, mode, level, lock, wins, cells, board, msg, sb, starter, rounds;

function winner(s) {
  for (const l of LINES) if (s[l[0]] && s[l[0]] === s[l[1]] && s[l[0]] === s[l[2]]) return { p: s[l[0]], l };
  return s.every(Boolean) ? { p: "draw" } : null;
}
function minimax(s, player, depth) {
  const w = winner(s);
  if (w) return w.p === "O" ? 10 - depth : w.p === "X" ? depth - 10 : 0;
  let best = player === "O" ? -99 : 99;
  for (let i = 0; i < 9; i++) if (!s[i]) {
    s[i] = player;
    const v = minimax(s, player === "O" ? "X" : "O", depth + 1);
    s[i] = null;
    best = player === "O" ? Math.max(best, v) : Math.min(best, v);
  }
  return best;
}
function cpuMove() {
  const free = b.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
  if (level === "easy" && Math.random() < 0.45) return free[Math.floor(Math.random() * free.length)];
  let best = -99, pick = free[0];
  for (const i of free) { b[i] = "O"; const v = minimax(b, "X", 0) + Math.random() * 0.1; b[i] = null; if (v > best) { best = v; pick = i; } }
  return pick;
}

function renderScore() {
  const [nx, no] = mode === "cpu" ? ["You · X", "CPU · O"] : ["P1 · X", "P2 · O"];
  sb.innerHTML = `<div class="tt-s tt-x ${turn === "X" && !lock ? "turn" : ""}"><em>${nx}</em><b>${wins.X}</b></div><div class="tt-s tt-d"><em>DRAWS</em><b>${wins.D}</b></div><div class="tt-s tt-o ${turn === "O" && !lock ? "turn" : ""}"><em>${no}</em><b>${wins.O}</b></div>`;
}

function place(i) {
  b[i] = turn;
  cells[i].innerHTML = turn === "X" ? XSVG : OSVG;
  api.sound.note(turn === "X" ? 4 : 6);
  const w = winner(b);
  if (w) return finish(w);
  turn = turn === "X" ? "O" : "X";
  msg.textContent = mode === "cpu" ? (turn === "X" ? "Your turn" : "CPU is thinking…") : `Player ${turn === "X" ? "1 (X)" : "2 (O)"}'s turn`;
  renderScore();
  if (mode === "cpu" && turn === "O") { lock = true; const rid = roundId; api.after(420, () => { if (rid !== roundId) return; lock = false; place(cpuMove()); }); }
}

function finish(w) {
  lock = true; rounds++;
  if (w.p === "draw") { wins.D++; msg.textContent = "It's a draw!"; api.sound.move(); }
  else {
    wins[w.p]++;
    w.l.forEach((k) => cells[k].classList.add("win"));
    const pos = (k) => [((k % 3) + 0.5) * 33.33, (Math.floor(k / 3) + 0.5) * 33.33];
    const [x1, y1] = pos(w.l[0]), [x2, y2] = pos(w.l[2]);
    const ln = el("div", "tt-line", `<svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" vector-effect="non-scaling-stroke"/></svg>`);
    board.appendChild(ln);
    const youWon = w.p === "X";
    msg.textContent = mode === "cpu" ? (youWon ? "You win this round! 🎉" : "CPU takes the round") : `Player ${w.p === "X" ? 1 : 2} wins the round!`;
    mode === "cpu" && !youWon ? api.sound.error() : api.sound.levelUp();
  }
  renderScore();
  const score = wins.X * 100 + wins.D * 30;
  api.setScore(score);
  if (wins.X >= 3 || wins.O >= 3) {
    const win = wins.X >= 3;
    const title = mode === "cpu" ? (win ? "Match won!" : "CPU wins the match") : `Player ${win ? 1 : 2} wins the match!`;
    api.gameOver({ score, win: mode === "cpu" && win, title, message: `Final: ${wins.X} – ${wins.O} (${wins.D} draw${wins.D === 1 ? "" : "s"})` });
    return;
  }
  const rid = roundId; api.after(1300, () => { if (rid === roundId) newRound(); });
}

function newRound() {
  roundId++;
  b = Array(9).fill(null); lock = false;
  board.querySelectorAll(".tt-line").forEach((n) => n.remove());
  cells.forEach((c) => { c.innerHTML = ""; c.classList.remove("win"); });
  starter = starter === "X" ? "O" : "X";
  turn = rounds === 0 ? "X" : starter;
  msg.textContent = mode === "cpu" ? (turn === "X" ? "Your turn — first to 3 wins" : "CPU starts this round") : `Player ${turn === "X" ? "1 (X)" : "2 (O)"} starts`;
  renderScore();
  if (mode === "cpu" && turn === "O") { lock = true; const rid = roundId; api.after(500, () => { if (rid !== roundId) return; lock = false; place(cpuMove()); }); }
}

export default {
  init(stage, a) {
    api = a; mode = mode || "cpu"; level = level || "hard"; wins = { X: 0, O: 0, D: 0 }; starter = "O"; rounds = 0;
    stage.appendChild(el("style", "", STYLE));
    const top = el("div", "tt-top");
    const modes = [["cpu", "🤖 vs CPU"], ["2p", "👥 2 Players"]].map(([k, l]) => { const btn = el("button", "g-btn" + (mode === k ? " on" : ""), l); api.on(btn, "click", () => { mode = k; api.sound.click(); restartAll(); }); return btn; });
    const lv = el("button", "g-btn", level === "hard" ? "🧠 Hard" : "🙂 Easy");
    api.on(lv, "click", () => { level = level === "hard" ? "easy" : "hard"; restartAll(); });
    top.append(...modes, lv);
    sb = el("div", "tt-sb");
    board = el("div", "tt-board");
    cells = Array.from({ length: 9 }, (_, i) => { const c = el("button", "tt-c"); c.dataset.i = i; board.appendChild(c); return c; });
    msg = el("div", "g-msg", "");
    stage.append(top, sb, board, msg);
    api.on(board, "click", (e) => {
      const c = e.target.closest(".tt-c");
      if (!c || lock || b[+c.dataset.i]) return;
      if (mode === "cpu" && turn !== "X") return;
      place(+c.dataset.i);
    });
    function restartAll() { wins = { X: 0, O: 0, D: 0 }; rounds = 0; starter = "O"; api.setScore(0); top.querySelectorAll(".g-btn").forEach((x, k) => k < 2 && x.classList.toggle("on", (k === 0) === (mode === "cpu"))); lv.textContent = level === "hard" ? "🧠 Hard" : "🙂 Easy"; lv.style.display = mode === "cpu" ? "" : "none"; newRound(); }
    api.setScore(0);
    restartAll();
  }
};
