// Butterflies: top view, four-lobed patterned wings hinged at a slender body.
// Wave 2: wingspan 0.17-0.22 of S.min * S.size, clear fore/hind notch, wide dark margin band, larger pale dots.
// Wingbeat = the wing geometry is scaled across the body axis by cos(flap angle)
// (flap swings about 14..80 degrees: slower upstroke, quicker downstroke, flutter
// bursts separated by short open-wing glides), mirrored left/right, with a small
// shear toward the hinge. Positions use S.t, every shape change uses S.b.
import { makeKit, TAU, clamp, lerp, smoothstep, mod, angleDiff, mixHex, shadeHex, rgba, noise1, roam, curve, ellipse } from "../core/util.js";

const D2R = Math.PI / 180;
const HOME_X = [0.18, 0.82, 0.5, 0.22, 0.78, 0.5];
const HOME_Y = [0.28, 0.72, 0.32, 0.78, 0.22, 0.66];

// Wing outlines in wing units (hinge at the origin, +x forward, +y outward, right wing).
// Forewing: broad pointed lobe; hindwing: rounder lobe set back, with a clear notch between.
const FORE = [
  [0.08, 0.03], [0.3, 0.28], [0.5, 0.62], [0.64, 0.92], [0.5, 1.06],
  [0.26, 1.04], [0.04, 0.98], [-0.14, 0.84], [-0.2, 0.6], [-0.16, 0.3], [-0.1, 0.08],
];
const HIND = [
  [-0.1, 0.06], [-0.2, 0.3], [-0.34, 0.52], [-0.56, 0.72], [-0.8, 0.72],
  [-0.99, 0.56], [-1.02, 0.34], [-0.88, 0.14], [-0.6, 0.04],
];
const HIND_TAIL = [
  [-0.1, 0.06], [-0.2, 0.3], [-0.34, 0.52], [-0.56, 0.72], [-0.8, 0.7],
  [-1.0, 0.58], [-1.28, 0.46], [-1.46, 0.36], [-1.3, 0.28], [-1.04, 0.24], [-0.86, 0.12], [-0.6, 0.04],
];
const VEIN_FORE = [[0.5, 0.8], [0.34, 0.92], [0.12, 0.88], [-0.04, 0.74], [-0.12, 0.5]];
const VEIN_HIND = [[-0.4, 0.58], [-0.62, 0.64], [-0.84, 0.46], [-0.78, 0.22]];
const DOT_FORE = [[0.54, 0.86], [0.44, 0.96], [0.26, 0.95], [0.07, 0.89], [-0.06, 0.76], [-0.11, 0.56]];
const DOT_HIND = [[-0.5, 0.63], [-0.72, 0.62], [-0.9, 0.5], [-0.92, 0.34], [-0.8, 0.2]];

// Closure level 0 (wings open) .. 1 (raised). Slower upstroke, faster downstroke.
function stroke(phi) {
  const psi = phi < 0.6 ? (0.5 * phi) / 0.6 : 0.5 + (0.5 * (phi - 0.6)) / 0.4;
  return 0.5 - 0.5 * Math.cos(TAU * psi);
}

function pos(i, t, w, h, S) {
  const k = S.min * (0.016 + 0.014 * S.flow);
  const H = (S.min * S.size * (0.17 + 0.05 * S.r(i, 3))) / 2.1;
  const radius = H * 1.8 + k * 1.45 + 5;
  const mx = Math.min(w * 0.45, radius + S.flow * 0.03 * w);
  const my = Math.min(h * 0.45, radius + S.flow * 0.02 * h);
  const cx = mx + (w - 2 * mx) * HOME_X[i % HOME_X.length];
  const cy = my + (h - 2 * my) * HOME_Y[i % HOME_Y.length];
  const ax = Math.max(0.01, Math.min(w * 0.22, cx - mx, w - mx - cx) / w);
  const ay = Math.max(0.01, Math.min(h * 0.2, cy - my, h - my - cy) / h);
  const r = roam(i, t, w, h, { rate: 0.24, ax, ay, cx: cx / w, cy: cy / h, seed: 9 });
  const x = r.x + k * (noise1(t * 0.9 + i * 5.3, 31 + i) + 0.45 * noise1(t * 2.1 + i * 2.1, 41 + i)) + S.flow * 0.03 * w * Math.sin(0.13 * t + 1.7);
  const y = r.y + k * (noise1(t * 0.8 + i * 3.7, 51 + i) + 0.45 * noise1(t * 2.3 + i * 1.3, 61 + i)) + S.flow * 0.02 * h * Math.sin(0.09 * t + 0.4);
  return [x, y];
}
function headingAt(i, t, w, h, S) {
  const a = pos(i, t - 0.12, w, h, S),
    b = pos(i, t + 0.12, w, h, S);
  return Math.atan2(b[1] - a[1], b[0] - a[0]);
}

function paintWing(ctx, kit, c, fore, tail, H, band, dotR) {
  const pts = fore ? FORE : tail ? HIND_TAIL : HIND;
  curve(ctx, pts, true);
  ctx.fillStyle = fore ? c.gF : c.gH;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // bold contrasting patch with a pale eye
  const pc = fore ? [0.16, 0.56, 0.22, 0.2] : [-0.58, 0.38, 0.2, 0.18];
  ctx.save();
  ctx.translate(pc[0], pc[1]);
  ctx.scale(pc[2], pc[3]);
  ctx.fillStyle = c.patch;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = rgba(kit.light, 0.9);
  ctx.beginPath();
  ctx.arc(pc[0] + 0.02, pc[1], dotR * 0.95, 0, TAU);
  ctx.fill();
  // radiating veins (bright thin lines)
  const vs = fore ? VEIN_FORE : VEIN_HIND;
  ctx.beginPath();
  for (let k = 0; k < vs.length; k++) {
    ctx.moveTo(fore ? 0.05 : -0.05, 0.06);
    ctx.quadraticCurveTo(vs[k][0] * 0.55, vs[k][1] * 0.5 + 0.05, vs[k][0], vs[k][1]);
  }
  ctx.lineWidth = 2.2 / H;
  ctx.strokeStyle = rgba(kit.light, 0.7);
  ctx.stroke();
  // wide dark margin band (also separates the fore and hind lobes)
  curve(ctx, pts, true);
  ctx.lineWidth = band * 2;
  ctx.lineJoin = "round";
  ctx.strokeStyle = rgba(kit.dark, 0.95);
  ctx.stroke();
  // pale dots in the band
  const ds = fore ? DOT_FORE : DOT_HIND;
  ctx.fillStyle = rgba(kit.light, 0.97);
  ctx.beginPath();
  for (let k = 0; k < ds.length; k++) {
    ctx.moveTo(ds[k][0] + dotR, ds[k][1]);
    ctx.arc(ds[k][0], ds[k][1], dotR, 0, TAU);
  }
  ctx.fill();
  ctx.restore();
}

function paintButterfly(ctx, w, h, S, i) {
  const kit = S.kit(i);
  const tail = i % 5 === 2;
  const H = (S.min * S.size * (0.17 + 0.05 * S.r(i, 3))) / 2.1;
  const t0 = S.t - 0.32;
  const hA = headingAt(i, t0 - 0.15, w, h, S),
    hB = headingAt(i, t0 + 0.15, w, h, S);
  const dh = angleDiff(hA, hB);
  const heading = hA + dh / 2;
  const turn = dh / 0.3;
  const bank = clamp(turn * 0.35, -0.9, 0.9);
  const p = pos(i, S.t, w, h, S);

  // articulation clock: flutter bursts with short open-wing glides
  const b = S.b;
  const f = 2.5 + 0.7 * S.r(i, 2);
  const T = 3.2 + 1.8 * S.r(i, 5);
  const u = mod(b / T + 0.1 + 0.8 * S.r(i, 4), 1);
  const E = smoothstep(0, 0.1, u) * (1 - smoothstep(0.7, 0.8, u));
  const phi = mod(b * f + S.r(i, 6), 1);
  const wv = stroke(phi);
  const open = (14 + 4 * S.r(i, 7)) * D2R,
    top = (74 + 10 * S.r(i, 8)) * D2R;
  const glide = 24 * D2R + 0.09 * Math.sin(b * 2.6 + i * 1.7);
  const flap = lerp(glide, lerp(open, top, wv), E);
  const s0 = Math.cos(flap);
  const sR = s0 * (1 - 0.18 * bank),
    sL = s0 * (1 + 0.18 * bank);
  const kk = 0.3 * (1 - s0);
  const bob = Math.sin(TAU * phi) * E;
  const band = clamp(9 / H, 0.12, 0.26);
  const dotR = clamp(3.8 / H, 0.05, 0.09);

  // per-butterfly shared paint (gradients live in wing units); hindwings take a second tone
  const mainDark = shadeHex(kit.main, 0.62),
    mainMid = shadeHex(kit.main, 0.92),
    edge = mixHex(kit.main, kit.second, 0.55),
    hindMain = mixHex(kit.main, kit.second, 0.4);
  const gF = ctx.createRadialGradient(0.02, 0, 0.03, 0.02, 0, 1.1);
  const gH = ctx.createRadialGradient(-0.05, 0, 0.03, -0.05, 0, 1.0);
  gF.addColorStop(0, mainDark);
  gF.addColorStop(0.3, mainMid);
  gF.addColorStop(0.65, kit.main);
  gF.addColorStop(1, edge);
  gH.addColorStop(0, shadeHex(hindMain, 0.55));
  gH.addColorStop(0.3, shadeHex(hindMain, 0.85));
  gH.addColorStop(0.65, hindMain);
  gH.addColorStop(1, mixHex(hindMain, kit.light, 0.18));
  const patch = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  patch.addColorStop(0, rgba(kit.accent, 1));
  patch.addColorStop(0.6, rgba(kit.accent, 0.85));
  patch.addColorStop(1, rgba(kit.accent, 0));
  const c = { gF, gH, patch };

  ctx.save();
  ctx.translate(p[0], p[1] + Math.sin(TAU * phi + 1) * E * 0.06 * H);
  ctx.rotate(heading);
  const bs = 1 + 0.035 * bob;
  ctx.scale(bs, bs);
  // wings: hind pair first, then fore pair on top
  for (let pass = 0; pass < 2; pass++) {
    for (let side = 1; side >= -1; side -= 2) {
      ctx.save();
      ctx.transform(H, 0, kk * H, side * (side > 0 ? sR : sL) * H, 0, 0);
      paintWing(ctx, kit, c, pass === 1, tail, H, band, dotR);
      ctx.restore();
    }
  }
  // body: slender, segmented abdomen, thorax, head
  ctx.save();
  ctx.scale(H, H);
  const bodyCol = mixHex(kit.dark, kit.light, 0.7),
    bodyHi = mixHex(kit.light, "#ffffff", 0.3);
  curve(ctx, [[0.02, 0.085], [-0.3, 0.085], [-0.66, 0.06], [-0.98, 0], [-0.66, -0.06], [-0.3, -0.085], [0.02, -0.085]], true);
  ctx.fillStyle = bodyCol;
  ctx.fill();
  ctx.beginPath();
  for (let k = 1; k < 8; k++) {
    const x = -0.08 - k * 0.11,
      hw = 0.068 * (1 - k / 9);
    ctx.moveTo(x, hw);
    ctx.lineTo(x, -hw);
  }
  ctx.lineWidth = 1.2 / H;
  ctx.strokeStyle = rgba(kit.dark, 0.7);
  ctx.stroke();
  ellipse(ctx, 0.14, 0, 0.22, 0.115);
  ctx.fillStyle = bodyHi;
  ctx.fill();
  ellipse(ctx, 0.52, 0, 0.09, 0.085);
  ctx.fillStyle = bodyHi;
  ctx.fill();
  // clubbed antennae that sway
  const sw1 = Math.sin(b * 2.1 + i * 2.3) * 0.05 + Math.sin(TAU * phi) * 0.025 * E - bank * 0.05;
  const sw2 = Math.sin(b * 1.8 + i * 1.1 + 1.3) * 0.05 + Math.sin(TAU * phi + 0.4) * 0.025 * E - bank * 0.05;
  const ant = mixHex(kit.light, kit.main, 0.3);
  ctx.strokeStyle = rgba(ant, 0.95);
  ctx.fillStyle = rgba(ant, 0.95);
  ctx.lineWidth = 2 / H;
  ctx.lineCap = "round";
  for (let side = 1; side >= -1; side -= 2) {
    const sw = side > 0 ? sw1 : sw2;
    const tx = 1.04,
      ty = side * 0.32 + sw * 1.4;
    ctx.beginPath();
    ctx.moveTo(0.56, side * 0.03);
    ctx.quadraticCurveTo(0.84, side * 0.1 + sw, tx, ty);
    ctx.stroke();
    ellipse(ctx, tx, ty, 0.06, 0.045, side * 0.9);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

export default {
  id: "butterflies",
  name: "Butterflies",
  group: "wings",
  blurb: "Patterned four-lobed wings flutter and glide on wandering routes.",
  motion: "travel",
  count: { min: 0, max: 12, default: 2, noun: "Butterfly" },
  natural: [
    makeKit({ main: "#e9781f", light: "#fff0cf", dark: "#1b1007", accent: "#ffe9a8", second: "#c9531a" }),
    makeKit({ main: "#2f6fe0", light: "#c4e4ff", dark: "#0a1230", accent: "#5fe6ff", second: "#7a5cff" }),
    makeKit({ main: "#f3d23a", light: "#fff8c9", dark: "#17130a", accent: "#4f8dff", second: "#f0a020" }),
    makeKit({ main: "#f27ea0", light: "#fff4f6", dark: "#4a1e2c", accent: "#fffafc", second: "#f7b25a" }),
    makeKit({ main: "#9a63e8", light: "#e9d8ff", dark: "#1b0f33", accent: "#ffd45a", second: "#d16bd6" }),
  ],
  flow: { label: "Breeze", help: "How strongly a gentle breeze pushes the butterflies about.", default: 1, min: 0, max: 1.5 },
  backdrop: { dark: "#101512", light: "#eef0e6" },
  draw(ctx, w, h, S) {
    for (let i = 0; i < S.count; i++) paintButterfly(ctx, w, h, S, i);
  },
};
