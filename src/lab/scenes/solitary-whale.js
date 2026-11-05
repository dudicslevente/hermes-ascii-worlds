// Solitary whale: side view, long countershaded body with a travelling vertical
// wave, swaying flipper and beating flukes. Slow broad crossings; each pass
// alternates direction and the whale always faces where it swims (mirrored,
// never upside down). It leaves the stage fully before the next pass.
import { makeKit, TAU, clamp, clamp01, lerp, fract, hash01, rgba, mixHex, curve, glow, ribbon } from "../core/util.js";

const K = 17;
const SIZES = [1, 0.74, 0.58];
const LANES = [0.46, 0.27, 0.68];

function girth(s) {
  const sm = 0.3;
  if (s < sm) return Math.sqrt(Math.max(0, 1 - Math.pow(1 - s / sm, 2.3)));
  const u = (s - sm) / (1 - sm);
  return 0.2 + 0.8 * Math.pow(1 - Math.pow(u, 1.35), 1.5);
}

// Crossing schedule of entity i: position of the body centre and pass info.
function track(i, t, w, h, flow, L) {
  const per = 62 + 20 * hash01(i, 1);
  const gap = 4 + 10 * hash01(i, 2);
  const cyc = per + gap;
  const u = t / cyc + (i === 0 ? 0.34 : 0.1 + 0.8 * hash01(i, 3));
  const n = Math.floor(u);
  const pf = ((u - n) * cyc) / per;
  const dir = (n + (hash01(i, 4) < 0.5 ? 0 : 1)) & 1 ? -1 : 1;
  const e = clamp01(pf);
  let x = -0.62 * L + (w + 1.24 * L) * e;
  if (dir < 0) x = w - x;
  const ph = hash01(i, 6, n) * TAU;
  const lane = LANES[i % 3] + 0.06 * (hash01(i, 5, n) - 0.5);
  const sway = flow * h * (0.026 * Math.sin((TAU * t) / 23 + ph) + 0.011 * Math.sin((TAU * t) / 9.3 + ph * 1.7));
  const glide = h * 0.045 * Math.sin(Math.PI * e * 1.6 + ph);
  return { vis: pf >= 0 && pf <= 1, x, y: lane * h + sway + glide, dir, n, pf, ph, per };
}

function shape(Lw, b, ph) {
  const A = 0.052 * Lw,
    om = TAU * 0.2;
  const sp = [],
    nx = [],
    ny = [],
    top = [],
    bot = [];
  for (let k = 0; k < K; k++) {
    const s = k / (K - 1);
    const env = 0.012 + Math.pow(s, 2.1);
    const y =
      A * env * Math.sin(om * b + ph - TAU * 0.74 * s) +
      0.006 * Lw * Math.sin(om * 0.5 * b + ph * 1.3) * (1 - s);
    sp.push([Lw * (0.5 - 0.86 * s), y]);
  }
  for (let k = 0; k < K; k++) {
    const a = sp[Math.max(0, k - 1)],
      c = sp[Math.min(K - 1, k + 1)];
    let dx = c[0] - a[0],
      dy = c[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    nx.push(dy);
    ny.push(-dx);
    const g = girth(k / (K - 1)) * 0.082 * Lw;
    top.push(g * 0.88);
    bot.push(g * 1.12);
  }
  // point at fraction s along the body, v in -1 (back edge) .. +1 (belly edge)
  const P = (s, v) => {
    const f = clamp(s, 0, 1) * (K - 1),
      k = Math.min(K - 2, Math.floor(f)),
      u = f - k;
    const x = lerp(sp[k][0], sp[k + 1][0], u),
      y = lerp(sp[k][1], sp[k + 1][1], u);
    const qx = lerp(nx[k], nx[k + 1], u),
      qy = lerp(ny[k], ny[k + 1], u);
    const th = v >= 0 ? lerp(bot[k], bot[k + 1], u) * v : lerp(top[k], top[k + 1], u) * v;
    return [x + qx * th, y + qy * th];
  };
  return { sp, P };
}

function drawWhale(ctx, kit, Lw, b, ph) {
  const { sp, P } = shape(Lw, b, ph);
  const H = 0.082 * Lw;
  const lw = Math.max(1, Lw * 0.0032);

  // flukes first (behind the stock): foreshortening grows with tail tilt
  const E = sp[K - 1],
    E1 = sp[K - 2];
  let ux = E[0] - E1[0],
    uy = E[1] - E1[1];
  const ul = Math.hypot(ux, uy) || 1;
  ux /= ul;
  uy /= ul;
  const vx = uy,
    vy = -ux;
  const tilt = Math.atan2(uy, -ux);
  const ff = 0.42 + 0.58 * clamp01(Math.abs(tilt) / 0.45);
  const F = (u, v) => [E[0] + (ux * u + vx * v) * Lw, E[1] + (uy * u + vy * v) * Lw];
  const half = [
    [0.0, 0.014],
    [0.028, 0.05 * ff],
    [0.072, 0.105 * ff],
    [0.112, 0.152 * ff],
    [0.092, 0.1 * ff],
    [0.062, 0.042 * ff],
  ];
  const fl = half.map(([u, v]) => F(u, v));
  const fr = half.map(([u, v]) => F(u, -v)).reverse();
  curve(ctx, fl.concat([F(0.046, 0)], fr), true);
  ctx.fillStyle = rgba(mixHex(kit.main, kit.dark, 0.25), 0.96);
  ctx.fill();
  ctx.strokeStyle = rgba(kit.light, 0.45);
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(...F(0.0, 0));
  ctx.lineTo(...F(0.05, 0));
  ctx.stroke();
  ctx.beginPath();
  [F(0.062, 0.042 * ff), F(0.092, 0.1 * ff), F(0.112, 0.152 * ff)].forEach((p, q) => (q ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.stroke();
  ctx.beginPath();
  [F(0.062, -0.042 * ff), F(0.092, -0.1 * ff), F(0.112, -0.152 * ff)].forEach((p, q) => (q ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.stroke();

  // dorsal fin
  {
    const f0 = P(0.64, -1),
      f1 = P(0.725, -1);
    const pm = P(0.69, -1);
    const tip = [pm[0] - 0.006 * Lw, pm[1] - 0.05 * Lw];
    curve(ctx, [f0, [f0[0] - 0.004 * Lw, f0[1] - 0.026 * Lw], tip, [tip[0] + 0.022 * Lw, tip[1] + 0.03 * Lw], f1], true);
    ctx.fillStyle = rgba(mixHex(kit.main, kit.dark, 0.2), 0.95);
    ctx.fill();
  }

  // body silhouette with countershading
  const top = [],
    bot = [];
  for (let k = 0; k < K; k++) {
    top.push(P(k / (K - 1), -1));
    bot.push(P(k / (K - 1), 1));
  }
  curve(ctx, top.concat(bot.reverse()), true);
  const g = ctx.createLinearGradient(0, -H * 0.9, 0, H * 1.12);
  g.addColorStop(0, rgba(mixHex(kit.main, kit.light, 0.4), 1));
  g.addColorStop(0.3, rgba(mixHex(kit.main, kit.light, 0.18), 1));
  g.addColorStop(0.5, rgba(mixHex(kit.main, kit.dark, 0.2), 1));
  g.addColorStop(0.72, rgba(mixHex(kit.main, kit.light, 0.4), 1));
  g.addColorStop(1, rgba(kit.light, 1));
  ctx.fillStyle = g;
  ctx.fill();

  // pale belly, built from nested translucent bands that follow the spine
  for (const v0 of [0.12, 0.45, 0.75]) {
    const up = [],
      dn = [];
    for (let k = 0; k < K; k++) {
      const s = k / (K - 1);
      const bump = Math.pow(Math.sin(Math.PI * clamp01((s - 0.02) / 0.84)), 0.45);
      up.push(P(s, lerp(1, v0, bump)));
      dn.push(P(s, 1));
    }
    curve(ctx, up.concat(dn.reverse()), true);
    ctx.fillStyle = rgba(kit.light, 0.24);
    ctx.fill();
  }

  // dappled light drifting along the back
  for (let j = 0; j < 2; j++) {
    const ph2 = fract(0.035 * b + j * 0.5 + ph * 0.1);
    const p = P(0.12 + 0.7 * ph2, -0.55);
    glow(ctx, p[0], p[1], 0.08 * Lw, kit.light, 0.16 * Math.sin(Math.PI * ph2));
  }

  // rim light along the back
  const rim = [];
  for (let q = 0; q <= 10; q++) rim.push(P(0.07 + 0.78 * (q / 10), -1));
  curve(ctx, rim, false);
  ctx.strokeStyle = rgba(kit.light, 0.75);
  ctx.lineWidth = lw * 1.6;
  ctx.stroke();

  // throat grooves (ventral pleats)
  ctx.strokeStyle = rgba(kit.dark, 0.34);
  ctx.lineWidth = Math.max(0.9, lw * 0.7);
  for (let j = 0; j < 12; j++) {
    const v = 0.42 + (0.55 * j) / 11;
    const s0 = 0.06 + 0.004 * j,
      s1 = 0.3 + 0.17 * fract(j * 0.618 + 0.2);
    const pts = [];
    for (let q = 0; q <= 6; q++) pts.push(P(lerp(s0, s1, q / 6), v));
    curve(ctx, pts, false);
    ctx.stroke();
  }

  // mouth line and eye
  curve(ctx, [P(0.012, 0.28), P(0.06, 0.4), P(0.12, 0.42), P(0.18, 0.35), P(0.215, 0.26)], false);
  ctx.strokeStyle = rgba(kit.dark, 0.85);
  ctx.lineWidth = lw * 1.3;
  ctx.stroke();
  const ey = P(0.19, 0.1);
  ctx.fillStyle = rgba(kit.dark, 0.9);
  ctx.beginPath();
  ctx.arc(ey[0], ey[1], Math.max(1.6, Lw * 0.0085), 0, TAU);
  ctx.fill();
  ctx.fillStyle = rgba(kit.accent, 0.95);
  ctx.beginPath();
  ctx.arc(ey[0], ey[1], Math.max(0.8, Lw * 0.0038), 0, TAU);
  ctx.fill();

  // pectoral flipper (near side), long, swaying with its own slow wave
  {
    const root = P(0.335, 0.6);
    const ang = Math.PI - (0.95 + 0.28 * Math.sin(0.55 * b + ph * 1.9));
    const Lf = 0.2 * Lw;
    const fs = [];
    let px = root[0],
      py = root[1];
    for (let j = 0; j <= 5; j++) {
      fs.push([px, py]);
      const a = ang + 0.22 * Math.pow(j / 5, 1.4) * Math.sin(0.55 * b + ph * 1.9 - j * 0.6);
      px += Math.cos(a) * (Lf / 5);
      py += Math.sin(a) * (Lf / 5);
    }
    const outline = ribbon(fs, (u) => Lw * 0.021 * (0.3 + 0.7 * Math.sin(Math.PI * Math.pow(clamp01(u), 0.7))) * (1 - 0.45 * u) + 0.4);
    curve(ctx, outline, true);
    const fg = ctx.createLinearGradient(fs[0][0], fs[0][1], fs[5][0], fs[5][1]);
    fg.addColorStop(0, rgba(mixHex(kit.main, kit.dark, 0.4), 1));
    fg.addColorStop(0.5, rgba(kit.main, 1));
    fg.addColorStop(1, rgba(mixHex(kit.main, kit.light, 0.5), 1));
    ctx.fillStyle = fg;
    ctx.fill();
    curve(ctx, fs, false);
    ctx.strokeStyle = rgba(kit.light, 0.4);
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

export default {
  id: "solitary-whale",
  name: "Solitary whale",
  group: "ocean",
  blurb: "Slow whale crossings, with an intentional quiet wait offstage before each return.",
  motion: "travel",
  count: { min: 0, max: 3, default: 1, noun: "Whale" },
  natural: [
    makeKit({ main: "#6f8ea6", light: "#d5e4ec", dark: "#26394a", accent: "#bfe0f0", second: "#547089" }),
    makeKit({ main: "#59687a", light: "#cdd8df", dark: "#1f2a37", accent: "#b9d2e0", second: "#43566a" }),
    makeKit({ main: "#8b8379", light: "#e4dccf", dark: "#38322c", accent: "#f0e3c6", second: "#6e675d" }),
    makeKit({ main: "#3f6a92", light: "#bfd9ea", dark: "#142a40", accent: "#a8d4f0", second: "#2f5276" }),
  ],
  flow: { label: "Current", help: "How strongly the water sways the whale as it glides.", default: 1, min: 0, max: 1.5 },
  backdrop: { dark: "#07141e", light: "#e1ecef" },
  draw(ctx, w, h, S) {
    const flow = S.flow == null ? 1 : S.flow;
    for (let i = S.count - 1; i >= 0; i--) {
      const sm = i === 0 ? SIZES[0] : SIZES[i % 3] * (0.94 + 0.12 * hash01(i, 8));
      const Lw = Math.min(0.56 * w, 1.5 * h) * S.size * sm;
      const T = track(i, S.t, w, h, flow, Lw);
      if (!T.vis) continue;
      const t1 = track(i, S.t - 0.5, w, h, flow, Lw),
        t2 = track(i, S.t + 0.5, w, h, flow, Lw);
      const dxs = t2.x - t1.x;
      const psi = Math.abs(dxs) > 1e-6 && t1.n === t2.n ? clamp(Math.atan((t2.y - t1.y) / dxs), -0.2, 0.2) : 0;
      ctx.save();
      ctx.globalAlpha = i === 0 ? 1 : 0.62 + 0.38 * sm;
      ctx.translate(T.x, T.y);
      ctx.rotate(psi);
      ctx.scale(T.dir, 1);
      drawWhale(ctx, S.kit(i), Lw, S.b, T.ph + i * 1.3);
      ctx.restore();
    }
  },
};
