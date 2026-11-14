import { makeKit, TAU, clamp, clamp01, lerp, mod, smoothstep, hash01, rgba, shadeHex, mixHex, shiftHue } from "../core/util.js";

// Nyan Cat (generic pixel-art homage): a boxy frosted-pastry body with a square grey cat head,
// stubby legs and a tail, flying straight right with a flat six-band rainbow behind it. The
// bands wiggle in the classic stair-step, the cat bobs by one block, plus-shaped stars drift
// left. Everything is drawn from blocks of one pixel unit U, a pure function of time.
// Rainbow hues are shiftHue(kit.accent, ...) so natural kits give red..violet.

const HUES = [0, 32, 60, 120, 212, 268];
const BAND_L = [0, 0, -0.02, -0.03, 0.05, 0.1];

function bandColour(kit, k, dark) {
  return shiftHue(kit.accent, HUES[k], 1.15, BAND_L[k] - (dark ? 0 : 0.08));
}

const rect = (ctx, x, y, w, h, col, a = 1) => {
  ctx.fillStyle = a < 1 ? rgba(col, a) : col;
  ctx.fillRect(x, y, w, h);
};

function layout(w, h, S, i) {
  const n = Math.max(1, S.count | 0);
  const f = n > 2 ? 0.6 : n > 1 ? 0.78 : 1;
  const U = Math.max(3, Math.round(Math.min(h * 0.0185, w * 0.0125) * S.size * f));
  const lanes = n === 1 ? [0.5] : n === 2 ? [0.3, 0.7] : [0.2, 0.5, 0.8];
  return { U, cy: h * lanes[i] };
}

// ---- stepped pixel stars --------------------------------------------------------
// twinkle sequence per star (frames at ~6 per second): gone, dot, plus, big plus, plus, dot
const TW = [0, 1, 2, 3, 2, 1, 0, 0];
function star(ctx, x, y, q, kind, col) {
  x = Math.round(x / q) * q;
  y = Math.round(y / q) * q;
  ctx.fillStyle = col;
  ctx.beginPath();
  if (kind === 1) ctx.rect(x, y, q, q);
  else {
    const arm = kind === 3 ? 2 : 1;
    ctx.rect(x, y, q, q);
    ctx.rect(x - arm * q, y, arm * q, q);
    ctx.rect(x + q, y, arm * q, q);
    ctx.rect(x, y - arm * q, q, arm * q);
    ctx.rect(x, y + q, q, arm * q);
  }
  ctx.fill();
}

function drawStars(ctx, w, h, S, U, step) {
  const kit = S.kit(0);
  const n = Math.round(22 * (S.extra.stars ?? 1));
  const col = S.dark ? mixHex(kit.light, "#ffffff", 0.7) : mixHex(kit.main, kit.dark, 0.5);
  const q0 = Math.max(2, Math.round(U * 0.42));
  const margin = 6 * q0;
  const span = w + 2 * margin;
  const drift = w * 0.07;
  for (let j = 0; j < n; j++) {
    const q = j % 4 === 0 ? q0 * 1.5 : q0;
    const rate = drift * (0.85 + 0.3 * hash01(j, 12));
    const x = mod(hash01(j, 10) * span - Math.floor(S.t * 6) / 6 * rate, span) - margin;
    const y = ((j + 0.15 + 0.7 * hash01(j, 11)) / Math.max(1, n)) * h * 0.96 + h * 0.02;
    const kind = TW[(step + Math.floor(hash01(j, 13) * 8) + j) % 8];
    if (kind > 0) star(ctx, x, y, q, kind, col);
  }
}

// ---- the cat, from layered pixel cells (sprite grid is 34 x 19 cells) ----------
const W = 34, H = 19;
function cells(rows) {
  const out = [];
  rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === "#") out.push([x, y]); });
  return out;
}
function rectC(x0, y0, x1, y1, cut) {
  const o = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (cut && (x === x0 || x === x1) && (y === y0 || y === y1)) continue;
    o.push([x, y]);
  }
  return o;
}
function dilate(list) {
  const set = new Set(list.map(([x, y]) => x + "," + y));
  const o = [];
  for (const [x, y] of list) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const k = x + dx + "," + (y + dy);
    if (!set.has(k)) { set.add(k); o.push([x + dx, y + dy]); }
  }
  return list.concat(o);
}
const TAIL = [
  cells([
    ".........",
    "..#......",
    ".##......",
    "##.......",
    "..#......",
    "..####...",
    "...####..",
  ]).map(([x, y]) => [x + 0, y + 8]),
  cells([
    ".........",
    ".........",
    ".........",
    ".#.......",
    ".##......",
    "..####...",
    "...####..",
  ]).map(([x, y]) => [x + 0, y + 8]),
];
const HEAD = rectC(19, 6, 32, 16, true).concat([[20, 4], [20, 5], [21, 5], [31, 4], [31, 5], [30, 5], [22, 5], [29, 5]]);
const BODY = rectC(6, 1, 24, 14, true);
const SPR = [[9, 4], [14, 3], [18, 3], [10, 7], [15, 8], [8, 10], [13, 11], [20, 2], [12, 6], [17, 12]];
const MOUTH = [[23, 13], [24, 14], [25, 13], [26, 13], [27, 14], [28, 13]];

// Discrete poses measured against the supplied video. The head leads the
// pastry horizontally, drops with it, then lifts BEFORE the pastry returns.
// One source-animation pose lasts about 70 ms; no sinusoidal interpolation.
const POSES = [
  { body: 0, hx: 0, hy: 0, tail: 0, feet: 0 },
  { body: 0, hx: 1, hy: 0, tail: 1, feet: 1 },
  { body: 1, hx: 1, hy: 1, tail: 2, feet: 2 },
  { body: 1, hx: 1, hy: 1, tail: 2, feet: 3 },
  { body: 1, hx: 0, hy: 1, tail: 1, feet: 2 },
  { body: 1, hx: 0, hy: 0, tail: 0, feet: 1 },
];
export const nyanPoseAt = (seconds) => POSES[mod(Math.floor(seconds / 0.07 + 1e-8), POSES.length)];

function drawCat(ctx, S, i, ox, oy, U, step) {
  const kit = S.kit(i);
  const dk = S.dark;
  const line = dk ? mixHex(kit.dark, kit.main, 0.3) : mixHex(kit.dark, kit.main, 0.15);
  const crust = mixHex(kit.second, kit.light, 0.25);
  const frost = mixHex(kit.accent, kit.light, dk ? 0.6 : 0.3);
  const sprink = mixHex(kit.accent, kit.dark, 0.1);
  const grey = mixHex(kit.main, kit.light, dk ? 0.2 : 0.02);
  const cheek = mixHex(kit.accent, kit.light, dk ? 0.45 : 0.2);
  const ink = kit.dark;
  const pose = POSES[mod(step, POSES.length)];
  const f = pose.feet;
  const bob = pose.body;
  const P = (list, c, dy = 0, dx = 0) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    for (const [x, y] of list) ctx.rect(Math.round(ox + (x + dx) * U), Math.round(oy + (y + dy) * U), Math.ceil(U), Math.ceil(U));
    ctx.fill();
  };
  // tail (alternates) then legs (alternate)
  const tail = pose.tail === 0 ? TAIL[0] : pose.tail === 1 ? TAIL[1]
    : cells(["###......", ".###.....", "...###...", ".....##.."]).map(([x,y]) => [x, y + 13]);
  P(dilate(tail), line);
  P(tail, grey);
  const stride = [-1, 0, 1, 0][f];
  const lg = (x0, off, lift = 0) => rectC(x0 + off, 15 + bob, x0 + off + 2, 17 + bob - lift, false);
  const legs = lg(7, stride, f === 0 ? 1 : 0).concat(lg(13, -stride, f === 2 ? 1 : 0), lg(21, stride, f === 0 ? 1 : 0), lg(28, -stride, f === 2 ? 1 : 0));
  P(dilate(legs), line);
  P(legs, grey);
  // body: outline, crust, frosting (bobbing)
  const bl = dilate(BODY);
  P(bl, line, bob);
  P(BODY, crust, bob);
  P(rectC(8, 3, 22, 12, true), frost, bob);
  for (const c of SPR) P([c], sprink, bob);
  // Independent head motion; translate facial features as a single sprite.
  ctx.save();
  ctx.translate(pose.hx * U, (pose.hy - bob) * U);
  P(dilate(HEAD), line, bob);
  P(HEAD, grey, bob);
  P(rectC(19, 6, 20, 6, false), mixHex(grey, kit.light, 0.2), bob);
  // face
  P(rectC(20, 12, 21, 13, false), cheek, bob);
  P(rectC(30, 12, 31, 13, false), cheek, bob);
  // True negative-space facial marks survive the renderer's dark-ink lift.
  ctx.save();
  if (dk) ctx.globalCompositeOperation = "destination-out";
  P(rectC(22, 9, 23, 10, false), ink, bob);
  P(rectC(28, 9, 29, 10, false), ink, bob);
  P(MOUTH.map(([x, y]) => [x, y - 1]), ink, bob);
  ctx.restore();
  P([[22, 9], [28, 9]], kit.light, bob);
  ctx.restore();
}

function drawRainbow(ctx, S, i, ox, oy, U, step, reach) {
  const kit = S.kit(i);
  const wave = S.extra.wave ?? true;
  const bob = POSES[mod(step, POSES.length)].body * U;
  const cw = Math.max(2, Math.round(3 * U));
  const xr = Math.round(ox + 9 * U);
  const x0 = Math.max(0, Math.round(xr - reach));
  const bh = 2.5 * U;
  const nc = Math.ceil((xr - x0) / cw);
  for (let c = 0; c < nc; c++) {
    const xe = xr - c * cw;
    const off = wave ? (mod(c - step, 4) < 2 ? 0 : U) : 0;
    const xs = Math.max(x0 - 1, xe - cw);
    for (let k = 0; k < 6; k++) {
      ctx.fillStyle = bandColour(kit, k, S.dark);
      const y = Math.round(oy + bob + off + (0.5 + k * 2.5) * U);
      ctx.fillRect(xs, y, xe - xs + 0.5, Math.ceil(bh + 0.5));
    }
  }
}

const KITS = [
  // classic: grey cat, pink frosting, real rainbow
  makeKit({ main: "#9aa0ad", light: "#f2f4fa", dark: "#2a2d3a", accent: "#ff3b44", second: "#f2c98e" }),
  // orange tabby
  makeKit({ main: "#e8924a", light: "#ffe3b8", dark: "#5a2a10", accent: "#ee3b2c", second: "#f2b873" }),
  // cream
  makeKit({ main: "#e6d6b4", light: "#fff8e8", dark: "#6e5434", accent: "#ec3c4a", second: "#f3d9a6" }),
  // dusk blue-grey
  makeKit({ main: "#7f93c0", light: "#e2eafa", dark: "#1e2640", accent: "#f04a58", second: "#e9c391" }),
];

export default {
  id: "nyan-cat",
  name: "Nyan Cat",
  group: "creatures",
  blurb: "A pixel pastry-cat flies straight across a deep night sky, bobbing along on a stair-stepped rainbow among drifting stars.",
  motion: "travel",
  count: { min: 0, max: 3, default: 1, noun: "Cat" },
  natural: KITS,
  atmosphere: "none",
  extras: [
    { key: "trail", type: "range", label: "Trail", min: 0.2, max: 1, step: 0.05, default: 1, help: "How far back the rainbow reaches; full length runs to the left edge." },
    { key: "stars", type: "range", label: "Stars", min: 0, max: 1.5, step: 0.05, default: 1, help: "How many twinkling plus-shaped stars drift past." },
    { key: "wave", type: "toggle", label: "Rainbow wave", default: true, help: "The stair-step wave running along the rainbow; off, it stays flat." },
  ],
  supports: { speed: true, size: true },
  labels: { speed: "Pace", size: "Size" },
  backdrop: { dark: "#07142e", light: "#e9edf7" },
  draw(ctx, w, h, S) {
    const n = Math.max(0, Math.min(3, S.count | 0));
    const step = Math.floor(S.b / 0.07 + 1e-8);
    const l0 = layout(w, h, S, 0);
    drawStars(ctx, w, h, S, l0.U, step);
    const trail = S.extra.trail ?? 1;
    const cats = [];
    for (let i = 0; i < n; i++) {
      const { U, cy } = layout(w, h, S, i);
      const catW = W * U;
      const stag = n === 1 ? 0 : (i === 1 ? 0.06 : i === 2 ? -0.05 : 0.0) * w;
      const ox = Math.round((w * 0.4 + stag - catW / 2) / U) * U;
      const oy = Math.round((cy - (H * U) / 2) / U) * U;
      cats.push({ i, U, ox, oy, reach: (ox + 9 * U) * trail + 1 });
    }
    for (let k = n - 1; k >= 0; k--) {
      const c = cats[k];
      drawRainbow(ctx, S, c.i, c.ox, c.oy, c.U, step + c.i, c.reach);
      drawCat(ctx, S, c.i, c.ox, c.oy, c.U, step + c.i);
    }
  },
};
