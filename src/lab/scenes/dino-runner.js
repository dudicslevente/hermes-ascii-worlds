import { makeKit, TAU, clamp, clamp01, lerp, mod, smoothstep, hash01, rgba, shadeHex, mixHex, shiftHue } from "../core/util.js";

// Dino runner: a homage to the offline-browser dinosaur game, in ONE ink colour. A blocky
// pixel T-rex runs along a thin horizon line with random bumps and dashes, hops saguaro
// cactus clusters, ducks pterodactyls (never crashes), small outline clouds drift left and a
// five-digit score counts up top right. Everything is a pure function of ground distance u
// (in dino heights): obstacle n sits at 7 + GAP*n + jitter, the jump/duck state is a function
// of dx = obstacle - u. One game pixel P = D/23 (D = standing dino height).

const LANE_SCALE = [1, 0.78, 0.62];
const GAP = 8;

// ---- sprites ('#' = ink) ---------------------------------------------------------
// Traced from the user-provided reference at half-pixel-grid resolution.
const DINO_STAND = [
  "......................################..",
  "......................################..",
  "....................####..##############",
  "....................####..##############",
  "....................####################",
  "....................####################",
  "....................####################",
  "....................####################",
  "....................####################",
  "....................####################",
  "....................####################",
  "....................##########..........",
  "....................##########..........",
  "....................##########..........",
  "....................###############.....",
  "##................##########............",
  "##................##########............",
  "##................##########............",
  "##.............#############............",
  "##.............#############............",
  "####........####################........",
  "####........################..#.........",
  "######....##################..#.........",
  "######.....#################............",
  "############################............",
  "############################............",
  "############################............",
  "..##########################............",
  "..########################..............",
  "....######################..............",
  "....######################..............",
  "........###############.................",
  "........###############.................",
  "........#############...................",
  "........#############...................",
  ".........############...................",
  "..........######..###...................",
  "..........######..###...................",
  "..........##........#...................",
  "..........##........#...................",
  "..........##........#...................",
  "..........##........#...................",
  "..........####......####................",
  "..........####......####................",
];
const DINO_RUN = [
[
"......................################..",
"......................################..",
"....................####..##############",
"....................####..##############",
"....................####################",
"....................####################",
"....................####################",
"....................####################",
"....................####################",
"....................####################",
"....................####################",
"....................##########..........",
"....................##########..........",
"....................##########..........",
"....................###############.....",
"##................##########............",
"##................##########............",
"##................##########............",
"##.............#############............",
"##.............#############............",
"####........####################........",
"####........################..#.........",
"######....##################..#.........",
"######.....#################............",
"############################............",
"############################............",
"############################............",
"..##########################............",
"..########################..............",
"....######################..............",
"....######################..............",
"........###############.................",
"........###############.................",
"........#############...................",
"........#############...................",
".........############...................",
"..........######....#...................",
"..........######....#...................",
"..........##........####................",
"..........##........####................",
"..........##............................",
"..........##............................",
"..........####..........................",
"..........####..........................",
],
[
"......................################..",
"......................################..",
"....................####..##############",
"....................####..##############",
"....................####################",
"....................####################",
"....................####################",
"....................####################",
"....................####################",
"....................####################",
"....................####################",
"....................##########..........",
"....................##########..........",
"....................##########..........",
"....................###############.....",
"##................##########............",
"##................##########............",
"##................##########............",
"##.............#############............",
"##.............#############............",
"####........####################........",
"####........################..#.........",
"######....##################..#.........",
"######.....#################............",
"############################............",
"############################............",
"############################............",
"..##########################............",
"..########################..............",
"....######################..............",
"....######################..............",
"........###############.................",
"........###############.................",
"........#############...................",
"........#############...................",
".........############...................",
"..........##......###...................",
"..........##......###...................",
"..........####......#...................",
"..........####......#...................",
"....................#...................",
"....................#...................",
"....................####................",
"....................####................",
],
];
// Give the eye enough negative space to survive the 2x2 glyph sampler.
for (const rows of [DINO_STAND, ...DINO_RUN]) {
  for (let y = 2; y <= 4; y++) rows[y] = rows[y].slice(0, 24) + "...." + rows[y].slice(28);
}
const DUCK_BODY = [
  "...................##########",
  "...................##.#######",
  "...................##########",
  "...................#####.....",
  "#.........##################.",
  "##.......####################",
  "######...#################.#.",
  ".#########################...",
  "..######################.....",
  "....####################.....",
];
const DUCK_LEG_DOWN = ["###", "###", "####"];
const DUCK_LEG_UP = ["###", "...", "..."];
function duckLegs(l, r) {
  const rows = [];
  for (let k = 0; k < 3; k++) rows.push((".........." + l[k].padEnd(4, ".") + "..." + r[k].padEnd(4, ".") + ".............").slice(0, 29));
  return rows;
}
const DUCK_RUN = [DUCK_BODY.concat(duckLegs(DUCK_LEG_DOWN, DUCK_LEG_UP)), DUCK_BODY.concat(duckLegs(DUCK_LEG_UP, DUCK_LEG_DOWN))];
const CACTUS_BIG = [
  ".....###....",
  "....#####...",
  "....#####.##",
  "....#####.##",
  "....#####.##",
  "....#####.##",
  "....#####.##",
  "....#####.##",
  ".##.#####.##",
  ".##.########",
  ".##.########",
  ".##.#####...",
  ".##.#####...",
  ".##.#####...",
  ".########...",
  ".########...",
].concat(Array(10).fill("....#####..."));
const CACTUS_SMALL = [
  "....#....",
  "...###...",
  "...###.##",
  "...###.##",
  "...###.##",
  "##.###.##",
  "##.######",
  "##.######",
  "######...",
  "######...",
].concat(Array(8).fill("...###..."));
const PTERO = [
[
".........#................",
".........#................",
".........##...............",
".........###..............",
".....###..####............",
"....####..#####...........",
"...######.######..........",
"..#######.#######.........",
"..#######.#######.........",
"#################.........",
"........##########........",
".........#################",
"..........############....",
"...........#############..",
"............#########.....",
"............#########.....",
],
[
"..........................",
"..........................",
"..........................",
"..........................",
".....###..................",
"....####..................",
"...#####..................",
"..######..................",
"..######..................",
"########..................",
"........##########........",
"........##################",
"........#.############....",
"..........##############..",
".........############.....",
".........#..#########.....",
],
];
const CLOUD = [
  "......###.........",
  ".....#...#..###...",
  "..###.....##...#..",
  ".#...............#",
  "#................#",
  ".#################",
];
const DIGITS = {
  0: ["###", "#.#", "#.#", "#.#", "###"],
  1: [".#.", "##.", ".#.", ".#.", "###"],
  2: ["###", "..#", "###", "#..", "###"],
  3: ["###", "..#", "###", "..#", "###"],
  4: ["#.#", "#.#", "###", "..#", "..#"],
  5: ["###", "#..", "###", "..#", "###"],
  6: ["###", "#..", "###", "#.#", "###"],
  7: ["###", "..#", "..#", "..#", "..#"],
  8: ["###", "#.#", "###", "#.#", "###"],
  9: ["###", "#.#", "###", "..#", "###"],
};

function sprite(ctx, rows, x, y, P) {
  ctx.beginPath();
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    let c = 0;
    while (c < row.length) {
      if (row[c] === "#") {
        let e = c;
        while (e < row.length && row[e] === "#") e++;
        ctx.rect(x + c * P, y + r * P, (e - c) * P, P);
        c = e;
      } else c++;
    }
  }
  ctx.fill();
}
function rects(ctx, list, x, y, P) {
  ctx.beginPath();
  for (const [a, b, c, d] of list) ctx.rect(x + a * P, y + b * P, c * P, d * P);
  ctx.fill();
}

function drawPlant(ctx, big, x, gy, P) {
  const rows = big ? CACTUS_BIG : CACTUS_SMALL;
  sprite(ctx, rows, x, gy - rows.length * P, P);
}
function pterodactyl(ctx, x, y, P, f) {
  sprite(ctx, PTERO[f], x, y, P * 0.6);
}

function slot(i, n, birds) {
  let kind = hash01(i, n, 6) < 0.66 ? "cactus" : "bird";
  if (!birds && kind === "bird") kind = "cactus";
  const jit = (hash01(i, n, 5) - 0.5) * 3;
  if (kind === "bird") return { n, kind, x: 7 + GAP * n + jit, wU: 0.9, hU: 0.5, cl: 1 };
  const cl = hash01(i, n, 8) < 0.5 ? 1 : hash01(i, n, 9) < 0.55 ? 2 : 3;
  const big = hash01(i, n, 10) < 0.55;
  const W = big ? 12 : 9;
  const sp = W + 3;
  const wU = ((cl - 1) * sp + W) / 24;
  return { n, kind, x: 7 + GAP * n + jit, wU, hU: (big ? 26 : 18) / 24, cl, big, sp, W };
}

function dinoState(i, u, on, birds) {
  const st = { air: 0, duck: 0 };
  if (!on) return st;
  const n0 = Math.floor((u - 7) / GAP);
  for (let n = n0 - 1; n <= n0 + 2; n++) {
    if (n < 0) continue;
    const o = slot(i, n, birds);
    const dx = o.x - u;
    if (o.kind === "bird") {
      st.duck = Math.max(st.duck, smoothstep(2.4, 1.6, Math.abs(dx)));
      continue;
    }
    const J = Math.max(1.4, o.wU / 2 + 1.0);
    const H = o.hU + 0.36;
    if (Math.abs(dx) < J) st.air = Math.max(st.air, H * (1 - (dx / J) * (dx / J)));
  }
  return st;
}

function laneGeom(w, h, S, n, i) {
  const sz = n > 1 ? Math.min(S.size, 1.2) : S.size;
  const base = n === 1 ? Math.min(0.3 * h, 0.2 * w) : n === 2 ? 0.27 * h : 0.2 * h;
  const D = Math.max(40, base * sz * LANE_SCALE[i]);
  const gys = n === 1 ? [0.72] : n === 2 ? [0.88, 0.47] : [0.93, 0.66, 0.4];
  const P = Math.max(2, D / 24);
  const gy = Math.round((h * gys[i]) / P) * P;
  const xd = w * (n === 1 ? 0.18 : 0.16 + 0.17 * i);
  const v = Math.min(h, w) * 0.85 * (S.flow == null ? 1 : S.flow) * (0.55 + 0.45 * LANE_SCALE[i]);
  const u = (S.t * v) / D + hash01(i, 90) * 40;
  return { i, D, P, gy, xd, u, v };
}

function inkOf(S, kit) {
  return S.dark ? mixHex(kit.main, kit.light, 0.55) : mixHex(kit.main, kit.dark, 0.55);
}

function drawScore(ctx, w, h, S, L0, kit, P) {
  const score = Math.floor(L0.u * 2.5) % 100000;
  const txt = String(score).padStart(5, "0");
  const q = clamp(h * 0.0125, 3, 8) * Math.max(0.8, Math.min(1.3, S.size));
  const colA = S.dark ? mixHex(kit.accent, inkOf(S, kit), 0.25) : mixHex(kit.accent, kit.dark, 0.45);
  ctx.fillStyle = colA;
  const tw = txt.length * 4 * q - q;
  const x0 = Math.round(w - tw - Math.max(q * 3, w * 0.03));
  const y0 = Math.round(Math.max(q * 3, h * 0.06));
  ctx.beginPath();
  for (let d = 0; d < txt.length; d++) {
    const g = DIGITS[txt[d]];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r][c] === "#") ctx.rect(x0 + (d * 4 + c) * q, y0 + r * q, q, q);
  }
  ctx.fill();
}

function drawClouds(ctx, w, h, S, P0) {
  const kit = S.kit(0);
  const ink = inkOf(S, kit);
  const P = Math.max(3, Math.min(P0, h * 0.011) );
  const cw = 18 * P;
  const span = w + cw * 2;
  ctx.fillStyle = rgba(ink, S.dark ? 0.5 : 0.45);
  for (let j = 0; j < 3; j++) {
    const sp = (0.012 + 0.006 * j) * w;
    const x = mod(((j + 0.3 + 0.2 * hash01(j, 4)) / 3) * span - S.t * sp, span) - cw;
    const y = Math.round((h * (0.1 + 0.11 * j + 0.04 * hash01(j, 5))) / P) * P;
    sprite(ctx, CLOUD, Math.round(x / P) * P, y, P);
  }
}

function drawLane(ctx, S, w, h, L, extras) {
  const kit = S.kit(L.i);
  const ink = inkOf(S, kit);
  const { D, P, gy, xd, u } = L;
  const on = extras.obstacles,
    birds = extras.birds;
  ctx.fillStyle = ink;
  // horizon line
  const gt = Math.max(2, Math.round(P * 0.55));
  ctx.fillRect(0, gy, w, gt);
  // bumps (above) and dashes (below), world-anchored
  const cell = 4 * P;
  const off = u * D;
  const c0 = Math.floor(off / cell);
  const c1 = Math.ceil((off + w) / cell);
  ctx.beginPath();
  for (let c = c0; c <= c1; c++) {
    const hh = hash01(L.i, c, 41);
    const sx = c * cell - off + hash01(L.i, c, 42) * cell;
    if (hh < 0.45) {
      const dw = (1 + Math.floor(hash01(L.i, c, 43) * 3)) * P;
      ctx.rect(Math.round(sx / P) * P, gy + gt + Math.round(P * (1 + 1.5 * hash01(L.i, c, 44))), dw, gt);
    } else if (hh > 0.9) {
      ctx.rect(Math.round(sx / P) * P, gy - P * 0.9, P * 2, P * 0.9 + 0.5);
    }
  }
  ctx.fill();

  // obstacles
  const dw = 22 * P;
  const xc0 = xd + dw * 0.5;
  if (on) {
    const lo = Math.floor((u - 7 - (xd / D + 4)) / GAP);
    const hi = Math.floor((u - 7 + ((w - xd) / D + 4)) / GAP) + 1;
    for (let n = Math.max(0, lo); n <= hi; n++) {
      const o = slot(L.i, n, birds);
      const sx = xc0 + (o.x - u) * D;
      if (o.kind === "bird") {
        const f = Math.floor(S.b * 6 + n) % 2;
        pterodactyl(ctx, Math.round((sx - 11 * P) / P) * P, gy - 29 * P, P, f);
      } else {
        const tot = (o.cl - 1) * o.sp + o.W;
        for (let k = 0; k < o.cl; k++) {
          const big = o.cl > 1 && hash01(L.i, n, 20 + k) < 0.3 ? !o.big : o.big;
          const px = Math.round((sx - (tot * P) / 2 + k * o.sp * P) / P) * P;
          drawPlant(ctx, big, px, gy, P);
        }
      }
    }
  }

  // dino
  const st = dinoState(L.i, u, on, birds);
  const duck = st.duck > 0.5 && st.air < 0.05;
  const yb = gy - Math.round((st.air * D) / P) * P;
  const x = Math.round(xd / P) * P;
  const step = Math.floor(S.b * 8) % 2;
  ctx.fillStyle = ink;
  if (duck) sprite(ctx, DUCK_RUN[step], x, yb - 13 * P, P);
  else if (st.air > 0.04) sprite(ctx, DINO_STAND, x, yb - 24 * P, P * 24 / 44);
  else sprite(ctx, DINO_RUN[step], x, yb - 24 * P, P * 24 / 44);
}

const KITS = [
  makeKit({ main: "#aaaaaa", light: "#eeeeee", dark: "#555555", accent: "#aaaaaa", second: "#cccccc" }),
  makeKit({ main: "#c8946a", light: "#f6dcc2", dark: "#3e2512", accent: "#d94a3a", second: "#d9b690" }),
  makeKit({ main: "#6fb0b0", light: "#d4f0ee", dark: "#143a3a", accent: "#f0884a", second: "#a6d0cc" }),
  makeKit({ main: "#a58cc8", light: "#e6dcf6", dark: "#2f2150", accent: "#f2a65a", second: "#c8badb" }),
];

export default {
  id: "dino-runner",
  name: "Dino runner",
  group: "creatures",
  blurb: "A blocky pixel dinosaur trots along a thin horizon, hopping saguaro cacti and ducking pterodactyls on an uncluttered stage.",
  motion: "travel",
  count: { min: 0, max: 3, default: 1, noun: "Dino" },
  natural: KITS,
  atmosphere: "none",
  flow: { label: "Run speed", help: "Ground and obstacles scroll faster; Pace controls the leg animation and clouds.", default: 1, min: 0, max: 1.5 },
  extras: [
    { key: "obstacles", type: "toggle", label: "Obstacles", default: true, help: "Cacti and pterodactyls arrive; off, the dino simply runs." },
    { key: "birds", type: "toggle", label: "Pterodactyls", default: true, help: "Flapping pterodactyls that the dino ducks under." },
    { key: "score", type: "toggle", label: "Score", default: true, help: "A blocky pixel score counter, top right." },
  ],
  supports: { speed: true, size: true },
  labels: { speed: "Pace", size: "Size" },
  backdrop: { dark: "#17181b", light: "#ffffff" },
  draw(ctx, w, h, S) {
    const n = Math.max(0, Math.min(3, S.count | 0));
    const extras = { obstacles: S.extra.obstacles ?? true, birds: S.extra.birds ?? true };
    const lanes = [];
    for (let i = 0; i < n; i++) lanes.push(laneGeom(w, h, S, n, i));
    drawClouds(ctx, w, h, S, lanes[0].P);
    for (let i = n - 1; i >= 0; i--) drawLane(ctx, S, w, h, lanes[i], extras);
    if (S.extra.score ?? true) drawScore(ctx, w, h, S, lanes[0], S.kit(0), lanes[0].P);
  },
};
