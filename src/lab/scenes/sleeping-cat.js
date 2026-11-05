// Sleeping cat: a cat curled into a croissant ring, seen from above and a little in
// front. Intentionally stationary; only the body articulates (S.b): slow breathing,
// occasional ear flick, rare slow tail-tip sway. Shading is by alpha (coverage).
import { makeKit, TAU, lerp, smoothstep, hash01, rgba, shadeHex, curve, poly, ribbon, ellipse } from "../core/util.js";

// Loose placement slots as stage fractions; landscape and portrait variants.
const SLOT_L = [
  [],
  [[0.5, 0.56]],
  [[0.31, 0.47], [0.69, 0.64]],
  [[0.5, 0.31], [0.27, 0.68], [0.73, 0.65]],
  [[0.27, 0.33], [0.7, 0.29], [0.4, 0.72], [0.79, 0.68]],
];
const SLOT_P = [
  [],
  [[0.5, 0.56]],
  [[0.44, 0.31], [0.57, 0.69]],
  [[0.5, 0.2], [0.31, 0.52], [0.67, 0.81]],
  [[0.32, 0.22], [0.69, 0.4], [0.33, 0.62], [0.68, 0.8]],
];
const SHRINK = [1, 1, 0.8, 0.68, 0.6];
const BW = 2.1, BH = 1.75; // cat footprint in units of R

// One cat radius for all cats: shrinks with count, never overlaps, stays on stage.
function fit(n, w, h, S) {
  const slots = (w >= h * 0.9 ? SLOT_L : SLOT_P)[n];
  let R = 0.195 * S.min * S.size * SHRINK[n];
  for (let i = 0; i < n; i++) {
    const [fx, fy] = slots[i], x = fx * w, y = fy * h;
    R = Math.min(R, Math.min(x, w - x) / 1.12, Math.min(y, h - y) / 1.0);
    for (let j = i + 1; j < n; j++) {
      const dx = Math.abs(x - slots[j][0] * w), dy = Math.abs(y - slots[j][1] * h);
      R = Math.min(R, Math.max(dx / BW, dy / BH) * 0.97);
    }
  }
  return { slots, R };
}

// Event schedule: a short event (dur s) once per cycle (period s), start jittered.
function ev(b, i, ch, period, dur) {
  const x = (b + hash01(i, ch) * period) / period, k = Math.floor(x);
  const start = (0.3 + 0.4 * hash01(i, ch + 1, k)) * (period - dur);
  const u = ((x - k) * period - start) / dur;
  return { u: u >= 0 && u <= 1 ? u : -1, k };
}

function spline(P, per) {
  const out = [], n = P.length;
  for (let j = 0; j < n - 1; j++) {
    const p0 = P[Math.max(0, j - 1)], p1 = P[j], p2 = P[j + 1], p3 = P[Math.min(n - 1, j + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  out.push(P[n - 1]);
  return out;
}

function carve(ctx, fn, dark = true) {
  ctx.save();
  // Negative-space markings suit dark review; on light, draw pigment so
  // head/eye/stripe marks do not become pale gaps in pale fur.
  if (dark) ctx.globalCompositeOperation = "destination-out";
  fn();
  ctx.restore();
}

function drawEar(ctx, kit, b1, b2, tip, ang, inner) {
  const px = (b1[0] + b2[0]) / 2, py = (b1[1] + b2[1]) / 2;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(ang);
  ctx.translate(-px, -py);
  const g = ctx.createLinearGradient(tip[0], tip[1], px, py);
  g.addColorStop(0, rgba(kit.light, 1));
  g.addColorStop(1, rgba(kit.main, 1));
  ctx.fillStyle = g;
  curve(ctx, [b1, [lerp(b1[0], tip[0], 0.55), lerp(b1[1], tip[1], 0.6)], tip, [lerp(b2[0], tip[0], 0.55), lerp(b2[1], tip[1], 0.6)], b2], true);
  ctx.fill();
  if (inner) {
    const m = (a, c, t) => [lerp(a[0], c[0], t), lerp(a[1], c[1], t)];
    ctx.fillStyle = rgba(kit.accent, 0.8);
    poly(ctx, [m(b1, tip, 0.22), m(b2, tip, 0.22), m([px, py], tip, 0.72)]);
    ctx.fill();
  } else {
    ctx.strokeStyle = rgba(kit.dark, 0.5);
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    ctx.moveTo(lerp(px, tip[0], 0.2), lerp(py, tip[1], 0.2));
    ctx.lineTo(lerp(px, tip[0], 0.7), lerp(py, tip[1], 0.7));
    ctx.stroke();
  }
  ctx.restore();
}

function drawCat(ctx, S, i, X, Y, R) {
  const kit = S.kit(i), b = S.b;
  const sgn = i % 2 ? -1 : 1;
  const stripe = [1, 0.9, 0.35, 0.55][i % 4];
  const a = TAU * (0.23 + 0.05 * hash01(i, 1)) * b + hash01(i, 2) * TAU;
  const v = Math.sin(a) + 0.16 * Math.sin(2 * a + 0.9);
  const ef = ev(b, i, 10, 8.5 + 3 * hash01(i, 4), 0.5);
  const tf = ev(b, i, 14, 15 + 5 * hash01(i, 5), 3.4);
  const sEar = ef.u < 0 ? 0 : Math.sin(Math.PI * ef.u);
  const earAng = ef.u < 0 ? 0 : 0.3 * sEar + 0.08 * Math.sin(TAU * 3 * ef.u) * sEar;
  const earSide = hash01(i, 21, Math.max(0, ef.k)) < 0.5 ? 0 : 1;
  const sway = (tf.u < 0 ? 0 : 0.5 * Math.pow(Math.sin(Math.PI * tf.u), 2) * Math.sin(TAU * 1.05 * tf.u)) + 0.05 * Math.sin(a * 0.5 + 1);

  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(sgn * R, R);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // ---- tail: wraps around the front, tip sways ----
  const P = [[0.8, 0.02], [0.92, 0.3], [0.78, 0.58], [0.48, 0.76], [0.12, 0.82], [-0.14, 0.74]].map((p, j, arr) => {
    const k = smoothstep(0.4, 1, j / (arr.length - 1)) * sway;
    const c = Math.cos(k), s = Math.sin(k), px = arr[2][0], py = arr[2][1];
    return j < 3 ? p : [px + (p[0] - px) * c - (p[1] - py) * s, py + (p[0] - px) * s + (p[1] - py) * c];
  });
  const spine = spline(P, 6);
  const tailPoly = ribbon(spine, (s) => lerp(0.125, 0.045, Math.pow(s, 0.85)) * (s > 0.94 ? Math.sqrt(Math.max(0, (1 - s) / 0.06)) * 0.6 + 0.4 : 1));
  const tg = ctx.createLinearGradient(0.9, 0.1, -0.1, 0.85);
  tg.addColorStop(0, rgba(kit.main, 0.95));
  tg.addColorStop(1, rgba(shadeHex(kit.main, 0.8), 0.8));
  ctx.fillStyle = tg;
  poly(ctx, tailPoly);
  ctx.fill();
  const n = spine.length;
  carve(ctx, () => {
    ctx.strokeStyle = "rgba(0,0,0," + 0.62 * stripe + ")";
    ctx.lineWidth = 0.034;
    for (const f of [0.22, 0.38, 0.54, 0.7]) {
      const j = Math.floor(f * (n - 1)), p0 = spine[j], p1 = spine[j + 1];
      const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy) || 1;
      const hw = lerp(0.125, 0.045, Math.pow(f, 0.85)) * 0.9;
      ctx.beginPath();
      ctx.moveTo(p0[0] - (dy / l) * hw, p0[1] + (dx / l) * hw);
      ctx.lineTo(p0[0] + (dy / l) * hw, p0[1] - (dx / l) * hw);
      ctx.stroke();
    }
  }, S.dark);
  ctx.strokeStyle = rgba(kit.light, 0.55);
  ctx.lineWidth = 0.028;
  ctx.beginPath();
  for (let j = 2; j < n - 4; j++) {
    const p = spine[j], q = spine[j + 1], l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
    const nx = (q[1] - p[1]) / l, ny = -(q[0] - p[0]) / l;
    if (j === 2) ctx.moveTo(p[0] + nx * 0.05, p[1] + ny * 0.05);
    else ctx.lineTo(p[0] + nx * 0.05, p[1] + ny * 0.05);
  }
  ctx.stroke();
  // dark tip
  ctx.strokeStyle = rgba(kit.dark, 0.85);
  ctx.lineWidth = 0.075;
  ctx.beginPath();
  for (let j = n - 6; j < n; j++) {
    if (j === n - 6) ctx.moveTo(spine[j][0], spine[j][1]);
    else ctx.lineTo(spine[j][0], spine[j][1]);
  }
  ctx.stroke();

  // ---- body: breathing swell about a low pivot ----
  ctx.save();
  ctx.translate(0.12, 0.12);
  ctx.scale(1 + 0.03 * v, 1 + 0.055 * v);
  ctx.translate(-0.12, -0.12 - 0.01 * v);
  ctx.translate(0.12, -0.05);
  ctx.rotate(-0.12);
  const bg = ctx.createRadialGradient(-0.25, -0.34, 0.04, 0, 0.02, 0.98);
  bg.addColorStop(0, rgba(kit.light, 0.98));
  bg.addColorStop(0.4, rgba(kit.main, 0.9));
  bg.addColorStop(0.8, rgba(shadeHex(kit.main, 0.7), 0.66));
  bg.addColorStop(1, rgba(kit.dark, 0.48));
  ctx.fillStyle = bg;
  ellipse(ctx, 0, 0, 0.88, 0.66, 0);
  ctx.fill();
  // haunch: bright upper rim of the tucked hind leg, shade below it
  const hg = ctx.createRadialGradient(0.18, 0.02, 0.02, 0.3, 0.14, 0.42);
  hg.addColorStop(0, rgba(kit.light, 0.4));
  hg.addColorStop(1, rgba(kit.dark, 0.0));
  ctx.fillStyle = hg;
  ellipse(ctx, 0.3, 0.12, 0.42, 0.36, 0);
  ctx.fill();
  ctx.strokeStyle = rgba(kit.light, 0.75);
  ctx.lineWidth = 0.04;
  ctx.beginPath();
  ctx.ellipse(0.3, 0.12, 0.42, 0.36, 0, Math.PI * 0.95, Math.PI * 1.75);
  ctx.stroke();
  // spine ridge highlight
  ctx.strokeStyle = rgba(kit.light, 0.5);
  ctx.lineWidth = 0.06;
  ctx.beginPath();
  ctx.ellipse(0, 0, 0.7, 0.5, 0, -2.85, -0.5);
  ctx.stroke();
  // tabby stripes across the back (carved gaps) and fur ticks on the rim
  carve(ctx, () => {
    ctx.strokeStyle = "rgba(0,0,0," + 0.68 * stripe + ")";
    ctx.lineWidth = 0.055;
    for (let k = 0; k < 11; k++) {
      const th = lerp(-2.75, 0.25, k / 10) + (hash01(i, 40 + k) - 0.5) * 0.12;
      const c = Math.cos(th), s = Math.sin(th), r1 = 0.52 + 0.16 * hash01(i, 60 + k);
      ctx.beginPath();
      ctx.moveTo(0.88 * c * 0.96, 0.66 * s * 0.96);
      ctx.quadraticCurveTo(0.88 * c * 0.8 + s * 0.05, 0.66 * s * 0.8 - c * 0.05, 0.88 * c * r1, 0.66 * s * r1);
      ctx.stroke();
    }
  }, S.dark);
  ctx.strokeStyle = rgba(kit.light, 0.6);
  ctx.lineWidth = 0.022;
  for (let k = 0; k < 13; k++) {
    const th = lerp(-3.0, 0.5, k / 12) + (hash01(i, 80 + k) - 0.5) * 0.1;
    const c = Math.cos(th), s = Math.sin(th);
    ctx.beginPath();
    ctx.moveTo(0.88 * c * 0.97, 0.66 * s * 0.97);
    ctx.lineTo(0.88 * c * 0.8, 0.66 * s * 0.8);
    ctx.stroke();
  }
  ctx.restore();

  // ---- head resting on the paws, rides the chest a little ----
  ctx.save();
  ctx.translate(-0.5, 0.5);
  ctx.rotate(0.012 * v);
  ctx.translate(0.5, -0.5 - 0.016 * v);
  // paws under the chin
  ctx.fillStyle = rgba(kit.second, 1);
  ellipse(ctx, -0.7, 0.56, 0.13, 0.075, 0.2);
  ctx.fill();
  ellipse(ctx, -0.3, 0.58, 0.13, 0.075, -0.2);
  ctx.fill();
  // ears: left slightly turned away, right shows its inner tint
  drawEar(ctx, kit, [-0.84, 0.08], [-0.6, -0.12], [-0.86, -0.34], earSide === 0 ? -earAng : 0, false);
  drawEar(ctx, kit, [-0.4, -0.12], [-0.16, 0.06], [-0.16, -0.34], earSide === 1 ? earAng : 0, true);
  const hgrad = ctx.createRadialGradient(-0.62, 0.1, 0.02, -0.5, 0.28, 0.5);
  hgrad.addColorStop(0, rgba(kit.light, 1));
  hgrad.addColorStop(0.55, rgba(kit.main, 0.95));
  hgrad.addColorStop(1, rgba(shadeHex(kit.main, 0.7), 0.8));
  ctx.fillStyle = hgrad;
  curve(ctx, [[-0.87, 0.22], [-0.79, 0.04], [-0.5, -0.08], [-0.21, 0.04], [-0.13, 0.23], [-0.24, 0.46], [-0.5, 0.55], [-0.76, 0.46]], true);
  ctx.fill();
  // A sampled negative-space seam separates the tucked head from the back.
  // Thin pigment-only outlines disappear under maximum-coverage sampling.
  carve(ctx, () => {
    ctx.strokeStyle = "rgba(0,0,0,0.92)";
    ctx.lineWidth = 0.06;
    ctx.stroke();
  }, S.dark);
  // muzzle, nose, mouth
  ctx.fillStyle = rgba(kit.second, 0.95);
  ellipse(ctx, -0.5, 0.39, 0.13, 0.085, 0);
  ctx.fill();
  ctx.fillStyle = rgba(kit.dark, 1);
  poly(ctx, [[-0.55, 0.335], [-0.45, 0.335], [-0.5, 0.375]]);
  ctx.fill();
  // closed eyes (curved lines) and forehead stripes as carved gaps
  carve(ctx, () => {
    ctx.strokeStyle = "rgba(0,0,0,0.95)";
    ctx.lineWidth = 0.065;
    for (const ex of [-0.65, -0.35]) {
      ctx.beginPath();
      ctx.moveTo(ex - 0.09, 0.215);
      ctx.quadraticCurveTo(ex, 0.29, ex + 0.09, 0.215);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(0,0,0," + 0.6 * stripe + ")";
    ctx.lineWidth = 0.03;
    for (const dx of [-0.58, -0.5, -0.42]) {
      ctx.beginPath();
      ctx.moveTo(dx, 0.0);
      ctx.lineTo(dx, 0.1);
      ctx.stroke();
    }
  }, S.dark);
  ctx.strokeStyle = rgba(kit.dark, 0.7);
  ctx.lineWidth = 0.022;
  ctx.beginPath();
  ctx.moveTo(-0.5, 0.375);
  ctx.lineTo(-0.5, 0.41);
  ctx.moveTo(-0.55, 0.435);
  ctx.quadraticCurveTo(-0.5, 0.41, -0.45, 0.435);
  ctx.stroke();
  // whiskers (sparse)
  ctx.strokeStyle = rgba(kit.light, 0.55);
  ctx.lineWidth = 0.012;
  ctx.beginPath();
  for (const s of [-1, 1])
    for (const dy of [0, 0.05]) {
      ctx.moveTo(-0.5 + s * 0.12, 0.4 + dy * 0.4);
      ctx.lineTo(-0.5 + s * 0.3, 0.4 + dy);
    }
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

export default {
  id: "sleeping-cat",
  name: "Sleeping cat",
  group: "quiet",
  blurb: "A cat curled up asleep: slow breathing, an ear flick, a tail tip that sways.",
  motion: "stationary",
  count: { min: 0, max: 4, default: 1, noun: "Cat" },
  natural: [
    makeKit({ main: "#d98a3d", light: "#f4c987", dark: "#8a4a1c", accent: "#e8949b", second: "#f3dcb4" }),
    makeKit({ main: "#8a8f99", light: "#cdd1d8", dark: "#3b3f48", accent: "#d9a3a8", second: "#e8e3da" }),
    makeKit({ main: "#38332f", light: "#9a9088", dark: "#14110f", accent: "#c78890", second: "#d6cdc0" }),
    makeKit({ main: "#e6d6bc", light: "#fff8ec", dark: "#b49a78", accent: "#e8a9a6", second: "#f8f1e4" }),
  ],
  supports: { speed: true, size: true },
  labels: { speed: "Pace", size: "Size" },
  backdrop: { dark: "#15110e", light: "#efe9df" },
  shading: "coverage",
  draw(ctx, w, h, S) {
    const n = Math.max(1, Math.min(4, S.count | 0));
    const { slots, R } = fit(n, w, h, S);
    for (let i = 0; i < n; i++) drawCat(ctx, S, i, slots[i][0] * w, slots[i][1] * h - 0.08 * R, R);
  },
};
