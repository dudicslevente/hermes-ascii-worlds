import { makeKit, TAU, clamp, lerp, smoothstep, hash01, rgba, mixHex, roam, at, poly, curve, ellipse } from "../core/util.js";

// Swallows, seen from above. Body frame: origin at the shoulders, +x toward the
// head, unit = semi-span s. Route and heading come from roam() on S.t. Wing beats,
// flap/glide alternation, wrist bend and tail spread are functions of S.b.
// Wing = arm segment + hand segment; the wrist bends and both segments foreshorten
// with the stroke, so the wing visibly flexes.
// Wave 2: wingspan about 1.5x (0.20-0.24 of S.min x size), brighter wings with a
// bright leading edge, thicker deeper-forked tail with two long bright streamers.

const D2R = Math.PI / 180;

const KITS = [
  makeKit({ main: "#3f6fb8", light: "#f2dcc4", dark: "#10203f", accent: "#c9683a", second: "#6c90d4" }),
  makeKit({ main: "#8d8074", light: "#eae0d3", dark: "#3a322c", accent: "#b9855c", second: "#a99a8a" }),
  makeKit({ main: "#4e86ae", light: "#eef4f7", dark: "#14293d", accent: "#d9885c", second: "#7fa9cf" }),
];

// Wing pose from the stroke phase phi and flapping amount fa (0 = glide).
function wingState(phi, fa) {
  const flex = 0.5 - 0.5 * Math.sin(phi); // 0 extended (mid downstroke) .. 1 flexed (mid upstroke)
  return {
    sa: lerp(14 * D2R, lerp(2 * D2R, 28 * D2R, flex), fa),
    be: lerp(54 * D2R, lerp(24 * D2R, 80 * D2R, flex), fa),
    ea: lerp(-0.06, 0.6 * Math.cos(phi), fa),
    eh: lerp(-0.1, 0.95 * Math.cos(phi - 0.85), fa),
  };
}

const LEAD_OFF = [0.015, 0.02, 0.03, 0.024, 0.012, 0];
const TRAIL_CH = [0.37, 0.34, 0.28, 0.165, 0.065, 0];

// Leading and trailing edge points (right wing, y >= 0) for a wing state.
function wingGeom(st, k) {
  const La = 0.52 * k * Math.cos(st.ea);
  const Lh = 0.66 * k * Math.cos(st.eh);
  const sa = st.sa;
  const sh = st.sa + st.be;
  const da = [-Math.sin(sa), Math.cos(sa)];
  const dh = [-Math.sin(sh), Math.cos(sh)];
  const na = [-Math.cos(sa), -Math.sin(sa)];
  const nh = [-Math.cos(sh), -Math.sin(sh)];
  const nm = [(na[0] + nh[0]) * 0.5, (na[1] + nh[1]) * 0.5];
  const S0 = [0.07, 0.07];
  const S2 = [S0[0] + da[0] * La, S0[1] + da[1] * La];
  const P = [
    S0,
    [S0[0] + da[0] * La * 0.5, S0[1] + da[1] * La * 0.5],
    S2,
    [S2[0] + dh[0] * Lh * 0.45, S2[1] + dh[1] * Lh * 0.45],
    [S2[0] + dh[0] * Lh * 0.8, S2[1] + dh[1] * Lh * 0.8],
    [S2[0] + dh[0] * Lh, S2[1] + dh[1] * Lh],
  ];
  const Nn = [na, na, nm, nh, nh, nh];
  const lead = [];
  const trail = [];
  for (let j = 0; j < 6; j++) {
    lead.push([P[j][0] - Nn[j][0] * LEAD_OFF[j], P[j][1] - Nn[j][1] * LEAD_OFF[j]]);
    const c = TRAIL_CH[j] * (0.85 + 0.15 * k);
    trail.push([P[j][0] + Nn[j][0] * c, P[j][1] + Nn[j][1] * c]);
  }
  return { lead, trail };
}

function drawWing(ctx, g, kit, lift, px) {
  const { lead, trail } = g;
  const all = lead.concat(trail.slice(0, 5).reverse());
  // glossy upper surface, lifted to a bright mid-tone so the swept wing reads
  poly(ctx, all);
  ctx.fillStyle = mixHex(kit.main, kit.light, 0.3 + clamp(lift, 0, 1) * 0.2);
  ctx.fill();
  // pale wing lining along the trailing half
  const mid = [];
  for (let j = 0; j < 6; j++) mid.push([lerp(lead[j][0], trail[j][0], 0.45), lerp(lead[j][1], trail[j][1], 0.45)]);
  poly(ctx, mid.concat(trail.slice(0, 5).reverse()));
  ctx.fillStyle = rgba(kit.light, 0.88);
  ctx.fill();
  // primaries: dark feather separations in the hand
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = rgba(kit.dark, 0.5);
  ctx.lineWidth = 1 * px;
  ctx.beginPath();
  for (const j of [3, 4]) {
    ctx.moveTo(lerp(lead[j][0], trail[j][0], 0.3), lerp(lead[j][1], trail[j][1], 0.3));
    ctx.lineTo(trail[j][0], trail[j][1]);
  }
  ctx.stroke();
  // bright leading edge, drawn last so it stays continuous from shoulder to tip
  ctx.strokeStyle = rgba(mixHex(kit.light, "#ffffff", 0.55), 0.98);
  ctx.lineWidth = 2.9 * px;
  ctx.beginPath();
  for (let j = 0; j < 6; j++) (j ? ctx.lineTo(lead[j][0], lead[j][1]) : ctx.moveTo(lead[j][0], lead[j][1]));
  ctx.stroke();
}

function drawTail(ctx, kit, spread, px) {
  const tone = mixHex(kit.main, kit.light, 0.3);
  const bright = rgba(mixHex(kit.light, "#ffffff", 0.45), 0.95);
  const sp = spread;
  // short inner feathers
  poly(ctx, [
    [-0.4, -0.07],
    [-0.6, -(0.05 + 0.05 * sp)],
    [-0.68, 0],
    [-0.6, 0.05 + 0.05 * sp],
    [-0.4, 0.07],
  ]);
  ctx.fillStyle = tone;
  ctx.fill();
  // long outer streamers: thick root, tapering to a pointed tip, with a bright core line
  const ang = (11 + 16 * sp) * D2R;
  const sa = Math.sin(ang),
    ca = Math.cos(ang);
  ctx.lineCap = "round";
  for (const sd of [-1, 1]) {
    const tx = -0.4 - 0.9 * ca;
    const ty = sd * (0.06 + 0.9 * sa);
    poly(ctx, [
      [-0.4, sd * 0.085],
      [-0.74, sd * (0.1 + 0.38 * sa)],
      [tx, ty],
      [-0.7, sd * (0.045 + 0.4 * sa)],
      [-0.4, sd * 0.02],
    ]);
    ctx.fillStyle = tone;
    ctx.fill();
    ctx.strokeStyle = bright;
    ctx.lineWidth = 2 * px;
    ctx.beginPath();
    ctx.moveTo(-0.44, sd * 0.055);
    ctx.lineTo(-0.72, sd * (0.075 + 0.39 * sa));
    ctx.lineTo(tx + 0.03, sd * (0.06 + 0.88 * sa));
    ctx.stroke();
  }
  ctx.fillStyle = rgba(kit.light, 0.9);
  ellipse(ctx, -0.5, -0.035, 0.03, 0.014);
  ctx.fill();
  ellipse(ctx, -0.5, 0.035, 0.03, 0.014);
  ctx.fill();
}

function drawBodyHead(ctx, kit, bank, px) {
  const bend = (x) => bank * 0.12 * Math.pow(Math.max(0, 0.4 - x), 2);
  const prof = [
    [0.4, 0.0],
    [0.37, 0.055],
    [0.31, 0.078],
    [0.2, 0.098],
    [0.05, 0.104],
    [-0.1, 0.088],
    [-0.25, 0.065],
    [-0.38, 0.048],
    [-0.46, 0.03],
  ];
  const pts = [];
  for (const [x, hw] of prof) pts.push([x, bend(x) + hw]);
  for (let j = prof.length - 2; j >= 1; j--) pts.push([prof[j][0], bend(prof[j][0]) - prof[j][1]]);
  const g = ctx.createLinearGradient(0, -0.1, 0, 0.1);
  g.addColorStop(0, mixHex(kit.main, kit.dark, 0.1));
  g.addColorStop(0.5, mixHex(kit.main, kit.light, 0.6));
  g.addColorStop(1, mixHex(kit.main, kit.dark, 0.1));
  curve(ctx, pts, true);
  ctx.fillStyle = g;
  ctx.fill();
  // glossy back stripe
  ctx.strokeStyle = rgba(kit.light, 0.6);
  ctx.lineWidth = 2.2 * px;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0.28, 0);
  ctx.lineTo(0.0, bend(0));
  ctx.lineTo(-0.3, bend(-0.3));
  ctx.stroke();
  // chestnut throat patch peeking out around the head, then forehead
  ellipse(ctx, 0.335, 0, 0.08, 0.088);
  ctx.fillStyle = rgba(kit.accent, 0.95);
  ctx.fill();
  ellipse(ctx, 0.39, 0, 0.062, 0.066);
  ctx.fillStyle = mixHex(kit.main, kit.dark, 0.2);
  ctx.fill();
  ellipse(ctx, 0.415, 0, 0.032, 0.042);
  ctx.fillStyle = rgba(kit.accent, 0.95);
  ctx.fill();
  // short beak
  poly(ctx, [
    [0.435, -0.026],
    [0.55, 0],
    [0.435, 0.026],
  ]);
  ctx.fillStyle = mixHex(kit.dark, kit.light, 0.45);
  ctx.fill();
}

export default {
  id: "swallows",
  name: "Swallows",
  group: "wings",
  blurb: "Swept-winged swallows alternate fast flapping with long glides on broad banking arcs.",
  motion: "travel",
  count: { min: 0, max: 10, default: 3, noun: "Swallow" },
  natural: KITS,
  flow: { label: "Wind", help: "How strongly wind drifts the swallows and ruffles their tails.", default: 1, min: 0, max: 1.5 },
  backdrop: { dark: "#0c1218", light: "#e9eef1" },
  draw(ctx, w, h, S) {
    const flow = S.flow == null ? 1 : S.flow;
    ctx.lineJoin = "round";
    for (let i = 0; i < S.count; i++) {
      const kit = S.kit(i);
      // semi-span unit: full wingspan is 0.20-0.24 of S.min x size
      const s = S.min * S.size * (0.1 + 0.02 * hash01(i, 1));
      const px = 1 / s;
      const r = roam(i, S.t, w, h, { rate: 0.3, ax: 0.38, ay: 0.33, seed: 7 });
      const ph1 = hash01(i, 13) * TAU;
      const ph2 = hash01(i, 14) * TAU;
      const x = r.x + flow * 0.03 * S.min * Math.sin(0.11 * S.t + ph1);
      const y = r.y + flow * 0.025 * S.min * Math.cos(0.09 * S.t + ph2);

      // flap burst (2.4-3.9 s) then glide, on a per-entity grid driven by the articulation clock
      const P = 5.4 + 0.6 * hash01(i, 61);
      const T = S.b + hash01(i, 62) * 90;
      const k = Math.floor(T / P);
      const u = T - k * P;
      const F = 2.4 + 1.5 * hash01(i, k, 63);
      const fa = smoothstep(0, 0.45, u) * (1 - smoothstep(F - 0.1, F + 0.5, u));
      const f = 3.1 + 0.8 * hash01(i, 64);
      const phi = S.b * f * TAU + hash01(i, 65) * TAU;

      const bank = clamp(r.turn * 1.7, -0.8, 0.8) + flow * 0.1 * Math.sin(0.7 * S.b + ph1);
      const kR = 1 - 0.2 * Math.max(bank, 0) + 0.06 * Math.max(-bank, 0);
      const kL = 1 - 0.2 * Math.max(-bank, 0) + 0.06 * Math.max(bank, 0);
      const spread = clamp(0.25 + 0.55 * (1 - fa) + 0.12 * flow * Math.sin(1.3 * S.b + ph2), 0, 1);
      const twist = bank * 0.35 + flow * 0.05 * Math.sin(0.9 * S.b + ph2);
      const stR = wingState(phi, fa);
      const stL = wingState(phi + 0.18 * Math.sin(0.5 * S.b + ph1), fa);
      const gR = wingGeom(stR, kR);
      const gL = wingGeom(stL, kL);
      const liftR = 0.5 + 0.5 * Math.cos(phi) * fa;
      const liftL = 0.5 + 0.5 * Math.cos(phi + 0.18) * fa;

      at(ctx, x, y, r.heading, s, s, () => {
        at(ctx, -0.4, 0, twist, 1, 1, () => {
          at(ctx, 0.4, 0, 0, 1, 1, () => drawTail(ctx, kit, spread, px));
        });
        at(ctx, 0, 0, 0, 1, 1, () => drawWing(ctx, gR, kit, liftR, px));
        at(ctx, 0, 0, 0, 1, -1, () => drawWing(ctx, gL, kit, liftL, px));
        drawBodyHead(ctx, kit, bank, px);
      });
    }
  },
};
