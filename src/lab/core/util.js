// Shared maths, deterministic randomness, colour kits, routes and drawing
// helpers for every scene. Pure functions only: no clock, no Math.random,
// no DOM. A scene is a function of (size, time, settings), so any frame can
// be reproduced exactly for tests and contact sheets.

export const TAU = Math.PI * 2;
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const mod = (a, n) => ((a % n) + n) % n;
export const fract = (x) => x - Math.floor(x);
export function smoothstep(a, b, x) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}
export const easeInOut = (t) => {
  t = clamp01(t);
  return t * t * (3 - 2 * t);
};
export const easeOut = (t) => 1 - Math.pow(1 - clamp01(t), 3);
// Shortest signed angular difference b - a in (-PI, PI].
export function angleDiff(a, b) {
  return mod(b - a + Math.PI, TAU) - Math.PI;
}

// ---- deterministic randomness -------------------------------------------
export function hash32(a, b = 0, c = 0) {
  let n =
    Math.imul(a | 0, 374761393) ^
    Math.imul((b | 0) + 31, 668265263) ^
    Math.imul((c | 0) + 7, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
}
// Uniform [0, 1). hash01(entityIndex, channel) is the usual call.
export const hash01 = (a, b = 0, c = 0) => hash32(a, b, c) / 4294967296;
// Smooth 1-D value noise in [-1, 1] (C1 continuous).
export function noise1(x, seed = 0) {
  const i = Math.floor(x),
    f = x - i;
  const a = hash01(i, seed, 1) * 2 - 1,
    b = hash01(i + 1, seed, 1) * 2 - 1;
  return a + (b - a) * (f * f * (3 - 2 * f));
}
export function fbm1(x, seed = 0, octaves = 3) {
  let sum = 0,
    amp = 1,
    norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += amp * noise1(x * (1 << o), seed + o * 17);
    norm += amp;
    amp *= 0.5;
  }
  return sum / norm;
}

// ---- colour --------------------------------------------------------------
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgbToHex = (r, g, b) =>
  "#" +
  [r, g, b]
    .map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0"))
    .join("");
export function rgba(hex, a = 1) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
export function mixHex(a, b, t) {
  const pa = hexToRgb(a),
    pb = hexToRgb(b);
  return rgbToHex(
    pa[0] + (pb[0] - pa[0]) * t,
    pa[1] + (pb[1] - pa[1]) * t,
    pa[2] + (pb[2] - pa[2]) * t,
  );
}
// k < 1 darkens, k > 1 lightens (towards white), hue preserved.
export function shadeHex(hex, k) {
  const [r, g, b] = hexToRgb(hex);
  if (k <= 1) return rgbToHex(r * k, g * k, b * k);
  const u = Math.min(1, k - 1);
  return rgbToHex(r + (255 - r) * u, g + (255 - g) * u, b + (255 - b) * u);
}
export function hexToHsl(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    l = (max + min) / 2,
    d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  return [(h * 60 + 360) % 360, d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)), l];
}
export function hslToHex(h, s, l) {
  h = mod(h, 360);
  s = clamp01(s);
  l = clamp01(l);
  const c = (1 - Math.abs(2 * l - 1)) * s,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = l - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}
export function shiftHue(hex, deg, sMul = 1, lAdd = 0) {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h + deg, s * sMul, l + lAdd);
}

// A colour kit is the five hues a creature is painted with. Scenes only ever
// read kit.main / light / dark / accent / second, so every colour mode
// (natural, palette, mono, custom tint, individual) works for every scene.
//   main    body colour          light  highlights / belly / pale areas
//   dark    shadow / ink / veins accent contrasting detail (spots, eyes)
//   second  analogous secondary patch
export function makeKit(k) {
  const main = k.main;
  const [h, s, l] = hexToHsl(main);
  return Object.freeze({
    main,
    light: k.light || hslToHex(h, s * 0.75, clamp(l + 0.22, 0.55, 0.92)),
    dark: k.dark || hslToHex(h, Math.min(0.55, s * 0.7 + 0.08), 0.17),
    accent: k.accent || hslToHex(h + 150, clamp(s, 0.35, 0.8), 0.6),
    second:
      k.second || hslToHex(h + 38, s * 0.92, clamp(l + 0.07, 0.36, 0.74)),
  });
}
const kitMemo = new Map();
// Derive a whole kit from one picked hex colour (pure arithmetic, memoised).
export function kitFromHex(hex) {
  let kit = kitMemo.get(hex);
  if (!kit) {
    if (kitMemo.size > 512) kitMemo.clear();
    const [h, s, l] = hexToHsl(hex);
    kit = makeKit({ main: hslToHex(h, s, clamp(l, 0.3, 0.72)) });
    kitMemo.set(hex, kit);
  }
  return kit;
}

// ---- routes --------------------------------------------------------------
// Smooth, never-repeating-looking wander with analytic velocity. Returns
// pixels, px/s, heading (radians) and signed turn rate (rad/s) so a body can
// bend into its turns instead of just rotating rigidly.
//   o.rate  base angular rate (rad/s, ~0.12 is a calm roam)
//   o.ax/o.ay  amplitude as a fraction of width/height (0.38 / 0.34)
//   o.cx/o.cy  centre as a fraction (0.5)
export function roam(i, t, w, h, o = {}) {
  const rate = o.rate ?? 0.12,
    seed = o.seed ?? 0;
  const ax = (o.ax ?? 0.38) * w,
    ay = (o.ay ?? 0.34) * h;
  const cx = (o.cx ?? 0.5) * w,
    cy = (o.cy ?? 0.5) * h;
  const fr = (k) => rate * (0.75 + 0.5 * hash01(i, seed + k));
  const f1 = fr(1),
    f2 = fr(2) * 1.73,
    f3 = fr(3) * 0.91,
    f4 = fr(4) * 2.29;
  const p1 = hash01(i, seed + 51) * TAU,
    p2 = hash01(i, seed + 52) * TAU,
    p3 = hash01(i, seed + 53) * TAU,
    p4 = hash01(i, seed + 54) * TAU;
  const a1 = 0.64,
    a2 = 0.36;
  const s1 = Math.sin(f1 * t + p1),
    c1 = Math.cos(f1 * t + p1),
    s2 = Math.sin(f2 * t + p2),
    c2 = Math.cos(f2 * t + p2),
    s3 = Math.sin(f3 * t + p3),
    c3 = Math.cos(f3 * t + p3),
    s4 = Math.sin(f4 * t + p4),
    c4 = Math.cos(f4 * t + p4);
  const x = cx + ax * (a1 * s1 + a2 * s2),
    y = cy + ay * (a1 * s3 + a2 * s4);
  const vx = ax * (a1 * f1 * c1 + a2 * f2 * c2),
    vy = ay * (a1 * f3 * c3 + a2 * f4 * c4);
  const ddx = -ax * (a1 * f1 * f1 * s1 + a2 * f2 * f2 * s2),
    ddy = -ay * (a1 * f3 * f3 * s3 + a2 * f4 * f4 * s4);
  const sp2 = vx * vx + vy * vy + 1e-6;
  return {
    x,
    y,
    vx,
    vy,
    speed: Math.sqrt(sp2),
    heading: Math.atan2(vy, vx),
    turn: (vx * ddy - vy * ddx) / sp2,
  };
}

// ---- canvas helpers -----------------------------------------------------
// Run fn with the origin moved to (x, y), rotated, and scaled.
export function at(ctx, x, y, angle, sx, sy, fn) {
  if (typeof sy === "function") {
    fn = sy;
    sy = sx;
  }
  ctx.save();
  ctx.translate(x, y);
  if (angle) ctx.rotate(angle);
  if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
  fn();
  ctx.restore();
}
// Begin a closed polygon path through [[x, y], ...].
export function poly(ctx, pts) {
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++)
    i ? ctx.lineTo(pts[i][0], pts[i][1]) : ctx.moveTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}
// Begin a smooth curve through points (quadratic mid-point smoothing).
export function curve(ctx, pts, closed = false) {
  const n = pts.length;
  ctx.beginPath();
  if (n < 3) {
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    return;
  }
  if (closed) {
    const m0 = [(pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2];
    ctx.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) {
      const p = pts[i],
        q = pts[(i + 1) % n];
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    ctx.closePath();
  } else {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n - 1; i++) {
      const p = pts[i],
        q = pts[i + 1];
      ctx.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    ctx.lineTo(pts[n - 1][0], pts[n - 1][1]);
  }
}
// Outline polygon around a spine: half(s, i) is the half width at s in 0..1.
// Returns [[x, y], ...]; pass to poly()/curve() then fill.
export function ribbon(spine, half) {
  const n = spine.length,
    left = [],
    right = [];
  for (let i = 0; i < n; i++) {
    const a = spine[Math.max(0, i - 1)],
      b = spine[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0],
      dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const hw = half(i / (n - 1), i);
    left.push([spine[i][0] - dy * hw, spine[i][1] + dx * hw]);
    right.push([spine[i][0] + dy * hw, spine[i][1] - dx * hw]);
  }
  return left.concat(right.reverse());
}
export function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
}
// Soft radial glow: alpha a0 in the middle fading to 0 at radius r.
export function glow(ctx, x, y, r, hex, a0 = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(hex, a0));
  g.addColorStop(0.4, rgba(hex, a0 * 0.35));
  g.addColorStop(1, rgba(hex, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}
