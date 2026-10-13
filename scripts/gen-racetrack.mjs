// Generates the Minibridge Racetrack SVG at correct A4 proportions (1400 x 1980 => 210:297).
import { writeFileSync } from 'node:fs';

const W = 1400;
const H = 1980; // 1400 * 297/210 = 1980  => true A4 portrait ratio

// suit column geometry (5 columns)
const cols = [
  { x: 80,  w: 200, cx: 180,  stroke: '#2e7d32', num: '#1b5e20', sym: '♣' },
  { x: 300, w: 200, cx: 400,  stroke: '#c62828', num: '#b71c1c', sym: '♦' },
  { x: 520, w: 200, cx: 620,  stroke: '#c62828', num: '#b71c1c', sym: '♥' },
  { x: 740, w: 200, cx: 840,  stroke: '#2e3a59', num: '#1a1a2e', sym: '♠' },
  { x: 960, w: 210, cx: 1065, stroke: '#1565c0', num: '#0d47a1', sym: 'NT' },
];

// per-level definition, top (level 7) to bottom (level 1)
// tier: 'grand' | 'slam' | 'game' | 'part'  controls glow + fill.
// cellTier: optional per-column override (used for L3/L4 where only some are game).
// scores: [C,D,H,S,NT]
const levels = [
  { lvl: 7, tier: 'grand', badge: '👑', hdrFill: '#ffd1ec', hdrStroke: '#ff1493', hdrText: '#c2185b',
    title: '👑 LEVEL 7 — GRAND SLAM · all 13 tricks', pts: '37+',  // 37+ points
    scores: [1440,1440,1510,1510,1520], cellTier: ['grand','grand','grand','grand','grand'] },
  { lvl: 6, tier: 'slam', badge: '💎', hdrFill: '#eccffb', hdrStroke: '#8e24aa', hdrText: '#6a1b9a',
    title: '💎 LEVEL 6 — SMALL SLAM · 12 tricks', pts: '33–36',
    scores: [920,920,980,980,990], cellTier: ['slam','slam','slam','slam','slam'] },
  { lvl: 5, tier: 'game', badge: '⭐', hdrFill: '#d9f3d1', hdrStroke: '#4caf50', hdrText: '#2e7d32',
    title: '⭐ LEVEL 5 — 11 tricks · 5♣ 5♦ = GAME', pts: '29–32',
    scores: [400,400,450,450,460], cellTier: ['game','game','game','game','game'] },
  { lvl: 4, tier: 'game', badge: '⭐', hdrFill: '#d9f3d1', hdrStroke: '#4caf50', hdrText: '#2e7d32',
    title: '⭐ LEVEL 4 — 10 tricks · 4♥ 4♠ = GAME', pts: '26–28',
    scores: [130,130,420,420,430], cellTier: ['part','part','game','game','game'] },
  { lvl: 3, tier: 'game', badge: '⭐', hdrFill: '#fde6c4', hdrStroke: '#f4a900', hdrText: '#9a5a00',
    title: '⭐ LEVEL 3 — 9 tricks · 3NT = GAME', pts: '24–25',
    scores: [110,110,140,140,400], cellTier: ['part','part','part','part','game'] },
  { lvl: 2, tier: 'part', badge: '', hdrFill: '#fde6c4', hdrStroke: '#f4a900', hdrText: '#9a5a00',
    title: 'LEVEL 2 — 8 tricks · part-score', pts: '22–23',
    scores: [90,90,110,110,120], cellTier: ['part','part','part','part','part'] },
  { lvl: 1, tier: 'part', badge: '', hdrFill: '#d6ecff', hdrStroke: '#1565c0', hdrText: '#0d47a1',
    title: 'LEVEL 1 — 7 tricks · part-score', pts: '21',
    scores: [70,70,80,80,90], cellTier: ['part','part','part','part','part'] },
];

const tierCfg = {
  grand: { glow: 'glowGrand', fill: 'url(#grandFill)', scoreFill: '#c2185b' },
  slam:  { glow: 'glowSlam',  fill: 'url(#slamFill)',  scoreFill: '#6a1b9a' },
  game:  { glow: 'glowGold',  fill: 'url(#gameFill)',  scoreFill: '#9a6a00' },
  part:  { glow: 'soft',      fill: null,              scoreFill: '#c43a00' }, // fill set per column
};
// plain (part) column fills to keep suit identity
const partFill = ['#ffffff', '#ffffff', '#ffffff', '#ffffff', '#eef5ff'];

// ---- vertical layout ----
const topOfRows = 300;          // first header top
const headerH = 46;
const gapHeaderCards = 8;
const cardH = 120;
const arrowGap = 34;            // space for the ▲ between rows
const rowStride = headerH + gapHeaderCards + cardH + arrowGap; // = 208
// 7 rows => 7*208 = 1456 ; start 300 => ends ~1756, leaving room for start line + footer within 1980

let s = '';
levels.forEach((L, i) => {
  const hy = topOfRows + i * rowStride;      // header top y
  const cy = hy + headerH + gapHeaderCards;  // cards top y
  // header bar
  s += `  <g>\n    <rect x="60" y="${hy}" width="1280" height="${headerH}" rx="14" fill="${L.hdrFill}" stroke="${L.hdrStroke}" stroke-width="4"/>\n`;
  s += `    <text x="80" y="${hy + 31}" font-size="23" font-weight="bold" fill="${L.hdrText}">${L.title}</text>\n`;
  // right-aligned punchy point tag
  s += `    <text x="1320" y="${hy + 32}" text-anchor="end" font-size="26" font-weight="bold" fill="${L.hdrText}">💪 ${L.pts}</text>\n  </g>\n`;
  // cards
  s += `  <g font-weight="bold" text-anchor="middle">\n`;
  cols.forEach((c, ci) => {
    const t = L.cellTier[ci];
    const cfg = tierCfg[t];
    const fill = t === 'part' ? partFill[ci] : cfg.fill;
    const label = c.sym === 'NT' ? `${L.lvl} NT` : `${L.lvl} ${c.sym}`;
    const labelSize = c.sym === 'NT' ? 36 : 42;
    const labelY = cy + 56;
    const scoreY = cy + 98;
    s += `    <g filter="url(#${cfg.glow})"><rect x="${c.x}" y="${cy}" width="${c.w}" height="${cardH}" rx="18" fill="${fill}" stroke="${c.stroke}" stroke-width="6"/></g>\n`;
    s += `    <text x="${c.cx}" y="${labelY}" font-size="${labelSize}" fill="${c.num}">${label}</text>`;
    s += `<text x="${c.cx}" y="${scoreY}" font-size="29" fill="${cfg.scoreFill}">${L.scores[ci]}</text>\n`;
  });
  s += `  </g>\n`;
  // down arrow (not after the last row)
  if (i < levels.length - 1) {
    s += `  <text x="700" y="${cy + cardH + 28}" text-anchor="middle" font-size="30" fill="#f4a900">▲</text>\n`;
  }
});

// start line + footer positions
const lastCardsBottom = topOfRows + (levels.length - 1) * rowStride + headerH + gapHeaderCards + cardH;
const arrowToStartY = lastCardsBottom + 26;
const startY = lastCardsBottom + 38;
const startH = 56;
const footY = startY + startH + 14;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="'Comic Sans MS','Baloo 2','Trebuchet MS',sans-serif">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cdeefe"/><stop offset="1" stop-color="#eafaff"/></linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000" flood-opacity="0.18"/></filter>
    <filter id="glowGold" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="0" stdDeviation="7" flood-color="#ffb300" flood-opacity="0.95"/></filter>
    <filter id="glowSlam" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="0" stdDeviation="9" flood-color="#8e24aa" flood-opacity="0.95"/></filter>
    <filter id="glowGrand" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="11" flood-color="#ff1493" flood-opacity="1"/></filter>
    <linearGradient id="gameFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6cc"/><stop offset="1" stop-color="#ffe99a"/></linearGradient>
    <linearGradient id="slamFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3e2ff"/><stop offset="1" stop-color="#e4c6ff"/></linearGradient>
    <linearGradient id="grandFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe3f3"/><stop offset="1" stop-color="#ffc2e4"/></linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  <g fill="#ffffff" opacity="0.9"><ellipse cx="200" cy="118" rx="70" ry="34"/><ellipse cx="260" cy="118" rx="55" ry="40"/><ellipse cx="1180" cy="88" rx="75" ry="34"/><ellipse cx="1240" cy="92" rx="50" ry="38"/></g>

  <g text-anchor="middle" filter="url(#soft)">
    <rect x="230" y="36" width="940" height="104" rx="28" fill="#ffde59" stroke="#f4a900" stroke-width="6"/>
    <text x="700" y="98" font-size="46" font-weight="bold" fill="#c43a00">🏎️ MINIBRIDGE RACETRACK 🏁</text>
    <text x="700" y="130" font-size="22" font-weight="bold" fill="#7a4a00">Race to the top! Bigger steps = bigger prizes</text>
  </g>
  <g text-anchor="middle" font-size="21" font-weight="bold" fill="#334"><text x="700" y="176">Suits get stronger as you go RIGHT  ♣ → ♦ → ♥ → ♠ → NT</text></g>
  <g text-anchor="middle" font-size="18" font-weight="bold">
    <text x="700" y="204" fill="#555">💪 = points you and your partner need together to aim for this level</text>
  </g>
  <g font-size="19" font-weight="bold" text-anchor="middle">
    <g filter="url(#soft)"><rect x="150" y="222" width="330" height="48" rx="13" fill="url(#gameFill)" stroke="#ffb300" stroke-width="4"/></g><text x="315" y="253" fill="#9a6a00">⭐ GAME</text>
    <g filter="url(#soft)"><rect x="520" y="222" width="330" height="48" rx="13" fill="url(#slamFill)" stroke="#8e24aa" stroke-width="4"/></g><text x="685" y="253" fill="#6a1b9a">💎 SLAM</text>
    <g filter="url(#soft)"><rect x="890" y="222" width="360" height="48" rx="13" fill="url(#grandFill)" stroke="#ff1493" stroke-width="4"/></g><text x="1070" y="253" fill="#c2185b">👑 GRAND SLAM</text>
  </g>

${s}
  <text x="700" y="${arrowToStartY}" text-anchor="middle" font-size="30" fill="#f4a900">▲</text>
  <g>
    <rect x="60" y="${startY}" width="1280" height="${startH}" rx="14" fill="#fff"/>
    <g fill="#111">
${checker(startY, startH)}
    </g>
  </g>
  <g text-anchor="middle" filter="url(#soft)">
    <rect x="490" y="${startY + 4}" width="420" height="${startH - 8}" rx="26" fill="#ff5252" stroke="#b71c1c" stroke-width="4"/>
    <text x="700" y="${startY + startH / 2 + 10}" font-size="28" font-weight="bold" fill="#fff">🏁 START HERE 🏁</text>
  </g>

  <g transform="translate(120,${footY + 2})">
    <ellipse cx="55" cy="70" rx="80" ry="11" fill="#000" opacity="0.12"/>
    <rect x="4" y="36" width="104" height="28" rx="11" fill="#ff3b3b"/>
    <path d="M26 36 q9 -20 30 -20 h11 q15 0 20 20 Z" fill="#ff6b6b"/>
    <rect x="38" y="22" width="31" height="16" rx="6" fill="#bfe9ff"/>
    <circle cx="32" cy="66" r="13" fill="#222"/><circle cx="32" cy="66" r="5" fill="#ccc"/>
    <circle cx="84" cy="66" r="13" fill="#222"/><circle cx="84" cy="66" r="5" fill="#ccc"/>
    <text x="55" y="100" text-anchor="middle" font-size="17" font-weight="bold" fill="#333">Start your engines!</text>
  </g>
  <g filter="url(#soft)"><rect x="330" y="${footY}" width="1010" height="134" rx="16" fill="#ffffff" stroke="#f4a900" stroke-width="5"/></g>
  <g font-size="18" fill="#333">
    <text x="354" y="${footY + 26}" font-size="20" font-weight="bold" fill="#c43a00">🏆 Aim for the glowing cards — first to 1000 points wins!</text>
    <text x="354" y="${footY + 50}">⭐ GAME +300 · 💎 SLAM +500 · 👑 GRAND SLAM +1000. Numbers = score for making it exactly.</text>
    <text x="354" y="${footY + 74}" fill="#1b5e20">Each EXTRA trick: ♣♦ +20 · ♥♠ +30 · NT +30 (but it does not add the game bonus).</text>
    <text x="354" y="${footY + 98}">The first 6 tricks score nothing — counting starts at trick 7.</text>
    <text x="354" y="${footY + 122}" fill="#b71c1c">Declarer short? The OTHER side scores 50 for each missing trick.</text>
  </g>
</svg>
`;

function checker(y, h) {
  const half = h / 2;
  let out = '';
  for (let x = 60; x < 1340; x += 80) out += `      <rect x="${x}" y="${y}" width="40" height="${half}"/>\n`;
  for (let x = 100; x < 1340; x += 80) out += `      <rect x="${x}" y="${y + half}" width="40" height="${half}"/>\n`;
  return out;
}

writeFileSync(new URL('../minibridge-racetrack.svg', import.meta.url), svg);
console.log('wrote minibridge-racetrack.svg', W, 'x', H);
