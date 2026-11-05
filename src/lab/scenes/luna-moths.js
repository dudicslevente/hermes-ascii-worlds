// Luna moths: top view. Wave 2: wingspan 0.22-0.30 of S.min * S.size, wide forewings,
// longer twisting tails. Broad triangular forewings with a purple-brown leading
// edge, one eyespot per wing, hindwings drawn into long twisting tails that trail
// and sway with a phase lag, comb antennae, thick furry body. Soft wingbeats with
// long open-wing glides. Positions use S.t, every shape change uses S.b.
import { makeKit, TAU, clamp, lerp, smoothstep, mod, angleDiff, mixHex, shadeHex, rgba, noise1, roam, curve, ribbon, ellipse } from "../core/util.js";

const D2R = Math.PI / 180;
const HOME_X = [0.2, 0.8, 0.5, 0.18, 0.82, 0.5, 0.3, 0.7];
const HOME_Y = [0.3, 0.7, 0.5, 0.8, 0.2, 0.2, 0.6, 0.4];

// Forewing (wing units: hinge at origin, +x forward, +y outward, right wing). Broad, pointed apex.
const FORE = [
  [0.2, 0.04], [0.28, 0.3], [0.38, 0.62], [0.54, 0.98], [0.54, 0.98],
  [0.36, 0.96], [0.12, 0.88], [-0.14, 0.72], [-0.38, 0.5], [-0.5, 0.26], [-0.42, 0.08], [-0.2, 0.02],
];
const LEAD = [[0.2, 0.04], [0.28, 0.3], [0.38, 0.62], [0.52, 0.97]];
const VEIN_FORE = [[0.36, 0.88], [0.18, 0.84], [-0.02, 0.74], [-0.24, 0.56], [-0.36, 0.3]];
const VEIN_HIND = [[-0.5, 0.5], [-0.86, 0.62], [-0.9, 0.3]];
// Hindwing spine control points (broad lobe then a long tail) and half-widths.
const SPINE = [[-0.3, 0.1], [-0.56, 0.28], [-0.86, 0.42], [-1.2, 0.5], [-1.62, 0.5], [-2.05, 0.4]];
const HALF = [0.12, 0.3, 0.4, 0.2, 0.12, 0.17, 0.0];

function stroke(phi) {
  const psi = phi < 0.55 ? (0.5 * phi) / 0.55 : 0.5 + (0.5 * (phi - 0.55)) / 0.45;
  return 0.5 - 0.5 * Math.cos(TAU * psi);
}

function pos(i, t, w, h, S) {
  const k = S.min * (0.008 + 0.012 * S.flow);
  const H = (S.min * S.size * (0.22 + 0.08 * S.r(i, 3))) / 1.96;
  const radius = H * 2.5 + k * 1.4 + 5;
  const mx = Math.min(w * 0.46, radius + S.flow * 0.035 * w);
  const my = Math.min(h * 0.46, radius + S.flow * 0.025 * h);
  const cx = mx + (w - 2 * mx) * HOME_X[i % HOME_X.length];
  const cy = my + (h - 2 * my) * HOME_Y[i % HOME_Y.length];
  const ax = Math.max(0.005, Math.min(w * 0.2, cx - mx, w - mx - cx) / w);
  const ay = Math.max(0.005, Math.min(h * 0.15, cy - my, h - my - cy) / h);
  const r = roam(i, t, w, h, { rate: 0.15, ax, ay, cx: cx / w, cy: cy / h, seed: 19 });
  const x = r.x + k * (noise1(t * 0.5 + i * 4.3, 71 + i) + 0.4 * noise1(t * 1.2 + i * 2.7, 81 + i)) + S.flow * 0.035 * w * Math.sin(0.1 * t + 0.9);
  const y = r.y + k * (noise1(t * 0.45 + i * 3.1, 91 + i) + 0.4 * noise1(t * 1.1 + i * 1.9, 101 + i)) + S.flow * 0.025 * h * Math.sin(0.08 * t + 2.2);
  return [x, y];
}
function headingAt(i, t, w, h, S) {
  const a = pos(i, t - 0.15, w, h, S),
    b = pos(i, t + 0.15, w, h, S);
  return Math.atan2(b[1] - a[1], b[0] - a[0]);
}

// Hindwing with its tail as one ribbon; the tail sways with a phase lag and twists
// (its width swells and narrows as it turns edge-on), with a small outward flare.
function hindOutline(side, b, f, ph, E, turn, bank) {
  const n = SPINE.length;
  const sp = [];
  const hw = [];
  const M = 4;
  // resample the control spine into a smooth polyline
  for (let k = 0; k <= (n - 1) * M; k++) {
    const q = k / M,
      a = Math.min(n - 2, Math.floor(q)),
      f1 = q - a;
    const p0 = SPINE[Math.max(0, a - 1)],
      p1 = SPINE[a],
      p2 = SPINE[a + 1],
      p3 = SPINE[Math.min(n - 1, a + 2)];
    const c = (u, v, w2, x2) => 0.5 * (2 * v + (w2 - u) * f1 + (2 * u - 5 * v + 4 * w2 - x2) * f1 * f1 + (3 * v - u - 3 * w2 + x2) * f1 * f1 * f1);
    const s = k / ((n - 1) * M);
    const lagWave = Math.sin(TAU * (b * f * 0.8 - 1.1 * s) + ph + side * 0.9);
    const amp = 0.26 * Math.pow(s, 1.4) * (0.6 + 0.4 * E) + 0.11 * s * s + 0.07 * s * Math.sin(TAU * 0.8 * s + ph);
    const trail = -side * (turn * 0.12 + bank * 0.18) * Math.pow(s, 1.7);
    sp.push([c(p0[0], p1[0], p2[0], p3[0]) + 0.06 * s * lagWave, c(p0[1], p1[1], p2[1], p3[1]) + amp * lagWave + trail]);
    const hi = s * (HALF.length - 1),
      ha = Math.min(HALF.length - 2, Math.floor(hi));
    const tw = 1 - 0.42 * smoothstep(0.3, 0.65, s) * (0.5 - 0.5 * Math.cos(TAU * (1.3 * s - b * f * 0.5) + ph + side));
    hw.push(lerp(HALF[ha], HALF[ha + 1], smoothstep(0, 1, hi - ha)) * tw);
  }
  return ribbon(sp, (s, k) => hw[k]);
}

function paintWing(ctx, kit, c, fore, outline, H, band, lead) {
  curve(ctx, outline, true);
  ctx.fillStyle = fore ? c.gF : c.gH;
  ctx.fill();
  ctx.save();
  ctx.clip();
  if (fore) {
    // purple-brown leading-edge stripe
    curve(ctx, LEAD, false);
    ctx.lineWidth = lead * 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = rgba(mixHex(kit.dark, kit.light, 0.2), 0.97);
    ctx.stroke();
  }
  // pale veins
  const vs = fore ? VEIN_FORE : VEIN_HIND;
  ctx.beginPath();
  for (let k = 0; k < vs.length; k++) {
    ctx.moveTo(fore ? 0.05 : -0.05, 0.06);
    ctx.quadraticCurveTo(vs[k][0] * 0.55, vs[k][1] * 0.5 + 0.05, vs[k][0], vs[k][1]);
  }
  ctx.lineWidth = 2 / H;
  ctx.strokeStyle = rgba(kit.light, 0.62);
  ctx.stroke();
  // edge shading and a thin pink-brown margin
  curve(ctx, outline, true);
  ctx.lineWidth = band * 1.2;
  ctx.lineJoin = "round";
  ctx.strokeStyle = rgba(mixHex(kit.dark, kit.main, 0.35), 0.75);
  ctx.stroke();
  // eyespot: dark ring, accent ring, dark core, pale crescent
  const ex = fore ? -0.02 : -0.74,
    ey = fore ? 0.5 : 0.38,
    rx = fore ? 0.17 : 0.19,
    ry = fore ? 0.2 : 0.23;
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(fore ? 0.2 : -0.3);
  ctx.scale(rx, ry);
  const ring = [
    [1, kit.dark, 0.95],
    [0.74, kit.accent, 1],
    [0.46, kit.dark, 0.95],
  ];
  for (let k = 0; k < ring.length; k++) {
    ctx.fillStyle = rgba(ring[k][1], ring[k][2]);
    ctx.beginPath();
    ctx.arc(0, 0, ring[k][0], 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = rgba(kit.light, 0.95);
  ctx.beginPath();
  ctx.ellipse(-0.1, -0.12, 0.2, 0.13, -0.6, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

function paintMoth(ctx, w, h, S, i) {
  const kit = S.kit(i);
  const H = (S.min * S.size * (0.22 + 0.08 * S.r(i, 3))) / 1.96;
  const t0 = S.t - 0.4;
  const hA = headingAt(i, t0 - 0.2, w, h, S),
    hB = headingAt(i, t0 + 0.2, w, h, S);
  const dh = angleDiff(hA, hB);
  const heading = hA + dh / 2;
  const turn = dh / 0.4;
  const bank = clamp(turn * 0.4, -0.9, 0.9);
  const p = pos(i, S.t, w, h, S);

  // slower, softer wingbeats with long open-wing glides
  const b = S.b;
  const f = 1.5 + 0.4 * S.r(i, 2);
  const T = 5.5 + 2.5 * S.r(i, 5);
  const u = mod(b / T + 0.1 + 0.8 * S.r(i, 4), 1);
  const E = smoothstep(0, 0.14, u) * (1 - smoothstep(0.52, 0.66, u));
  const phi = mod(b * f + S.r(i, 6), 1);
  const wv = stroke(phi);
  const dphi = Math.sin(TAU * (phi < 0.55 ? (0.5 * phi) / 0.55 : 0.5 + (0.5 * (phi - 0.55)) / 0.45)) * E;
  const open = (10 + 4 * S.r(i, 7)) * D2R,
    top = (56 + 8 * S.r(i, 8)) * D2R;
  const glide = 14 * D2R + 0.07 * Math.sin(b * 1.4 + i * 1.7);
  const flap = lerp(glide, lerp(open, top, wv), E);
  const s0 = Math.cos(flap);
  const sR = s0 * (1 - 0.15 * bank),
    sL = s0 * (1 + 0.15 * bank);
  const kk = 0.22 * (1 - s0);
  const band = clamp(4 / H, 0.05, 0.14);
  const lead = clamp(10 / H, 0.1, 0.2);

  const mainLit = mixHex(kit.main, kit.light, 0.55),
    mainEdge = mixHex(kit.main, kit.dark, 0.25);
  const gF = ctx.createRadialGradient(0.02, 0, 0.03, 0.02, 0, 1.15);
  const gH = ctx.createRadialGradient(-0.05, 0, 0.03, -0.05, 0, 1.75);
  gF.addColorStop(0, mainLit);
  gF.addColorStop(0.3, kit.main);
  gF.addColorStop(0.75, shadeHex(kit.main, 0.82));
  gF.addColorStop(1, mainEdge);
  gH.addColorStop(0, mainLit);
  gH.addColorStop(0.25, kit.main);
  gH.addColorStop(0.6, shadeHex(kit.main, 0.85));
  gH.addColorStop(1, mainEdge);
  const c = { gF, gH };

  ctx.save();
  ctx.translate(p[0], p[1] + Math.sin(TAU * phi + 1) * E * 0.05 * H);
  ctx.rotate(heading);
  const bs = 1 + 0.03 * Math.sin(TAU * phi) * E;
  ctx.scale(bs, bs);
  for (let pass = 0; pass < 2; pass++) {
    for (let side = 1; side >= -1; side -= 2) {
      const sy = side > 0 ? sR : sL;
      ctx.save();
      ctx.transform(H, 0, kk * H, side * sy * H, 0, 0);
      if (pass === 1) {
        // forewing tips lag the stroke a little
        const tipLag = 0.13 * dphi;
        const pts = FORE.map((q) => [q[0], q[1] * (1 + tipLag * q[1] * q[1])]);
        paintWing(ctx, kit, c, true, pts, H, band, lead);
      } else {
        paintWing(ctx, kit, c, false, hindOutline(side, b, f, S.r(i, 9) * TAU, E, turn, bank), H, band, lead);
      }
      ctx.restore();
    }
  }
  // thick furry body
  ctx.save();
  ctx.scale(H, H);
  const fur = mixHex(kit.light, "#ffffff", 0.5),
    furShade = mixHex(kit.light, kit.main, 0.4);
  curve(ctx, [[0.0, 0.16], [-0.3, 0.18], [-0.7, 0.13], [-1.0, 0.03], [-1.0, -0.03], [-0.7, -0.13], [-0.3, -0.18], [0.0, -0.16]], true);
  ctx.fillStyle = furShade;
  ctx.fill();
  ctx.beginPath();
  for (let k = 1; k < 7; k++) {
    const x = -0.1 - k * 0.13,
      hw = 0.13 * (1 - k / 8);
    ctx.moveTo(x, hw);
    ctx.lineTo(x, -hw);
  }
  ctx.lineWidth = 1.2 / H;
  ctx.strokeStyle = rgba(kit.main, 0.55);
  ctx.stroke();
  ellipse(ctx, -0.45, 0, 0.4, 0.09);
  ctx.fillStyle = rgba(fur, 0.8);
  ctx.fill();
  ellipse(ctx, 0.16, 0, 0.27, 0.17);
  ctx.fillStyle = fur;
  ctx.fill();
  ellipse(ctx, 0.5, 0, 0.1, 0.09);
  ctx.fillStyle = fur;
  ctx.fill();
  // feathery comb antennae
  const ant = mixHex(kit.light, kit.main, 0.25);
  ctx.strokeStyle = rgba(ant, 0.95);
  ctx.lineWidth = 1.8 / H;
  ctx.lineCap = "round";
  for (let side = 1; side >= -1; side -= 2) {
    const sw = Math.sin(b * 1.6 + i * 2.1 + side * 0.9) * 0.05 + Math.sin(TAU * phi) * 0.02 * E - bank * 0.05;
    ctx.beginPath();
    const pts = [];
    for (let k = 0; k <= 8; k++) {
      const q = k / 8;
      const x = 0.56 + 0.5 * q,
        y = side * (0.06 + 0.3 * q * q) + sw * q * 1.5;
      pts.push([x, y]);
      k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    for (let k = 1; k < 9; k++) {
      const q = k / 8,
        len = 0.12 * (1 - 0.55 * q);
      const x = pts[k][0],
        y = pts[k][1];
      ctx.moveTo(x - 0.03, y - side * len);
      ctx.lineTo(x + 0.04, y + side * len * 0.6);
    }
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

export default {
  id: "luna-moths",
  name: "Luna moths",
  group: "wings",
  blurb: "Pale green moths with long curling tails drift in soft wingbeats and glides.",
  motion: "travel",
  count: { min: 0, max: 8, default: 1, noun: "Moth" },
  natural: [
    makeKit({ main: "#a9dc9c", light: "#f2f7da", dark: "#5a2a52", accent: "#f2c94c", second: "#d6edb0" }),
    makeKit({ main: "#9bdcc2", light: "#e8f8ef", dark: "#3d2a5c", accent: "#8fb0ff", second: "#c3ecd9" }),
    makeKit({ main: "#e2e79e", light: "#fffbe0", dark: "#6a3a30", accent: "#f08a3c", second: "#f1e5a6" }),
  ],
  flow: { label: "Breeze", help: "How strongly a gentle breeze pushes the moths about.", default: 1, min: 0, max: 1.5 },
  backdrop: { dark: "#0c130f", light: "#ecefe5" },
  draw(ctx, w, h, S) {
    for (let i = 0; i < S.count; i++) paintMoth(ctx, w, h, S, i);
  },
};
