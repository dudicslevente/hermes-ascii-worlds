import { makeKit, TAU, lerp, mod, fract, clamp01, mixHex, rgba, hash01 } from "../core/util.js";

// Cherry blossom petals: cupped obovate petals (narrow pointed base, broad
// rounded top with a V notch at the tip). Each petal is a thin 3D sheet rotated
// in 3D and projected, so it turns between a full petal, a narrow sliver and its
// other face. Fall, wind and the periodic BREEZE act on S.t / S.flow; the
// flutter is on S.b. The breeze is one shared envelope for all petals, so a
// sweep and a burst of faster tumbling visibly belong together.
// Wave 2: petals are 0.07-0.10 of S.min x size long, painted as solid pale pink
// or cream shapes with a deeper flush at the base; the spin lingers face-on and
// flips quickly through edge-on so petals stay readable.

const WIND = [
  [TAU / 19.0, 0.5, 1.1],
  [TAU / 11.3, 0.3, 3.3],
  [TAU / 6.7, 0.16, 0.4],
];
const WIND_MEAN = 0.15;
function windDisp(ta, tb) {
  let d = WIND_MEAN * (tb - ta);
  for (let k = 0; k < WIND.length; k++) {
    const w = WIND[k][0],
      a = WIND[k][1],
      p = WIND[k][2];
    d += (a / w) * (Math.cos(w * ta + p) - Math.cos(w * tb + p));
  }
  return d;
}

// Breeze k starts at bT(k) (gaps 18..26 s), lasts bD(k) = 5..7.5 s.
const bT = (k) => 22 * k + 6 + (hash01(k, 91, 3) - 0.5) * 4;
const bD = (k) => 5 + 2.5 * hash01(k, 92, 3);
const bS = (k) => (hash01(k, 93, 3) < 0.25 ? -0.6 : 1) * (0.75 + 0.5 * hash01(k, 94, 3));
const bump = (x) => (x <= 0 || x >= 1 ? 0 : 0.5 - 0.5 * Math.cos(TAU * x));
const bumpInt = (x) => (x <= 0 ? 0 : x >= 1 ? 0.5 : 0.5 * (x - Math.sin(TAU * x) / TAU));
// Smooth 0..1 envelope, identical for every petal.
function breezeEnv(t) {
  const k0 = Math.floor((t - 6) / 22);
  let e = 0;
  for (let k = k0 - 1; k <= k0 + 1; k++) e += bump((t - bT(k)) / bD(k));
  return e;
}
// Signed sideways displacement (units of peak speed * seconds) between ta and tb.
function breezeDisp(ta, tb) {
  let d = 0;
  const k0 = Math.floor((ta - 6) / 22) - 1,
    k1 = Math.floor((tb - 6) / 22) + 1;
  for (let k = k0; k <= k1; k++) {
    const T = bT(k),
      D = bD(k);
    d += bS(k) * D * (bumpInt((tb - T) / D) - bumpInt((ta - T) / D));
  }
  return d;
}

// Petal outline, right half: [u, s] with s = 0 at the pointed base, 1 at the lobe top.
// The tip is cut by a clear V notch about a fifth of the petal long.
const HALF = [
  [0.0, 0.0], [0.045, 0.08], [0.12, 0.24], [0.23, 0.46], [0.325, 0.66],
  [0.368, 0.8], [0.34, 0.92], [0.24, 0.99], [0.125, 0.945], [0.0, 0.78],
];
const LIGHT = [-0.45, -0.5, 0.74];

function rotation(alpha, beta, psi) {
  const ca = Math.cos(alpha),
    sa = Math.sin(alpha),
    cb = Math.cos(beta),
    sb = Math.sin(beta),
    cp = Math.cos(psi),
    sp = Math.sin(psi);
  const r0 = [ca, 0, sa],
    r1 = [sa * sb, cb, -sb * ca],
    r2 = [-sa * cb, sb, ca * cb];
  return [
    cp * r0[0] - sp * r1[0], cp * r0[1] - sp * r1[1], cp * r0[2] - sp * r1[2],
    sp * r0[0] + cp * r1[0], sp * r0[1] + cp * r1[1], sp * r0[2] + cp * r1[2],
    r2[0], r2[1], r2[2],
  ];
}

// Petals are translucent: the shadow side tints towards the pink accent, never to black.
function shade(kit, base, f) {
  return f < 0.8
    ? mixHex(mixHex(kit.accent, kit.dark, 0.3), base, 0.45 + 0.55 * (f / 0.8))
    : mixHex(base, kit.light, Math.min(0.62, ((f - 0.8) / 0.2) * 0.5));
}

function drawPetal(ctx, kit, cx, cy, L, M, fold, cup, curl) {
  const proj = (u, y, z) => [
    cx + L * (M[0] * u + M[1] * y + M[2] * z),
    cy + L * (M[3] * u + M[4] * y + M[5] * z),
  ];
  const zOf = (u, s) => fold * Math.abs(u) + cup * (u * u) * 7.5 + curl * (2 * s - 1) * (2 * s - 1);
  const base = proj(0, 0.5, 0);
  const top = proj(0, -0.5, zOf(0, 1));
  const axisLen = Math.hypot(top[0] - base[0], top[1] - base[1]);
  const halves = [];
  for (let sgn = -1; sgn <= 1; sgn += 2) {
    const nx = -sgn * fold,
      nn = Math.hypot(nx, 1);
    const vx = (M[0] * nx + M[2]) / nn,
      vy = (M[3] * nx + M[5]) / nn,
      vz = (M[6] * nx + M[8]) / nn;
    const sg = vz < 0 ? -1 : 1;
    const dif = sg * (vx * LIGHT[0] + vy * LIGHT[1] + vz * LIGHT[2]);
    const f = 0.72 + 0.32 * clamp01(dif / 0.92); // bright floor: petals stay solid
    const pts = [];
    for (let k = 0; k < HALF.length; k++) {
      const u = sgn * HALF[k][0],
        s = HALF[k][1];
      pts.push(proj(u, 0.5 - s, zOf(u, s)));
    }
    halves.push({ pts, f, back: sg < 0 });
  }
  for (const H of halves) {
    const tint = H.back ? mixHex(kit.main, kit.second, 0.5) : kit.main;
    if (axisLen > 0.8) {
      const g = ctx.createLinearGradient(base[0], base[1], top[0], top[1]);
      g.addColorStop(0, shade(kit, mixHex(kit.accent, kit.main, 0.3), H.f)); // deeper flush at the base
      g.addColorStop(0.3, shade(kit, mixHex(tint, kit.accent, 0.16), H.f));
      g.addColorStop(0.7, shade(kit, mixHex(tint, kit.light, 0.2), H.f));
      g.addColorStop(1, shade(kit, mixHex(tint, kit.light, 0.7), H.f));
      ctx.fillStyle = g;
    } else ctx.fillStyle = shade(kit, mixHex(tint, kit.light, 0.2), H.f);
    ctx.beginPath();
    for (let k = 0; k < H.pts.length; k++)
      k ? ctx.lineTo(H.pts[k][0], H.pts[k][1]) : ctx.moveTo(H.pts[k][0], H.pts[k][1]);
    ctx.closePath();
    ctx.fill();
  }
  const fa = (halves[0].f + halves[1].f) / 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // Pale rim keeps the outline and the tip notch crisp; a short vein near the base.
  ctx.strokeStyle = rgba(shade(kit, mixHex(kit.light, kit.main, 0.35), fa), 0.7);
  ctx.lineWidth = Math.max(1, L * 0.03);
  for (const H of halves) {
    ctx.beginPath();
    for (let k = 0; k < H.pts.length; k++)
      k ? ctx.lineTo(H.pts[k][0], H.pts[k][1]) : ctx.moveTo(H.pts[k][0], H.pts[k][1]);
    ctx.closePath();
    ctx.stroke();
  }
  const v0 = proj(0, 0.47, zOf(0, 0.03)),
    v1 = proj(0, 0.5 - 0.5, zOf(0, 0.5));
  ctx.strokeStyle = rgba(shade(kit, mixHex(kit.accent, kit.main, 0.35), fa), 0.55);
  ctx.lineWidth = Math.max(0.9, L * 0.028);
  ctx.beginPath();
  ctx.moveTo(v0[0], v0[1]);
  ctx.lineTo(v1[0], v1[1]);
  ctx.stroke();
}

export default {
  id: "cherry-blossom-petals",
  name: "Cherry blossom petals",
  group: "drift",
  blurb: "Pale petals flutter and spin down, swept sideways by a passing breeze.",
  motion: "travel",
  count: { min: 0, max: 80, default: 18, noun: "Petal" },
  natural: [
    makeKit({ main: "#f4aec5", light: "#fcd3e0", dark: "#b2607c", accent: "#e8809f", second: "#f8c4d5" }),
    makeKit({ main: "#f9d3df", light: "#fee9f0", dark: "#c47c96", accent: "#ee9fb7", second: "#fcdfe8" }),
    makeKit({ main: "#e88db0", light: "#f8c4d7", dark: "#a2426a", accent: "#d6618a", second: "#f0a6c1" }),
    makeKit({ main: "#f3d9bd", light: "#fdeedb", dark: "#bf8f6e", accent: "#ebb5a0", second: "#f7d3c0" }),
  ],
  flow: { label: "Breeze", help: "How strongly the wind and passing breezes push the petals.", default: 1, min: 0, max: 1.5 },
  extras: [
    { key: "flutter", type: "range", label: "Flutter", min: 0, max: 1.5, step: 0.05, default: 1, help: "How far each petal turns and flips as it falls." },
  ],
  backdrop: { dark: "#14100f", light: "#f2ece8" },
  draw(ctx, w, h, S) {
    const n = S.count;
    const flt = S.extra && typeof S.extra.flutter === "number" ? S.extra.flutter : 1;
    const flow = typeof S.flow === "number" ? S.flow : 1;
    const sz = S.min * S.size;
    const m = sz * 0.14;
    const Hh = h + 2 * m,
      Ww = w + 2 * m;
    const env = breezeEnv(S.b) * Math.min(1, flow); // flutter boost on the articulation clock
    const order = [];
    for (let i = 0; i < n; i++) order.push(i);
    order.sort((a, b) => hash01(a, 1) - hash01(b, 1));
    for (let o = 0; o < n; o++) {
      const i = order[o];
      const d = hash01(i, 1);
      const D = S.depthOf ? S.depthOf(i) : null,
        dc = (D && S.layer(D.layer)) || ctx;
      const L = sz * lerp(0.07, 0.1, d) * (D ? D.scale : 1); // petal length 0.07-0.10 of min x size
      const v = S.min * lerp(0.028, 0.046, clamp01(0.5 * d + 0.5 * hash01(i, 2))) * (D ? D.pace : 1);
      const p = fract(0.5 + i * 0.5698402909980532) + (S.t * v) / Hh;
      const cyc = Math.floor(p),
        q = p - cyc;
      const age = (q * Hh) / v,
        ts = S.t - age;
      const xs = fract(0.21 + i * 0.7548776662466927 + cyc * 0.6180339887) * Ww - m;
      const lite = lerp(0.8, 1.4, hash01(i, 12));
      const Uw = S.min * 0.05 * flow * lite;
      const Ub = S.min * 0.13 * flow * lite;
      const tau = hash01(i, 13) * 1.5;
      const dxw = Uw * windDisp(ts - tau, S.t - tau) + Ub * breezeDisp(ts, S.t);
      const dxg = (hash01(i, 3) - 0.5) * S.min * 0.012 * age;
      const wsw = TAU / lerp(1.9, 3.3, hash01(i, 4));
      const phi = hash01(i, 6) * TAU;
      const envT = breezeEnv(S.t) * Math.min(1, flow);
      const As = L * lerp(1.0, 1.9, hash01(i, 5)) * (1 + 0.35 * envT);
      const tht = wsw * S.t + phi;
      const zig = Math.asin(0.8 * Math.sin(tht)) / Math.asin(0.8); // rounded zig-zag
      const x = mod(xs + dxw + dxg + As * zig + m, Ww) - m;
      const y = -m + q * Hh + ((0.22 * v) / wsw) * Math.sin(2 * tht);
      // Flutter and spin: articulation clock only, livelier inside a breeze.
      const thb = wsw * S.b + phi;
      const wr = lerp(1.3, 2.3, hash01(i, 9)) * (hash01(i, 10) < 0.5 ? -1 : 1);
      const aRaw =
        flt *
        (hash01(i, 14) * TAU +
          wr * S.b +
          0.8 * Math.sin(0.47 * wr * S.b + hash01(i, 15) * TAU) +
          0.35 * Math.sin(1.31 * wr * S.b + hash01(i, 19) * TAU) +
          env * 1.0 * Math.sin(2.9 * S.b + hash01(i, 20) * TAU));
      // Dwell face-on, flip quickly through edge-on (monotonic: slope 0.1 .. 1.9).
      const alpha = aRaw - 0.45 * Math.sin(2 * aRaw);
      const wp = lerp(0.9, 1.7, hash01(i, 11));
      const beta =
        flt *
        (0.5 * Math.sin(wp * S.b + hash01(i, 16) * TAU) +
          0.3 * Math.sin(thb + 0.7) +
          env * 0.4 * Math.sin(3.7 * S.b + hash01(i, 21) * TAU));
      const psi =
        (hash01(i, 7) - 0.5) * TAU +
        (hash01(i, 8) - 0.5) * 1.2 * S.b +
        0.7 * Math.sin(0.8 * S.b + hash01(i, 22) * TAU) +
        0.5 * env;
      const M = rotation(alpha, beta, psi);
      drawPetal(
        dc,
        S.kit(i),
        x,
        y,
        L,
        M,
        lerp(0.16, 0.28, hash01(i, 17)),
        lerp(0.04, 0.09, hash01(i, 18)),
        lerp(0.03, 0.08, hash01(i, 23)),
      );
    }
  },
};
