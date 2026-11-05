// Tiny fish school: top-down silvery fish following a broad leader route. Each
// fish trails the leader by its own lag plus a loose offset in the leader's
// local frame, so turns travel through the school and individuals turn at
// staggered moments. Heading = tangent of the fish's own trajectory.
// Wave 2: fish are about 1.5x longer and brighter (pale flanks, white back
// highlight), with a longer forked tail whose lobes are drawn as bright lines.
import { makeKit, TAU, clamp, clamp01, fract, roam, noise1, hash01, angleDiff, rgba, mixHex, curve, poly } from "../core/util.js";

const KP = 12; // spine points per fish (head = 0, tail tip = 11)
const BODY = 8; // body spans spine points 0..8, the forked tail fin takes the rest

function leader(T, w, h, flow, rate) {
  // One broad orbit with a nonzero tangent, rather than a multi-frequency
  // wander cusp that can whirl a delayed formation into a tight knot.
  const theta = T * rate + 0.8;
  const r = {
    x: w * (0.5 + 0.34 * Math.cos(theta)),
    y: h * (0.5 + 0.3 * Math.sin(theta)),
    heading: Math.atan2(h * 0.3 * Math.cos(theta), -w * 0.34 * Math.sin(theta)),
  };
  return {
    x: r.x + noise1(T * 0.05, 5) * 0.05 * w * flow,
    y: r.y + noise1(T * 0.043, 6) * 0.045 * h * flow,
    hd: r.heading,
  };
}

// Position of fish f at time T: the leader's route, delayed by the fish's lag,
// plus an offset in the leader's local frame (slot in the cloud + slow wander).
function fishPos(f, T, w, h, c) {
  const tt = T - f.lag;
  const L = leader(tt, w, h, c.flow, c.rate);
  const ch = Math.cos(L.hd),
    sh = Math.sin(L.hd);
  const lat =
    f.lat * c.spread * (0.3 + 0.7 * Math.sin(Math.PI * f.back)) +
    noise1(tt * 0.11 + f.ph, f.seed) * c.wander;
  const alo = noise1(tt * 0.09 + f.ph * 1.3, f.seed + 9) * c.wander * 1.4;
  // Compress the entire formation domain smoothly, never clamp individual
  // fish at an edge: loose cohesion retains the school and staggered turns.
  return [w * 0.5 + (L.x - sh * lat + ch * alo - w * 0.5) * c.fitX,
    h * 0.5 + (L.y + ch * lat + sh * alo - h * 0.5) * c.fitY];
}

function bodyProfile(u) {
  return Math.max(Math.pow(Math.sin(Math.PI * Math.pow(u, 0.62)), 0.85), 0.17 * u);
}

function drawFish(ctx, kit, f, S, c) {
  const d = 0.14;
  const a = fishPos(f, S.t - d, S.w, S.h, c),
    m = fishPos(f, S.t, S.w, S.h, c),
    e = fishPos(f, S.t + d, S.w, S.h, c);
  const hd = Math.atan2(e[1] - a[1], e[0] - a[0]);
  const turn = clamp(angleDiff(Math.atan2(m[1] - a[1], m[0] - a[0]), Math.atan2(e[1] - m[1], e[0] - m[0])) / d, -1.6, 1.6);
  const cs = Math.cos(hd),
    sn = Math.sin(hd);
  const L = f.len,
    Wmax = 0.14 * L;
  const om = TAU * f.freq;
  const amp = L * (0.12 + 0.03 * clamp01(Math.abs(turn)));
  const bendK = clamp(turn * 0.25, -0.25, 0.25);

  const sp = [],
    nx = [],
    ny = [];
  for (let k = 0; k < KP; k++) {
    const s = k / (KP - 1);
    const ly =
      amp * (0.08 + 0.92 * Math.pow(s, 1.8)) * Math.sin(om * S.b - TAU * 0.9 * s + f.ph) +
      bendK * s * s * L;
    const lx = L * (0.35 - s);
    sp.push([m[0] + cs * lx - sn * ly, m[1] + sn * lx + cs * ly]);
  }
  for (let k = 0; k < KP; k++) {
    const p = sp[Math.max(0, k - 1)],
      q = sp[Math.min(KP - 1, k + 1)];
    let dx = q[0] - p[0],
      dy = q[1] - p[1];
    const len = Math.hypot(dx, dy) || 1;
    nx.push(-dy / len);
    ny.push(dx / len);
  }
  const hw = (k) => Wmax * bodyProfile(k / BODY);
  const white = mixHex(kit.light, "#ffffff", 0.65);

  // forked tail fin (behind the body): two bright lobes with a deep notch
  const span = 0.21 * L;
  const bw = 0.2 * Wmax;
  const b8 = sp[BODY],
    b9 = sp[BODY + 1],
    b10 = sp[KP - 2],
    b11 = sp[KP - 1];
  const tdx = b11[0] - b10[0],
    tdy = b11[1] - b10[1];
  const tl = Math.hypot(tdx, tdy) || 1;
  const tnx = -tdy / tl,
    tny = tdx / tl;
  const tipU = [b11[0] + tnx * span, b11[1] + tny * span];
  const tipL = [b11[0] - tnx * span, b11[1] - tny * span];
  const notch = [b9[0] + (b10[0] - b9[0]) * 0.55, b9[1] + (b10[1] - b9[1]) * 0.55];
  poly(ctx, [[b8[0] + nx[BODY] * bw, b8[1] + ny[BODY] * bw], tipU, notch, tipL, [b8[0] - nx[BODY] * bw, b8[1] - ny[BODY] * bw]]);
  ctx.fillStyle = rgba(kit.light, 0.72);
  ctx.fill();
  ctx.strokeStyle = rgba(white, 0.95);
  ctx.lineWidth = Math.max(1.1, L * 0.045);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const tp of [tipU, tipL]) {
    ctx.beginPath();
    ctx.moveTo(b8[0], b8[1]);
    ctx.lineTo(tp[0], tp[1]);
    ctx.stroke();
  }

  // pectoral fins: small flicking triangles
  for (let side = -1; side <= 1; side += 2) {
    const r = sp[2],
      q = sp[3];
    const bx = q[0] - r[0],
      by = q[1] - r[1];
    const bl = Math.hypot(bx, by) || 1;
    const flick = 1 + 0.5 * Math.sin(TAU * 0.8 * S.b + f.ph + (side > 0 ? 0 : Math.PI));
    const rx = r[0] + nx[2] * hw(2) * 0.85 * side,
      ry = r[1] + ny[2] * hw(2) * 0.85 * side;
    poly(ctx, [
      [rx, ry],
      [rx + (bx / bl) * 0.17 * L + nx[2] * side * 0.12 * L * flick, ry + (by / bl) * 0.17 * L + ny[2] * side * 0.12 * L * flick],
      [rx + (bx / bl) * 0.09 * L, ry + (by / bl) * 0.09 * L],
    ]);
    ctx.fillStyle = rgba(kit.light, 0.8);
    ctx.fill();
  }

  // body
  const bodySpine = sp.slice(0, BODY + 1);
  const outline = [];
  const rightSide = [];
  for (let k = 0; k <= BODY; k++) {
    outline.push([bodySpine[k][0] + nx[k] * hw(k), bodySpine[k][1] + ny[k] * hw(k)]);
    rightSide.push([bodySpine[k][0] - nx[k] * hw(k), bodySpine[k][1] - ny[k] * hw(k)]);
  }
  const pts = outline.concat(rightSide.reverse());
  curve(ctx, pts, true);
  ctx.fillStyle = rgba(mixHex(kit.main, kit.light, 0.5), 1);
  ctx.fill();

  // pale belly-side flanks: broad lit centre
  const ridgeL = [],
    ridgeR = [];
  for (let k = 0; k <= BODY; k++) {
    const rw = hw(k) * 0.62;
    ridgeL.push([bodySpine[k][0] + nx[k] * rw, bodySpine[k][1] + ny[k] * rw]);
    ridgeR.push([bodySpine[k][0] - nx[k] * rw, bodySpine[k][1] - ny[k] * rw]);
  }
  curve(ctx, ridgeL.concat(ridgeR.reverse()), true);
  ctx.fillStyle = rgba(kit.light, 0.95);
  ctx.fill();

  // bright back highlight along the spine
  const back = [];
  for (let k = 0; k <= BODY - 1; k++) back.push(bodySpine[k]);
  curve(ctx, back, false);
  ctx.strokeStyle = rgba(white, 1);
  ctx.lineWidth = Math.max(1.2, L * 0.075);
  ctx.stroke();

  // flank glint on each side, brighter on the inside of a turn; cross-fades smoothly
  for (let side = -1; side <= 1; side += 2) {
    const glint = 0.2 + 0.1 * Math.sin(S.b * 0.7 + f.ph + side) + 0.7 * clamp01(side * turn * 1.1);
    const gl = [];
    for (let k = 1; k <= 6; k++) {
      gl.push([bodySpine[k][0] + nx[k] * side * hw(k) * 0.62, bodySpine[k][1] + ny[k] * side * hw(k) * 0.62]);
    }
    curve(ctx, gl, false);
    ctx.strokeStyle = rgba(kit.accent, clamp01(glint));
    ctx.lineWidth = Math.max(1, L * 0.06);
    ctx.stroke();
  }

  // eyes: two small dark dots set back from the snout
  const ex = bodySpine[1];
  for (let side = -1; side <= 1; side += 2) {
    ctx.beginPath();
    ctx.arc(ex[0] + nx[1] * side * hw(1) * 0.55, ex[1] + ny[1] * side * hw(1) * 0.55, Math.max(0.9, L * 0.035), 0, TAU);
    ctx.fillStyle = rgba(kit.dark, 0.85);
    ctx.fill();
  }
  ctx.lineCap = "butt";
}

export default {
  id: "tiny-fish-school",
  name: "Tiny fish school",
  group: "ocean",
  blurb: "A loose silver school follows one broad route, turning in a rolling wave.",
  motion: "travel",
  count: { min: 0, max: 40, default: 12, noun: "Fish" },
  natural: [
    makeKit({ main: "#8fb4cf", light: "#e6f2fb", dark: "#2f5675", accent: "#c4e6ff", second: "#6a95b8" }),
    makeKit({ main: "#cdbf94", light: "#f7f0d8", dark: "#6b5a30", accent: "#ffe0a0", second: "#a99868" }),
    makeKit({ main: "#8fcfc4", light: "#e5faf5", dark: "#2b6b66", accent: "#c8fff1", second: "#6bb5ad" }),
    makeKit({ main: "#d2aebd", light: "#fcebf1", dark: "#7a4a5e", accent: "#ffd6e6", second: "#b88aa0" }),
  ],
  flow: { label: "Current", help: "How far the water drifts the school and how loose its edges are.", default: 1, min: 0, max: 1.5 },
  extras: [
    { key: "cohesion", type: "range", label: "Cohesion", min: 0.3, max: 1.5, step: 0.05, default: 1, help: "How tightly the fish hold together behind the leader." },
  ],
  backdrop: { dark: "#091821", light: "#e3edf0" },
  draw(ctx, w, h, S) {
    const coh = clamp(S.extra && S.extra.cohesion != null ? S.extra.cohesion : 1, 0.3, 1.5);
    const flow = S.flow == null ? 1 : S.flow;
    const amean = 0.5 * (0.34 * w + 0.3 * h);
    const c = {
      flow,
      rate: clamp((0.04 * S.min) / amean, 0.07, 0.13),
      spread: (0.17 * S.min) / Math.pow(coh, 0.8),
      wander: (0.03 * S.min * (0.6 + 0.6 * flow)) / Math.sqrt(coh),
    };
    const margin = 0.1 * S.min * S.size + 4;
    const cloud = c.spread + c.wander * 2.4;
    c.fitX = Math.min(1, Math.max(0.05, (w * 0.5 - margin) / ((0.34 + 0.05 * flow) * w + cloud)));
    c.fitY = Math.min(1, Math.max(0.05, (h * 0.5 - margin) / ((0.3 + 0.045 * flow) * h + cloud)));
    const lagSpan = 6.2 / Math.pow(coh, 0.6);
    for (let i = 0; i < S.count; i++) {
      const back = clamp01(fract(0.5 + i * 0.7548776662) + 0.12 * (hash01(i, 2) - 0.5));
      const f = {
        back,
        lat: fract(0.5 + i * 0.569840291) * 2 - 1,
        lag: 0.2 + back * lagSpan,
        ph: hash01(i, 7) * TAU,
        freq: 1.25 + 0.55 * hash01(i, 8),
        len: 0.083 * S.min * S.size * (0.85 + 0.35 * hash01(i, 9)),
        seed: 100 + i * 3,
      };
      ctx.globalAlpha = 0.92 + 0.08 * hash01(i, 10);
      drawFish(ctx, S.kit(i), f, S, c);
    }
    ctx.globalAlpha = 1;
  },
};
