import { makeKit, TAU, clamp01, smoothstep, fract, hash01, rgba, shadeHex, glow } from "../core/util.js";

// Night sky: a stable star field (positions never move, no parallax, no zoom),
// slow per-star twinkle on the articulation clock, and a rare shooting star
// chosen deterministically from 8 s time slots on the travel clock.

const SLOT = 8; // seconds per shooting-star slot
const DUR = 1.15; // seconds a shooting star is visible
const A1 = 0.7548776662466927; // R2 low-discrepancy sequence (plastic number)
const A2 = 0.5698402909980532;

// Star i sits at the same place whatever the count is, and any prefix of the
// sequence is evenly spread (no clumps), with a small stable jitter.
function starAt(i, w, h) {
  const u = fract(0.5 + i * A1 + (hash01(i, 21) - 0.5) * 0.03);
  const v = fract(0.5 + i * A2 + (hash01(i, 22) - 0.5) * 0.03);
  return [w * (0.015 + 0.97 * u), h * (0.02 + 0.96 * v)];
}

function shootingStar(ctx, w, h, S, rate, unit) {
  if (!(rate > 0)) return;
  const k = Math.floor(S.t / SLOT);
  if (k < 0 || hash01(k, 91) >= Math.min(0.9, 0.12 * rate)) return;
  const t0 = k * SLOT + 0.7 + hash01(k, 92) * (SLOT - DUR - 1.4);
  const p = (S.t - t0) / DUR;
  if (p <= 0 || p >= 1) return;
  const kit = S.kit(k);
  const ang = ((15 + 25 * hash01(k, 93)) * Math.PI) / 180;
  const dir = hash01(k, 94) < 0.5 ? 1 : -1;
  const len = (0.4 + 0.2 * hash01(k, 95)) * w;
  const x0 = dir > 0 ? w * (0.04 + 0.3 * hash01(k, 96)) : w * (0.96 - 0.3 * hash01(k, 96));
  const y0 = h * (0.06 + 0.3 * hash01(k, 97));
  const ux = dir * Math.cos(ang),
    uy = Math.sin(ang);
  const hx = x0 + ux * len * p,
    hy = y0 + uy * len * p;
  const env = smoothstep(0, 0.14, p) * (1 - smoothstep(0.5, 1, p));
  const tailLen = len * 0.3 * (0.35 + 0.65 * smoothstep(0, 0.3, p)) * (1 - 0.4 * smoothstep(0.6, 1, p));
  const tx = hx - ux * tailLen,
    ty = hy - uy * tailLen;
  const nx = -uy,
    ny = ux;
  const hw = 1.5 * unit;
  const g = ctx.createLinearGradient(tx, ty, hx, hy);
  g.addColorStop(0, rgba(shadeHex(kit.main, 0.5), 0));
  g.addColorStop(0.55, rgba(shadeHex(kit.main, 0.85), 0.35 * env));
  g.addColorStop(1, rgba(kit.light, 0.95 * env));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(hx + nx * hw, hy + ny * hw);
  ctx.lineTo(tx, ty);
  ctx.lineTo(hx - nx * hw, hy - ny * hw);
  ctx.closePath();
  ctx.fill();
  // fine bright core line inside the wedge
  const g2 = ctx.createLinearGradient(tx + (hx - tx) * 0.35, ty + (hy - ty) * 0.35, hx, hy);
  g2.addColorStop(0, rgba(kit.light, 0));
  g2.addColorStop(1, rgba(kit.light, 0.9 * env));
  ctx.strokeStyle = g2;
  ctx.lineWidth = 1.1 * unit;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(tx + (hx - tx) * 0.35, ty + (hy - ty) * 0.35);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  glow(ctx, hx, hy, 8 * unit, kit.light, 0.55 * env);
  ctx.fillStyle = rgba(kit.light, env);
  ctx.beginPath();
  ctx.arc(hx, hy, 1.5 * unit, 0, TAU);
  ctx.fill();
}

export default {
  id: "night-sky",
  name: "Night sky",
  group: "quiet",
  blurb: "Stars hold still and breathe; now and then a shooting star slips across.",
  motion: "stationary",
  count: { min: 0, max: 220, default: 80, noun: "Star" },
  natural: [
    makeKit({ main: "#bcd0ff", light: "#f6f8ff", dark: "#6f7fa8", accent: "#ffe2a6", second: "#d9e4ff" }),
    makeKit({ main: "#c4d6ff", light: "#ffffff", dark: "#7a86a8", accent: "#ffd89a", second: "#e0e8ff" }),
    makeKit({ main: "#b8ccf8", light: "#fff8ee", dark: "#8a8296", accent: "#ffe7b8", second: "#dfe7fb" }),
  ],
  individual: false,
  extras: [
    {
      key: "shooting",
      type: "range",
      label: "Shooting stars",
      min: 0,
      max: 2,
      step: 0.05,
      default: 0.6,
      help: "How often a shooting star crosses. 0 turns them off.",
    },
  ],
  labels: { size: "Star size" },
  backdrop: { dark: "#070b16", light: "#e9edf3" },
  draw(ctx, w, h, S) {
    const unit = Math.max(0.8, Math.min(1.6, S.min / 560)) * S.size;
    ctx.lineCap = "round";
    for (let i = 0; i < S.count; i++) {
      const kit = S.kit(i);
      const [x, y] = starAt(i, w, h);
      const bright = i === 0 || fract(i * 0.6180339887 + 0.13) < 0.08;
      const medium = !bright && hash01(i, 2) < 0.3;
      const rc = hash01(i, 7);
      const hex = rc < 0.66 ? kit.light : rc < 0.86 ? kit.main : rc < 0.95 ? kit.second : kit.accent;
      // slow smooth twinkle (0.1 .. 0.5 Hz), amplitude about 0.25
      const f = 0.1 + 0.4 * hash01(i, 5);
      const ph = hash01(i, 6) * TAU;
      const tw = 0.8 * Math.sin(TAU * f * S.b + ph) + 0.2 * Math.sin(TAU * f * 0.37 * S.b + ph * 1.7 + 1);
      const base = bright ? 1 : medium ? 0.8 : 0.62 + 0.3 * hash01(i, 8);
      const br = clamp01(base * (1 + 0.25 * tw));
      const col = shadeHex(hex, 0.62 + 0.38 * br);
      const core = unit * (S.dark ? 1 : 1.35) * (bright ? 1.8 + 0.45 * br : medium ? 1.35 + 0.4 * br : 0.95 + 0.4 * br);
      const halo = unit * (bright ? 13 + 4 * br : medium ? 7 + 3 * br : 4.6 + 2.6 * br);
      glow(ctx, x, y, halo, col, bright ? 0.4 + 0.25 * br : 0.2 + 0.25 * br);
      if (bright) {
        const sp = 0.8 + 0.2 * Math.sin(TAU * 0.12 * S.b + ph);
        const L = unit * (17 + 11 * hash01(i, 9)) * sp * (0.8 + 0.2 * br);
        const a = 0.75 + 0.25 * br;
        ctx.lineWidth = 1.4 * unit;
        for (let d = 0; d < 2; d++) {
          const dx = d === 0 ? L : 0,
            dy = d === 0 ? 0 : L;
          const g = ctx.createLinearGradient(x - dx, y - dy, x + dx, y + dy);
          g.addColorStop(0, rgba(col, 0));
          g.addColorStop(0.5, rgba(col, a));
          g.addColorStop(1, rgba(col, 0));
          ctx.strokeStyle = g;
          ctx.beginPath();
          ctx.moveTo(x - dx, y - dy);
          ctx.lineTo(x + dx, y + dy);
          ctx.stroke();
        }
      }
      ctx.fillStyle = rgba(col, 0.5 + 0.5 * br);
      ctx.beginPath();
      ctx.arc(x, y, core, 0, TAU);
      ctx.fill();
    }
    const rate = S.extra && typeof S.extra.shooting === "number" ? S.extra.shooting : 0.6;
    shootingStar(ctx, w, h, S, rate, unit);
  },
};
