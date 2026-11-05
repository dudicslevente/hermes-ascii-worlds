import { makeKit, TAU, clamp, lerp, smoothstep, angleDiff, hash01, rgba, mixHex, at, poly, curve, ellipse } from "../core/util.js";

// Dragonflies, seen from above. Body frame: origin at the thorax, +x toward the
// head, unit = body length L (the whole body is about 1.07 L, 0.21-0.26 of
// S.min x size). Position/heading are functions of S.t (hover then ease-in-out
// glide on a deterministic waypoint grid); wing beats, wing blur and abdomen sway
// are functions of S.b. Nothing is stored between frames.
// Wave 2: the body is the long bright central axis; the four wings are dim,
// translucent slender blades (fore pair swept forward, hind pair swept back).

const D2R = Math.PI / 180;

const KITS = [
  makeKit({ main: "#1fb0a2", light: "#b8fbe8", dark: "#0b3a46", accent: "#46d8ff", second: "#3f86d8" }),
  makeKit({ main: "#d9482b", light: "#ffbf93", dark: "#4a130e", accent: "#ffd65c", second: "#f0832f" }),
  makeKit({ main: "#2faa6c", light: "#c2f8ca", dark: "#0e3a22", accent: "#c8ff62", second: "#4fcf9a" }),
  makeKit({ main: "#6a5bdc", light: "#d6d0ff", dark: "#181250", accent: "#8ae6ff", second: "#9a6ce8" }),
];

// Waypoint k of entity i (stage pixels, clamped to a safe margin).
function waypoint(i, k, w, h) {
  const g1 = 0.62 + 0.38 * hash01(i, 21);
  const g2 = 1.25 + 0.7 * hash01(i, 22);
  const g3 = 0.55 + 0.4 * hash01(i, 23);
  const g4 = 1.1 + 0.8 * hash01(i, 24);
  const p1 = hash01(i, 25) * TAU;
  const p2 = hash01(i, 26) * TAU;
  const p3 = hash01(i, 27) * TAU;
  const p4 = hash01(i, 28) * TAU;
  const jx = hash01(i, k, 31) - 0.5;
  const jy = hash01(i, k, 32) - 0.5;
  const x = 0.5 + 0.26 * (0.62 * Math.sin(g1 * k + p1) + 0.38 * Math.sin(g2 * k + p2)) + 0.07 * jx;
  const y = 0.5 + 0.25 * (0.62 * Math.sin(g3 * k + p3) + 0.38 * Math.sin(g4 * k + p4)) + 0.07 * jy;
  return [clamp(x, 0.13, 0.87) * w, clamp(y, 0.15, 0.85) * h];
}

// Hover (about 1.5-3 s) then ease-in-out glide (1.1-2.3 s) on a fixed per-entity grid.
function pose(i, t, w, h) {
  const P = 3.8 + 0.3 * hash01(i, 11);
  const T = t + hash01(i, 12) * 60;
  const k = Math.floor(T / P);
  const u = T - k * P;
  const G = 1.1 + 1.2 * hash01(i, k, 4);
  const H = P - G;
  const A = waypoint(i, k, w, h);
  const B = waypoint(i, k + 1, w, h);
  const Z = waypoint(i, k - 1, w, h);
  const dir = Math.atan2(B[1] - A[1], B[0] - A[0]);
  const dirPrev = Math.atan2(A[1] - Z[1], A[0] - Z[0]);
  if (u < H) {
    const f = smoothstep(0.72, 1, u / H);
    return { x: A[0], y: A[1], hd: dirPrev + angleDiff(dirPrev, dir) * f, gl: 0, T };
  }
  const g = (u - H) / G;
  const e = g * g * g * (g * (g * 6 - 15) + 10);
  return { x: lerp(A[0], B[0], e), y: lerp(A[1], B[1], e), hd: dir, gl: g, T };
}

// Wing outline in body units: x along the wing, y negative = leading edge.
function makeWing(len, W, hind) {
  const N = 10;
  const lead = [];
  const trail = [];
  for (let j = 0; j <= N; j++) {
    const s = j / N;
    const base = (0.3 + 0.7 * smoothstep(0, 0.3, s)) * Math.sqrt(Math.max(0, 1 - Math.pow(s, 3.6)));
    const lobe = hind ? 0.38 * Math.exp(-Math.pow((s - 0.2) / 0.16, 2)) : 0;
    lead.push([s * len, -W * 0.3 * base]);
    trail.push([s * len, W * (0.62 + lobe) * base]);
  }
  const outline = lead.concat(trail.slice(0, N).reverse());
  return { lead, trail, outline, N, len, W };
}
const FORE = makeWing(0.52, 0.1, false);
const HIND = makeWing(0.5, 0.13, true);

// Draw one wing: a dim, translucent slender blade. The body must stay the
// brightest thing, so membrane and veins use darkened colours at low alpha.
function drawWing(ctx, shp, rx, ry, ang, side, ls, memA, kit, detail, px) {
  at(ctx, rx, ry, ang, ls, side, () => {
    curve(ctx, shp.outline, true);
    const g = ctx.createLinearGradient(0, 0, shp.len, 0);
    g.addColorStop(0, rgba(mixHex(kit.main, kit.dark, 0.3), memA * 1.2));
    g.addColorStop(1, rgba(mixHex(kit.main, kit.dark, 0.55), memA * 0.75));
    ctx.fillStyle = g;
    ctx.fill();
    if (!detail) return;
    const { lead, trail, N } = shp;
    ctx.lineWidth = 1.1 * px;
    ctx.lineCap = "round";
    ctx.strokeStyle = rgba(mixHex(kit.main, kit.light, 0.35), 0.3);
    ctx.beginPath();
    for (let j = 0; j <= N - 1; j++) (j ? ctx.lineTo(lead[j][0], lead[j][1]) : ctx.moveTo(lead[j][0], lead[j][1]));
    ctx.stroke();
    ctx.strokeStyle = rgba(kit.main, 0.2);
    ctx.beginPath();
    for (let j = 1; j <= N - 2; j++) {
      const y = lerp(lead[j][1], trail[j][1], 0.45);
      j > 1 ? ctx.lineTo(lead[j][0], y) : ctx.moveTo(lead[j][0], y);
    }
    ctx.stroke();
    const a = lead[8];
    const b = lead[9];
    poly(ctx, [
      [a[0], a[1]],
      [b[0] + 0.008, b[1]],
      [b[0] + 0.008, b[1] + 0.032],
      [a[0], a[1] + 0.042],
    ]);
    ctx.fillStyle = rgba(mixHex(kit.dark, kit.main, 0.3), 0.75);
    ctx.fill();
  });
}

// Local ribbon: left side then reversed right side (so right[j] = pts[2n-1-j]).
function ribbonPts(spine, half) {
  const n = spine.length;
  const left = [];
  const right = [];
  for (let i = 0; i < n; i++) {
    const a = spine[Math.max(0, i - 1)];
    const b = spine[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0];
    let dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const hw = half(i / (n - 1));
    left.push([spine[i][0] - dy * hw, spine[i][1] + dx * hw]);
    right.push([spine[i][0] + dy * hw, spine[i][1] - dx * hw]);
  }
  return left.concat(right.reverse());
}

// Body in body units (call inside at(..., L, L)). The long bright central axis:
// pale segments with dark rings, a bright thorax, a head on two big compound eyes.
function drawBody(ctx, kit, bend, wagPh, px) {
  const nSeg = 10;
  const spine = [];
  for (let j = 0; j <= nSeg; j++) {
    const s = j / nSeg;
    spine.push([-0.07 - 0.73 * s, bend * s * s + Math.sin(wagPh - s * 2.6) * 0.022 * s]);
  }
  const rb = ribbonPts(spine, (s) => 0.05 + 0.02 * Math.exp(-s * 5) - 0.014 * s);
  const n = spine.length;
  const base = mixHex(kit.main, kit.light, 0.4);
  const alt = mixHex(kit.main, kit.light, 0.82);
  for (let j = 0; j < nSeg; j++) {
    poly(ctx, [rb[j], rb[j + 1], rb[2 * n - 2 - j], rb[2 * n - 1 - j]]);
    ctx.fillStyle = j >= nSeg - 2 ? kit.light : j % 2 ? alt : base;
    ctx.fill();
  }
  // dark rings between segments
  ctx.strokeStyle = rgba(kit.dark, 0.85);
  ctx.lineWidth = 1.7 * px;
  ctx.lineCap = "butt";
  ctx.beginPath();
  for (let j = 1; j < nSeg; j++) {
    ctx.moveTo(rb[j][0], rb[j][1]);
    ctx.lineTo(rb[2 * n - 1 - j][0], rb[2 * n - 1 - j][1]);
  }
  ctx.stroke();
  // bright dorsal line
  ctx.strokeStyle = rgba(kit.light, 0.5);
  ctx.lineWidth = 1.4 * px;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let j = 0; j < nSeg - 1; j++) (j ? ctx.lineTo(spine[j][0], spine[j][1]) : ctx.moveTo(spine[j][0], spine[j][1]));
  ctx.stroke();
  const tip = spine[nSeg];
  ctx.strokeStyle = rgba(kit.light, 0.85);
  ctx.lineWidth = 1.3 * px;
  ctx.beginPath();
  ctx.moveTo(tip[0], tip[1] + 0.01);
  ctx.lineTo(tip[0] - 0.05, tip[1] + 0.035);
  ctx.moveTo(tip[0], tip[1] - 0.01);
  ctx.lineTo(tip[0] - 0.05, tip[1] - 0.035);
  ctx.stroke();

  // thorax with cylindrical shading across its width
  const tg = ctx.createLinearGradient(0, -0.09, 0, 0.09);
  tg.addColorStop(0, mixHex(kit.main, kit.light, 0.1));
  tg.addColorStop(0.35, mixHex(kit.main, kit.light, 0.5));
  tg.addColorStop(0.5, mixHex(kit.main, kit.light, 0.9));
  tg.addColorStop(0.68, mixHex(kit.main, kit.light, 0.45));
  tg.addColorStop(1, mixHex(kit.main, kit.dark, 0.1));
  ellipse(ctx, 0.02, 0, 0.135, 0.088);
  ctx.fillStyle = tg;
  ctx.fill();
  ctx.strokeStyle = rgba(kit.second, 0.8);
  ctx.lineWidth = 1.6 * px;
  ctx.beginPath();
  ctx.moveTo(-0.05, -0.04);
  ctx.lineTo(0.08, -0.03);
  ctx.moveTo(-0.05, 0.04);
  ctx.lineTo(0.08, 0.03);
  ctx.stroke();

  // head and the two big compound eyes
  ellipse(ctx, 0.215, 0, 0.05, 0.065);
  ctx.fillStyle = mixHex(kit.main, kit.dark, 0.2);
  ctx.fill();
  for (const sd of [-1, 1]) {
    const ex = 0.228;
    const ey = sd * 0.054;
    const er = 0.068;
    const eg = ctx.createRadialGradient(ex - 0.014, ey - sd * 0.014, 0, ex, ey, er);
    eg.addColorStop(0, "#ffffff");
    eg.addColorStop(0.3, kit.light);
    eg.addColorStop(0.62, kit.accent);
    eg.addColorStop(1, mixHex(kit.accent, kit.dark, 0.45));
    ellipse(ctx, ex, ey, er, er * 1.02);
    ctx.fillStyle = eg;
    ctx.fill();
  }
}

export default {
  id: "dragonflies",
  name: "Dragonflies",
  group: "wings",
  blurb: "Long-bodied dragonflies hover on blurred wings, then glide to a new spot in the air.",
  motion: "travel",
  count: { min: 0, max: 8, default: 3, noun: "Dragonfly" },
  natural: KITS,
  flow: { label: "Breeze", help: "How strongly a light breeze nudges hovering dragonflies.", default: 1, min: 0, max: 1.5 },
  extras: [
    { key: "blur", type: "range", label: "Wing blur", min: 0, max: 1.5, step: 0.05, default: 1, help: "Strength of the soft ghost images drawn around each beating wing." },
  ],
  backdrop: { dark: "#0b1411", light: "#eaf0e8" },
  draw(ctx, w, h, S) {
    const min = S.min;
    const flow = S.flow == null ? 1 : S.flow;
    const blur = S.extra && S.extra.blur != null ? S.extra.blur : 1;
    ctx.lineJoin = "round";
    for (let i = 0; i < S.count; i++) {
      const kit = S.kit(i);
      const L = min * S.size * (0.2 + 0.045 * hash01(i, 1)); // whole body about 0.21-0.26 of min x size
      const px = 1 / L;
      const p = pose(i, S.t, w, h);
      const p0 = pose(i, S.t - 0.12, w, h);
      const yaw = angleDiff(p0.hd, p.hd) / 0.12;
      const T = p.T;
      const ph1 = hash01(i, 13) * TAU;
      const ph2 = hash01(i, 14) * TAU;
      const micro = 0.006 * min;
      const x = p.x + micro * Math.sin(0.9 * T + ph1) + flow * 0.014 * min * Math.sin(0.31 * T + ph2);
      const y = p.y + micro * Math.cos(0.7 * T + ph2) + flow * 0.011 * min * Math.cos(0.27 * T + ph1);
      const hd = p.hd + (0.035 + 0.05 * flow) * Math.sin(0.8 * T + ph1);
      const glide = Math.sin(Math.PI * clamp(p.gl, 0, 1));

      // ~2 Hz wing beat, smooth; each wing is drawn at three times (ghost fan)
      const f = 2 * (0.92 + 0.16 * hash01(i, 41));
      const ph = S.b * f * TAU + hash01(i, 42) * TAU;
      const amp = 11 * D2R * (1 - 0.5 * glide);
      const dt = 0.055 * blur;
      const ghosts = blur > 0.02 ? [-dt, 0, dt] : [0];
      const three = ghosts.length === 3;
      const bend = clamp(-yaw * 0.035, -0.12, 0.12);
      at(ctx, x, y, hd, L, L, () => {
        // fore pair swept forward (66 deg), hind pair swept back (114 deg)
        const wings = [
          { shp: HIND, rx: -0.04, base: 114 * D2R, pOff: 2.7 },
          { shp: FORE, rx: 0.05, base: 66 * D2R, pOff: 0 },
        ];
        for (const wg of wings) {
          for (const side of [1, -1]) {
            for (let gi = 0; gi < ghosts.length; gi++) {
              const bb = ph + ghosts[gi] * f * TAU + wg.pOff;
              const psi = wg.base + amp * Math.sin(bb);
              const ls = Math.cos(0.5 * Math.sin(bb + 1.2));
              const main = !three || gi === 1;
              const aMem = three ? (main ? 0.22 : 0.09) : 0.26;
              drawWing(ctx, wg.shp, wg.rx, side * 0.06, side * psi, side, ls, aMem, kit, main, px);
            }
          }
        }
        drawBody(ctx, kit, bend, S.b * TAU * 0.6 + hash01(i, 43) * TAU, px);
      });
    }
  },
};
