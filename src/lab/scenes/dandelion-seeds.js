import { makeKit, TAU, fract, mod, hash01, rgba, mixHex, glow, curve, at } from "../core/util.js";

// Dandelion seeds: each seed is a pappus parachute (15..19 fine spokes forming a
// shallow dome, seen in 3D so the ring of tips is an ellipse), a thin curved
// beak hanging below it and a small dark achene. The shared breeze carries the
// seeds sideways (travel clock, scaled by Wind); thermals lift and lower them;
// the assembly sways like a pendulum, slowly spins and flexes (articulation clock).

// Shared breeze: speed multiplier (never negative) and its exact time integral,
// so drift stays a pure function of t.
const WA = [0.34, 0.16, 0.22];
const WF = [0.19, 0.47, 0.083];
const WP = [1.3, 4.1, 2.2];
function windSpeed(t) {
  let v = 1;
  for (let k = 0; k < 3; k++) v += WA[k] * Math.sin(WF[k] * t + WP[k]);
  return v;
}
function windDist(t) {
  let d = t;
  for (let k = 0; k < 3; k++) d += (WA[k] / WF[k]) * (Math.cos(WP[k]) - Math.cos(WF[k] * t + WP[k]));
  return d;
}

const CA = 0.78,
  SA = 0.63; // barb angle, about 39 degrees from the spoke

// Trace every fine spoke together. Projection supplies depth without a
// binary near/far opacity swap when a rotating spoke crosses the mid-plane.
function traceSpokes(ctx, pts, nSp) {
  for (let j = 0; j < nSp; j++) {
    const o = j * 10;
    ctx.moveTo(0, 0);
    for (let k = 1; k < 5; k++) ctx.lineTo(pts[o + k * 2], pts[o + k * 2 + 1]);
  }
}
// Trace fine barbs along the outer half of each spoke.
function traceBarbs(ctx, pts, nSp, R) {
  for (let j = 0; j < nSp; j++) {
    const o = j * 10;
    for (let k = 2; k < 5; k++) {
      const ax = pts[o + (k - 1) * 2],
        ay = pts[o + (k - 1) * 2 + 1],
        bx = pts[o + k * 2],
        by = pts[o + k * 2 + 1];
      let dx = bx - ax,
        dy = by - ay;
      const dl = Math.hypot(dx, dy) || 1;
      dx /= dl;
      dy /= dl;
      const bl = R * (0.21 - 0.025 * k);
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + bl * (dx * CA - dy * SA), by + bl * (dx * SA + dy * CA));
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + bl * (dx * CA + dy * SA), by + bl * (-dx * SA + dy * CA));
    }
  }
}

function drawSeed(ctx, S, i, x, y, R, phi, e, spin, alpha) {
  const kit = S.kit(i);
  const nSp = 15 + Math.floor(hash01(i, 11) * 5);
  const se = Math.sin(e),
    ce = Math.cos(e);
  const pts = new Float32Array(nSp * 10);

  const wph = hash01(i, 19) * TAU;
  for (let j = 0; j < nSp; j++) {
    const th = (TAU * j) / nSp + (hash01(i, 40 + j) - 0.5) * 0.55 * (TAU / nSp) + spin;
    const L = R * (0.88 + 0.22 * hash01(i, 70 + j));
    // flex: a slow wave travelling round the ring opens and closes the dome
    const fx = 1 + 0.13 * Math.sin(TAU * 0.31 * S.b + j * 0.83 + wph);
    const c = Math.cos(th),
      s = Math.sin(th);

    for (let k = 1; k < 5; k++) {
      const u = k / 4;
      const rho = L * u * (1 - 0.1 * u * fx);
      const z = L * (0.64 * u - 0.44 * u * u) * fx;
      pts[j * 10 + k * 2] = rho * c;
      pts[j * 10 + k * 2 + 1] = -z * ce + rho * s * se;
    }
  }
  const lw = Math.max(1.4, Math.min(2.6, R * 0.065));
  const spoke = mixHex(kit.main, kit.light, 0.55),
    pale = kit.light;
  const B = R * (1.25 + 0.3 * hash01(i, 20));
  const bend = R * 0.17 * Math.sin(TAU * 0.24 * S.b + hash01(i, 21) * TAU);
  const bp = [
    [0, 0],
    [bend * 0.45, B * 0.33],
    [bend, B * 0.68],
    [bend * 0.6, B],
  ];
  const barbs = R > 12;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(phi);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // beak
  ctx.strokeStyle = rgba(mixHex(kit.main, kit.light, 0.35), alpha);
  ctx.lineWidth = Math.max(1.5, R * 0.05);
  curve(ctx, bp);
  ctx.stroke();
  // achene (dark teardrop hanging from the beak)
  const tx = bp[3][0] - bp[2][0],
    ty = bp[3][1] - bp[2][1];
  const ach = mixHex(kit.dark, kit.main, 0.5);
  const len = R * 0.52,
    wd = R * 0.14;
  at(ctx, bp[3][0], bp[3][1], Math.atan2(-tx, ty), 1, 1, () => {
    const g = ctx.createLinearGradient(-wd, 0, wd, 0);
    g.addColorStop(0, rgba(mixHex(ach, pale, 0.4), alpha));
    g.addColorStop(1, rgba(ach, alpha));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -len * 0.08);
    ctx.bezierCurveTo(wd * 0.6, len * 0.22, wd * 1.15, len * 0.6, 0, len);
    ctx.bezierCurveTo(-wd * 1.15, len * 0.6, -wd * 0.6, len * 0.22, 0, -len * 0.08);
    ctx.closePath();
    ctx.fill();
  });
  // Delicate translucent parachute, with continuous brightness during spin.
  ctx.strokeStyle = rgba(spoke, 0.85 * alpha);
  ctx.lineWidth = lw;
  ctx.beginPath();
  traceSpokes(ctx, pts, nSp);
  ctx.stroke();
  if (barbs) {
    ctx.strokeStyle = rgba(pale, 0.3 * alpha);
    ctx.lineWidth = Math.max(0.9, lw * 0.7);
    ctx.beginPath();
    traceBarbs(ctx, pts, nSp, R);
    ctx.stroke();
  }
  // tuft tips
  ctx.fillStyle = rgba(pale, alpha);
  ctx.beginPath();
  const tr = Math.max(1, R * 0.04);
  for (let j = 0; j < nSp; j++) {
    const px = pts[j * 10 + 8],
      py = pts[j * 10 + 9];
    ctx.moveTo(px + tr, py);
    ctx.arc(px, py, tr, 0, TAU);
  }
  ctx.fill();
  // hub
  glow(ctx, 0, 0, R * 0.34, pale, 0.65 * alpha);
  ctx.fillStyle = rgba(pale, 0.95 * alpha);
  ctx.beginPath();
  ctx.arc(0, 0, Math.max(1.2, R * 0.075), 0, TAU);
  ctx.fill();
  ctx.restore();
}

export default {
  id: "dandelion-seeds",
  name: "Dandelion seeds",
  group: "drift",
  blurb: "Parachute seeds float on a slow breeze, swaying as they rise and sink.",
  motion: "travel",
  count: { min: 0, max: 24, default: 8, noun: "Seed" },
  natural: [
    makeKit({ main: "#e4e9ea", light: "#ffffff", dark: "#6e6458", accent: "#b9c4c6", second: "#cfd6d8" }),
    makeKit({ main: "#f1e6c8", light: "#fffaf0", dark: "#6b4a2f", accent: "#d8c49a", second: "#e8d9b0" }),
    makeKit({ main: "#c8d8e6", light: "#f2f7fb", dark: "#4f5b6a", accent: "#9db3c8", second: "#b4c6d8" }),
  ],
  flow: {
    label: "Wind",
    help: "How strongly the breeze carries seeds sideways. 0 lets them hang and bob in place.",
    default: 1,
    min: 0,
    max: 1.5,
  },
  labels: { size: "Seed size" },
  backdrop: { dark: "#0f1311", light: "#eef0e8" },
  draw(ctx, w, h, S) {
    const unit = S.min * S.size;
    // two passes: smaller (farther) seeds first so nearer ones sit on top
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < S.count; i++) {
        const u = hash01(i, 3);
        if (u >= 0.5 !== (pass === 1)) continue;
        const D = S.depthOf ? S.depthOf(i) : null,
          dc = (D && S.layer(D.layer)) || ctx,
          dPace = D ? D.pace : 1;
        const R = 0.5 * unit * (0.125 + 0.055 * u) * (D ? D.scale : 1);
        const alpha = 0.78 + 0.22 * u;
        const m = 2.6 * R;
        const P = w + 2 * m;
        const tt = S.t + 3.1 * hash01(i, 9);
        const vmean = 0.03 * w * (0.72 + 0.56 * u) * S.flow * dPace;
        const x = -m + mod(fract(0.37 + i * 0.6180339887) * P + vmean * windDist(tt), P);
        const yb = h * (0.15 + 0.58 * fract(0.21 + i * 0.7548776662));
        const y =
          yb +
          h *
            0.045 *
            (Math.sin((TAU * S.t) / (11 + 7 * hash01(i, 12)) + hash01(i, 13) * TAU) +
              0.6 * Math.sin((TAU * S.t) / (4.7 + 3 * hash01(i, 14)) + hash01(i, 15) * TAU));
        const phi =
          0.3 * Math.sin(TAU * (0.12 + 0.07 * hash01(i, 5)) * S.b + hash01(i, 6) * TAU) +
          0.1 * Math.sin(TAU * 0.37 * S.b + hash01(i, 7) * TAU) +
          0.1 * (windSpeed(tt) - 1) * Math.min(1, S.flow);
        const e = 0.62 + 0.14 * Math.sin(TAU * 0.085 * S.b + hash01(i, 16) * TAU);
        const spin =
          hash01(i, 8) * TAU +
          TAU * 0.04 * (0.7 + 0.6 * hash01(i, 17)) * (hash01(i, 18) < 0.5 ? 1 : -1) * S.b;
        drawSeed(dc, S, i, x, y, R, phi, e, spin, alpha);
      }
    }
  },
};
