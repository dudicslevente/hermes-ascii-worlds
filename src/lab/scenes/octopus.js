// Octopus: front-ish view. Bulbous mantle that breathes, two bulging eyes with
// horizontal slit pupils, a siphon, a short web and eight tapered arms. Each arm
// is a curvature-integrated curve: a gentle base bend, a travelling wave and a
// tip curl whose phase differs from arm to arm (independent but coherent).
// Positions and the soft jet lift run on S.t; all shape (breathing, arms, blink,
// jet contraction) on S.b. Units: 1 = overall height U of the octopus.
import { makeKit, TAU, clamp, smoothstep, fract, hash01, roam, at, curve, ellipse, rgba, mixHex, shadeHex } from "../core/util.js";

const NA = 8;
const NP = 15;
const SLOT_X = [0.3, 0.7, 0.5, 0.16];
const SLOT_Y = [0.48, 0.52, 0.66, 0.4];
const LIGHT = [-0.55, -0.83]; // light from upper left
const ORDER = [0, 7, 1, 6, 2, 5, 3, 4];

function buildArm(i, k, b, ph, jet, L) {
  const side = (k - 3.5) / 3.5; // -1 .. 1
  const psi = k * 0.62 + hash01(i, 40 + k) * 1.2 + ph;
  const ex = side * 0.15 * 0.9;
  const bx = ex,
    by = -0.02 + 0.13 * Math.sqrt(Math.max(0, 1 - (ex / 0.19) * (ex / 0.19))) * 0.92;
  let th = Math.PI / 2 - side * 1.15 * (1 - 0.62 * jet);
  const ds = L / (NP - 1);
  const P = [[bx, by]];
  let x = bx,
    y = by;
  for (let n = 1; n < NP; n++) {
    const u = (n - 0.5) / (NP - 1);
    const tipw = smoothstep(0.4, 1, u);
    const calm = 1 - 0.7 * jet;
    const kap =
      side * 1.5 * (1 - 0.5 * u) * (1 - 0.55 * jet) +
      (0.5 + 3.6 * u) * Math.sin(1.3 * b - 5.2 * u + psi) * calm +
      15 * tipw * tipw * Math.sin(0.5 * b + psi + 0.7) * calm;
    th += kap * ds;
    x += Math.cos(th) * ds;
    y += Math.sin(th) * ds;
    P.push([x, y]);
  }
  return { P, psi };
}

function drawEye(ctx, kit, s, blink, px, dark) {
  const ex = s * 0.106,
    ey = -0.055;
  at(ctx, ex, ey, 0, s * 1.25, 1.25, () => {
    // eye turret
    const g = ctx.createRadialGradient(-0.012, -0.016, 0.004, 0, 0, 0.07);
    g.addColorStop(0, rgba(mixHex(kit.main, kit.light, 0.4), 1));
    g.addColorStop(0.7, kit.main);
    g.addColorStop(1, dark);
    ctx.fillStyle = g;
    ellipse(ctx, 0, 0, 0.066, 0.06, 0);
    ctx.fill();
    // iris
    const lid = 1 - 0.88 * blink;
    const ig = ctx.createRadialGradient(-0.008, -0.01, 0.002, 0, 0, 0.046);
    ig.addColorStop(0, "#fff6d8");
    ig.addColorStop(0.45, kit.accent);
    ig.addColorStop(1, shadeHex(kit.accent, 0.6));
    ctx.fillStyle = ig;
    ellipse(ctx, 0.004, 0.002, 0.046, 0.044 * lid, 0);
    ctx.fill();
    // horizontal slit pupil
    ctx.fillStyle = "#0a0a0d";
    ellipse(ctx, 0.004, 0.004, 0.034, Math.max(0.002, 0.0095 * lid), 0);
    ctx.fill();
    // glint
    ctx.fillStyle = rgba("#ffffff", 0.85 * lid);
    ellipse(ctx, -0.014, -0.014 * lid, 0.0085, 0.007 * lid, 0);
    ctx.fill();
    // brow ridge
    ctx.strokeStyle = rgba(kit.dark, 0.7);
    ctx.lineWidth = 0.0125;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.ellipse(0.004, 0.004, 0.056, 0.052, 0, Math.PI * 1.08, Math.PI * 1.9);
    ctx.stroke();
    ctx.strokeStyle = rgba(kit.light, 0.55);
    ctx.lineWidth = 0.006;
    ctx.beginPath();
    ctx.ellipse(0.004, 0.0, 0.066, 0.064, 0, Math.PI * 1.15, Math.PI * 1.8);
    ctx.stroke();
  });
}

function drawOctopus(ctx, S, i, w, h) {
  const kit = S.kit(i);
  const t = S.t,
    b = S.b;
  const flow = S.flow === undefined ? 1 : S.flow;
  const U = S.min * S.size * 0.32 * (0.92 + 0.16 * hash01(i, 11));
  const px = 1 / U;
  const ph = hash01(i, 21) * TAU;
  const slot = i % 4;

  // ---- jet cycle: contraction on S.b, lift on S.t (same period) --------
  const Pj = 12 + 6 * hash01(i, 9);
  const jph = hash01(i, 10);
  const jb = fract(b / Pj + jph);
  const jet = smoothstep(0, 0.045, jb) * (1 - smoothstep(0.045, 0.2, jb));
  const jt = fract(t / Pj + jph);
  const lift = smoothstep(0, 0.05, jt) * (1 - smoothstep(0.05, 0.42, jt));

  // ---- position: slow buoyant drift on S.t ------------------------------
  const mx = Math.min(w * 0.46, U * 0.94 + 8);
  const my = Math.min(h * 0.46, U * 1.08 + 8);
  const homeX = mx + (w - 2 * mx) * SLOT_X[slot];
  const homeY = my + (h - 2 * my) * SLOT_Y[slot];
  const rp = roam(i, t, w, h, {
    rate: 0.09,
    ax: Math.min(w * 0.24 * flow, homeX - mx, w - mx - homeX) / w,
    ay: Math.min(h * 0.15 * flow, homeY - my, h - my - homeY) / h,
    cx: homeX / w,
    cy: homeY / h,
    seed: 77,
  });
  const cx = rp.x;
  const cy = rp.y - lift * 0.13 * U + 0.015 * U * Math.sin(t * 0.7 + ph);
  // arms trail behind: tilt the whole body against the drift direction
  const rot = clamp(rp.vx * 0.006, -0.28, 0.28) + 0.035 * Math.sin(0.45 * b + ph);

  // ---- breathing and blink -----------------------------------------------
  const br = Math.sin(1.55 * b + ph);
  const bx = 1 + 0.045 * br - 0.1 * jet;
  const by = 1 - 0.03 * br - 0.08 * jet;
  const bq = fract(b / 6.5 + hash01(i, 12));
  const blink = bq < 0.035 ? Math.sin((Math.PI * bq) / 0.035) : 0;

  const dark = shadeHex(kit.main, 0.5);
  const mid = kit.main;
  const arms = [];
  for (let k = 0; k < NA; k++) {
    const L = U * 0 + (0.56 + 0.08 * Math.abs(k - 3.5) / 3.5 + 0.06 * hash01(i, 30 + k)) * (1 + 0.1 * jet);
    arms.push(buildArm(i, k, b, ph, jet, L));
  }

  at(ctx, cx, cy, 0, U, U, () => {
    ctx.rotate(rot);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // -- web between the arm bases (behind the arms)
    {
      const outer = [],
        inner = [];
      for (let k = 0; k < NA; k++) {
        outer.push(arms[k].P[3]);
        inner.push(arms[k].P[0]);
      }
      const pts = outer.concat(inner.reverse());
      ctx.fillStyle = rgba(shadeHex(kit.main, 0.7), 0.95);
      curve(ctx, pts, true);
      ctx.fill();
    }

    // -- arms
    for (let oi = 0; oi < NA; oi++) {
      const k = ORDER[oi];
      const { P, psi } = arms[k];
      const hw = [],
        nx = [],
        ny = [],
        off = [];
      for (let n = 0; n < NP; n++) {
        const a = P[Math.max(0, n - 1)],
          c = P[Math.min(NP - 1, n + 1)];
        let dx = c[0] - a[0],
          dy = c[1] - a[1];
        const l = Math.hypot(dx, dy) || 1;
        dx /= l;
        dy /= l;
        nx.push(dy);
        ny.push(-dx);
        const u = n / (NP - 1);
        hw.push(0.062 * Math.pow(1 - u, 1.0) + 0.008);
        off.push(clamp((dy * LIGHT[0] - dx * LIGHT[1]) * 1.8, -1, 1));
      }
      const band = (kw, ko, shift) => {
        const pts = [];
        for (let n = 0; n < NP; n++) {
          const o = off[n] * ko * hw[n] + shift * hw[n];
          pts.push([P[n][0] + nx[n] * (o - hw[n] * kw), P[n][1] + ny[n] * (o - hw[n] * kw)]);
        }
        for (let n = NP - 1; n >= 0; n--) {
          const o = off[n] * ko * hw[n] + shift * hw[n];
          pts.push([P[n][0] + nx[n] * (o + hw[n] * kw), P[n][1] + ny[n] * (o + hw[n] * kw)]);
        }
        return pts;
      };
      ctx.fillStyle = dark;
      curve(ctx, band(1, 0, 0), true);
      ctx.fill();
      ctx.fillStyle = mid;
      curve(ctx, band(0.84, 0.18, 0), true);
      ctx.fill();
      ctx.fillStyle = rgba(mixHex(kit.main, kit.light, 0.55), 0.85);
      curve(ctx, band(0.46, 0.5, 0), true);
      ctx.fill();
      // suckers: light dots on the inner side of the curl
      const sig = clamp(1.4 * Math.sin(0.5 * b + psi + 0.7), -1, 1);
      ctx.fillStyle = rgba(kit.light, 0.9);
      for (let n = 2; n < NP - 1; n++) {
        const u = n / (NP - 1);
        const o = -sig * hw[n] * 0.34;
        const r = Math.max(0.0035, hw[n] * 0.3);
        ellipse(ctx, P[n][0] + nx[n] * o, P[n][1] + ny[n] * o, r, r);
        ctx.fill();
      }
    }

    // -- mantle: shaded bulb, scaled about its base by the breath
    at(ctx, 0, -0.02, 0, bx, by, () => {
      ctx.translate(0, 0.02);
      const g = ctx.createRadialGradient(-0.07, -0.3, 0.01, -0.01, -0.2, 0.3);
      g.addColorStop(0, mixHex(kit.main, kit.light, 0.62));
      g.addColorStop(0.42, kit.main);
      g.addColorStop(1, dark);
      ctx.fillStyle = g;
      ellipse(ctx, 0, -0.215, 0.185, 0.225, 0);
      ctx.fill();
      // mottling
      for (let n = 0; n < 16; n++) {
        const a = hash01(i, 100 + n) * TAU;
        const r = Math.sqrt(hash01(i, 130 + n)) * 0.82;
        const sx = Math.cos(a) * r * 0.185,
          sy = -0.215 + Math.sin(a) * r * 0.225;
        const rad = 0.014 + 0.022 * hash01(i, 160 + n);
        ctx.fillStyle = n % 3 === 0 ? rgba(kit.light, 0.2) : n % 3 === 1 ? rgba(kit.dark, 0.3) : rgba(kit.second, 0.34);
        ellipse(ctx, sx, sy, rad * 1.25, rad, hash01(i, 190 + n) * 3);
        ctx.fill();
      }
      // soft specular on the crown
      ctx.fillStyle = rgba(kit.light, 0.3);
      ellipse(ctx, -0.07, -0.33, 0.045, 0.07, -0.5);
      ctx.fill();
    });

    // -- head: overlaps the lower mantle, carries the eyes
    {
      const g = ctx.createRadialGradient(-0.06, -0.08, 0.01, 0, -0.03, 0.2);
      g.addColorStop(0, mixHex(kit.main, kit.light, 0.4));
      g.addColorStop(0.55, kit.main);
      g.addColorStop(1, shadeHex(kit.main, 0.55));
      ctx.fillStyle = g;
      ellipse(ctx, 0, -0.03, 0.2, 0.125, 0);
      ctx.fill();
      ctx.strokeStyle = rgba(kit.dark, 0.45);
      ctx.lineWidth = 1.2 * px;
      ctx.beginPath();
      ctx.ellipse(0, -0.03, 0.2, 0.125, 0, Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
      drawEye(ctx, kit, -1, blink, px, dark);
      drawEye(ctx, kit, 1, blink, px, dark);
      // siphon
      at(ctx, 0.07, 0.065, 0.55, 1 + 0.25 * jet, 1, () => {
        ctx.fillStyle = shadeHex(kit.main, 0.55);
        ellipse(ctx, 0, 0, 0.045, 0.02, 0);
        ctx.fill();
        ctx.fillStyle = kit.main;
        ellipse(ctx, -0.004, -0.004, 0.036, 0.013, 0);
        ctx.fill();
        ctx.fillStyle = rgba("#050508", 0.8);
        ellipse(ctx, 0.03, 0.0, 0.01, 0.009, 0);
        ctx.fill();
      });
    }
  });
}

export default {
  id: "octopus",
  name: "Octopus",
  group: "ocean",
  blurb: "Breathing mantles, eight curling arms and gentle jet pulses carry octopuses along.",
  motion: "travel",
  count: { min: 0, max: 4, default: 2, noun: "Octopus" },
  natural: [
    makeKit({ main: "#d9532f", light: "#ffb48a", dark: "#4a1710", accent: "#f7c04a", second: "#b53a2a" }),
    makeKit({ main: "#7a4f6e", light: "#d3a8c8", dark: "#2c1a2b", accent: "#e9c46a", second: "#5e5a7a" }),
    makeKit({ main: "#e8b9a0", light: "#ffe9d9", dark: "#6a4638", accent: "#f2c14e", second: "#d49a86" }),
    makeKit({ main: "#6f8fa6", light: "#c9dde8", dark: "#1f3140", accent: "#f0d68a", second: "#8a9cb0" }),
  ],
  flow: { label: "Current", help: "How strongly the water carries the octopuses along.", default: 1, min: 0, max: 1.5 },
  backdrop: { dark: "#0b1620", light: "#e4edf0" },
  draw(ctx, w, h, S) {
    for (let i = 0; i < S.count; i++) drawOctopus(ctx, S, i, w, h);
  },
};
