import { makeKit, TAU, clamp, clamp01, lerp, roam, at, poly, curve, ribbon, ellipse, glow, hash01, rgba, mixHex } from "../core/util.js";

// Manta rays, seen from above. Local frame: +x is the nose, +y the animal's right.
// H is half the wingspan; every length below is a fraction of H.
// Wings are built from stations root -> tip. Each station carries a flap angle with a
// phase that lags towards the tip, so the fin wave travels outward, the projected span
// breathes, the trailing edge ripples and the shading bands slide towards the tips.

const MANTA_N = 12;
const MANTA_SIZE = [0.38, 0.32, 0.41, 0.34, 0.36, 0.3];

const mantaLead = (u) => 0.42 - 0.43 * Math.pow(u, 1.5) - 0.07 * Math.pow(u, 6);
const mantaTrail = (u) => -0.5 + 0.4 * Math.pow(u, 0.85);

function mantaOne(ctx, w, h, S, i) {
  const kit = S.kit(i);
  const H = (S.min * S.size * MANTA_SIZE[i % MANTA_SIZE.length] * (0.96 + 0.08 * hash01(i, 3))) / 2;
  // Route the centre of the whole footprint, not just the wing roots. The
  // long tail is balanced by moving the body origin forward along heading.
  const fl = S.flow == null ? 1 : S.flow;
  const margin = H * (1.95 + 0.3 * fl) + 8;
  const axf = clamp(0.48 - margin / w, 0.01, 0.44);
  const ayf = clamp(0.48 - margin / h, 0.01, 0.42);
  const r = roam(i, S.t, w, h, {
    rate: 0.06 + 0.022 * hash01(i, 4),
    ax: axf,
    ay: ayf,
    cx: 0.5 + 0.04 * (hash01(i, 9) - 0.5),
    cy: 0.5 + 0.04 * (hash01(i, 10) - 0.5),
    seed: 5,
  });
  // The current pushes the animal gently across its own track; heading follows the real velocity.
  const dph = hash01(i, 12) * TAU;
  const dxa = fl * 0.3 * H;
  const dya = fl * 0.22 * H;
  const vx = r.vx + dxa * 0.1 * Math.cos(S.t * 0.1 + dph);
  const vy = r.vy + dya * 0.077 * Math.cos(S.t * 0.077 + dph * 1.7);
  const heading = Math.atan2(vy, vx);
  const px = r.x + dxa * Math.sin(S.t * 0.1 + dph) + H * 0.8 * Math.cos(heading);
  const py = r.y + dya * Math.sin(S.t * 0.077 + dph * 1.7) + H * 0.8 * Math.sin(heading);
  const bank = Math.tanh(r.turn * 5.5);

  const b = S.b;
  const f = 0.33 * (0.9 + 0.2 * hash01(i, 6));
  const ph0 = hash01(i, 7) * TAU;
  const beat = TAU * f * b + ph0;
  // slow alternation between a lazy glide and stronger flapping
  const power = 0.5 + 0.5 * Math.sin(b * 0.17 * (0.85 + 0.3 * hash01(i, 8)) + ph0 * 1.3);
  const amp = lerp(0.42, 0.95, power);

  const bendAmt = bank * 0.5 * H;
  const bendY = (x) => bendAmt * Math.pow(clamp01((0.35 * H - x) / (2.7 * H)), 1.6);

  const lw = Math.max(1.2, H * 0.02);
  const wings = [];
  for (const s of [1, -1]) {
    const sc = 1 - 0.2 * Math.max(0, s * bank) + 0.05 * Math.max(0, -s * bank);
    const L = [];
    const T = [];
    const lit = [];
    let yy = 0;
    let zz = 0;
    for (let k = 0; k <= MANTA_N; k++) {
      const u = k / MANTA_N;
      const pk = beat - u * 2.3 + s * 0.12;
      const th = amp * (0.1 + 0.9 * Math.pow(u, 1.3)) * Math.sin(pk);
      if (k > 0) {
        yy += (H / MANTA_N) * Math.cos(th);
        zz += (H / MANTA_N) * Math.sin(th);
      }
      const yk = s * yy * sc * (1 + (0.16 * zz) / H);
      const xl = mantaLead(u) * H + 0.05 * H * u * amp * Math.sin(pk + 0.9);
      const xt = mantaTrail(u) * H - (0.3 + 0.9 * u) * 0.085 * H * amp * Math.sin(pk - 0.9);
      L.push([xl, yk + bendY(xl)]);
      T.push([xt, yk + bendY(xt)]);
      lit.push(clamp01(0.5 + 0.5 * Math.cos(pk + 0.5) - 0.12 * s * bank));
    }
    wings.push({ L, T, lit });
  }

  at(ctx, px, py, heading, 1, 1, () => {
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // tail: thin, long, with a slight travelling wave
    const tp = [];
    for (let j = 0; j <= 12; j++) {
      const s = j / 12;
      const x = -0.5 * H - 1.7 * H * s;
      tp.push([x, bendY(x) + 0.07 * H * Math.pow(s, 1.1) * Math.sin(beat * 0.9 - s * 5.2 + 1.3)]);
    }
    poly(ctx, ribbon(tp, (s) => H * (0.05 * Math.pow(1 - s, 0.9) + 0.009)));
    ctx.fillStyle = rgba(mixHex(kit.main, kit.light, 0.3), 0.9);
    ctx.fill();
    curve(ctx, tp);
    ctx.strokeStyle = rgba(kit.light, 0.55);
    ctx.lineWidth = lw * 0.9;
    ctx.stroke();

    // wings
    for (const wg of wings) {
      const { L, T, lit } = wg;
      poly(ctx, L.concat(T.slice().reverse()));
      ctx.fillStyle = mixHex(kit.main, kit.dark, 0.2);
      ctx.fill();
      for (let k = 0; k < MANTA_N; k++) {
        const lt = (lit[k] + lit[k + 1]) / 2;
        const xa = (L[k][0] + L[k + 1][0]) / 2;
        const xb = (T[k][0] + T[k + 1][0]) / 2;
        const g = ctx.createLinearGradient(xa, 0, xb - 0.001, 0);
        g.addColorStop(0, mixHex(mixHex(kit.main, kit.dark, 0.18), kit.light, 0.12 + 0.5 * lt));
        g.addColorStop(0.5, mixHex(mixHex(kit.main, kit.dark, 0.42), kit.light, 0.78 * lt));
        g.addColorStop(1, mixHex(kit.second, kit.light, 0.22 + 0.5 * lt));
        poly(ctx, [L[k], L[k + 1], T[k + 1], T[k]]);
        ctx.globalAlpha = 0.93;
        ctx.fillStyle = g;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      // fine ribs along the span make the travelling wave readable as lines of glyphs
      for (const q of [0.3, 0.62]) {
        curve(ctx, L.map((p, k) => [p[0] + (T[k][0] - p[0]) * q, p[1]]));
        ctx.strokeStyle = rgba(kit.light, 0.3);
        ctx.lineWidth = lw * 0.8;
        ctx.stroke();
      }
      curve(ctx, L);
      ctx.strokeStyle = rgba(kit.light, 0.6);
      ctx.lineWidth = lw * 1.2;
      ctx.stroke();
      curve(ctx, T);
      ctx.strokeStyle = rgba(kit.light, 0.5);
      ctx.lineWidth = lw;
      ctx.stroke();
    }

    // body disc
    const spine = [];
    for (let j = 0; j <= 9; j++) {
      const x = lerp(0.46 * H, -0.5 * H, j / 9);
      spine.push([x, bendY(x)]);
    }
    poly(ctx, ribbon(spine, (s) => H * (0.14 + 0.19 * Math.sin(Math.PI * Math.pow(s, 0.85)) - 0.05 * s)));
    const bg = ctx.createLinearGradient(0.46 * H, 0, -0.5 * H, 0);
    bg.addColorStop(0, mixHex(kit.main, kit.light, 0.24));
    bg.addColorStop(0.45, mixHex(kit.main, kit.light, 0.12));
    bg.addColorStop(1, mixHex(kit.main, kit.dark, 0.25));
    ctx.fillStyle = bg;
    ctx.fill();
    glow(ctx, 0.04 * H, bendY(0.04 * H), 0.34 * H, mixHex(kit.main, kit.light, 0.4), 0.22);

    // pale shoulder patches
    for (const s of [1, -1]) {
      ellipse(ctx, 0.12 * H, s * 0.2 * H + bendY(0.12 * H), 0.17 * H, 0.055 * H, -s * 0.9);
      ctx.fillStyle = rgba(kit.light, 0.88);
      ctx.fill();
    }
    // subtle dorsal spots
    for (let j = 0; j < 7; j++) {
      const sx = lerp(-0.42, -0.02, hash01(i, 20 + 2 * j)) * H;
      const sy = (hash01(i, 21 + 2 * j) - 0.5) * 0.26 * H;
      ellipse(ctx, sx, sy + bendY(sx), H * (0.018 + 0.012 * hash01(i, 40 + j)), H * 0.02);
      ctx.fillStyle = rgba(kit.accent, 0.5);
      ctx.fill();
    }
    // cephalic lobes and eyes
    for (const s of [1, -1]) {
      const curl = 0.03 * H * Math.sin(beat * 0.9 + s * 0.7);
      const lp = [
        [0.4 * H, s * 0.12 * H],
        [0.5 * H, s * (0.115 * H + curl)],
        [0.6 * H, s * (0.1 * H + curl * 1.6)],
        [0.68 * H, s * (0.075 * H + curl * 2.2)],
      ];
      poly(ctx, ribbon(lp, (q) => H * (0.045 - 0.03 * q)));
      ctx.fillStyle = mixHex(kit.main, kit.light, 0.22);
      ctx.fill();
      ellipse(ctx, 0.3 * H, s * 0.255 * H, H * 0.026, H * 0.026);
      ctx.fillStyle = rgba(kit.accent, 0.95);
      ctx.fill();
    }
  });
}

export default {
  id: "manta-rays",
  name: "Manta rays",
  group: "ocean",
  blurb: "Broad dark wings undulate as manta rays glide on slow, banked turns.",
  motion: "travel",
  count: { min: 0, max: 6, default: 1, noun: "Manta ray" },
  natural: [
    makeKit({ main: "#4f7088", light: "#eef6f8", dark: "#101e2b", accent: "#a9cde0", second: "#7aa0b8" }),
    makeKit({ main: "#85766a", light: "#f1e8dc", dark: "#241f1b", accent: "#d2bb9c", second: "#a39384" }),
    makeKit({ main: "#8fb0c0", light: "#f4fafc", dark: "#2a4152", accent: "#dcedf3", second: "#aecbd8" }),
    makeKit({ main: "#41607c", light: "#e6f0f4", dark: "#0c1824", accent: "#8fb8d2", second: "#6a93b0" }),
  ],
  flow: { label: "Current", help: "How strongly the current drifts the rays sideways.", default: 1, min: 0, max: 1.5 },
  backdrop: { dark: "#08161f", light: "#e2edf0" },
  draw(ctx, w, h, S) {
    for (let i = 0; i < S.count; i++) mantaOne(ctx, w, h, S, i);
  },
};
