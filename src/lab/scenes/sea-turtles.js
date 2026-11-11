import { placeAtDepth } from "../core/depth.js";
import { makeKit, TAU, clamp, lerp, roam, at, poly, curve, ribbon, ellipse, hash01, rgba, mixHex } from "../core/util.js";

// Sea turtles, seen from above. Local frame: +x is the nose, +y the animal's right.
// a is the shell half length. Wave 2: compact oval carapace, broad paddle flippers rooted
// under the shell (large front pair, small rear pair), a bright headed neck out front.
// Flippers use an asymmetric stroke: a slow power stroke that sweeps the paddle back, then
// a quicker recovery in which the paddle is lifted (foreshortened). Tips lag the roots.
// Left/right and rear flippers are phase offset.

const TURTLE_SIZE = [0.27, 0.23, 0.3, 0.25, 0.28, 0.22];
// Home slots on the stage (fractions of w, h). Entity i keeps slot i % 6.
const HOME_X = [0.34, 0.68, 0.5, 0.2, 0.8, 0.5];
const HOME_Y = [0.44, 0.56, 0.74, 0.7, 0.3, 0.26];

// returns [sweep 0..1, lift 0..1] for a stroke phase
function turtleStroke(tau) {
  tau = tau - Math.floor(tau);
  const P = 0.62;
  if (tau < P) {
    const q = tau / P;
    return [q * q * (3 - 2 * q), 0];
  }
  const q = (tau - P) / (1 - P);
  return [1 - q * q * (3 - 2 * q), Math.sin(Math.PI * q)];
}

function turtleShellW(sn) {
  const e = Math.max(0, 1 - sn * sn);
  const ex = 0.52 + (sn < 0 ? -0.34 * sn : 0);
  return Math.pow(e, ex) * (1 + 0.2 * sn - 0.12 * sn * sn);
}

// broad paddle: narrow root, widest near half length, rounded blunt tip (peak = 1)
function turtlePaddleHW(q) {
  if (q < 0.5) {
    const u = q / 0.5;
    return 0.5 + 0.5 * u * u * (3 - 2 * u);
  }
  const v = (q - 0.5) / 0.5;
  return Math.sqrt(Math.max(0, 1 - v * v * 0.985));
}

function turtleSpine(rx, ry, side, tau, len, b0, b1, lag, n) {
  const pts = [[rx, ry]];
  let x = rx;
  let y = ry;
  for (let k = 1; k <= n; k++) {
    const st = turtleStroke(tau - (lag * (k - 0.5)) / n);
    const beta = lerp(b0, b1, st[0]);
    const seg = (len / n) * (1 - 0.22 * st[1]);
    x += Math.cos(beta) * seg;
    y += side * Math.sin(beta) * seg;
    pts.push([x, y]);
  }
  return pts;
}

function turtleFlipper(ctx, spine, wmax, a, kit, lift) {
  const n = spine.length - 1;
  const out = ribbon(spine, (q) => wmax * a * turtlePaddleHW(q));
  curve(ctx, out, true);
  const p0 = spine[0];
  const p1 = spine[n];
  const g = ctx.createLinearGradient(p0[0], p0[1], p1[0], p1[1]);
  g.addColorStop(0, mixHex(kit.second, kit.dark, 0.3));
  g.addColorStop(0.35, mixHex(kit.second, kit.light, 0.14 + 0.3 * lift));
  g.addColorStop(1, mixHex(kit.second, kit.light, 0.42 + 0.3 * lift));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = rgba(kit.light, 0.85);
  ctx.lineWidth = Math.max(1.5, a * 0.055);
  ctx.stroke();
  curve(ctx, spine.slice(1, n));
  ctx.strokeStyle = rgba(kit.dark, 0.32);
  ctx.lineWidth = Math.max(1, a * 0.035);
  ctx.stroke();
}

function turtleOne(ctx, w, h, S, i) {
  const kit = S.kit(i);
  const Lt = S.min * S.size * TURTLE_SIZE[i % TURTLE_SIZE.length] * (0.96 + 0.08 * hash01(i, 3));
  const a = Lt / 2.5;
  const c = a * 0.84;
  const margin = a * 1.9 + 8;
  const mx = margin / w;
  const my = margin / h;
  const hx0 = clamp(HOME_X[i % 6] + 0.04 * (hash01(i, 9) - 0.5), mx + 0.03, 1 - mx - 0.03);
  const hy0 = clamp(HOME_Y[i % 6] + 0.04 * (hash01(i, 10) - 0.5), my + 0.03, 1 - my - 0.03);
  const axf = clamp(Math.min(0.2, hx0 - mx, 1 - mx - hx0), 0.02, 0.44);
  const ayf = clamp(Math.min(0.16, hy0 - my, 1 - my - hy0), 0.02, 0.42);
  const r = roam(i, S.t, w, h, {
    rate: 0.05 + 0.02 * hash01(i, 4),
    ax: axf,
    ay: ayf,
    cx: hx0,
    cy: hy0,
    seed: 11,
  });
  const fl = S.flow == null ? 1 : S.flow;
  const dph = hash01(i, 12) * TAU;
  const dxa = fl * 0.3 * a;
  const dya = fl * 0.22 * a;
  const px = r.x + dxa * Math.sin(S.t * 0.1 + dph);
  const py = r.y + dya * Math.sin(S.t * 0.077 + dph * 1.7);
  const vx = r.vx + dxa * 0.1 * Math.cos(S.t * 0.1 + dph);
  const vy = r.vy + dya * 0.077 * Math.cos(S.t * 0.077 + dph * 1.7);
  const bend = Math.tanh(r.turn * 5);

  const b = S.b;
  const f = 0.25 * (0.9 + 0.2 * hash01(i, 6));
  const cyc = f * b + hash01(i, 7);
  const wob = 0.045 * Math.sin(TAU * cyc + 0.6);
  const rot = Math.atan2(vy, vx) + wob;
  // fixed light from upper left, expressed in the turtle frame
  const lx = -0.5 * Math.cos(rot) - 0.8 * Math.sin(rot);
  const ly = 0.5 * Math.sin(rot) - 0.8 * Math.cos(rot);

  const tauL = cyc;
  const tauR = cyc + 0.13 + 0.05 * hash01(i, 8);

  const P = (sn, v) => [sn * a, v * c * turtleShellW(sn) + bend * (0.5 - 0.5 * sn) * c * 0.22];

  at(ctx, px, py, rot, 1, 1, () => {
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const lw = Math.max(1.4, a * 0.05);

    // tail
    const tp = [];
    for (let j = 0; j <= 4; j++) {
      const s = j / 4;
      tp.push([-0.95 * a - 0.34 * a * s, bend * 0.2 * c + 0.1 * a * s * Math.sin(TAU * cyc - s * 2.2)]);
    }
    poly(ctx, ribbon(tp, (s) => a * (0.08 * (1 - s) + 0.015)));
    ctx.fillStyle = mixHex(kit.second, kit.dark, 0.2);
    ctx.fill();

    // rear flippers: small paddles, offset against the front pair
    for (const s of [1, -1]) {
      const tau = (s > 0 ? tauL : tauR) + 0.42;
      const sp = turtleSpine(-0.58 * a, s * 0.5 * c, s, tau, 0.6 * a, 2.15, 2.7, 0.08, 6);
      turtleFlipper(ctx, sp, 0.21, a, kit, turtleStroke(tau)[1]);
    }
    // front flippers: the big paddles, rooted at the shoulders under the shell
    for (const s of [1, -1]) {
      const tau = s > 0 ? tauL : tauR;
      const sp = turtleSpine(0.46 * a, s * 0.6 * c, s, tau, 1.12 * a, 0.85, 1.95, 0.1, 8);
      turtleFlipper(ctx, sp, 0.37, a, kit, turtleStroke(tau)[1]);
    }

    // neck and head
    const hy = clamp(bend * 0.55, -0.55, 0.55) + 0.12 * Math.sin(b * 0.37 + hash01(i, 13) * TAU) + 0.04 * Math.sin(TAU * cyc + 2);
    const D = 0.5 * a * (1 + 0.06 * Math.sin(TAU * cyc + 1));
    const np = [[0.86 * a, bend * 0.02 * c]];
    for (let k = 1; k <= 4; k++) {
      const ang = hy * Math.pow(k / 4, 1.3);
      const q = np[k - 1];
      np.push([q[0] + (Math.cos(ang) * D) / 4, q[1] + (Math.sin(ang) * D) / 4]);
    }
    poly(ctx, ribbon(np, (s) => a * (0.21 - 0.05 * s)));
    ctx.fillStyle = mixHex(kit.second, kit.dark, 0.22);
    ctx.fill();
    ctx.strokeStyle = rgba(kit.light, 0.5);
    ctx.lineWidth = lw;
    ctx.stroke();

    // shell: dark moat, lit gradient, scutes, rim
    const outline = [];
    const M = 26;
    for (let k = 0; k <= M; k++) outline.push(P(-1 + (2 * k) / M, -1));
    for (let k = M; k >= 0; k--) outline.push(P(-1 + (2 * k) / M, 1));
    poly(ctx, outline.map((p) => [p[0] * 1.1, p[1] * 1.1]));
    ctx.fillStyle = rgba(mixHex(kit.dark, kit.main, 0.15), 0.92);
    ctx.fill();
    poly(ctx, outline);
    const sg = ctx.createRadialGradient(lx * 0.35 * a, ly * 0.35 * c, 0, lx * 0.35 * a, ly * 0.35 * c, 1.35 * a);
    sg.addColorStop(0, mixHex(kit.main, kit.light, 0.3));
    sg.addColorStop(0.5, mixHex(kit.main, kit.dark, 0.28));
    sg.addColorStop(1, mixHex(kit.main, kit.dark, 0.66));
    ctx.fillStyle = sg;
    ctx.fill();

    // marginal scutes: ring plus ticks
    const ring = [];
    for (let k = 1; k < M; k++) ring.push(P(-1 + (2 * k) / M, -0.82));
    for (let k = M - 1; k >= 1; k--) ring.push(P(-1 + (2 * k) / M, 0.82));
    poly(ctx, ring);
    ctx.strokeStyle = rgba(kit.light, 0.65);
    ctx.lineWidth = lw * 1.15;
    ctx.stroke();
    for (let m = 0; m < 12; m++) {
      const sn = -0.82 + (1.64 * m) / 11;
      for (const s of [1, -1]) {
        const p0 = P(sn, s * 0.82);
        const p1 = P(sn, s * 1.0);
        ctx.beginPath();
        ctx.moveTo(p0[0], p0[1]);
        ctx.lineTo(p1[0], p1[1]);
        ctx.strokeStyle = rgba(kit.light, 0.8);
        ctx.lineWidth = lw * 1.4;
        ctx.stroke();
      }
    }
    // costal seams and accent growth marks
    const vc = [0.6, 0.27, -0.06, -0.38, -0.68];
    const vh = [0.17, 0.16, 0.16, 0.15, 0.13];
    const vw = [0.34, 0.38, 0.38, 0.34, 0.26];
    for (let k = 0; k < 4; k++) {
      const jn = (vc[k] + vc[k + 1]) / 2;
      for (const s of [1, -1]) {
        const p0 = P(jn, s * 0.26);
        const p1 = P(jn - 0.12, s * 0.82);
        ctx.beginPath();
        ctx.moveTo(p0[0], p0[1]);
        ctx.lineTo(p1[0], p1[1]);
        ctx.strokeStyle = rgba(kit.light, 0.9);
        ctx.lineWidth = lw * 1.6;
        ctx.stroke();
        const pc = P(jn + 0.01, s * 0.55);
        ellipse(ctx, pc[0], pc[1], a * 0.07, a * 0.06, 0);
        ctx.fillStyle = rgba(kit.accent, 0.32);
        ctx.fill();
      }
    }
    // vertebral row: five larger hexagonal scutes
    for (let k = 0; k < 5; k++) {
      const s0 = vc[k];
      const hl = vh[k];
      const v0 = vw[k];
      poly(ctx, [P(s0 + hl, -v0 * 0.7), P(s0, -v0), P(s0 - hl, -v0 * 0.7), P(s0 - hl, v0 * 0.7), P(s0, v0), P(s0 + hl, v0 * 0.7)]);
      ctx.fillStyle = rgba(mixHex(kit.main, kit.light, 0.5), 0.62);
      ctx.fill();
      ctx.strokeStyle = rgba(kit.light, 0.95);
      ctx.lineWidth = lw * 1.6;
      ctx.stroke();
      const pc = P(s0, 0);
      ellipse(ctx, pc[0], pc[1], a * 0.06, a * 0.05, 0);
      ctx.fillStyle = rgba(kit.accent, 0.38);
      ctx.fill();
    }
    // bright rim
    poly(ctx, outline);
    ctx.strokeStyle = rgba(kit.light, 0.96);
    ctx.lineWidth = Math.max(2.2, a * 0.075);
    ctx.stroke();

    // head: bright, with a dark outline so it separates from the shell and flippers
    const hb = np[4];
    const hx = hb[0] + Math.cos(hy) * 0.1 * a;
    const hyy = hb[1] + Math.sin(hy) * 0.1 * a;
    at(ctx, hx, hyy, hy, 1, 1, () => {
      ellipse(ctx, 0.1 * a, 0, 0.47 * a, 0.35 * a, 0);
      ctx.fillStyle = rgba(kit.dark, 0.9);
      ctx.fill();
      ellipse(ctx, 0.06 * a, 0, 0.38 * a, 0.29 * a, 0);
      const hg = ctx.createLinearGradient(-0.3 * a, 0, 0.45 * a, 0);
      hg.addColorStop(0, mixHex(kit.second, kit.dark, 0.05));
      hg.addColorStop(1, mixHex(kit.second, kit.light, 0.5));
      ctx.fillStyle = hg;
      ctx.fill();
      ellipse(ctx, 0.4 * a, 0, 0.16 * a, 0.13 * a, 0);
      ctx.fillStyle = mixHex(kit.second, kit.light, 0.65);
      ctx.fill();
      ellipse(ctx, 0.06 * a, 0, 0.38 * a, 0.29 * a, 0);
      ctx.strokeStyle = rgba(kit.light, 0.8);
      ctx.lineWidth = lw;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0.02 * a, -0.19 * a);
      ctx.quadraticCurveTo(0.26 * a, 0, 0.02 * a, 0.19 * a);
      ctx.strokeStyle = rgba(kit.dark, 0.4);
      ctx.lineWidth = lw * 0.9;
      ctx.stroke();
      for (const s of [1, -1]) {
        ellipse(ctx, 0.16 * a, s * 0.2 * a, 0.075 * a, 0.06 * a, 0);
        ctx.fillStyle = rgba(kit.dark, 0.97);
        ctx.fill();
      }
    });
  });
}

export default {
  id: "sea-turtles",
  name: "Sea turtles",
  group: "ocean",
  blurb: "Sea turtles paddle along relaxed curves, their flippers stroking out of step.",
  motion: "travel",
  count: { min: 0, max: 6, default: 2, noun: "Sea turtle" },
  natural: [
    makeKit({ main: "#6f8a45", light: "#ebe6bd", dark: "#222f16", accent: "#e3c45f", second: "#b9c585" }),
    makeKit({ main: "#a0713b", light: "#f2dfb4", dark: "#2f1d0e", accent: "#e0a944", second: "#d0a36b" }),
    makeKit({ main: "#6f8c7d", light: "#e1ebdf", dark: "#1f2d29", accent: "#b9d0bb", second: "#a3bcab" }),
  ],
  flow: { label: "Current", help: "How strongly the current nudges turtles off their line.", default: 1, min: 0, max: 1.5 },
  backdrop: { dark: "#091a1c", light: "#e4efec" },
  draw(ctx, w, h, S) {
    for (let i = 0; i < S.count; i++) {
      const d = placeAtDepth(ctx, S, i);
      turtleOne(d.ctx, w, h, d.S, i);
    }
  },
};
