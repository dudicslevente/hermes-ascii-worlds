import { makeKit, TAU, lerp, fract, smoothstep, at, hash01, rgba } from "../core/util.js";

// Bubbles: outlined rings that rise on a gentle wobbling path. Every bubble is
// a deterministic cycle (period, phase, per-cycle column from hash01), so no
// state is kept. Position uses the travel clock S.t; shape wobble uses S.b.

// Gentle soft wall so a drifting bubble turns back before the stage edge.
function keepIn(v, lo, hi) {
  const m = (hi - lo) * 0.1;
  if (v < lo + m) return lo + m - m * (1 - Math.exp(-(lo + m - v) / m));
  if (v > hi - m) return hi - m + m * (1 - Math.exp(-(v - (hi - m)) / m));
  return v;
}

// One bubble drawn on a circle of radius r in the caller's squashed frame.
function ring(ctx, k, r, lw, a, glint) {
  // faint interior with a slightly denser rim
  const g = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r);
  g.addColorStop(0, rgba(k.main, 0));
  g.addColorStop(0.75, rgba(k.main, 0.03 * a));
  g.addColorStop(1, rgba(k.main, 0.09 * a));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.lineCap = "round";
  // thin full rim
  ctx.strokeStyle = rgba(k.main, 0.82 * a);
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();
  // thick shadow side (lower right) gives the film some thickness
  ctx.strokeStyle = rgba(k.second, 0.95 * a);
  ctx.lineWidth = lw * 1.8;
  ctx.beginPath();
  ctx.arc(0, 0, r - lw * 0.15, 0.25 * Math.PI - 0.46 * Math.PI, 0.25 * Math.PI + 0.46 * Math.PI);
  ctx.stroke();
  // bright specular arc, upper left
  const ga = -0.75 * Math.PI + glint;
  ctx.strokeStyle = rgba(k.light, 0.96 * a);
  ctx.lineWidth = lw * 1.25;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.74, ga - 0.24 * Math.PI, ga + 0.2 * Math.PI);
  ctx.stroke();
  // small bright dot after the arc
  ctx.fillStyle = rgba(k.light, 0.9 * a);
  ctx.beginPath();
  ctx.arc(r * 0.74 * Math.cos(ga + 0.34 * Math.PI), r * 0.74 * Math.sin(ga + 0.34 * Math.PI), Math.max(0.9, lw * 0.55), 0, TAU);
  ctx.fill();
  // faint secondary reflection, lower right
  ctx.strokeStyle = rgba(k.light, 0.32 * a);
  ctx.lineWidth = lw * 0.8;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.78, 0.25 * Math.PI - 0.14 * Math.PI, 0.25 * Math.PI + 0.14 * Math.PI);
  ctx.stroke();
}

export default {
  id: "bubbles",
  name: "Bubbles",
  group: "ocean",
  blurb: "Thin glassy bubbles rise, wobble and grow slowly through still water.",
  motion: "travel",
  count: { min: 0, max: 40, default: 12, noun: "Bubble" },
  natural: [
    makeKit({ main: "#8fe3e8", light: "#f2ffff", dark: "#1d4e5c", accent: "#bff6ff", second: "#5cc7d6" }),
    makeKit({ main: "#cfe6ff", light: "#ffffff", dark: "#2b4a73", accent: "#e8f3ff", second: "#8fb8f0" }),
    makeKit({ main: "#5fc9b8", light: "#d8fff6", dark: "#10463f", accent: "#9ff0dc", second: "#3aa597" }),
    makeKit({ main: "#a9b8ff", light: "#f0f2ff", dark: "#2a3278", accent: "#d6dcff", second: "#7d8fe8" }),
  ],
  flow: {
    label: "Current",
    help: "Sideways push and wobble of the water.",
    default: 1,
    min: 0,
    max: 1.5,
  },
  backdrop: { dark: "#071620", light: "#e4eef2" },
  draw(ctx, w, h, S) {
    const u0 = S.min * S.size;
    const flow = S.flow === undefined ? 1 : S.flow;
    const m = 0.075 * u0; // off-stage margin top and bottom
    const dist = h + 2 * m;

    for (let i = 0; i < S.count; i++) {
      const k = S.kit(i);
      // identity: size class, speed, phase, wobble all depend on i only
      const sn = Math.pow(fract(0.72 + i * 0.6180339887), 1.35);
      const rFrac = lerp(0.013, 0.05, sn);
      const speed = h * lerp(0.04, 0.1, sn) * (0.9 + 0.2 * hash01(i, 2));
      const P = dist / speed;
      const phase = i === 0 ? 0.24 : hash01(i, 3);
      const q = S.t / P + phase;
      const c = Math.floor(q);
      const u = q - c;

      // cluster: bubbles i = 3g..3g+2 share a source column per stream window
      const g = Math.floor(i / 3);
      const T = 13 + 7 * hash01(g, 20);
      const wi = Math.floor(((c - phase) * P) / T);
      const col = hash01(g, wi, 21);
      const dir = (hash01(g, wi, 23) - 0.5) * 2;
      const drift = dir * flow * 0.11 * w;
      const x0 = lerp(0.1, 0.9, col) * w - drift * 0.5 + (hash01(i, c, 22) - 0.5) * 0.045 * w;
      const rise = u * u * (3 - 2 * u) * 0.35 + u * 0.65; // slightly eased
      const cyc = 2.2 + 2.6 * hash01(i, 5);
      const wA = w * (0.006 + 0.012 * (1 - sn)) * (0.35 + 0.8 * flow);
      const ph = hash01(i, 6) * TAU;
      const wob =
        wA * Math.sin(TAU * (u * cyc) + ph) + wA * 0.4 * Math.sin(TAU * (u * cyc * 2.3) + ph * 1.7);
      const x = keepIn(x0 + drift * rise + wob, w * 0.04, w * 0.96);
      const y = h + m - u * dist;

      const grow = 1 + 0.35 * u;
      const r = rFrac * u0 * grow * (0.92 + 0.16 * hash01(i, c, 24));
      const a = smoothstep(0, 0.1, u) * (1 - smoothstep(0.76, 0.99, u));
      if (a < 0.01 || y < -r * 2 || y > h + r * 2) continue;

      // shape wobble on the articulation clock: slight ellipse oscillation
      const fw = lerp(0.9, 0.38, sn) * (0.85 + 0.3 * hash01(i, 7));
      const ew = (0.04 + 0.075 * sn) * Math.sin(TAU * (S.b * fw + hash01(i, 8)));
      const tilt =
        0.5 * Math.sin(TAU * (S.b * fw * 0.37 + hash01(i, 9))) + 0.2 * Math.cos(TAU * (u * cyc) + ph);
      const lw = Math.min(2.6, Math.max(1.6, 1.3 + r * 0.045));
      const glint = 0.2 * Math.sin(TAU * (S.b * fw * 0.5 + hash01(i, 10)));
      at(ctx, x, y, tilt, 1 + ew, 1 - ew, () => ring(ctx, k, r, lw, a, glint));
    }
  },
};
