import { placeAtDepth } from "../core/depth.js";
import { makeKit, TAU, clamp, clamp01, lerp, smoothstep, mod, at, poly, curve, ellipse, hash01, rgba, mixHex } from "../core/util.js";

// Axolotls on a pond floor, seen from the side. Local frame: origin at the
// shoulder on the body midline, +x towards the snout, +y down; L is the length
// from snout to tail tip. Each axolotl rests, strolls along the bottom with a
// diagonal leg gait, rests again and turns round; now and then it floats up
// and sinks back. Gills fan and the tail sways on the articulation clock.

const WALK = 7,
  REST = 6,
  TURN = 0.9;
const LEG = 2 * (WALK + REST + TURN);

// Where axolotl i is in its routine at time t. Six segments: walk out, rest,
// turn round, walk back, rest, turn round. x is the offset from home, facing
// is +1/-1 (sweeping through 0 in a turn), dist is the total distance walked
// so far (it only ever grows, so the leg gait never jumps).
function routine(i, t, span) {
  const shifted = t + hash01(i, 11) * LEG;
  const u = mod(shifted, LEG);
  const d0 = i % 2 ? -1 : 1;
  const ends = [WALK, WALK + REST, WALK + REST + TURN, 2 * WALK + REST + TURN, 2 * WALK + 2 * REST + TURN, LEG];
  let k = 0;
  while (k < 5 && u >= ends[k]) k++;
  const start = k ? ends[k - 1] : 0;
  const p = clamp01((u - start) / (ends[k] - start));
  const e = smoothstep(0, 1, p);
  const walked = k === 0 ? e : k === 3 ? 1 - e : k < 3 ? 1 : 0;
  const facing = k < 2 ? d0 : k === 2 ? d0 * Math.cos(Math.PI * p) : k < 5 ? -d0 : -d0 * Math.cos(Math.PI * p);
  const dist = span * (k === 0 ? e : k < 3 ? 1 : k === 3 ? 1 + e : 2);
  // Every other rest or so is a float up and back down.
  const rest = k === 1 || k === 4;
  const float = rest && hash01(i, Math.floor(shifted / LEG) * 2 + (k === 4 ? 1 : 0), 12) > 0.5 ? Math.sin(Math.PI * smoothstep(0.05, 0.95, p)) : 0;
  return { x: (walked - 0.5) * span * d0, facing, dist, walking: k === 0 || k === 3 ? Math.sin(Math.PI * p) : 0, float };
}

// One leg: hip at (hx, hy), swing angle a, a short upper and lower segment
// and four little toes spread on the ground.
function leg(ctx, hx, hy, a, len, col, px, tuck) {
  const k1 = [hx + Math.sin(a) * len * 0.55, hy + Math.cos(a) * len * 0.55];
  const fa = a * 0.4 - tuck * 1.2;
  const k2 = [k1[0] + Math.sin(fa) * len * 0.5 - tuck * len * 0.3, k1[1] + Math.cos(fa) * len * 0.5 - tuck * len * 0.2];
  ctx.strokeStyle = col;
  ctx.lineCap = "round";
  ctx.lineWidth = len * 0.42;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(k1[0], k1[1]);
  ctx.lineTo(k2[0], k2[1]);
  ctx.stroke();
  ctx.lineWidth = Math.max(1.1 * px, len * 0.12);
  ctx.beginPath();
  for (let d = 0; d < 4; d++) {
    const ang = -0.9 + d * 0.6 + fa * 0.3;
    ctx.moveTo(k2[0], k2[1]);
    ctx.lineTo(k2[0] + Math.sin(ang) * len * 0.22, k2[1] + Math.cos(ang) * len * 0.08 + len * 0.05);
  }
  ctx.stroke();
}

function drawAxolotl(ctx, S, i, x, y, L, st) {
  const kit = S.kit(i);
  const b = S.b;
  const px = 1 / L;
  const sx = Math.abs(st.facing) < 0.12 ? 0.12 * Math.sign(st.facing || 1) : st.facing;
  at(ctx, x, y, 0, L * sx, L, () => {
    // Tail: a wave that grows towards the tip; stronger while floating.
    const swim = 0.012 + 0.03 * st.float + 0.006 * st.walking;
    const tailAt = (s) => [-0.04 - 0.62 * s, swim * Math.pow(s, 1.4) * Math.sin(b * 2.2 - s * 5 + i)];
    const spine = [];
    for (let k = 0; k <= 10; k++) spine.push(tailAt(k / 10));
    // Gait: diagonal pairs, phased by distance walked (in pixels). One full
    // step cycle per third of a body length: slow, deliberate axolotl steps.
    const g = (st.dist / (L * 0.34)) * TAU;
    const swingA = 0.55 * Math.sin(g) * clamp01(st.walking * 3);
    const tuck = st.float;
    const legCol = mixHex(kit.main, kit.dark, 0.18);
    const farCol = mixHex(kit.main, kit.dark, 0.38);
    // far-side legs first (darker, opposite phase)
    leg(ctx, 0.03, 0.05, -swingA, 0.11, farCol, px, tuck);
    leg(ctx, -0.25, 0.045, swingA, 0.1, farCol, px, tuck);

    // tail fin: dorsal ridge from mid back, ventral fin from the vent
    const fin = [];
    for (let k = 0; k <= 10; k++) {
      const s = k / 10,
        [tx, ty] = spine[k];
      fin.push([tx, ty - (0.035 + 0.04 * Math.sin(Math.PI * Math.min(1, s * 1.15))) * (s < 0.15 ? s / 0.15 : 1)]);
    }
    for (let k = 10; k >= 3; k--) {
      const s = k / 10,
        [tx, ty] = spine[k];
      fin.push([tx, ty + 0.025 + 0.03 * Math.sin(Math.PI * (s - 0.3) / 0.75)]);
    }
    curve(ctx, fin, true);
    ctx.fillStyle = rgba(mixHex(kit.main, kit.light, 0.5), 0.42);
    ctx.fill();
    ctx.strokeStyle = rgba(kit.light, 0.6);
    ctx.lineWidth = 1.1 * px;
    ctx.stroke();

    // body: shoulder to tail, plump in the middle
    const top = [],
      bot = [];
    for (let k = 0; k <= 8; k++) {
      const s = k / 8;
      const [tx, ty] = k === 0 ? [0.06, 0] : tailAt(s * 0.55);
      const hh = lerp(0.085, 0.034, Math.pow(s, 1.25)) * (1 + 0.04 * Math.sin(b * 0.9));
      top.push([tx, ty - hh]);
      bot.push([tx, ty + hh * 1.05]);
    }
    const outline = top.concat(bot.slice().reverse());
    curve(ctx, outline, true);
    ctx.fillStyle = kit.main;
    ctx.fill();
    // On light backdrops pale morphs need a soft edge to stay readable.
    if (S.dark === false) {
      ctx.strokeStyle = rgba(kit.dark, 0.35);
      ctx.lineWidth = Math.max(1.4 * px, 0.012);
      ctx.stroke();
    }
    // pale belly
    curve(ctx, bot.slice().reverse().map(([u, v], k) => [u, v - 0.02]).concat(bot.map(([u, v]) => [u, v])), true);
    ctx.fillStyle = rgba(kit.light, 0.45);
    ctx.fill();
    // speckles
    ctx.fillStyle = rgba(kit.dark, 0.22);
    for (let k = 0; k < 6; k++) {
      ellipse(ctx, lerp(-0.3, 0.02, hash01(i, 30 + k)), lerp(-0.05, 0.02, hash01(i, 40 + k)), 0.012, 0.009);
      ctx.fill();
    }

    // gills: three feathery stalks fanning up and back behind the head
    const gillCol = kit.accent,
      filCol = mixHex(kit.accent, kit.light, 0.35);
    for (let k = 0; k < 3; k++) {
      const root = [0.06 - 0.01 * k, -0.09 + 0.035 * k];
      const ang = [-1.8, -2.35, -2.85][k] + 0.13 * Math.sin(b * 1.1 + k * 0.7 + i) + 0.2 * st.float;
      const len = [0.23, 0.25, 0.2][k];
      const pts = [];
      for (let m = 0; m <= 5; m++) {
        const s = m / 5,
          a = ang + 0.35 * s * s;
        pts.push([root[0] + Math.cos(a) * len * s, root[1] + Math.sin(a) * len * s]);
      }
      curve(ctx, pts);
      ctx.strokeStyle = gillCol;
      ctx.lineWidth = Math.max(2 * px, 0.026);
      ctx.lineCap = "round";
      ctx.stroke();
      ctx.strokeStyle = filCol;
      ctx.lineWidth = Math.max(1.3 * px, 0.013);
      ctx.beginPath();
      for (let m = 1; m <= 5; m++) {
        const [fx, fy] = pts[m];
        const a = ang + 0.35 * (m / 5) ** 2;
        const fl = 0.05 * (1 - 0.1 * m) * (1 + 0.15 * Math.sin(b * 2 + m + k));
        for (const side of [1, -1]) {
          ctx.moveTo(fx, fy);
          ctx.lineTo(fx + Math.cos(a + side * 1.35) * fl, fy + Math.sin(a + side * 1.35) * fl);
        }
      }
      ctx.stroke();
    }

    // head: broad and rounded, a little wider than the body
    ellipse(ctx, 0.15, -0.01, 0.175, 0.13);
    ctx.fillStyle = mixHex(kit.main, kit.light, 0.28);
    ctx.fill();
    if (S.dark === false) {
      ctx.strokeStyle = rgba(kit.dark, 0.35);
      ctx.lineWidth = Math.max(1.4 * px, 0.012);
      ctx.stroke();
    }
    ellipse(ctx, 0.17, 0.055, 0.12, 0.045);
    ctx.fillStyle = rgba(kit.light, 0.35);
    ctx.fill();
    // Eye and smile are cut out of the art, so they read as real gaps on
    // any backdrop (dark ink on a dark backdrop would be lifted and vanish).
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ellipse(ctx, 0.215, -0.04, 0.028, 0.028);
    ctx.fillStyle = "#000000";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0.305, 0.02);
    ctx.quadraticCurveTo(0.265, 0.07, 0.18, 0.05);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = Math.max(2.5 * px, 0.024);
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();
    // a tiny catchlight keeps the eye alive
    ellipse(ctx, 0.222, -0.048, 0.008, 0.008);
    ctx.fillStyle = rgba("#ffffff", 0.9);
    ctx.fill();

    // near-side legs on top
    leg(ctx, 0.05, 0.06, swingA, 0.11, legCol, px, tuck);
    leg(ctx, -0.23, 0.055, -swingA, 0.1, legCol, px, tuck);
  });
}

// Pond grass and gravel behind the axolotls: clumps of long blades that
// bend more towards their tips and sway slowly.
function drawPond(ctx, w, h, S, floor) {
  const sz = S.min;
  for (let k = 0; k < 6; k++) {
    const cx = w * (0.05 + 0.9 * hash01(k, 70));
    for (let j = 0; j < 4; j++) {
      const H = sz * (0.18 + 0.28 * hash01(k, j, 71)),
        lean = (hash01(k, j, 72) - 0.5) * 0.7;
      const pts = [];
      for (let m = 0; m <= 8; m++) {
        const s = m / 8;
        const sway = sz * 0.04 * s * s * Math.sin(S.b * 0.45 + k * 1.3 + j * 0.8 + s * 1.2);
        pts.push([cx + j * sz * 0.012 + lean * H * s * s + sway, floor - H * s]);
      }
      curve(ctx, pts);
      ctx.strokeStyle = rgba((k + j) % 2 ? "#4f8f5b" : "#6aa868", 0.7);
      ctx.lineWidth = Math.max(1.6, sz * (0.009 - 0.002 * j));
      ctx.lineCap = "round";
      ctx.stroke();
    }
  }
  for (let k = 0; k < 16; k++) {
    const gx = w * hash01(k, 80),
      gr = sz * (0.008 + 0.01 * hash01(k, 81));
    ellipse(ctx, gx, floor + gr * 0.6 + sz * 0.01 * hash01(k, 82), gr * 1.4, gr);
    ctx.fillStyle = rgba(k % 3 ? "#8a8170" : "#a39a86", 0.45);
    ctx.fill();
  }
}

export default {
  id: "axolotl",
  name: "Axolotls",
  group: "quiet",
  atmosphere: "silt",
  blurb: "Axolotls rest on a pond floor, fan their gills and now and then wander off for a stroll.",
  motion: "travel",
  count: { min: 0, max: 4, default: 2, noun: "Axolotl" },
  natural: [
    makeKit({ main: "#f2bdc9", light: "#fde6ec", dark: "#3a1f26", accent: "#e23d68", second: "#eea6b6" }),
    makeKit({ main: "#6e7651", light: "#b4b78f", dark: "#1c2014", accent: "#9a6070", second: "#596340" }),
    makeKit({ main: "#f0cf78", light: "#fff1c6", dark: "#4a3a14", accent: "#f08868", second: "#e0b456" }),
    makeKit({ main: "#474b54", light: "#7c818e", dark: "#0d0e11", accent: "#7a5a68", second: "#3a3e46" }),
  ],
  extras: [
    { key: "plants", type: "toggle", label: "Pond plants", default: true, help: "Swaying weed and a little gravel on the bottom." },
    { key: "activity", type: "range", label: "Activity", min: 0, max: 1.5, step: 0.05, default: 1, help: "How far they wander. At zero they just rest and fan their gills." },
  ],
  backdrop: { dark: "#0a1512", light: "#e6eee8" },
  draw(ctx, w, h, S) {
    const ex = S.extra || {};
    const plants = ex.plants !== false;
    const activity = clamp(ex.activity ?? 1, 0, 1.5);
    const floor = h * 0.86;
    if (plants) drawPond(ctx, w, h, S, floor);
    const n = S.count;
    const order = [];
    for (let i = 0; i < n; i++) order.push(i);
    order.sort((a, b) => (S.depthOf ? S.depthOf(a).z - S.depthOf(b).z : 0) || a - b);
    for (const i of order) {
      const { ctx: c, S: s, D } = placeAtDepth(ctx, S, i);
      // Smaller when there are more of them, so neighbours do not pile up.
      const crowd = Math.min(1, (w / Math.max(1, n)) / (s.min * 0.62));
      const L = s.min * s.size * 0.5 * Math.max(0.55, crowd) * (0.92 + 0.16 * hash01(i, 1));
      // Spread homes across the floor; far ones sit further back (higher).
      const slot = (i + 0.5) / n;
      const lane = D.layer === "far" ? -0.07 : D.layer === "near" ? 0.03 : 0;
      const span = Math.min(w / n, w * 0.4) * 0.55 * activity;
      const margin = L * 0.7 + 6;
      const x0 = clamp(w * (0.08 + 0.84 * slot), margin + span / 2, w - margin - span / 2);
      const st = activity < 0.02 ? { x: 0, facing: i % 2 ? -1 : 1, dist: 0, walking: 0, float: 0 } : routine(i, s.t, Math.max(span, 1));
      const groundY = h * (0.86 + lane) - L * 0.17;
      const y = groundY - st.float * h * 0.16;
      drawAxolotl(c, s, i, x0 + st.x, y, L, st);
    }
  },
};
