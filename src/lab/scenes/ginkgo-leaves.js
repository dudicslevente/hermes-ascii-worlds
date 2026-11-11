import { makeKit, TAU, lerp, mod, fract, clamp01, mixHex, rgba, hash01 } from "../core/util.js";

// Ginkgo leaves: flabellate fans on a thin petiole. Each leaf is a thin 3D
// sheet (V-folded along its mid rib, slightly cupped along its length) that is
// rotated in 3D and projected orthographically, so the silhouette really goes
// fan -> narrow oval -> edge-on sliver -> fan (other face) as it tumbles.
// Falling, wind and sway are functions of S.t and S.flow; the tumble is a
// function of S.b.

// Wind speed = mean + sum of slow sines (units of U px/s). Its integral is
// closed form, so a leaf's drift since it spawned needs no state.
const WIND = [
  [TAU / 23.0, 0.52, 0.3],
  [TAU / 13.7, 0.3, 2.1],
  [TAU / 8.3, 0.17, 4.4],
  [TAU / 5.1, 0.09, 1.2],
];
const WIND_MEAN = 0.2;
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

// Local leaf frame (unit = blade length): x across, y down, petiole joint at YA.
const YA = 0.42;
const PHI = 1.1; // half opening angle of the fan, radians
const NA = 16; // arc segments per half (dense near the notch)
function rim(phi) {
  const f = phi / PHI;
  const cleft = Math.max(0, 1 - phi / 0.2);
  return 1 - 0.15 * f * f * f - 0.3 * cleft * cleft; // deep V notch at the centre
}
const ARC = [];
for (let k = 0; k <= NA; k++) {
  const phi = PHI * Math.pow(k / NA, 1.35),
    r = rim(phi);
  ARC.push([r * Math.sin(phi), YA - r * Math.cos(phi)]);
}
const LIGHT = [-0.45, -0.5, 0.74];

// M = Rz(psi) * Rx(beta) * Ry(alpha); x right, y down, z towards the viewer.
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

// f: 0 deep shadow .. ~0.8 face on .. 1 fully lit.
function shade(kit, base, f) {
  const t = clamp01((f - 0.42) / 0.6);
  return t < 0.5
    ? mixHex(mixHex(kit.dark, base, 0.66), base, t / 0.5)
    : mixHex(base, kit.light, ((t - 0.5) / 0.5) * 0.5);
}

function drawLeaf(ctx, kit, cx, cy, R, M, fold, curl) {
  const proj = (u, y, z) => [
    cx + R * (M[0] * u + M[1] * y + M[2] * z),
    cy + R * (M[3] * u + M[4] * y + M[5] * z),
  ];
  const zOf = (u, y) => fold * Math.abs(u) + curl * (YA - y) * (YA - y);
  const apex = proj(0, YA, 0);
  const top = proj(0, YA - 0.95, curl * 0.9);
  const axisLen = Math.hypot(top[0] - apex[0], top[1] - apex[1]);
  const lw = Math.max(1.5, R * 0.05);
  const halves = [];
  for (let s = -1; s <= 1; s += 2) {
    const nx = -s * fold,
      nz = 1,
      nn = Math.hypot(nx, nz);
    const vx = (M[0] * nx + M[2] * nz) / nn,
      vy = (M[3] * nx + M[5] * nz) / nn,
      vz = (M[6] * nx + M[8] * nz) / nn;
    const sg = vz < 0 ? -1 : 1;
    const dif = sg * (vx * LIGHT[0] + vy * LIGHT[1] + vz * LIGHT[2]);
    const f = 0.42 + 0.6 * clamp01(dif / 0.92);
    const pts = [apex];
    for (let k = 0; k <= NA; k++) {
      const u = s * ARC[k][0],
        y = ARC[k][1];
      pts.push(proj(u, y, zOf(u, y)));
    }
    halves.push({ s, pts, f, back: sg < 0 });
  }
  // Membrane: deeper gold at the petiole, richer gold towards the edge, so the
  // pale veins stand out as dense glyph streaks against it.
  for (const H of halves) {
    const tint = H.back ? kit.second : kit.main;
    if (axisLen > 0.8) {
      const g = ctx.createLinearGradient(apex[0], apex[1], top[0], top[1]);
      g.addColorStop(0, shade(kit, mixHex(tint, kit.dark, 0.16), H.f));
      g.addColorStop(0.5, shade(kit, tint, H.f));
      g.addColorStop(1, shade(kit, mixHex(tint, kit.light, 0.22), H.f));
      ctx.fillStyle = g;
    } else ctx.fillStyle = shade(kit, tint, H.f);
    ctx.beginPath();
    for (let k = 0; k < H.pts.length; k++)
      k ? ctx.lineTo(H.pts[k][0], H.pts[k][1]) : ctx.moveTo(H.pts[k][0], H.pts[k][1]);
    ctx.closePath();
    ctx.fill();
  }
  // Veins: bright lines radiating from the petiole; their count follows the
  // leaf size so they stay resolvable as separate glyph streaks.
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const nv = Math.max(4, Math.min(7, Math.round(R / 8)));
  for (const H of halves) {
    const s = H.s;
    ctx.strokeStyle = rgba(shade(kit, mixHex(kit.light, kit.accent, 0.25), Math.min(1, H.f + 0.2)), H.back ? 0.7 : 0.92);
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (let j = 0; j < nv; j++) {
      const phi = PHI * (0.1 + 0.86 * (j / (nv - 1))),
        re = 0.9 * rim(phi),
        sn = Math.sin(phi),
        cs = Math.cos(phi);
      let p = proj(s * 0.07 * sn, YA - 0.07 * cs, 0);
      ctx.moveTo(p[0], p[1]);
      let u = re * 0.55 * sn,
        y = YA - re * 0.55 * cs;
      p = proj(s * u, y, zOf(u, y));
      ctx.lineTo(p[0], p[1]);
      u = re * sn;
      y = YA - re * cs;
      p = proj(s * u, y, zOf(u, y));
      ctx.lineTo(p[0], p[1]);
    }
    if (R > 40) {
      for (let j = 0; j < nv - 1; j++) {
        const phi = PHI * (0.1 + 0.86 * ((j + 0.5) / (nv - 1))),
          re = 0.9 * rim(phi),
          sn = Math.sin(phi),
          cs = Math.cos(phi);
        let u = re * 0.5 * sn,
          y = YA - re * 0.5 * cs;
        let p = proj(s * u, y, zOf(u, y));
        ctx.moveTo(p[0], p[1]);
        u = re * sn;
        y = YA - re * cs;
        p = proj(s * u, y, zOf(u, y));
        ctx.lineTo(p[0], p[1]);
      }
    }
    ctx.stroke();
  }
  // Faint darker rim around the whole fan, thin enough to survive edge-on.
  const fa = (halves[0].f + halves[1].f) / 2;
  ctx.strokeStyle = rgba(shade(kit, mixHex(kit.main, kit.dark, 0.22), fa), 0.8);
  ctx.lineWidth = Math.max(1.2, R * 0.032);
  for (const H of halves) {
    ctx.beginPath();
    for (let k = 0; k < H.pts.length; k++)
      k ? ctx.lineTo(H.pts[k][0], H.pts[k][1]) : ctx.moveTo(H.pts[k][0], H.pts[k][1]);
    ctx.closePath();
    ctx.stroke();
  }
  // Petiole.
  const e = proj(0.07, YA + 0.72, 0.07),
    mid = proj(0.02, YA + 0.36, 0.035);
  ctx.strokeStyle = rgba(shade(kit, mixHex(kit.light, kit.main, 0.3), Math.max(fa, 0.8)), 1);
  ctx.lineWidth = Math.max(2, R * 0.075);
  ctx.beginPath();
  ctx.moveTo(apex[0], apex[1]);
  ctx.quadraticCurveTo(mid[0], mid[1], e[0], e[1]);
  ctx.stroke();
}

export default {
  id: "ginkgo-leaves",
  name: "Ginkgo leaves",
  group: "drift",
  blurb: "Golden fan-shaped leaves tumble slowly down on a drifting wind.",
  motion: "travel",
  count: { min: 0, max: 60, default: 14, noun: "Leaf" },
  natural: [
    makeKit({ main: "#f2b91f", light: "#fff0a0", dark: "#7a560a", accent: "#ffe27a", second: "#d9a52a" }),
    makeKit({ main: "#f6b02a", light: "#ffdc8c", dark: "#7a4810", accent: "#ffcc60", second: "#d9902a" }),
    makeKit({ main: "#f0df5c", light: "#fff9c4", dark: "#807216", accent: "#f8ee92", second: "#d6c648" }),
    makeKit({ main: "#cbc43c", light: "#f0eea0", dark: "#4e5c18", accent: "#dcd868", second: "#9bb02e" }),
  ],
  flow: { label: "Wind", help: "How strongly the wind pushes the leaves sideways.", default: 1, min: 0, max: 1.5 },
  extras: [
    { key: "tumble", type: "range", label: "Tumble", min: 0, max: 1.5, step: 0.05, default: 1, help: "How far each leaf turns over as it falls." },
  ],
  backdrop: { dark: "#13120d", light: "#f0ecdf" },
  draw(ctx, w, h, S) {
    const n = S.count;
    const tum = S.extra && typeof S.extra.tumble === "number" ? S.extra.tumble : 1;
    const flow = typeof S.flow === "number" ? S.flow : 1;
    const sz = S.min * S.size;
    const m = sz * 0.21; // wrap margin: leaves are fully off-stage when they wrap
    const Hh = h + 2 * m,
      Ww = w + 2 * m;
    const order = [];
    for (let i = 0; i < n; i++) order.push(i);
    order.sort((a, b) => hash01(a, 1) - hash01(b, 1));
    for (let o = 0; o < n; o++) {
      const i = order[o];
      const d = hash01(i, 1); // 0 far .. 1 near
      const D = S.depthOf ? S.depthOf(i) : null,
        dc = (D && S.layer(D.layer)) || ctx;
      const R = sz * lerp(0.09, 0.146, d) * (D ? D.scale : 1);
      const v = S.min * lerp(0.04, 0.066, clamp01(0.6 * d + 0.4 * hash01(i, 2))) * (D ? D.pace : 1);
      const p = fract(0.5 + i * 0.5698402909980532) + (S.t * v) / Hh;
      const cyc = Math.floor(p),
        q = p - cyc;
      const age = (q * Hh) / v,
        ts = S.t - age;
      const xs = fract(0.37 + i * 0.7548776662466927 + cyc * 0.6180339887) * Ww - m;
      const U = S.min * 0.075 * flow * lerp(0.7, 1.3, hash01(i, 12));
      const tau = hash01(i, 13) * 2.5;
      const dxw = U * windDisp(ts - tau, S.t - tau);
      const dxg = (hash01(i, 3) - 0.5) * S.min * 0.016 * age;
      const wsw = TAU / lerp(3.4, 5.8, hash01(i, 4));
      const phi = hash01(i, 6) * TAU;
      const As = R * lerp(0.7, 1.5, hash01(i, 5));
      const tht = wsw * S.t + phi;
      const x = mod(xs + dxw + dxg + As * Math.sin(tht) + m, Ww) - m;
      const y = -m + q * Hh + ((0.18 * v) / wsw) * Math.sin(2 * tht);
      // Tumble: articulation clock only.
      const thb = wsw * S.b + phi;
      const wr = lerp(0.42, 0.82, hash01(i, 9)) * (hash01(i, 10) < 0.5 ? -1 : 1);
      const alpha =
        tum * (hash01(i, 14) * TAU + wr * S.b + 0.55 * Math.sin(0.43 * wr * S.b + hash01(i, 15) * TAU));
      const wp = lerp(0.33, 0.6, hash01(i, 11));
      const beta =
        tum * (0.48 * Math.sin(wp * S.b + hash01(i, 16) * TAU) + 0.42 * Math.sin(thb + 0.7));
      const psi =
        (hash01(i, 7) - 0.5) * 2.2 + (hash01(i, 8) - 0.5) * 0.3 * S.b + 0.5 * (0.3 + 0.7 * tum) * Math.cos(thb);
      const M = rotation(alpha, beta, psi);
      drawLeaf(dc, S.kit(i), x, y, R, M, lerp(0.14, 0.26, hash01(i, 17)), lerp(0.05, 0.14, hash01(i, 18)));
    }
  },
};
