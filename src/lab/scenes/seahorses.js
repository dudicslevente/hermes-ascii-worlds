// Seahorses: upright, side view. A curvature-integrated spine (S-curve trunk,
// spiralling prehensile tail) wrapped in a shaded, ring-segmented ribbon.
// Positions and bobbing run on S.t; body shape (tail curl, sway, fin flutter,
// head nod) runs on S.b. Everything is drawn in units of the seahorse height H
// (1 unit = H px) with the animal facing +x, then mirrored for facing left.
import { makeKit, TAU, clamp, smoothstep, fract, hash01, roam, at, curve, ellipse, rgba, mixHex, shadeHex } from "../core/util.js";

const N_TRUNK = 16;
const N_TAIL = 28;
const N = N_TRUNK + N_TAIL - 1;
const TAIL_LEN = 0.55;

// Trunk control points, neck top to tail base (units of H, y down, facing +x).
const TRUNK = [
  [0.06, -0.33],
  [0.01, -0.235],
  [-0.03, -0.13],
  [-0.045, -0.02],
  [-0.045, 0.09],
  [-0.035, 0.19],
];

// Half widths (front/belly side and back side) against spine position s in 0..1.
const S_TAB = [0, 0.08, 0.2, 0.3, 0.42, 0.55, 0.7, 0.85, 1];
const WF_TAB = [0.05, 0.078, 0.162, 0.15, 0.115, 0.085, 0.05, 0.036, 0.026];
const WB_TAB = [0.042, 0.052, 0.066, 0.07, 0.066, 0.056, 0.04, 0.031, 0.022];
const tab = (T, s) => {
  for (let k = 1; k < S_TAB.length; k++) {
    if (s <= S_TAB[k]) {
      const f = (s - S_TAB[k - 1]) / (S_TAB[k] - S_TAB[k - 1]);
      return T[k - 1] + (T[k] - T[k - 1]) * f;
    }
  }
  return T[T.length - 1];
};

// Slots on the stage (fractions of w, h). Entity i always owns slot i % 8.
const SLOT_X = [0.3, 0.68, 0.5, 0.14, 0.86, 0.4, 0.76, 0.22];
const SLOT_Y = [0.5, 0.45, 0.62, 0.6, 0.55, 0.4, 0.62, 0.38];

function catmull(p, n) {
  const out = [];
  const m = p.length - 1;
  for (let k = 0; k < n; k++) {
    const u = (k / (n - 1)) * m;
    const i = Math.min(m - 1, Math.floor(u));
    const f = u - i;
    const p0 = p[Math.max(0, i - 1)],
      p1 = p[i],
      p2 = p[i + 1],
      p3 = p[Math.min(m, i + 2)];
    const f2 = f * f,
      f3 = f2 * f;
    const c = (d) =>
      0.5 *
      (2 * p1[d] +
        (-p0[d] + p2[d]) * f +
        (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * f2 +
        (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * f3);
    out.push([c(0), c(1)]);
  }
  return out;
}

function buildSpine(b, ph, curl) {
  const spine = catmull(TRUNK, N_TRUNK);
  for (let i = 0; i < N_TRUNK; i++) {
    const s = i / (N_TRUNK - 1);
    spine[i][0] += 0.016 * smoothstep(0.15, 1, s) * Math.sin(b * 0.8 + ph - s * 3.2);
  }
  const last = spine[N_TRUNK - 1],
    prev = spine[N_TRUNK - 2];
  let th = Math.atan2(last[1] - prev[1], last[0] - prev[0]);
  let x = last[0],
    y = last[1];
  const ds = TAIL_LEN / (N_TAIL - 1);
  for (let k = 1; k < N_TAIL; k++) {
    const u = (k - 0.5) / (N_TAIL - 1);
    // negative curvature turns toward the belly: the tail curls forward
    const kap = -curl * (2.2 + 15 * smoothstep(0.1, 0.7, u)) + 1.4 * u * Math.sin(b * 0.95 + ph - u * 4.5);
    th += kap * ds;
    x += Math.cos(th) * ds;
    y += Math.sin(th) * ds;
    spine.push([x, y]);
  }
  return spine;
}

// Closed band of the body between spine indices a..c: back edge at -wb*kb,
// front (belly) edge at +wf*kf along the right-hand normal.
function bandPoly(sp, nx, ny, wf, wb, kf, kb, a, c) {
  const pts = [];
  for (let i = a; i <= c; i++) pts.push([sp[i][0] - nx[i] * wb[i] * kb, sp[i][1] - ny[i] * wb[i] * kb]);
  for (let i = c; i >= a; i--) pts.push([sp[i][0] + nx[i] * wf[i] * kf, sp[i][1] + ny[i] * wf[i] * kf]);
  return pts;
}

function drawFan(ctx, kit, bx, by, dirx, diry, spread, len, count, flutter, lw, aMem, aRay) {
  const base = Math.atan2(diry, dirx);
  const tips = [];
  for (let j = 0; j < count; j++) {
    const f = count === 1 ? 0 : j / (count - 1) - 0.5;
    const a = base + f * spread + flutter(j);
    const l = len * (0.78 + 0.22 * Math.cos(f * 2.2));
    tips.push([bx + Math.cos(a) * l, by + Math.sin(a) * l]);
  }
  ctx.beginPath();
  ctx.moveTo(bx, by);
  for (let j = 0; j < tips.length; j++) ctx.lineTo(tips[j][0], tips[j][1]);
  ctx.closePath();
  ctx.fillStyle = rgba(kit.light, aMem);
  ctx.fill();
  ctx.strokeStyle = rgba(kit.light, aRay);
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (let j = 0; j < tips.length; j++) {
    ctx.moveTo(bx, by);
    ctx.lineTo(tips[j][0], tips[j][1]);
  }
  ctx.stroke();
}

function drawSeahorse(ctx, S, i, w, h) {
  const kit = S.kit(i);
  const t = S.t,
    b = S.b;
  const flow = S.flow === undefined ? 1 : S.flow;
  const H = S.min * S.size * 0.34 * (0.9 + 0.16 * hash01(i, 11));
  const px = 1 / H;
  const ph = hash01(i, 21) * TAU;

  // ---- position: restrained drift on S.t, slow vertical bob ------------
  const slot = i % 8;
  const lane = Math.floor(i / 8);
  const rp = roam(i, t, w, h, {
    rate: 0.11,
    ax: 0.075 * flow,
    ay: 0.05 * flow,
    cx: clamp(SLOT_X[slot] + 0.05 * lane, 0.1, 0.9),
    cy: SLOT_Y[slot],
    seed: 73,
  });
  const bobW = TAU / (8 + 5 * hash01(i, 7));
  const bobP = hash01(i, 8) * TAU;
  const bob = Math.sin(t * bobW + bobP);
  const cx = rp.x;
  const cy = rp.y + bob * 0.14 * H;
  const lean = 0.045 * Math.sin(t * bobW + bobP + 0.9) + 0.0025 * clamp(rp.vx, -12, 12);

  // ---- facing: per-entity side, rare smooth turn (width through zero) ---
  const baseDir = hash01(i, 3) < 0.5 ? -1 : 1;
  const period = 42 + 40 * hash01(i, 5);
  const cyc = t / period + 0.55 * hash01(i, 6);
  const k = Math.floor(cyc);
  const e = smoothstep(0, 1.2 / period, fract(cyc));
  const face = baseDir * Math.cos(Math.PI * (k + e));

  // ---- spine, widths, normals -----------------------------------------
  const curl = 0.88 + 0.12 * Math.sin(b * 0.55 + ph);
  const sp = buildSpine(b, ph, curl);
  const wf = new Array(N),
    wb = new Array(N),
    nx = new Array(N),
    ny = new Array(N);
  for (let n = 0; n < N; n++) {
    const s = n < N_TRUNK ? (0.55 * n) / (N_TRUNK - 1) : 0.55 + (0.45 * (n - N_TRUNK + 1)) / (N_TAIL - 1);
    wf[n] = tab(WF_TAB, s);
    wb[n] = tab(WB_TAB, s);
    const a = sp[Math.max(0, n - 1)],
      c = sp[Math.min(N - 1, n + 1)];
    let dx = c[0] - a[0],
      dy = c[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l;
    dy /= l;
    nx[n] = dy;
    ny[n] = -dx;
  }

  const dark = mixHex(kit.main, kit.dark, 0.5);
  const mid = mixHex(kit.main, kit.light, 0.14);
  const hi = mixHex(kit.main, kit.light, 0.64);

  at(ctx, cx, cy, 0, face * H, H, () => {
    ctx.rotate(lean);
    ctx.lineJoin = "round";

    // -- dorsal fin (behind the body): fine rays, smooth travelling flutter
    {
      const a0 = 8,
        cnt = 7;
      const pts = [];
      const tips = [];
      for (let j = 0; j < cnt; j++) {
        const fi = a0 + (j / (cnt - 1)) * 5.2;
        const i0 = Math.floor(fi),
          fr = fi - i0;
        const i1 = Math.min(N - 1, i0 + 1);
        const bnx = -(nx[i0] * (1 - fr) + nx[i1] * fr),
          bny = -(ny[i0] * (1 - fr) + ny[i1] * fr);
        const bx = sp[i0][0] * (1 - fr) + sp[i1][0] * fr + bnx * wb[i0] * 0.9;
        const by = sp[i0][1] * (1 - fr) + sp[i1][1] * fr + bny * wb[i0] * 0.9;
        const tx = -bny,
          ty = bnx; // along the spine, toward the tail
        const flap = 0.2 * Math.sin(b * 6.2 + ph - j * 0.85);
        const ang = 0.5 + flap;
        const len = 0.15 * (0.55 + 0.45 * Math.sin(((j + 0.6) / (cnt + 0.2)) * Math.PI)) * (0.94 + 0.06 * Math.sin(b * 3.1 + j));
        const dx = bnx * Math.cos(ang) + tx * Math.sin(ang),
          dy = bny * Math.cos(ang) + ty * Math.sin(ang);
        pts.push([bx, by]);
        tips.push([bx + dx * len, by + dy * len]);
      }
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let j = 1; j < cnt; j++) ctx.lineTo(pts[j][0], pts[j][1]);
      for (let j = cnt - 1; j >= 0; j--) ctx.lineTo(tips[j][0], tips[j][1]);
      ctx.closePath();
      ctx.fillStyle = rgba(kit.light, 0.45);
      ctx.fill();
      ctx.strokeStyle = rgba(mixHex(kit.light, kit.second, 0.3), 0.92);
      ctx.lineWidth = 1.7 * px;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let j = 0; j < cnt; j++) {
        ctx.moveTo(pts[j][0], pts[j][1]);
        ctx.lineTo(tips[j][0], tips[j][1]);
      }
      ctx.stroke();
    }

    // -- body: layered ribbon (dark rim, main, lit front, bright ridge)
    ctx.fillStyle = dark;
    curve(ctx, bandPoly(sp, nx, ny, wf, wb, 1, 1, 0, N - 1), true);
    ctx.fill();
    ctx.fillStyle = mid;
    curve(ctx, bandPoly(sp, nx, ny, wf, wb, 0.92, 0.38, 0, N - 1), true);
    ctx.fill();
    ctx.fillStyle = rgba(hi, 0.88);
    curve(ctx, bandPoly(sp, nx, ny, wf, wb, 0.62, -0.2, 0, N - 1), true);
    ctx.fill();
    ctx.fillStyle = rgba(kit.light, 0.7);
    curve(ctx, bandPoly(sp, nx, ny, wf, wb, 0.36, -0.46, 1, N - 2), true);
    ctx.fill();

    // -- ring segments: alternate darker plates, then dark ring lines
    for (let a = 1, j = 0; a + 2 < N; a += 2, j++) {
      if (j % 2 === 0) {
        ctx.fillStyle = rgba(kit.dark, 0.42);
        curve(ctx, bandPoly(sp, nx, ny, wf, wb, 0.97, 0.97, a, a + 2), true);
        ctx.fill();
      }
    }
    ctx.strokeStyle = rgba(kit.dark, 0.72);
    ctx.lineWidth = 1.9 * px;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let a = 1; a < N - 2; a += 2) {
      const p0x = sp[a][0] - nx[a] * wb[a],
        p0y = sp[a][1] - ny[a] * wb[a];
      const p1x = sp[a][0] + nx[a] * wf[a] * 0.95,
        p1y = sp[a][1] + ny[a] * wf[a] * 0.95;
      ctx.moveTo(p0x, p0y);
      ctx.quadraticCurveTo((p0x + p1x) / 2 + nx[a] * 0.006, (p0y + p1y) / 2 + ny[a] * 0.006, p1x, p1y);
    }
    ctx.stroke();

    // -- bright outline so the silhouette survives glyph sampling
    ctx.strokeStyle = rgba(kit.light, 0.9);
    ctx.lineWidth = 2.4 * px;
    curve(ctx, bandPoly(sp, nx, ny, wf, wb, 1, 1, 0, N - 1), true);
    ctx.stroke();

    // -- ridge of small bumps along the back
    ctx.fillStyle = rgba(kit.light, 0.75);
    for (let a = 2; a < N - 3; a += 2) {
      const r = 0.4 * wb[a] + 0.006;
      ellipse(ctx, sp[a][0] - nx[a] * (wb[a] + 0.002), sp[a][1] - ny[a] * (wb[a] + 0.002), r, r);
      ctx.fill();
    }

    // -- pectoral fin: tiny fan, quick but soft flutter
    drawFan(
      ctx,
      kit,
      sp[4][0] + nx[4] * 0.004,
      sp[4][1] + ny[4] * 0.004,
      -0.82,
      -0.4,
      1.0,
      0.1,
      5,
      (j) => 0.22 * Math.sin(b * 7.5 + ph - j * 0.7),
      0.9 * px,
      0.42,
      0.9,
    );

    // -- head: pitch nods gently with S.b; larger than the trunk scale suggests
    const phi = 0.55 + 0.06 * Math.sin(b * 0.5 + ph);
    const hs = 1.45;
    const hp = px / hs;
    at(ctx, 0.078, -0.382 + 0.004 * Math.sin(b * 0.5 + ph), phi, hs, hs, () => {
      // coronet: a fan of bright spikes on the crown
      ctx.fillStyle = rgba(kit.light, 0.95);
      for (let c = 0; c < 5; c++) {
        const a = -2.2 - c * 0.28;
        const bx = Math.cos(a) * 0.05 - 0.004,
          by = Math.sin(a) * 0.046;
        const l = 0.04 + 0.022 * (c === 1 || c === 2 ? 1 : c === 3 ? 0.6 : 0.25);
        const sw = 0.013;
        ctx.beginPath();
        ctx.moveTo(bx - Math.sin(a) * sw, by + Math.cos(a) * sw);
        ctx.lineTo(bx + Math.cos(a) * l - 0.004, by + Math.sin(a) * l);
        ctx.lineTo(bx + Math.sin(a) * sw, by - Math.cos(a) * sw);
        ctx.closePath();
        ctx.fill();
      }
      // long tubular snout
      const snout = [
        [0.0, -0.045],
        [0.06, -0.036],
        [0.12, -0.03],
        [0.18, -0.024],
        [0.225, -0.017],
        [0.245, 0.0],
        [0.225, 0.018],
        [0.18, 0.027],
        [0.12, 0.035],
        [0.06, 0.046],
        [0.0, 0.058],
      ];
      ctx.fillStyle = dark;
      curve(ctx, snout, true);
      ctx.fill();
      ellipse(ctx, -0.005, -0.004, 0.07, 0.062);
      ctx.fill();
      ctx.strokeStyle = rgba(kit.light, 0.92);
      ctx.lineWidth = 2.3 * hp;
      curve(ctx, snout, true);
      ctx.stroke();
      ellipse(ctx, -0.005, -0.004, 0.07, 0.062);
      ctx.stroke();
      ctx.fillStyle = mid;
      curve(ctx, snout.map((p) => [p[0], p[1] * 0.78 - 0.007]), true);
      ctx.fill();
      ellipse(ctx, 0.002, -0.01, 0.058, 0.05);
      ctx.fill();
      ctx.fillStyle = rgba(hi, 0.92);
      curve(ctx, snout.map((p) => [p[0] * 0.96 + 0.01, p[1] * 0.4 - 0.016]), true);
      ctx.fill();
      ellipse(ctx, 0.012, -0.022, 0.04, 0.028, -0.2);
      ctx.fill();
      // mouth dot and a gill arc
      ctx.fillStyle = rgba(kit.dark, 0.9);
      ellipse(ctx, 0.238, 0.0, 0.007, 0.008);
      ctx.fill();
      ctx.strokeStyle = rgba(kit.dark, 0.7);
      ctx.lineWidth = 1.7 * hp;
      ctx.beginPath();
      ctx.arc(-0.02, 0.014, 0.034, 0.2, 1.7);
      ctx.stroke();
      // eye: dark ring, pale iris, dark pupil
      ctx.fillStyle = rgba(kit.dark, 0.85);
      ellipse(ctx, 0.03, -0.018, 0.037, 0.035);
      ctx.fill();
      ctx.fillStyle = "#f4efe2";
      ellipse(ctx, 0.03, -0.018, 0.028, 0.027);
      ctx.fill();
      ctx.fillStyle = "#0b0b0e";
      ellipse(ctx, 0.034, -0.017, 0.014, 0.015);
      ctx.fill();
    });
  });
}

export default {
  id: "seahorses",
  name: "Seahorses",
  group: "ocean",
  blurb: "Upright seahorses bob in place, tails curling and uncurling as small fins shimmer.",
  motion: "travel",
  count: { min: 0, max: 8, default: 3, noun: "Seahorse" },
  natural: [
    makeKit({ main: "#e8822e", light: "#ffd89a", dark: "#5a2410", accent: "#fff1b8", second: "#f2a24a" }),
    makeKit({ main: "#e2b53c", light: "#fff2b0", dark: "#5a3d0e", accent: "#fff6d0", second: "#c98f2b" }),
    makeKit({ main: "#e0707e", light: "#ffc9c8", dark: "#5e1f2f", accent: "#fff0e0", second: "#f09a8a" }),
    makeKit({ main: "#9a7656", light: "#e2cba8", dark: "#3b281b", accent: "#f3e6c8", second: "#7e5c40" }),
  ],
  flow: { label: "Drift", help: "How far the seahorses sway sideways on the water.", default: 1, min: 0, max: 1.5 },
  backdrop: { dark: "#0a1a22", light: "#e3eef0" },
  draw(ctx, w, h, S) {
    for (let i = 0; i < S.count; i++) drawSeahorse(ctx, S, i, w, h);
  },
};
