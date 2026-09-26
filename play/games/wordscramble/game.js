import { el, shuffle, choice } from "../../hub/js/core/Engine.js";

const WORDS = {
  Animals: ["tiger", "panda", "zebra", "koala", "otter", "eagle", "shark", "camel", "rabbit", "monkey", "turtle", "parrot", "dolphin", "giraffe", "penguin", "leopard", "hamster", "lobster"],
  Food: ["pizza", "mango", "bread", "honey", "pasta", "lemon", "cookie", "cheese", "banana", "noodle", "waffle", "burger", "orange", "pancake", "avocado", "popcorn"],
  Space: ["orbit", "comet", "star", "moon", "rocket", "planet", "galaxy", "meteor", "saturn", "nebula", "gravity", "eclipse", "asteroid", "universe"],
  Games: ["puzzle", "arcade", "player", "level", "score", "bonus", "joystick", "trophy", "quest", "combo", "pixel", "reward", "victory", "champion"],
  Nature: ["river", "ocean", "cloud", "storm", "flower", "forest", "desert", "island", "canyon", "volcano", "rainbow", "thunder", "glacier", "meadow"],
  Home: ["chair", "table", "lamp", "window", "pillow", "carpet", "mirror", "kitchen", "blanket", "candle", "garden", "ladder"]
};

const STYLE = `
.ws-card{width:min(560px,calc(100vw - 40px));padding:26px 22px;border-radius:26px;background:linear-gradient(160deg,rgba(255,159,28,.16),rgba(192,57,43,.12));border:1px solid rgba(255,255,255,.14);box-shadow:0 30px 60px -24px rgba(0,0,0,.8);display:flex;flex-direction:column;gap:20px;align-items:center}
.ws-cat{font-size:12px;font-weight:900;letter-spacing:.14em;text-transform:uppercase;padding:6px 14px;border-radius:99px;background:rgba(255,255,255,.1);color:#ffd08a}
.ws-bar{width:100%;height:10px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden}.ws-bar i{display:block;height:100%;background:linear-gradient(90deg,#ff9f1c,#ffe45c);border-radius:99px}
.ws-slots,.ws-tiles{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}
.ws-slot{--s:min(52px,calc((100vw - 90px)/8.6));width:var(--s);height:calc(var(--s)*1.1);border-radius:12px;border:2px dashed rgba(255,255,255,.25);display:grid;place-items:center;font-size:calc(var(--s)*.52);font-weight:900;text-transform:uppercase;cursor:pointer;background:rgba(0,0,0,.15)}
.ws-slot.filled{border-style:solid;border-color:#ffd08a;background:rgba(255,208,138,.15);color:#fff;animation:wsIn .18s}
.ws-slot.hint{border-color:#7ee04a;color:#7ee04a}
.ws-tile{--s:min(56px,calc((100vw - 90px)/8.2));width:var(--s);height:calc(var(--s)*1.1);border-radius:14px;border:0;font-size:calc(var(--s)*.5);font-weight:900;text-transform:uppercase;color:#6a3000;cursor:pointer;
  background:linear-gradient(180deg,#fff6de,#ffd89a);box-shadow:0 5px 0 #c98a2a,0 10px 18px -6px rgba(0,0,0,.6);transition:transform .1s,opacity .2s}
.ws-tile:hover{transform:translateY(-3px)}.ws-tile:active{transform:translateY(3px);box-shadow:0 2px 0 #c98a2a}
.ws-tile.used{opacity:.15;pointer-events:none;transform:scale(.85)}
.ws-slots.bad{animation:wsBad .4s}.ws-slots.good .ws-slot{border-color:#7ee04a;background:rgba(126,224,74,.2);animation:wsGood .5s}
@keyframes wsIn{from{transform:scale(.6)}}@keyframes wsBad{25%{transform:translateX(-10px)}75%{transform:translateX(10px)}}@keyframes wsGood{50%{transform:translateY(-8px)}}
`;

let api, word, cat, picks, tilesEl, slotsEl, catEl, info, score, solved, time, over, busy, used, hinted, bar;
const TOTAL = 90;

function newWord() {
  cat = choice(Object.keys(WORDS));
  let w; do { w = choice(WORDS[cat]); } while (used.has(w) && used.size < 60);
  used.add(w); word = w; picks = []; hinted = 0;
  let letters; do { letters = shuffle(word.split("")); } while (letters.join("") === word);
  catEl.textContent = `${cat} · ${word.length} letters`;
  tilesEl.innerHTML = ""; slotsEl.innerHTML = "";
  slotsEl.className = "ws-slots";
  letters.forEach((ch, i) => { const t = el("button", "ws-tile", ch); t.dataset.i = i; tilesEl.appendChild(t); });
  for (let i = 0; i < word.length; i++) slotsEl.appendChild(el("div", "ws-slot"));
  busy = false;
}

function render() {
  const slots = [...slotsEl.children], tiles = [...tilesEl.children];
  tiles.forEach((t) => t.classList.toggle("used", picks.includes(+t.dataset.i)));
  slots.forEach((s, i) => {
    const p = picks[i];
    s.textContent = p === undefined ? "" : tiles[p].textContent;
    s.className = "ws-slot" + (p !== undefined ? " filled" : "") + (i < hinted ? " hint" : "");
  });
}

function add(i) {
  if (busy || picks.includes(i) || picks.length >= word.length) return;
  picks.push(i); api.sound.tick(); render();
  if (picks.length === word.length) check();
}
function removeAt(k) { if (busy || k < hinted) return; picks.splice(k); api.sound.move(); render(); }

function check() {
  const tiles = [...tilesEl.children];
  const guess = picks.map((p) => tiles[p].textContent).join("");
  busy = true;
  if (guess === word) {
    slotsEl.classList.add("good");
    const pts = word.length * 20 - hinted * 15;
    score += Math.max(10, pts); solved++;
    time = Math.min(TOTAL, time + 5);
    api.setScore(score);
    info.textContent = `✓ ${word.toUpperCase()}  +${Math.max(10, pts)}  (+5s)`;
    api.sound.levelUp();
    api.after(900, newWord);
  } else {
    slotsEl.classList.add("bad");
    api.sound.error();
    info.textContent = "Not quite — try again!";
    api.after(420, () => { slotsEl.classList.remove("bad"); picks = picks.slice(0, hinted); busy = false; render(); });
  }
}

function hint() {
  if (busy || hinted >= word.length - 1) return;
  const tiles = [...tilesEl.children];
  picks = picks.slice(0, hinted);
  const need = word[hinted];
  const idx = tiles.findIndex((t, i) => t.textContent === need && !picks.includes(i));
  picks.push(idx); hinted++;
  time -= 5;
  api.sound.flip();
  render();
}

export default {
  init(stage, a) {
    api = a; score = 0; solved = 0; time = TOTAL; over = false; used = new Set();
    stage.appendChild(el("style", "", STYLE));
    const card = el("div", "ws-card");
    catEl = el("div", "ws-cat");
    bar = el("div", "ws-bar", "<i></i>");
    slotsEl = el("div", "ws-slots"); tilesEl = el("div", "ws-tiles");
    info = el("div", "g-msg", "Unscramble the word!");
    const btns = el("div", "g-row");
    const hintBtn = el("button", "g-btn", "💡 Hint (−5s)"), skipBtn = el("button", "g-btn", "⏭ Skip (−10s)"), clrBtn = el("button", "g-btn", "⌫ Clear");
    btns.append(clrBtn, hintBtn, skipBtn);
    card.append(bar, catEl, slotsEl, tilesEl, info, btns);
    stage.append(card, el("div", "g-sub", "Type letters · Backspace to undo · every word adds 5 seconds"));
    newWord();
    api.setScore(0); api.setTimer(TOTAL);
    api.on(tilesEl, "click", (e) => { const t = e.target.closest(".ws-tile"); if (t) add(+t.dataset.i); });
    api.on(slotsEl, "click", (e) => { const s = e.target.closest(".ws-slot"); if (s) removeAt([...slotsEl.children].indexOf(s)); });
    api.on(hintBtn, "click", hint);
    api.on(clrBtn, "click", () => removeAt(hinted));
    api.on(skipBtn, "click", () => { if (busy) return; time -= 10; info.textContent = `It was: ${word.toUpperCase()}`; api.sound.whoosh(); newWord(); });
    api.on(window, "keydown", (e) => {
      if (e.key === "Backspace") { e.preventDefault(); if (picks.length > hinted) removeAt(picks.length - 1); return; }
      const ch = e.key.toLowerCase();
      if (!/^[a-z]$/.test(ch)) return;
      const tiles = [...tilesEl.children];
      const i = tiles.findIndex((t, k) => t.textContent === ch && !picks.includes(k));
      if (i >= 0) add(i);
    });
    api.loop((dt) => {
      if (over) return;
      time -= dt;
      bar.firstChild.style.width = Math.max(0, (time / TOTAL) * 100) + "%";
      api.setTimer(Math.max(0, Math.ceil(time)));
      if (time <= 0) { over = true; busy = true; api.gameOver({ score, title: "Time's up!", message: `You solved ${solved} word${solved === 1 ? "" : "s"}. The last one was “${word.toUpperCase()}”.` }); }
    });
  }
};
