// Owl: front view of a perched owl. Intentionally stationary; the body articulates
// (S.b): blinking, small head turns, subtle chest breathing. Shading by alpha (coverage).
import { makeKit, TAU, lerp, smoothstep, easeInOut, hash01, rgba, mixHex, shadeHex, curve, poly, ribbon, ellipse } from "../core/util.js";

const SLOT_L = [
  [],
  [[0.5, 0.55]],
  [[0.31, 0.5], [0.69, 0.6]],
  [[0.2, 0.6], [0.5, 0.47], [0.8, 0.62]],
];
const SLOT_P = [
  [],
  [[0.5, 0.55]],
  [[0.42, 0.27], [0.58, 0.74]],
  [[0.44, 0.18], [0.58, 0.5], [0.42, 0.83]],
];
const SHRINK = [1, 1, 0.78, 0.62];

function fit(n, w, h, S, perch) {
  const slots = (w >= h * 0.9 ? SLOT_L : SLOT_P)[n];
  const BW = perch ? 9.6 : 6.6, BH = 11.4;
  let u = (0.48 * S.min * S.size * SHRINK[n]) / 10.6;
  for (let i = 0; i < n; i++) {
    const [fx, fy] = slots[i], x = fx * w, y = fy * h;
    u = Math.min(u, Math.min(x, w - x) / (BW / 2 + 0.3), Math.min(y, h - y) / 5.9);
    for (let j = i + 1; j < n; j++) {
      const dx = Math.abs(x - slots[j][0] * w), dy = Math.abs(y - slots[j][1] * h);
      u = Math.min(u, Math.max(dx / BW, dy / BH) * 0.97);
    }
  }
  return { slots, u };
}

// A short event (dur s) once per cycle (period s), start jittered; s = seconds since start.
function ev(b, i, ch, period, dur) {
  const x = (b + hash01(i, ch) * period) / period, k = Math.floor(x);
  const start = (0.25 + 0.5 * hash01(i, ch + 1, k)) * (period - dur);
  const s = (x - k) * period - start;
  return { u: s >= 0 && s <= dur ? s / dur : -1, s, k };
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

function carve(ctx, fn) {
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  fn();
  ctx.restore();
}

function lidAt(s) {
  if (s < 0 || s > 0.24) return 0;
  const u = s / 0.24;
  return u < 0.42 ? easeInOut(u / 0.42) : easeInOut((1 - u) / 0.58);
}

function leaf(ctx, x, y, ang, len, kit) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = rgba(mixHex(kit.accent, kit.main, 0.35), 0.92);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -len * 0.32, len, 0);
  ctx.quadraticCurveTo(len * 0.5, len * 0.32, 0, 0);
  ctx.fill();
  carve(ctx, () => {
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.lineWidth = 0.05;
    ctx.beginPath();
    ctx.moveTo(len * 0.12, 0);
    ctx.lineTo(len * 0.86, 0);
    ctx.stroke();
  });
  ctx.restore();
}

function drawOwl(ctx, S, i, X, Y, u, perch) {
  const kit = S.kit(i), b = S.b;
  const a = TAU * (0.28 + 0.04 * hash01(i, 1)) * b + hash01(i, 2) * TAU;
  const v = Math.sin(a) + 0.12 * Math.sin(2 * a + 1.1);
  // head turn: ease out, hold, ease back
  const tv = ev(b, i, 32, 8 + 2 * hash01(i, 31), 3.6);
  const dir = hash01(i, 33, Math.max(0, tv.k)) < 0.5 ? -1 : 1;
  const turn = tv.u < 0 ? 0 : smoothstep(0, 0.25, tv.u) * (1 - smoothstep(0.7, 1, tv.u));
  // blink (about 0.24 s), sometimes a double blink
  const bv = ev(b, i, 42, 3.4 + 2 * hash01(i, 41), 0.24);
  const dbl = hash01(i, 44, Math.max(0, bv.k)) < 0.3;
  const lid = Math.max(lidAt(bv.s), dbl ? lidAt(bv.s - 0.36) : 0);
  const rim = shadeHex(kit.main, 0.55);

  ctx.save();
  ctx.translate(X, Y - 0.55 * u);
  ctx.scale(u, u);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // ---- perch (or a faint ground line) ----
  if (perch) {
    const spine = spline([[-4.7, 5.95], [-2.6, 5.68], [0, 5.6], [2.7, 5.72], [4.7, 5.4]], 6);
    ctx.fillStyle = rgba(mixHex(kit.dark, kit.main, 0.4), 1);
    poly(ctx, ribbon(spine, (s) => 0.34 - 0.08 * Math.abs(s - 0.5)));
    ctx.fill();
    ctx.strokeStyle = rgba(kit.light, 0.5);
    ctx.lineWidth = 0.08;
    ctx.beginPath();
    spine.forEach((p, j) => (j ? ctx.lineTo(p[0], p[1] - 0.14) : ctx.moveTo(p[0], p[1] - 0.14)));
    ctx.stroke();
    ctx.strokeStyle = rgba(mixHex(kit.dark, kit.main, 0.4), 1);
    ctx.lineWidth = 0.17;
    ctx.beginPath();
    ctx.moveTo(3.1, 5.66);
    ctx.quadraticCurveTo(3.9, 5.0, 4.5, 4.3);
    ctx.stroke();
    leaf(ctx, 3.95, 5.0, -0.5, 0.95, kit);
    leaf(ctx, 4.3, 4.55, -1.5, 0.85, kit);
    leaf(ctx, 3.55, 5.3, 0.25, 0.8, kit);
    leaf(ctx, -3.6, 5.78, -2.7, 0.8, kit);
  } else {
    ctx.fillStyle = rgba(kit.dark, 0.4);
    ellipse(ctx, 0, 5.62, 2.6, 0.22);
    ctx.fill();
  }

  // ---- body with chest breathing ----
  ctx.save();
  ctx.translate(0, 4.4);
  ctx.scale(1 + 0.014 * v, 1 + 0.024 * v);
  ctx.translate(0, -4.4);
  const bg = ctx.createRadialGradient(-0.9, -0.2, 0.2, 0, 1.2, 3.8);
  bg.addColorStop(0, rgba(kit.light, 0.95));
  bg.addColorStop(0.45, rgba(kit.main, 0.9));
  bg.addColorStop(0.85, rgba(shadeHex(kit.main, 0.72), 0.7));
  bg.addColorStop(1, rgba(kit.dark, 0.5));
  ctx.fillStyle = bg;
  ellipse(ctx, 0, 1.0, 2.75, 3.5);
  ctx.fill();
  // cream chest with scalloped feather chevrons
  ctx.fillStyle = rgba(kit.light, 0.5);
  ellipse(ctx, 0, 1.75, 1.85, 2.6);
  ctx.fill();
  ctx.strokeStyle = rgba(mixHex(kit.main, kit.dark, 0.45), 0.95);
  ctx.lineWidth = 0.14;
  for (let r = 0; r < 6; r++) {
    const y = 0.15 + 0.8 * r, hw = 1.95 * Math.sqrt(Math.max(0, 1 - Math.pow((y + 0.45 - 1.75) / 2.75, 2)));
    const cnt = Math.max(1, Math.floor(hw / 0.52));
    for (let k = 0; k < cnt; k++) {
      const x = (k - (cnt - 1) / 2) * 1.04 + (r % 2 ? 0.52 : 0);
      if (Math.abs(x) > hw - 0.25) continue;
      ctx.beginPath();
      ctx.moveTo(x - 0.5, y);
      ctx.quadraticCurveTo(x, y + 1.0, x + 0.5, y);
      ctx.stroke();
    }
  }
  // folded wings, long feather lines and bars
  for (const sg of [-1, 1]) {
    ctx.save();
    ctx.scale(sg, 1);
    const wg = ctx.createLinearGradient(-3.1, 1, -1.7, 1);
    wg.addColorStop(0, rgba(shadeHex(kit.main, 0.8), 1));
    wg.addColorStop(1, rgba(kit.main, 0.95));
    ctx.fillStyle = wg;
    curve(ctx, [[-2.5, -0.7], [-3.05, 0.9], [-3.0, 2.8], [-2.6, 4.2], [-2.0, 4.95], [-1.9, 3.6], [-1.75, 1.8], [-1.9, 0.2]], true);
    ctx.fill();
    ctx.strokeStyle = rgba(kit.light, 0.62);
    ctx.lineWidth = 0.09;
    for (let k = 0; k < 5; k++) {
      ctx.beginPath();
      ctx.moveTo(-2.75 + 0.2 * k, 0.4 + 0.3 * k);
      ctx.quadraticCurveTo(-2.95 + 0.2 * k, 2.4, -2.45 + 0.1 * k, 4.2 + 0.12 * k);
      ctx.stroke();
    }
    carve(ctx, () => {
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 0.1;
      for (let k = 0; k < 4; k++) {
        ctx.beginPath();
        ctx.moveTo(-2.9 + 0.12 * k, 1.1 + 0.85 * k);
        ctx.lineTo(-2.0, 1.25 + 0.85 * k);
        ctx.stroke();
      }
    });
    ctx.restore();
  }
  ctx.restore();

  // ---- feet gripping the perch ----
  ctx.strokeStyle = rgba(kit.second, 1);
  ctx.lineWidth = 0.26;
  for (const fx of [-1.0, 1.0])
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.moveTo(fx + 0.32 * k, 4.4);
      ctx.lineTo(fx + 0.44 * k, 5.3);
      ctx.stroke();
    }

  // ---- head: slides and rotates a little; the face moves slightly more ----
  const hx = dir * turn * 0.4, fx = dir * turn * 0.22;
  ctx.save();
  ctx.translate(hx, -0.05 * v);
  ctx.translate(0, -0.8);
  ctx.rotate(dir * turn * 0.07);
  ctx.translate(0, 0.8);
  // ear tufts
  for (const sg of [-1, 1]) {
    ctx.save();
    ctx.scale(sg, 1);
    const tg = ctx.createLinearGradient(2.5, -5.05, 1.8, -3.4);
    tg.addColorStop(0, rgba(shadeHex(kit.main, 0.75), 1));
    tg.addColorStop(1, rgba(kit.main, 1));
    ctx.fillStyle = tg;
    curve(ctx, [[1.0, -3.9], [1.8, -4.55], [2.5, -5.1], [2.65, -4.0], [2.6, -3.0]], true);
    ctx.fill();
    ctx.strokeStyle = rgba(kit.light, 0.6);
    ctx.lineWidth = 0.08;
    ctx.beginPath();
    ctx.moveTo(1.9, -3.7);
    ctx.lineTo(2.4, -4.7);
    ctx.stroke();
    ctx.restore();
  }
  const hg = ctx.createRadialGradient(-0.8, -3.0, 0.3, 0, -2.1, 3.2);
  hg.addColorStop(0, rgba(kit.light, 0.98));
  hg.addColorStop(0.6, rgba(kit.main, 0.95));
  hg.addColorStop(1, rgba(shadeHex(kit.main, 0.7), 0.88));
  ctx.fillStyle = hg;
  ellipse(ctx, 0, -2.1, 2.85, 2.15);
  ctx.fill();
  ctx.strokeStyle = rgba(rim, 0.9);
  ctx.lineWidth = 0.14;
  ctx.beginPath();
  ctx.ellipse(0, -2.1, 2.85, 2.15, 0, 0.25 * Math.PI, 0.75 * Math.PI);
  ctx.stroke();
  // face: heart-shaped disc of two lobes, rim, eyes, beak
  ctx.save();
  ctx.translate(fx, 0);
  ctx.fillStyle = rgba(kit.light, 0.66);
  ctx.beginPath();
  ctx.arc(1.12, -1.95, 1.55, 0, TAU);
  ctx.moveTo(-1.12 + 1.55, -1.95);
  ctx.arc(-1.12, -1.95, 1.55, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = rgba(rim, 1);
  ctx.lineWidth = 0.13;
  for (const sg of [-1, 1]) {
    ctx.beginPath();
    if (sg > 0) ctx.arc(1.12, -1.95, 1.55, -2.38, 2.38);
    else ctx.arc(-1.12, -1.95, 1.55, Math.PI - 2.38, Math.PI + 2.38);
    ctx.stroke();
  }
  for (const sg of [-1, 1]) {
    ctx.save();
    ctx.translate(sg * 1.1, -1.95);
    ctx.fillStyle = rgba(rim, 1);
    ctx.beginPath();
    ctx.arc(0, 0, 0.98, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(S.dark ? kit.accent : mixHex(kit.accent, kit.light, 0.6), 1);
    ctx.beginPath();
    ctx.arc(0, 0, 0.8, 0, TAU);
    ctx.fill();
    // A transparent pupil reads as a dark pupil only on a dark surface.
    // Light review needs actual dark pigment, not a pale hole in the face.
    const pupil = () => {
      ctx.fillStyle = rgba(shadeHex(kit.dark, 0.3), 1);
      ctx.beginPath();
      ctx.arc(0, 0, 0.4, 0, TAU);
      ctx.fill();
    };
    if (S.dark) carve(ctx, pupil);
    else pupil();
    ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.beginPath();
    ctx.arc(-0.22, -0.26, 0.15, 0, TAU);
    ctx.fill();
    if (lid > 0.02) {
      const ly = -1 + 1.98 * lid;
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, 1.0, 0, TAU);
      ctx.clip();
      carve(ctx, () => {
        ctx.fillStyle = "#000";
        ctx.fillRect(-1.1, -1.1, 2.2, ly + 1.1);
      });
      ctx.fillStyle = rgba(kit.light, 0.66);
      ctx.fillRect(-1.1, -1.1, 2.2, ly + 1.1);
      ctx.restore();
      ctx.strokeStyle = rgba(rim, 1);
      ctx.lineWidth = 0.15;
      ctx.beginPath();
      ctx.moveTo(-0.92, ly - 0.05);
      ctx.quadraticCurveTo(0, ly + 0.22, 0.92, ly - 0.05);
      ctx.stroke();
    }
    ctx.restore();
  }
  // beak
  ctx.translate(fx * 0.5, 0);
  ctx.fillStyle = rgba(kit.second, 1);
  ctx.beginPath();
  ctx.moveTo(-0.4, -1.8);
  ctx.quadraticCurveTo(-0.46, -1.1, 0.0, -0.55);
  ctx.quadraticCurveTo(0.46, -1.1, 0.4, -1.8);
  ctx.closePath();
  ctx.fill();
  if (!S.dark) {
    ctx.strokeStyle = rgba(rim, 1);
    ctx.lineWidth = 0.16;
    ctx.stroke();
  }
  ctx.strokeStyle = rgba(rim, 0.8);
  ctx.lineWidth = 0.07;
  ctx.beginPath();
  ctx.moveTo(0, -1.5);
  ctx.lineTo(0, -0.7);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  ctx.restore();
}

export default {
  id: "owl",
  name: "Owl",
  group: "quiet",
  blurb: "A perched owl blinks, turns its head a little and breathes.",
  motion: "stationary",
  count: { min: 0, max: 3, default: 1, noun: "Owl" },
  natural: [
    makeKit({ main: "#a9784a", light: "#f1dfbf", dark: "#4a2f1c", accent: "#4b3020", second: "#d9b27c" }),
    makeKit({ main: "#8c9096", light: "#d9dce0", dark: "#3a3d42", accent: "#e0b43a", second: "#c9b48a" }),
    makeKit({ main: "#9a6a3c", light: "#d8b27c", dark: "#3f2716", accent: "#e9a23a", second: "#c9a05a" }),
    makeKit({ main: "#e8e9ec", light: "#ffffff", dark: "#4b4f57", accent: "#f0c02a", second: "#8a8a90" }),
  ],
  extras: [{ key: "perch", type: "toggle", label: "Perch", default: true, help: "A minimal branch under the owl." }],
  supports: { speed: true, size: true },
  labels: { speed: "Pace", size: "Size" },
  backdrop: { dark: "#0f1214", light: "#eeeae0" },
  shading: "coverage",
  draw(ctx, w, h, S) {
    const n = Math.max(1, Math.min(3, S.count | 0));
    const perch = !S.extra || S.extra.perch === undefined ? true : !!S.extra.perch;
    const { slots, u } = fit(n, w, h, S, perch);
    for (let i = 0; i < n; i++) drawOwl(ctx, S, i, slots[i][0] * w, slots[i][1] * h, u, perch);
  },
};
