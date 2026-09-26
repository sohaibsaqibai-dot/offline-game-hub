// Offline Game Hub website — pulls game data + cover art straight from the
// playable build in /play, so the site and the games never drift apart.
import { GAMES, CATEGORIES } from "../../play/hub/js/core/GameRegistry.js";
import { coverFor } from "../../play/hub/js/core/Art.js";

const PLAY = "play/hub/index.html";
const $ = (s) => document.querySelector(s);

// Mobile menu
const menuBtn = $(".menu-btn");
if (menuBtn) menuBtn.addEventListener("click", () => {
  const open = $(".nav-links").classList.toggle("open");
  menuBtn.setAttribute("aria-expanded", String(open));
});

// Hero: three drifting columns of cover art (duplicated for a seamless loop)
const wall = $("#wall");
if (wall) {
  const cols = [[], [], []];
  GAMES.forEach((g, i) => cols[i % 3].push(g));
  wall.innerHTML = cols.map((col, c) => {
    const cards = col.map((g) => `<a class="wall-card" href="${PLAY}#game/${g.id}" tabindex="-1" aria-hidden="true">${coverFor(g)}</a>`).join("");
    return `<div class="wall-col" style="left:${c * 240}px;top:${c === 1 ? -120 : 0}px">${cards}${cards}</div>`;
  }).join("");
}

// Games grid with category tabs
const grid = $("#game-grid");
if (grid) {
  let filter = "All";
  const tabs = ["All", "New", ...CATEGORIES];
  const count = (t) => (t === "All" ? GAMES.length : t === "New" ? GAMES.filter((g) => g.isNew).length : GAMES.filter((g) => g.category === t).length);
  $("#tabs").innerHTML = tabs.map((t) => `<button class="tab ${t === filter ? "active" : ""}" data-t="${t}" type="button">${t === "New" ? "✨ New" : t}<span class="n">${count(t)}</span></button>`).join("");
  const render = () => {
    const list = GAMES.filter((g) => filter === "All" || (filter === "New" ? g.isNew : g.category === filter));
    grid.innerHTML = list.map((g) => `
      <a class="game" href="${PLAY}#game/${g.id}" aria-label="Play ${g.title}">
        <div class="art">${coverFor(g)}${g.isNew ? '<span class="new">NEW</span>' : ""}<span class="play" aria-hidden="true">▶</span></div>
        <div class="body"><h3>${g.title}</h3><p>${g.description}</p><span class="chip c-${g.category.toLowerCase()}">${g.category}</span></div>
      </a>`).join("");
  };
  $("#tabs").addEventListener("click", (e) => {
    const b = e.target.closest(".tab"); if (!b) return;
    filter = b.dataset.t;
    document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x === b));
    render();
  });
  render();
}

// Live game count anywhere on the page
document.querySelectorAll("[data-game-count]").forEach((n) => (n.textContent = GAMES.length));

// Reveal-on-scroll
const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: 0.12 }) : null;
document.querySelectorAll(".reveal").forEach((el) => (io ? io.observe(el) : el.classList.add("in")));

// Footer year
document.querySelectorAll("[data-year]").forEach((n) => (n.textContent = new Date().getFullYear()));
