import { placeAtDepth } from "../core/depth.js";
import { makeKit, TAU, clamp, clamp01, lerp, smoothstep, fract, roam, at, poly, curve, ellipse, hash01, rgba, mixHex } from "../core/util.js";

// Deep-sea anglerfish, seen from the side. Local frame: +x is forward (the
// mouth), +y is down; R is the body radius. The fish hangs almost still and
// drifts; fins flutter and the lure sways on the articulation clock. A small
// prey fish is drawn to the lure; when it gets close the jaw snaps open, the
// prey is gone, and a new one arrives a little later. All closed form.

const SIZE = [0.155, 0.13, 0.14];

const smoother = (a, b, x) => {
  const u = clamp01((x - a) / (b - a));
  return u * u * u * (u * (u * 6 - 15) + 10);
};

function softGlow(ctx, x, y, r, hex, a) {
  if (a < 0.004 || r < 0.6) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(hex, a));
  g.addColorStop(0.25, rgba(hex, a * 0.55));
  g.addColorStop(0.6, rgba(hex, a * 0.14));
  g.addColorStop(1, rgba(hex, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

// Body outline (upper half), from the snout back to the tail stalk, as
// [x, yTop, yBottom] in units of R. Big head, short tapering body.
const PROFILE = [
  [1.0, -0.38, 0.05],
  [0.86, -0.72, 0.42],
  [0.55, -0.95, 0.78],
  [0.15, -0.98, 0.9],
  [-0.25, -0.86, 0.8],
  [-0.6, -0.6, 0.55],
  [-0.88, -0.3, 0.27],
  [-1.08, -0.16, 0.14],
];

// Phase of one hunt: 0..1. The prey drifts in over most of the cycle; the
// strike happens near the end.
function hunt(i, t) {
  const P = 13 + 5 * hash01(i, 21);
  const q = fract(t / P + hash01(i, 22));
  return { q, cycle: Math.floor(t / P + hash01(i, 22)) };
}

function drawAngler(ctx, S, i, x, y, R, face, preyOn, glowAmt) {
  const kit = S.kit(i);
  const b = S.b;
  const { q, cycle } = hunt(i, S.t);
  // Jaw: resting a little open. It eases wide while the prey is pulled in,
  // holds a beat, then closes slowly; smootherstep keeps both ends soft.
  const snap = preyOn ? smoother(0.76, 0.84, q) * (1 - smoother(0.87, 0.99, q)) : 0;
  const breathe = 0.5 + 0.5 * Math.sin(b * 0.7 + i);
  const open = 0.16 + 0.06 * breathe + 0.7 * snap;
  // Lure: rod from the forehead arching forward over the mouth.
  const sway = 0.1 * Math.sin(b * 0.9 + hash01(i, 3) * TAU) + 0.05 * Math.sin(b * 2.3 + i);
  const rod = [[0.3, -0.92], [0.55 + sway * 0.4, -1.45], [1.05 + sway, -1.55], [1.42 + sway * 1.3, -1.12 - snap * 0.25]];
  const esca = rod[3];
  const pulse = 0.72 + 0.28 * Math.sin(b * 1.6 + hash01(i, 4) * TAU);
  const lure = kit.accent;

  at(ctx, x, y, 0, face * R, R, () => {
    const px = 1 / R;
    // Light from the lure falls on the face.
    softGlow(ctx, esca[0], esca[1], 2.1, lure, 0.1 * glowAmt * pulse);

    // tail fin
    const wag = 0.25 * Math.sin(b * 1.4 + i * 1.7);
    poly(ctx, [[-1.0, -0.12], [-1.55, -0.55 + wag], [-1.45, 0 + wag * 0.6], [-1.55, 0.5 + wag], [-1.0, 0.12]]);
    ctx.fillStyle = mixHex(kit.second, kit.dark, 0.3);
    ctx.fill();
    ctx.strokeStyle = rgba(kit.light, 0.45);
    ctx.lineWidth = 1.2 * px;
    ctx.stroke();

    // body
    const top = PROFILE.map(([u, a]) => [u, a]);
    const bottom = PROFILE.slice().reverse().map(([u, , c]) => [u, c]);
    curve(ctx, top.concat(bottom), true);
    const g = ctx.createRadialGradient(esca[0] - 0.4, esca[1] + 0.6, 0.2, 0.2, 0, 1.9);
    g.addColorStop(0, mixHex(kit.main, kit.light, 0.35 * glowAmt));
    g.addColorStop(0.55, kit.main);
    g.addColorStop(1, mixHex(kit.main, kit.dark, 0.5));
    ctx.fillStyle = g;
    ctx.fill();

    // Lower jaw: an underbite that juts past the upper lip, hinged under the
    // eye. jaw(u, v) maps the jaw's own frame (tip at u = 1) into the body.
    const ang = open * 0.85;
    const hinge = [0.25, 0.3];
    const jaw = (u, v) => [hinge[0] + u * Math.cos(ang) - v * Math.sin(ang), hinge[1] + u * Math.sin(ang) + v * Math.cos(ang)];
    const outer = [[0, 0.2], [0.45, 0.34], [0.85, 0.24], [1.02, -0.02]].map(([u, v]) => jaw(u, v));
    const inner = [[0.97, -0.14], [0.62, -0.07], [0.25, -0.03], [0, 0]].map(([u, v]) => jaw(u, v));
    curve(ctx, outer.concat(inner), true);
    ctx.fillStyle = mixHex(kit.main, kit.light, 0.12);
    ctx.fill();
    // Mouth: cut out of the art so it is real empty space, not dark ink
    // (dark ink on a dark backdrop is lifted and would read as more body).
    const lip = [[1.03, -0.12], [0.78, 0.0], [0.5, 0.1], [0.28, 0.2]];
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    curve(ctx, lip.concat(inner.slice().reverse().slice(1)), true);
    ctx.fillStyle = "#000000";
    ctx.fill();
    ctx.restore();
    // teeth: pale needles, longer towards the front, on both jaws
    ctx.strokeStyle = rgba(mixHex(kit.light, "#ffffff", 0.5), 1);
    ctx.lineWidth = 1.6 * px;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const f = k / 4;
      const u = lerp(0.42, 0.98, f), v = lerp(0.12, -0.1, f);
      ctx.moveTo(u, v);
      ctx.lineTo(u + 0.03, v + 0.1 + 0.08 * f + 0.1 * open);
      const p0 = jaw(lerp(0.3, 0.95, f), lerp(-0.04, -0.13, f));
      const p1 = jaw(lerp(0.3, 0.95, f) + 0.03, lerp(-0.04, -0.13, f) - 0.1 - 0.08 * f - 0.1 * open);
      ctx.moveTo(p0[0], p0[1]);
      ctx.lineTo(p1[0], p1[1]);
    }
    ctx.stroke();

    // pectoral fin, fluttering
    const fl = 0.5 + 0.5 * Math.sin(b * 2.1 + i * 2.3);
    poly(ctx, [[-0.15, 0.2], [-0.62, 0.05 - 0.2 * fl], [-0.7, 0.35], [-0.55, 0.6 + 0.15 * fl], [-0.15, 0.42]]);
    ctx.fillStyle = rgba(mixHex(kit.second, kit.light, 0.2), 0.85);
    ctx.fill();
    // dorsal spines
    ctx.strokeStyle = rgba(kit.light, 0.55);
    ctx.lineWidth = 1.1 * px;
    ctx.beginPath();
    for (let k = 0; k < 3; k++) {
      const u = -0.25 - 0.22 * k;
      const base = -0.86 + k * 0.12;
      ctx.moveTo(u, base);
      ctx.lineTo(u - 0.12, base - 0.22 + 0.04 * Math.sin(b * 1.3 + k));
    }
    ctx.stroke();
    // skin speckles
    ctx.fillStyle = rgba(kit.dark, 0.45);
    for (let k = 0; k < 7; k++) {
      ellipse(ctx, lerp(-0.7, 0.5, hash01(i, 40 + k)), lerp(-0.6, 0.55, hash01(i, 50 + k)), 0.05, 0.04);
      ctx.fill();
    }
    // eye: small, high on the head
    ellipse(ctx, 0.52, -0.5, 0.11, 0.11);
    ctx.fillStyle = mixHex(kit.dark, "#000000", 0.3);
    ctx.fill();
    ellipse(ctx, 0.55, -0.53, 0.035, 0.035);
    ctx.fillStyle = rgba(lure, 0.9);
    ctx.fill();

    // rod and lure
    curve(ctx, rod);
    ctx.strokeStyle = rgba(mixHex(kit.second, kit.light, 0.35), 0.95);
    ctx.lineWidth = 1.5 * px;
    ctx.stroke();
    softGlow(ctx, esca[0], esca[1], 0.25 + 0.3 * glowAmt, lure, 0.55 * pulse * Math.min(1, glowAmt));
    ellipse(ctx, esca[0], esca[1], 0.09, 0.09);
    ctx.fillStyle = mixHex(lure, "#ffffff", 0.55);
    ctx.fill();

    // prey: a small fish wandering towards the lure; gone at the strike
    if (preyOn && q < 0.86) {
      // Swim in to just in front of the lure, nibble, then get sucked into
      // the mouth as the jaw snaps open.
      const k = smoothstep(0.05, 0.7, q);
      const near = [esca[0] + 0.28, esca[1] + 0.12];
      let sx = lerp(3.0, near[0], k) + 0.1 * Math.sin(S.t * 1.7 + i) * (1 - k * 0.6),
        sy = lerp(-0.1 + 0.6 * hash01(i, cycle, 23), near[1], k) + 0.08 * Math.sin(S.t * 2.3 + i);
      const suck = smoother(0.81, 0.86, q);
      sx = lerp(sx, 0.95, suck);
      sy = lerp(sy, 0.12, suck);
      const fade = smoothstep(0.02, 0.1, q) * (1 - smoother(0.84, 0.86, q));
      ctx.globalAlpha = fade;
      at(ctx, sx, sy, 0.15 * Math.sin(S.t * 1.7 + i), 1, 1, () => {
        const wagp = 0.06 * Math.sin(b * 6 + i);
        ellipse(ctx, 0, 0, 0.17, 0.07);
        ctx.fillStyle = mixHex(kit.light, "#ffffff", 0.3);
        ctx.fill();
        poly(ctx, [[0.14, 0], [0.26, -0.07 + wagp], [0.26, 0.07 + wagp]]);
        ctx.fill();
        ellipse(ctx, -0.09, -0.015, 0.02, 0.02);
        ctx.fillStyle = kit.dark;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }
  });
}

export default {
  id: "anglerfish",
  name: "Anglerfish",
  group: "ocean",
  blurb: "In the dark deep, an anglerfish dangles a glowing lure and waits for something curious.",
  motion: "travel",
  count: { min: 0, max: 3, default: 1, noun: "Anglerfish" },
  natural: [
    makeKit({ main: "#5c4a3c", light: "#d8c3a8", dark: "#1a120d", accent: "#8ff5dc", second: "#7a6150" }),
    makeKit({ main: "#4c5360", light: "#cdd4de", dark: "#14181f", accent: "#ffd27a", second: "#646c7a" }),
    makeKit({ main: "#6a3e3d", light: "#e3bcb5", dark: "#200f0f", accent: "#a9e6ff", second: "#86514f" }),
  ],
  flow: { label: "Current", help: "How much the anglerfish drift and bob in the water.", default: 1, min: 0, max: 1.5 },
  extras: [
    { key: "glow", type: "range", label: "Lure glow", min: 0.3, max: 1.5, step: 0.05, default: 1, help: "How brightly the lure shines and lights the face." },
    { key: "prey", type: "toggle", label: "Curious prey", default: true, help: "Small fish swim up to the lure, and the anglerfish snaps." },
  ],
  backdrop: { dark: "#03070c", light: "#e3e8ec" },
  draw(ctx, w, h, S) {
    const flow = S.flow == null ? 1 : S.flow;
    const ex = S.extra || {};
    const glowAmt = clamp(ex.glow ?? 1, 0.3, 1.5);
    const preyOn = ex.prey !== false;
    const order = [];
    for (let i = 0; i < S.count; i++) order.push(i);
    // Far ones first, so nearer anglers overlap them.
    order.sort((a, b) => (S.depthOf ? S.depthOf(a).z - S.depthOf(b).z : 0) || a - b);
    for (const i of order) {
      const { ctx: c, S: s } = placeAtDepth(ctx, S, i);
      const R = s.min * s.size * SIZE[i % SIZE.length] * (0.95 + 0.1 * hash01(i, 1));
      const face = S.count === 1 ? 1 : i % 2 ? -1 : 1;
      // Room for the lure in front and the tail behind.
      const mx = (R * 1.8 + 8) / w,
        my = (R * 1.7 + 8) / h;
      const home = S.count === 1 ? [0.45, 0.55] : [[0.36, 0.58], [0.66, 0.42], [0.5, 0.72]][i % 3];
      const r = roam(i, s.t, w, h, {
        rate: 0.035,
        ax: clamp(0.06 + 0.05 * flow, 0, 0.5 - mx),
        ay: clamp(0.04 + 0.04 * flow, 0, 0.5 - my),
        cx: clamp(home[0], mx + 0.02, 1 - mx - 0.02),
        cy: clamp(home[1], my + 0.02, 1 - my - 0.02),
        seed: 23,
      });
      const bob = R * 0.08 * Math.sin(s.b * 0.6 + i * 2);
      drawAngler(c, s, i, r.x, r.y + bob, R, face, preyOn, glowAmt);
    }
  },
};
