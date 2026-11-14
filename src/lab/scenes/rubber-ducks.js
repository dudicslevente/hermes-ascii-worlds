// Rubber ducks (minimal): one to three big glossy ducks float on a single wavy light water line with a few soap bubbles.
// Now and then a duck squeaks (squash and stretch). Extras: foam puffs under the ducks, soap bubbles, a tiny toy boat.
import { makeKit, TAU, clamp, clamp01, lerp, fract, hash01, rgba, mixHex, shadeHex, smoothstep, at, ellipse } from "../core/util.js";

const ss = smoothstep;

function palette(S, K) {
  const d = S.dark;
  return {
    water: d ? mixHex(K.second, K.light, 0.3) : shadeHex(K.second, 0.72),
    foam: d ? mixHex(K.light, "#ffffff", 0.8) : mixHex(K.second, "#ffffff", 0.5),
    bub: d ? mixHex(K.light, K.second, 0.3) : shadeHex(K.second, 0.7),
  };
}

// duck facing +x; origin on the waterline in the middle of the body; unit = duck height
function drawDuck(ctx, K, blink, mouth) {
  const rim = rgba(K.light, 0.7), lw = 0.035;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  // tail flip
  ctx.beginPath();
  ctx.moveTo(-0.45, -0.18);
  ctx.quadraticCurveTo(-0.84, -0.22, -0.9, -0.58);
  ctx.quadraticCurveTo(-0.62, -0.5, -0.38, -0.5);
  ctx.closePath();
  ctx.fillStyle = mixHex(K.main, K.dark, 0.1);
  ctx.fill();
  // body
  ellipse(ctx, -0.04, -0.15, 0.68, 0.4);
  const g = ctx.createLinearGradient(0, -0.55, 0, 0.25);
  g.addColorStop(0, mixHex(K.main, K.light, 0.35));
  g.addColorStop(0.6, K.main);
  g.addColorStop(1, mixHex(K.main, K.dark, 0.22));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = rim;
  ctx.lineWidth = lw;
  ctx.stroke();
  // neck + head
  ellipse(ctx, 0.2, -0.46, 0.27, 0.3);
  ctx.fillStyle = mixHex(K.main, K.light, 0.1);
  ctx.fill();
  ellipse(ctx, 0.3, -0.69, 0.32, 0.31);
  const hg = ctx.createRadialGradient(0.2, -0.82, 0.03, 0.3, -0.69, 0.36);
  hg.addColorStop(0, mixHex(K.main, K.light, 0.6));
  hg.addColorStop(0.55, K.main);
  hg.addColorStop(1, mixHex(K.main, K.dark, 0.15));
  ctx.fillStyle = hg;
  ctx.fill();
  ctx.strokeStyle = rim;
  ctx.stroke();
  // wing
  at(ctx, -0.14, -0.2, -0.28, 1, 1, () => {
    ellipse(ctx, 0, 0, 0.34, 0.18);
    ctx.fillStyle = mixHex(K.main, K.dark, 0.18);
    ctx.fill();
    ctx.strokeStyle = rgba(K.light, 0.6);
    ctx.lineWidth = 0.03;
    ctx.stroke();
  });
  // bill
  ellipse(ctx, 0.66, -0.64, 0.16, 0.065 + 0.012 * mouth);
  ctx.fillStyle = K.accent;
  ctx.fill();
  ellipse(ctx, 0.62, -0.58 + 0.025 * mouth, 0.12, 0.045 + 0.015 * mouth);
  ctx.fillStyle = mixHex(K.accent, K.dark, 0.2);
  ctx.fill();
  // eye
  if (blink > 0.5) {
    ctx.strokeStyle = mixHex(K.dark, "#000000", 0.4);
    ctx.lineWidth = 0.04;
    ctx.beginPath();
    ctx.moveTo(0.35, -0.76);
    ctx.lineTo(0.45, -0.76);
    ctx.stroke();
  } else {
    ellipse(ctx, 0.4, -0.76, 0.075, 0.08);
    ctx.fillStyle = mixHex(K.dark, "#000000", 0.5);
    ctx.fill();
    ellipse(ctx, 0.42, -0.79, 0.027, 0.027);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
  }
}

function bubble(ctx, P, x, y, r, a, pop) {
  if (pop > 0) {
    ctx.strokeStyle = rgba(P.bub, a * (1 - pop));
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r * (1 + 0.6 * pop), 0, TAU);
    ctx.stroke();
    return;
  }
  ctx.strokeStyle = rgba(P.bub, a);
  ctx.lineWidth = Math.max(1.5, r * 0.18);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = rgba(P.foam, a * 0.9);
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.35, Math.max(1, r * 0.2), 0, TAU);
  ctx.fill();
}

export default {
  id: "rubber-ducks",
  name: "Rubber ducks",
  group: "creatures",
  blurb: "A few glossy rubber ducks bob on a wavy water line among soap bubbles.",
  motion: "stationary",
  count: { min: 0, max: 3, default: 2, noun: "Duck" },
  natural: [
    makeKit({ main: "#f7c519", light: "#fff2ae", dark: "#6b4300", accent: "#ff8a1c", second: "#4aa7d8" }),
    makeKit({ main: "#f283b3", light: "#ffd8e8", dark: "#6e1f45", accent: "#ffb52e", second: "#5ab0d4" }),
    makeKit({ main: "#52a8ee", light: "#d6edff", dark: "#143a6a", accent: "#ffb52e", second: "#3f8fd0" }),
    makeKit({ main: "#6d5d92", light: "#d3c8ea", dark: "#1d1530", accent: "#f0a030", second: "#d6453a" }),
  ],
  atmosphere: "none",
  flow: { label: "Ripples", help: "How much the water line heaves and the ducks rock.", default: 1, min: 0, max: 1.5 },
  extras: [
    { key: "foam", type: "range", label: "Foam", min: 0, max: 1.5, step: 0.05, default: 1, help: "A few soft white puffs of foam under the ducks." },
    { key: "bubbles", type: "range", label: "Bubbles", min: 0, max: 1.5, step: 0.05, default: 1, help: "How many soap bubbles float up and pop." },
    { key: "boat", type: "toggle", label: "Toy boat", default: true, help: "A tiny boat drifts across the water." },
  ],
  backdrop: { dark: "#0b1417", light: "#e6eff0" },
  draw(ctx, w, h, S) {
    const ex = S.extra || {};
    const foamAmt = ex.foam ?? 1, bubAmt = ex.bubbles ?? 1, boatOn = ex.boat ?? true;
    const n = S.count;
    if (n < 1) return;
    const flow = S.flow == null ? 1 : S.flow;
    const K0 = S.kit(0);
    const P = palette(S, K0);
    const b = S.b;
    const x0 = 0.06 * w, x1 = 0.94 * w, yW = 0.64 * h;
    const A = (0.012 * h + 0.5) * flow, wl = Math.max(60, 0.16 * w);
    const surf = (x) => A * (Math.sin((x / wl) * TAU - b * 0.8) + 0.4 * Math.sin((x / (wl * 0.45)) * TAU + b * 1.2 + 1.3));
    const slope = (x) => (surf(x + 3) - surf(x - 3)) / 6;
    const u = clamp(Math.min(0.22 * h, 0.14 * w, (0.86 * w) / (1.65 * n + 0.4)) * Math.pow(S.size, 0.6), 22, Math.min(0.3 * h, (0.9 * w) / (1.65 * n + 0.4)));

    // the single water line
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = P.water;
    ctx.lineWidth = Math.max(2.5, u * 0.035);
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 8) (x === x0 ? ctx.moveTo(x, yW + surf(x)) : ctx.lineTo(x, yW + surf(x)));
    ctx.stroke();

    // ducks
    const ducks = [];
    for (let i = 0; i < n; i++) {
      const frac = (i + 0.5) / n;
      const x = lerp(x0, x1, n === 1 ? 0.5 : 0.18 + 0.64 * (i / (n - 1))) + Math.sin(S.t * 0.25 + i * 2) * 0.012 * w;
      const dir = i % 2 === 0 ? 1 : -1;
      const q = S.t / 12 + hash01(i, 4) * 3 + i / 3, c = Math.floor(q), age = (q - c) * 12;
      const sq = age < 0.6 ? Math.sin((age / 0.6) * Math.PI) : 0;
      const blink = hash01(i, 6, Math.floor(S.t / 4 + i)) > 0.6 && fract(S.t / 4 + i) < 0.04 ? 1 : 0;
      const kk = S.kit(i);
      const K = S.dark ? kk : { main: shadeHex(kk.main, 0.84), light: mixHex(kk.light, kk.main, 0.5), dark: kk.dark, accent: shadeHex(kk.accent, 0.9), second: kk.second };
      ducks.push({ i, x, dir, sq, blink, K, age });
      void frac;
    }

    // tiny boat
    if (boatOn) {
      const per = 28, q = S.t / per, f = q - Math.floor(q);
      const bx = lerp(x0 - 0.05 * w, x1 + 0.05 * w, f);
      const fade = ss(0, 0.06, f) * (1 - ss(0.94, 1, f));
      if (fade > 0.01) {
        const wy = yW + surf(bx);
        const s = u * 0.2;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(bx, wy);
        ctx.rotate(slope(bx) * 1.2);
        ctx.beginPath();
        ctx.moveTo(-0.9 * s, -0.5 * s);
        ctx.lineTo(0.9 * s, -0.5 * s);
        ctx.lineTo(0.55 * s, 0.1 * s);
        ctx.lineTo(-0.55 * s, 0.1 * s);
        ctx.closePath();
        ctx.fillStyle = K0.accent;
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, -0.5 * s);
        ctx.lineTo(0, -1.9 * s);
        ctx.lineTo(0.8 * s, -0.6 * s);
        ctx.closePath();
        ctx.fillStyle = K0.light;
        ctx.fill();
        ctx.restore();
      }
    }

    // foam puffs under ducks (behind them)
    if (foamAmt > 0.02) {
      for (const d of ducks) {
        const m = Math.round(2 * Math.min(foamAmt, 1.5));
        for (let k = 0; k < Math.max(1, m); k++) {
          const ox = (k - (m - 1) / 2) * 0.9 * u + Math.sin(S.t * 0.4 + k + d.i) * 0.04 * u;
          const px = d.x + ox, py = yW + surf(px) + 0.04 * u;
          const r = (0.15 + 0.05 * hash01(d.i, k, 2)) * u * Math.min(1, 0.4 + foamAmt * 0.6);
          ctx.fillStyle = rgba(P.foam, S.dark ? 0.85 : 0.9);
          for (const [dx, dy, rr] of [[0, 0, 1], [-0.7, 0.1, 0.7], [0.7, 0.08, 0.75]]) {
            ctx.beginPath();
            ctx.arc(px + dx * r, py + dy * r - 0.1 * r, Math.max(1, rr * r), 0, TAU);
            ctx.fill();
          }
        }
      }
    }

    // ducks
    for (const d of ducks) {
      const wy = yW + surf(d.x), sl = slope(d.x) * 1.4;
      const squash = 1 - 0.12 * d.sq, stretch = 1 + 0.12 * d.sq;
      const lift = Math.sin(S.t * 0.8 + d.i * 1.7) * 0.01 * u;
      ctx.save();
      ctx.translate(d.x, wy + 0.16 * u + lift * 0);
      ctx.rotate(sl * d.dir * 0.5 + Math.sin(b * 0.6 + d.i) * 0.02);
      ctx.scale(d.dir * u * stretch, u * squash);
      // clip the part under the water line
      ctx.save();
      ctx.beginPath();
      ctx.rect(-2, -2, 4, 1.86);
      ctx.clip();
      drawDuck(ctx, d.K, d.blink, d.sq);
      ctx.restore();
      ctx.restore();
      // squeak ticks
      if (d.sq > 0.05) {
        ctx.strokeStyle = rgba(P.foam, d.sq);
        ctx.lineWidth = Math.max(1.6, 0.03 * u);
        const bx = d.x + d.dir * 0.95 * u, by = wy - 0.42 * u;
        for (const k of [0, 1]) {
          ctx.beginPath();
          ctx.moveTo(bx + d.dir * (0.05 + 0.14 * k) * u, by - (0.12 * k - 0.04) * u - 0.08 * u);
          ctx.lineTo(bx + d.dir * (0.12 + 0.16 * k) * u, by - (0.12 * k - 0.04) * u - 0.14 * u);
          ctx.stroke();
        }
      }
    }

    // soap bubbles
    const nb = Math.round(3 + 4 * Math.min(1.5, bubAmt)) * (bubAmt < 0.03 ? 0 : 1);
    for (let k = 0; k < nb; k++) {
      const per = 7 + 3 * hash01(k, 1);
      const q = S.t / per + hash01(k, 2), c = Math.floor(q), f = q - c;
      const bx0 = lerp(x0, x1, hash01(k, 3, c) * 0.9 + 0.05);
      const rise = f * (1.1 + 0.4 * hash01(k, 4)) * u;
      const bx = bx0 + Math.sin(f * 6 + k) * 0.12 * u;
      const by = yW + surf(bx0) - 0.1 * u - rise;
      const r = (0.07 + 0.07 * hash01(k, 5, c)) * u;
      const pop = ss(0.85, 1, f);
      bubble(ctx, P, bx, by, r, 0.9 * ss(0, 0.08, f), pop);
    }

  },
};
