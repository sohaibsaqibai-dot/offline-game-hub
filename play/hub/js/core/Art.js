// Art — original vector cover illustrations for every game (160×100 scenes).
// Generated at runtime as inline SVG: no image files, no network.

let uid = 0;
const W = "#ffffff";

const S = {
  merge2048: () => {
    const t = [[2, "#fff3d6", "#8a5a00"], [8, "#ffd08a", "#7a3b00"], [64, "#ff8a5c", "#fff"], [2048, "#ffe14d", "#7a4b00"]];
    return `<g transform="rotate(-8 80 50)">${t.map(([n, bg, fg], i) => `<g transform="translate(${28 + (i % 2) * 54},${6 + Math.floor(i / 2) * 46})"><rect width="48" height="40" rx="9" fill="${bg}"/><rect width="48" height="14" rx="9" fill="#fff" opacity=".25"/><text x="24" y="27" text-anchor="middle" font-size="${n > 999 ? 15 : 20}" font-weight="900" fill="${fg}">${n}</text></g>`).join("")}</g>`;
  },
  memorymatch: () => `
    <g transform="rotate(-12 50 55)"><rect x="28" y="18" width="40" height="58" rx="8" fill="#fff"/><path d="M48 36c-6-8-16 2 0 18 16-16 6-26 0-18z" fill="#ff4d6d"/></g>
    <g transform="rotate(4 80 50)"><rect x="60" y="16" width="40" height="58" rx="8" fill="#3b1d8f"/><rect x="65" y="21" width="30" height="48" rx="5" fill="none" stroke="#b69cff" stroke-width="2" stroke-dasharray="4 3"/><text x="80" y="52" text-anchor="middle" font-size="20" font-weight="900" fill="#b69cff">?</text></g>
    <g transform="rotate(14 112 55)"><rect x="92" y="20" width="40" height="58" rx="8" fill="#fff"/><path d="M112 38c-6-8-16 2 0 18 16-16 6-26 0-18z" fill="#ff4d6d"/></g>`,
  slidingpuzzle: () => {
    let s = `<rect x="44" y="8" width="72" height="84" rx="10" fill="#0b2a4a" opacity=".55"/>`;
    let n = 1;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      if (r === 2 && c === 2) continue;
      s += `<g transform="translate(${50 + c * 21},${14 + r * 25})"><rect width="18" height="22" rx="4" fill="#e9fff7"/><text x="9" y="16" text-anchor="middle" font-size="11" font-weight="900" fill="#185a9d">${n++}</text></g>`;
    }
    return s + `<path d="M120 76h18m-6-5 6 5-6 5" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  },
  minesweeper: () => {
    let s = "";
    const nums = { "1,1": ["1", "#2f80ed"], "2,1": ["2", "#27ae60"], "1,2": ["3", "#eb5757"] };
    for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
      const open = (r + c) % 3 !== 0 && c < 4;
      s += `<rect x="${34 + c * 16}" y="${16 + r * 17}" width="14" height="15" rx="3" fill="${open ? "#dff2ff" : "#6fb6ff"}"/>`;
      const k = nums[`${c},${r}`];
      if (k && open) s += `<text x="${41 + c * 16}" y="${28 + r * 17}" text-anchor="middle" font-size="10" font-weight="900" fill="${k[1]}">${k[0]}</text>`;
    }
    return s + `<circle cx="124" cy="60" r="16" fill="#151a2e"/>${[0, 45, 90, 135].map((a) => `<rect x="122" y="38" width="4" height="44" rx="2" fill="#151a2e" transform="rotate(${a} 124 60)"/>`).join("")}<circle cx="118" cy="54" r="4" fill="#fff" opacity=".8"/>
      <path d="M92 24v22" stroke="#fff" stroke-width="3"/><path d="M93 24l14 6-14 6z" fill="#ff4d6d"/>`;
  },
  bubblepop: () => [[40, 40, 18, "#ffe45c"], [70, 30, 14, "#3fa9ff"], [66, 64, 20, "#ff4fa3"], [100, 46, 16, "#7ee04a"], [126, 66, 14, "#8b5cf6"], [128, 30, 10, "#ffe45c"], [30, 74, 10, "#3fa9ff"]]
    .map(([x, y, r, c]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/><circle cx="${x - r / 3}" cy="${y - r / 3}" r="${r / 3.5}" fill="#fff" opacity=".75"/>`).join(""),
  patternmemory: () => `<g transform="translate(80 50)">
      <path d="M-4-4V-40A36 36 0 0 0-40-4Z" fill="#4ade80"/><path d="M4-4V-40A36 36 0 0 1 40-4Z" fill="#ff4d6d" opacity=".55"/>
      <path d="M-4 4V40A36 36 0 0 1-40 4Z" fill="#facc15" opacity=".55"/><path d="M4 4V40A36 36 0 0 0 40 4Z" fill="#3fa9ff" opacity=".55"/>
      <circle r="12" fill="#2a0f3f"/><circle r="5" fill="#fff" opacity=".8"/></g>
      <circle cx="54" cy="24" r="22" fill="#4ade80" opacity=".25"/>`,
  colormatch: () => {
    let s = "";
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
      const odd = r === 1 && c === 2;
      s += `<rect x="${38 + c * 22}" y="${14 + r * 24}" width="19" height="21" rx="5" fill="${odd ? "#ffb08a" : "#ff8a5c"}" ${odd ? 'stroke="#fff" stroke-width="2.5"' : ""}/>`;
    }
    return s + `<circle cx="93" cy="62" r="9" fill="none" stroke="#fff" stroke-width="3"/><path d="M99 69l8 9" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`;
  },
  wordscramble: () => ["W", "O", "R", "D"].map((ch, i) => `<g transform="translate(${30 + i * 26},${30 + (i % 2) * 14}) rotate(${[-8, 6, -4, 9][i]})"><rect width="24" height="28" rx="5" fill="#fff4d6"/><rect y="22" width="24" height="6" rx="3" fill="#e2b76a"/><text x="12" y="19" text-anchor="middle" font-size="15" font-weight="900" fill="#8a3a00">${ch}</text></g>`).join(""),
  blockdrop: () => {
    const b = (x, y, c) => `<rect x="${x}" y="${y}" width="13" height="13" rx="2.5" fill="${c}"/><rect x="${x + 2}" y="${y + 2}" width="9" height="3" rx="1.5" fill="#fff" opacity=".45"/>`;
    let s = `<rect x="44" y="4" width="72" height="92" rx="6" fill="#001a3d" opacity=".45"/>`;
    [[0, "#ff4d6d"], [1, "#ff4d6d"], [2, "#ffc53d"], [3, "#7ee04a"], [4, "#7ee04a"]].forEach(([c, col]) => (s += b(46 + c * 14, 82, col)));
    [[0, "#3fa9ff"], [1, "#8b5cf6"], [2, "#8b5cf6"], [3, "#8b5cf6"]].forEach(([c, col]) => (s += b(46 + c * 14, 68, col)));
    s += b(102, 68, "#ffc53d") + b(102, 82, "#ffc53d");
    s += b(60, 18, "#19d3c5") + b(74, 18, "#19d3c5") + b(88, 18, "#19d3c5") + b(74, 32, "#19d3c5");
    return s;
  },
  jewelswap: () => {
    const gem = (x, y, c, d) => `<g transform="translate(${x} ${y})"><path d="M-12-6-6-13H6l6 7L0 13Z" fill="${c}"/><path d="M-12-6H12L0 13Z" fill="#000" opacity=".15"/><path d="M-6-13H6L3-6H-3Z" fill="#fff" opacity=".45"/>${d ? `<circle r="15" fill="none" stroke="#fff" stroke-width="2" opacity=".9"/>` : ""}</g>`;
    return gem(40, 30, "#ff4fa3") + gem(70, 30, "#ffc53d") + gem(100, 30, "#3fa9ff") + gem(40, 66, "#7ee04a") + gem(70, 66, "#ff4fa3", 1) + gem(100, 66, "#ff4fa3") + gem(130, 66, "#ff4fa3") + gem(130, 30, "#8b5cf6") +
      `<path d="M70 44v10" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M84 88h60" stroke="#fff" stroke-width="2" opacity=".5"/>`;
  },
  sudoku: () => {
    let s = `<rect x="40" y="8" width="84" height="84" rx="6" fill="#fff"/>`;
    for (let i = 1; i < 9; i++) {
      const w = i % 3 === 0 ? 2 : 0.7;
      s += `<path d="M${40 + i * 9.33} 8v84M40 ${8 + i * 9.33}h84" stroke="#3b2a8f" stroke-width="${w}" opacity="${i % 3 === 0 ? 1 : 0.35}"/>`;
    }
    [[0, 0, 5], [2, 1, 3], [4, 0, 7], [7, 2, 9], [1, 4, 8], [5, 4, 1], [8, 5, 2], [3, 7, 6], [6, 6, 4], [0, 8, 9], [4, 4, 5]].forEach(([c, r, n]) => (s += `<text x="${44.7 + c * 9.33}" y="${15.5 + r * 9.33}" text-anchor="middle" font-size="7.5" font-weight="800" fill="${c === 4 && r === 4 ? "#ff4fa3" : "#2a2466"}">${n}</text>`));
    return s + `<rect x="77.3" y="45.3" width="9.33" height="9.33" fill="#ff4fa3" opacity=".2"/>`;
  },
  snake: () => `<path d="M24 76 H64 V40 H104 V24 H132" stroke="#7ee04a" stroke-width="12" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
    <path d="M24 76 H64 V40 H104 V24 H132" stroke="#c9ff9e" stroke-width="3" fill="none" stroke-linejoin="round" stroke-linecap="round" opacity=".7" stroke-dasharray="2 8"/>
    <circle cx="132" cy="24" r="9" fill="#b6ff7a"/><circle cx="135" cy="21" r="2.2" fill="#0f2b12"/>
    <circle cx="132" cy="68" r="7" fill="#ff4d6d"/><circle cx="132" cy="68" r="12" fill="#ff4d6d" opacity=".25"/>`,
  brickbreaker: () => {
    let s = "";
    const cols = ["#ff4d6d", "#ffc53d", "#7ee04a", "#3fa9ff"];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) if (!(r === 3 && (c === 2 || c === 3))) s += `<rect x="${18 + c * 21}" y="${10 + r * 10}" width="19" height="8" rx="2" fill="${cols[r]}"/>`;
    return s + `<circle cx="84" cy="66" r="5" fill="#fff"/><path d="M84 66 L60 82" stroke="#fff" stroke-width="2" opacity=".35" stroke-dasharray="3 3"/><rect x="62" y="84" width="40" height="7" rx="3.5" fill="#fff"/>`;
  },
  skyhopper: () => `<circle cx="126" cy="22" r="10" fill="#fff" opacity=".6"/>
    <rect x="96" y="0" width="22" height="34" fill="#35d07f"/><rect x="92" y="30" width="30" height="8" rx="2" fill="#27ae60"/>
    <rect x="96" y="70" width="22" height="30" fill="#35d07f"/><rect x="92" y="66" width="30" height="8" rx="2" fill="#27ae60"/>
    <g transform="translate(58 52) rotate(-15)"><ellipse rx="15" ry="12" fill="#ffd23a"/><ellipse cx="-5" cy="3" rx="8" ry="5" fill="#ffae00"/><circle cx="6" cy="-4" r="5" fill="#fff"/><circle cx="7.5" cy="-4" r="2.3" fill="#222"/><path d="M13 1l9 3-9 3z" fill="#ff7a2a"/></g>
    <path d="M22 60q8-4 16 0" stroke="#fff" stroke-width="2" fill="none" opacity=".6"/>`,
  spaceshooter: () => `${[[20, 14], [44, 70], [140, 20], [120, 84], [70, 10], [150, 60]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.2" fill="#fff"/>`).join("")}
    <circle cx="124" cy="30" r="13" fill="#8a6a5a"/><circle cx="120" cy="27" r="3" fill="#6b4f42"/><circle cx="128" cy="35" r="2" fill="#6b4f42"/>
    <path d="M80 50 L92 86 L80 80 L68 86Z" fill="#e8ecff"/><path d="M80 52 L86 70 L74 70Z" fill="#6fd0ff"/><path d="M74 84 L80 96 L86 84Z" fill="#ffb13d"/>
    <rect x="79" y="20" width="2" height="18" rx="1" fill="#7ee04a"/><rect x="79" y="4" width="2" height="10" rx="1" fill="#7ee04a"/><circle cx="118" cy="40" r="14" fill="#ffc53d" opacity=".3"/>`,
  dodgerunner: () => `<path d="M60 0 L20 100 H140 L100 0Z" fill="#1a1040" opacity=".6"/>
    <path d="M73 0 L60 100 M87 0 L100 100" stroke="#fff" stroke-width="2" stroke-dasharray="8 8" opacity=".6"/>
    <rect x="44" y="64" width="22" height="30" rx="6" fill="#3fa9ff"/><rect x="47" y="70" width="16" height="8" rx="2" fill="#bfe6ff"/>
    <rect x="92" y="22" width="18" height="24" rx="5" fill="#ff4d6d"/><circle cx="78" cy="40" r="6" fill="#ffc53d"/>`,
  coincollector: () => `<circle cx="56" cy="50" r="22" fill="#ffc93a"/><circle cx="56" cy="50" r="16" fill="#ffdc6b"/><text x="56" y="58" text-anchor="middle" font-size="22" font-weight="900" fill="#b87800">$</text>
    <circle cx="100" cy="30" r="10" fill="#ffc93a"/><circle cx="118" cy="64" r="8" fill="#ffc93a"/>
    <circle cx="126" cy="30" r="11" fill="#1d1d2b"/><path d="M130 20q4-8 10-6" stroke="#8a5a2b" stroke-width="2.5" fill="none"/><circle cx="141" cy="14" r="3" fill="#ffe45c"/>`,
  stacktower: () => ["#ffd6e0", "#ffb3c6", "#ff8fab", "#fb6f92", "#c9184a", "#8b5cf6"].map((c, i) => `<g transform="translate(${80 + (i % 2 ? 2 : -2) - (40 - i * 3)},${84 - i * 13})"><rect width="${80 - i * 6}" height="12" rx="2" fill="${c}"/><rect width="${80 - i * 6}" height="3" fill="#fff" opacity=".35"/></g>`).join("") + `<rect x="100" y="0" width="40" height="11" rx="2" fill="#fff" opacity=".85"/>`,
  cloudjumper: () => `<g fill="#fff"><ellipse cx="44" cy="80" rx="26" ry="8"/><ellipse cx="112" cy="54" rx="24" ry="7"/><ellipse cx="60" cy="28" rx="20" ry="6" opacity=".8"/></g>
    <rect x="104" y="42" width="10" height="6" rx="2" fill="#ff4d6d"/>
    <g transform="translate(80 58)"><rect x="-10" y="-14" width="20" height="24" rx="9" fill="#ffd23a"/><circle cx="-4" cy="-5" r="2.5" fill="#222"/><circle cx="5" cy="-5" r="2.5" fill="#222"/><path d="M-4 3q4 3 8 0" stroke="#222" stroke-width="1.5" fill="none"/></g>
    <path d="M70 76v8M90 76v8" stroke="#fff" stroke-width="2" opacity=".6"/>`,
  neonpong: () => `<path d="M80 6v88" stroke="#fff" stroke-width="2" stroke-dasharray="5 6" opacity=".4"/>
    <rect x="20" y="22" width="7" height="32" rx="3.5" fill="#3fa9ff"/><rect x="133" y="48" width="7" height="32" rx="3.5" fill="#ff4fa3"/>
    <circle cx="96" cy="40" r="6" fill="#fff"/><circle cx="96" cy="40" r="12" fill="#fff" opacity=".2"/>
    <text x="60" y="22" text-anchor="middle" font-size="16" font-weight="900" fill="#3fa9ff">3</text><text x="100" y="22" text-anchor="middle" font-size="16" font-weight="900" fill="#ff4fa3">2</text>`,
  tictactoe: () => `<path d="M66 12v76M94 12v76M42 38h76M42 62h76" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".85"/>
    <path d="M47 17l14 14M61 17 47 31" stroke="#ffe45c" stroke-width="5" stroke-linecap="round"/><circle cx="80" cy="50" r="8" fill="none" stroke="#19d3c5" stroke-width="5"/>
    <path d="M99 67l14 14M113 67 99 81" stroke="#ffe45c" stroke-width="5" stroke-linecap="round"/><circle cx="108" cy="24" r="8" fill="none" stroke="#19d3c5" stroke-width="5"/>
    <path d="M44 16 L116 84" stroke="#ff4fa3" stroke-width="3" stroke-linecap="round" opacity=".0"/>`,
  connectfour: () => {
    let s = `<rect x="34" y="14" width="92" height="80" rx="8" fill="#1a55c9"/>`;
    const b = [[0, 0, 0, 0, 0, 0], [0, 0, 0, 1, 0, 0], [0, 0, 2, 1, 0, 0], [0, 2, 1, 2, 0, 0], [2, 1, 2, 1, 2, 1]];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) s += `<circle cx="${46 + c * 13.6}" cy="${26 + r * 15}" r="5.6" fill="${["#0c2a6e", "#ff4d6d", "#ffd23a"][b[r][c]]}"/>`;
    return s + `<circle cx="87" cy="4" r="5.6" fill="#ff4d6d"/>`;
  },
  dotsandboxes: () => {
    let s = `<rect x="44" y="18" width="24" height="24" fill="#ff4fa3" opacity=".7"/><rect x="68" y="42" width="24" height="24" fill="#3fa9ff" opacity=".7"/><rect x="92" y="42" width="24" height="24" fill="#3fa9ff" opacity=".7"/>`;
    s += `<path d="M44 18h24v24H44zM68 42h48v24H68zM92 42v24M68 18h24M116 18v24" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) s += `<circle cx="${44 + c * 24}" cy="${18 + r * 24}" r="3.5" fill="#fff"/>`;
    return s;
  },
  reversi: () => {
    let s = `<rect x="40" y="10" width="80" height="80" rx="6" fill="#16a34a"/>`;
    for (let i = 1; i < 4; i++) s += `<path d="M${40 + i * 20} 10v80M40 ${10 + i * 20}h80" stroke="#0b5d3b" stroke-width="1.5"/>`;
    [[1, 1, 1], [2, 1, 0], [1, 2, 0], [2, 2, 1], [3, 2, 1], [0, 3, 0]].forEach(([c, r, w]) => (s += `<circle cx="${50 + c * 20}" cy="${20 + r * 20}" r="7.5" fill="${w ? "#f8fafc" : "#111827"}"/>`));
    return s;
  },
  quickmath: () => `<text x="80" y="46" text-anchor="middle" font-size="30" font-weight="900" fill="#fff">7 × 6</text>
    ${["42", "36", "48"].map((n, i) => `<g transform="translate(${34 + i * 34},58)"><rect width="30" height="24" rx="6" fill="${i === 0 ? "#7ee04a" : "#ffffff"}" opacity="${i === 0 ? 1 : 0.25}"/><text x="15" y="17" text-anchor="middle" font-size="13" font-weight="900" fill="${i === 0 ? "#0b3b12" : "#fff"}">${n}</text></g>`).join("")}`,
  reactiontest: () => `<circle cx="80" cy="50" r="34" fill="#22c55e"/><circle cx="80" cy="50" r="42" fill="none" stroke="#22c55e" stroke-width="3" opacity=".4"/>
    <path d="M86 24 70 54h12l-6 22 18-32H82Z" fill="#fff"/>`,
  targettap: () => `<circle cx="80" cy="50" r="34" fill="#fff"/><circle cx="80" cy="50" r="26" fill="#ff416c"/><circle cx="80" cy="50" r="18" fill="#fff"/><circle cx="80" cy="50" r="10" fill="#ff416c"/>
    <path d="M80 50l40-34" stroke="#3a2a1a" stroke-width="3"/><path d="M120 16l8-4-3 9-9-1z" fill="#ffd23a"/><circle cx="36" cy="26" r="9" fill="#fff" opacity=".4"/>`,
  fruitcatch: () => `<circle cx="52" cy="26" r="11" fill="#ff4d6d"/><path d="M52 15q2-6 6-8" stroke="#6b3b12" stroke-width="2" fill="none"/>
    <circle cx="108" cy="18" r="9" fill="#ffa531"/><path d="M84 40q-6 12 6 16 12-4 6-16z" fill="#7ee04a"/>
    <path d="M44 66h72l-8 26H52z" fill="#b5651d"/><path d="M44 66h72" stroke="#8a4a12" stroke-width="5" stroke-linecap="round"/>
    <path d="M56 72l4 18M72 72v18M88 72v18M104 72l-4 18" stroke="#8a4a12" stroke-width="2" opacity=".6"/>`,
  molebash: () => `<ellipse cx="80" cy="82" rx="42" ry="11" fill="#3a2210"/>
    <path d="M52 82Q52 34 80 34T108 82Z" fill="#9a6a42"/><ellipse cx="80" cy="64" rx="14" ry="10" fill="#e0b48a"/>
    <circle cx="71" cy="52" r="4" fill="#1a1a1a"/><circle cx="89" cy="52" r="4" fill="#1a1a1a"/><ellipse cx="80" cy="60" rx="5" ry="4" fill="#ff7aa2"/>
    <g transform="rotate(-30 122 30)"><rect x="104" y="20" width="36" height="18" rx="6" fill="#ff4d6d"/><rect x="118" y="36" width="7" height="34" rx="3" fill="#8a5a2b"/></g>`,
  typingrush: () => `${["neon", "rush", "type"].map((w, i) => `<g transform="translate(${26 + i * 40},${14 + i * 18})"><rect width="${w.length * 8 + 10}" height="16" rx="5" fill="#fff" opacity="${i === 1 ? 1 : 0.3}"/><text x="${(w.length * 8 + 10) / 2}" y="12" text-anchor="middle" font-size="10.5" font-weight="800" fill="${i === 1 ? "#4f3bd9" : "#fff"}">${w}</text></g>`).join("")}
    <rect x="30" y="74" width="100" height="20" rx="5" fill="#1b1446" opacity=".6"/>${Array.from({ length: 8 }, (_, i) => `<rect x="${34 + i * 12}" y="78" width="9" height="12" rx="2" fill="#fff" opacity=".7"/>`).join("")}`,
  minigolf: () => `<path d="M10 70q40-24 80-10t60-6v46H10z" fill="#2e7d32" opacity=".6"/>
    <ellipse cx="112" cy="64" rx="10" ry="4" fill="#12301a"/><path d="M112 64V20" stroke="#fff" stroke-width="2.5"/><path d="M113 20l20 7-20 7z" fill="#ff4d6d"/>
    <circle cx="44" cy="70" r="6" fill="#fff"/><path d="M50 67 L100 58" stroke="#fff" stroke-width="2" stroke-dasharray="3 4" opacity=".8"/>`
};

export function coverFor(game) {
  const id = "c" + uid++;
  const [c1, c2] = game.colors || ["#8b5cf6", "#3b1d8f"];
  const scene = S[game.id] ? S[game.id]() : "";
  return `<svg viewBox="0 0 160 100" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${game.title}" font-family="Segoe UI, system-ui, sans-serif">
    <defs>
      <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
      <radialGradient id="${id}r" cx=".2" cy=".1" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <pattern id="${id}p" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#fff" opacity=".12"/></pattern>
    </defs>
    <rect width="160" height="100" fill="url(#${id}g)"/>
    <rect width="160" height="100" fill="url(#${id}p)"/>
    <circle cx="140" cy="96" r="44" fill="#fff" opacity=".07"/><circle cx="14" cy="4" r="30" fill="#fff" opacity=".06"/>
    <g class="cover-scene">${scene}</g>
    <rect width="160" height="100" fill="url(#${id}r)"/>
  </svg>`;
}
