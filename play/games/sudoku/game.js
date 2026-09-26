import { el, shuffle } from "../../hub/js/core/Engine.js";

const STYLE = `
.sd-wrap{display:flex;gap:22px;align-items:center;flex-wrap:wrap;justify-content:center}
.sd-grid{--s:min(52px,calc((100vw - 50px)/9.4),calc((100vh - 250px)/9.6));display:grid;grid-template-columns:repeat(9,var(--s));background:#2a2466;padding:4px;border-radius:16px;
  box-shadow:0 30px 60px -24px rgba(0,0,0,.8),0 0 80px -30px #667eea;gap:1px;user-select:none}
.sd-c{width:var(--s);height:var(--s);display:grid;place-items:center;font-size:calc(var(--s)*.54);font-weight:800;background:#f7f5ff;color:#3b2a8f;cursor:pointer;position:relative;border:0;padding:0;font-family:inherit}
.sd-c.given{color:#1c1640;font-weight:900;background:#ece8ff}
.sd-c.rel{background:#dcd5ff}.sd-c.same{background:#b9a8ff;color:#1c1640}
.sd-c.sel{background:#8b5cf6;color:#fff;box-shadow:inset 0 0 0 2px #fff}
.sd-c.bad{color:#ff2d55;animation:sdBad .35s}.sd-c.win{animation:sdWin .5s ease both}
.sd-c:nth-child(9n+3),.sd-c:nth-child(9n+6){margin-right:3px}
.sd-c:nth-child(n+19):nth-child(-n+27),.sd-c:nth-child(n+46):nth-child(-n+54){margin-bottom:3px}
.sd-c:nth-child(1){border-top-left-radius:12px}.sd-c:nth-child(9){border-top-right-radius:12px}.sd-c:nth-child(73){border-bottom-left-radius:12px}.sd-c:nth-child(81){border-bottom-right-radius:12px}
.sd-notes{position:absolute;inset:2px;display:grid;grid-template-columns:repeat(3,1fr);font-size:calc(var(--s)*.2);font-weight:700;color:#7a6fb8;line-height:1}
.sd-notes i{display:grid;place-items:center;font-style:normal}
.sd-side{display:flex;flex-direction:column;gap:12px;align-items:center}
.sd-pad{display:grid;grid-template-columns:repeat(3,64px);gap:8px}
.sd-n{height:60px;border-radius:14px;border:0;font-size:24px;font-weight:900;color:#fff;cursor:pointer;background:linear-gradient(160deg,#7c6cf0,#4c3bbd);box-shadow:0 5px 0 #33278a,0 10px 20px -8px rgba(0,0,0,.6);position:relative;transition:transform .08s}
.sd-n:active{transform:translateY(4px);box-shadow:0 1px 0 #33278a}
.sd-n small{position:absolute;right:7px;bottom:4px;font-size:10px;opacity:.7}
.sd-n.done{opacity:.3;pointer-events:none}
.sd-mist{font-weight:800}.sd-mist b{color:#ff4d6d}
@keyframes sdBad{25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}@keyframes sdWin{50%{transform:scale(1.15);background:#7ee04a}}
`;

let api, sol, puz, cur, notes, cells, sel, mistakes, time, over, notesMode, padBtns, mistEl, notesBtn;

function canPlace(g, i, n) {
  const r = Math.floor(i / 9), c = i % 9, br = r - (r % 3), bc = c - (c % 3);
  for (let k = 0; k < 9; k++) {
    if (g[r * 9 + k] === n || g[k * 9 + c] === n) return false;
    if (g[(br + Math.floor(k / 3)) * 9 + bc + (k % 3)] === n) return false;
  }
  return true;
}
function solve(g, count = { n: 0 }, limit = 2, rnd = false) {
  const i = g.indexOf(0);
  if (i < 0) { count.n++; return count.n >= limit; }
  for (const n of rnd ? shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]) : [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
    if (!canPlace(g, i, n)) continue;
    g[i] = n;
    if (solve(g, count, limit, rnd)) { if (rnd) return true; g[i] = 0; return true; }
    g[i] = 0;
  }
  return false;
}
function generate(holes) {
  const full = Array(81).fill(0);
  solve(full, { n: 0 }, 1, true);
  const p = full.slice();
  let removed = 0;
  for (const i of shuffle([...Array(81).keys()])) {
    if (removed >= holes) break;
    const keep = p[i]; p[i] = 0;
    const cnt = { n: 0 };
    solve(p.slice(), cnt, 2);
    if (cnt.n !== 1) p[i] = keep; else removed++;
  }
  return { sol: full, puz: p };
}

function render() {
  const sv = sel >= 0 ? cur[sel] : 0;
  const sr = Math.floor(sel / 9), sc = sel % 9, sb = Math.floor(sr / 3) * 3 + Math.floor(sc / 3);
  cells.forEach((node, i) => {
    const r = Math.floor(i / 9), c = i % 9, b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
    node.classList.toggle("sel", i === sel);
    node.classList.toggle("rel", sel >= 0 && i !== sel && (r === sr || c === sc || b === sb));
    node.classList.toggle("same", sv > 0 && i !== sel && cur[i] === sv);
    if (cur[i]) node.textContent = cur[i];
    else if (notes[i].size) node.innerHTML = `<div class="sd-notes">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<i>${notes[i].has(n) ? n : ""}</i>`).join("")}</div>`;
    else node.textContent = "";
  });
  padBtns.forEach((b, k) => {
    const left = 9 - cur.filter((v, i) => v === k + 1 && v === sol[i]).length;
    b.querySelector("small").textContent = left;
    b.classList.toggle("done", left === 0);
  });
}

function input(n) {
  if (over || sel < 0 || puz[sel]) return;
  if (n === 0) { cur[sel] = 0; notes[sel].clear(); api.sound.move(); return render(); }
  if (notesMode) { notes[sel].has(n) ? notes[sel].delete(n) : notes[sel].add(n); api.sound.tick(); return render(); }
  if (cur[sel] === sol[sel]) return;
  cur[sel] = n;
  const node = cells[sel];
  if (n !== sol[sel]) {
    mistakes++;
    mistEl.innerHTML = `Mistakes: <b>${mistakes}</b> / 3`;
    node.classList.remove("bad"); void node.offsetWidth; node.classList.add("bad");
    api.sound.error();
    render();
    if (mistakes >= 3) {
      over = true;
      const filled = cur.filter((v, i) => !puz[i] && v === sol[i]).length;
      api.gameOver({ score: filled * 10, message: "Three mistakes — the puzzle wins this time." });
    }
    return;
  }
  node.classList.remove("bad");
  // clear this number from notes in the same row/col/box
  const r = Math.floor(sel / 9), c = sel % 9;
  for (let i = 0; i < 81; i++) {
    const rr = Math.floor(i / 9), cc = i % 9;
    if (rr === r || cc === c || (Math.floor(rr / 3) === Math.floor(r / 3) && Math.floor(cc / 3) === Math.floor(c / 3))) notes[i].delete(n);
  }
  api.sound.pop();
  const filled = cur.filter((v, i) => !puz[i] && v === sol[i]).length;
  api.setScore(filled * 10);
  render();
  if (cur.every((v, i) => v === sol[i])) {
    over = true;
    cells.forEach((c2, i) => { c2.style.animationDelay = ((i % 9) + Math.floor(i / 9)) * 30 + "ms"; c2.classList.add("win"); });
    const score = Math.max(300, 3000 - time * 2 - mistakes * 250);
    api.setScore(score);
    api.gameOver({ score, win: true, title: "Solved!", message: `Finished in ${Math.floor(time / 60)}m ${time % 60}s with ${mistakes} mistake${mistakes === 1 ? "" : "s"}.` });
  }
}

export default {
  init(stage, a) {
    api = a; sel = -1; mistakes = 0; time = 0; over = false; notesMode = false;
    ({ sol, puz } = generate(47));
    cur = puz.slice(); notes = Array.from({ length: 81 }, () => new Set());
    stage.appendChild(el("style", "", STYLE));
    const wrap = el("div", "sd-wrap");
    const grid = el("div", "sd-grid");
    cells = puz.map((v, i) => { const c = el("button", "sd-c" + (v ? " given" : "")); c.dataset.i = i; grid.appendChild(c); return c; });
    const side = el("div", "sd-side");
    mistEl = el("div", "sd-mist", "Mistakes: <b>0</b> / 3");
    const pad = el("div", "sd-pad");
    padBtns = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => { const b = el("button", "sd-n", `${n}<small></small>`); api.on(b, "click", () => input(n)); pad.appendChild(b); return b; });
    const row = el("div", "g-row");
    notesBtn = el("button", "g-btn", "✏️ Notes: off");
    const erase = el("button", "g-btn", "⌫ Erase");
    row.append(notesBtn, erase);
    side.append(mistEl, pad, row);
    wrap.append(grid, side);
    stage.append(wrap);
    render();
    api.setScore(0); api.setTimer("0:00");
    api.every(1000, () => { if (!over) { time++; api.setTimer(`${Math.floor(time / 60)}:${String(time % 60).padStart(2, "0")}`); } });
    api.on(grid, "click", (e) => { const c = e.target.closest(".sd-c"); if (!c) return; sel = +c.dataset.i; api.sound.tick(); render(); });
    api.on(notesBtn, "click", () => { notesMode = !notesMode; notesBtn.textContent = `✏️ Notes: ${notesMode ? "on" : "off"}`; notesBtn.classList.toggle("on", notesMode); });
    api.on(erase, "click", () => input(0));
    api.on(window, "keydown", (e) => {
      if (/^[1-9]$/.test(e.key)) input(+e.key);
      else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") input(0);
      else if (e.key === "n") notesBtn.click();
      else {
        const mv = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[e.key];
        if (mv) { e.preventDefault(); sel = sel < 0 ? 40 : (sel + mv + 81) % 81; render(); }
      }
    });
  }
};
