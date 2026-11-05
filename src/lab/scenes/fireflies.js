import { makeKit, TAU, lerp, fract, smoothstep, roam, at, ellipse, glow, hash01, rgba } from "../core/util.js";

// Fireflies: a handful of warm lights. Each one has a tiny glowing abdomen, a
// very faint dark body and two wing hints that only show while it glows. The
// glow follows its own slow pulse (articulation clock S.b); the wandering is a
// slow roam around a private home region (travel clock S.t).

// Softer falloff than util.glow(): keeps the halo a gentle gradient of glyphs.
function softGlow(ctx, x, y, r, hex, a) {
  if (a < 0.004 || r < 0.6) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(hex, a));
  g.addColorStop(0.2, rgba(hex, a * 0.64));
  g.addColorStop(0.46, rgba(hex, a * 0.24));
  g.addColorStop(0.74, rgba(hex, a * 0.035));
  g.addColorStop(0.9, rgba(hex, a * 0.008));
  g.addColorStop(1, rgba(hex, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

// Gentle soft wall so wanderers turn back before the stage edge.
function keepIn(v, lo, hi) {
  const m = (hi - lo) * 0.12;
  if (v < lo + m) return lo + m - m * (1 - Math.exp(-(lo + m - v) / m));
  if (v > hi - m) return hi - m + m * (1 - Math.exp(-(v - (hi - m)) / m));
  return v;
}

export default {
  id: "fireflies",
  name: "Fireflies",
  group: "drift",
  blurb: "A few warm lights wander lazily and pulse, each on its own slow rhythm.",
  motion: "travel",
  count: { min: 0, max: 40, default: 9, noun: "Firefly" },
  natural: [
    makeKit({ main: "#c4e04e", light: "#f6ffb4", dark: "#2a3410", accent: "#ffe27a", second: "#8fd16a" }),
    makeKit({ main: "#ffb23e", light: "#ffe6a8", dark: "#3a2208", accent: "#ff8f3a", second: "#ffd262" }),
    makeKit({ main: "#d8f07c", light: "#f8ffd6", dark: "#27360f", accent: "#b9e86c", second: "#ecf59c" }),
    makeKit({ main: "#f2cd58", light: "#fff2bc", dark: "#3a2d0c", accent: "#ffe18c", second: "#e9b84a" }),
  ],
  flow: {
    label: "Drift",
    help: "How far each firefly wanders and sways.",
    default: 1,
    min: 0,
    max: 1.5,
  },
  extras: [
    {
      key: "halo",
      type: "range",
      label: "Halo",
      min: 0.4,
      max: 1.6,
      step: 0.05,
      default: 1,
      help: "Reach of the soft glow around each firefly.",
    },
  ],
  backdrop: { dark: "#0a100c", light: "#eef1e4" },
  draw(ctx, w, h, S) {
    const u0 = S.min * S.size;
    const flow = S.flow === undefined ? 1 : S.flow;
    const halo = S.extra && S.extra.halo !== undefined ? S.extra.halo : 1;
    const amp = 0.2 + 0.8 * flow;
    const boost = S.dark === false ? 1.1 : 1;
    const n = S.count;
    const px = new Array(n),
      py = new Array(n),
      pl = new Array(n),
      pt = new Array(n);

    for (let i = 0; i < n; i++) {
      // Home region: low-discrepancy sequence so any count is evenly spread
      // and firefly i keeps its home when the count changes.
      const hx = 0.1 + 0.8 * fract(0.5 + i * 0.7548776662 + 0.07 * (hash01(i, 11) - 0.5));
      const hy = 0.16 + 0.68 * fract(0.5 + i * 0.569840291 + 0.07 * (hash01(i, 12) - 0.5));
      const p = roam(i, S.t, w, h, {
        rate: 0.2 + 0.1 * hash01(i, 13),
        ax: 0.1 * amp,
        ay: 0.075 * amp,
        cx: hx,
        cy: hy,
        seed: 5,
      });
      // slow vertical meander on top of the roam
      const q1 = hash01(i, 14) * TAU,
        q2 = hash01(i, 15) * TAU;
      const meander =
        h * 0.018 * amp * Math.sin(TAU * 0.055 * S.t + q1) +
        h * 0.009 * amp * Math.sin(TAU * 0.16 * S.t + q2);
      px[i] = keepIn(p.x, w * 0.04, w * 0.96);
      py[i] = keepIn(p.y + meander, h * 0.06, h * 0.94);
      pt[i] = 0.3 * Math.tanh(p.vx / (0.02 * w)); // lean into the drift

      // Individual smooth pulse: slow rise and fall, dim baseline, no flicker.
      const f = lerp(0.12, 0.3, hash01(i, 2));
      const ph = fract(i * 0.6180339887 + 0.3 * hash01(i, 3));
      const s = Math.sin(TAU * (S.b * f + ph));
      const pulse = s > 0 ? Math.pow(s, 2.4) : 0;
      pl[i] = 0.14 + 0.86 * pulse;
    }

    // Pass 1: halos (all of them first so bodies are never washed out).
    for (let i = 0; i < n; i++) {
      const k = S.kit(i),
        L = pl[i];
      const R = u0 * 0.13 * halo * (0.5 + 0.5 * L);
      softGlow(ctx, px[i], py[i], R, k.main, Math.min(0.9, (0.12 + 0.4 * L) * boost));
      softGlow(ctx, px[i], py[i], R * 0.42, k.second, Math.min(0.95, (0.16 + 0.6 * L) * boost));
    }

    // Pass 2: core, small dark body and wing hints.
    for (let i = 0; i < n; i++) {
      const k = S.kit(i),
        L = pl[i];
      const x = px[i],
        y = py[i];
      const bs = Math.max(S.dark ? 3 : 4, u0 * (S.dark ? 0.0125 : 0.016));
      glow(ctx, x, y, bs * (1.8 + 1.3 * L), k.light, 0.5 + 0.5 * L);
      const hi = smoothstep(0.42, 0.85, L); // body and wings only while glowing
      at(ctx, x, y, pt[i], 1, 1, () => {
        // wings: two faint leaf hints above the body, breathing with S.b
        if (hi > 0.01) {
          const beat = Math.sin(TAU * (S.b * 0.9 + hash01(i, 4)));
          const spread = 0.62 + 0.2 * beat;
          for (const side of [-1, 1]) {
            at(ctx, side * bs * 0.25, -bs * 1.0, side * spread, 1, 1, () => {
              ctx.fillStyle = rgba(k.light, 0.1 * hi);
              ellipse(ctx, 0, -bs * 1.5, bs * 0.7, bs * 1.6);
              ctx.fill();
              ctx.strokeStyle = rgba(k.light, 0.28 * hi);
              ctx.lineWidth = 1;
              ctx.stroke();
            });
          }
          // small dark body (head + thorax) just above the lit abdomen
          ctx.fillStyle = rgba(k.dark, 0.7 * hi);
          ellipse(ctx, 0, -bs * 1.05, bs * 0.42, bs * 0.7);
          ctx.fill();
        }
        // lit abdomen
        ctx.fillStyle = rgba(k.light, 0.35 + 0.65 * L);
        ellipse(ctx, 0, bs * 0.15, bs * 0.5, bs * 0.72);
        ctx.fill();
      });
    }
  },
};
