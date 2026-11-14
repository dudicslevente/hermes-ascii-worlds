import { makeKit, TAU, clamp, clamp01, lerp, fract, hash01, rgba, mixHex, shadeHex, shiftHue, smoothstep, poly, curve, ellipse, glow, ribbon } from "../core/util.js";

// Pirate ship: one richly drawn galleon on ONE wavy line in an empty sky. Planked hull with gold trim and
// gun ports, stern castle with lantern, three masts, billowing seamed sails with a skull, lookout, helmsman,
// pennant, bow spray + wake, a rare cannon puff, a kraken tentacle and a gull as extras.
const LINE_Y = [[0.7], [0.58, 0.86]];
const SC = [1, 0.62];

function track(i, t, w, L) {
  const span = w + 1.9 * L;
  const per = (38 + 6 * hash01(i, 1)) * clamp(span / 1500, 0.6, 1.2) * (i ? 1.15 : 1);
  const gap = 2.5 + 2.5 * hash01(i, 2);
  const cyc = per + gap;
  const u = t / cyc + (i === 0 ? 0.25 : 0.7);
  const n = Math.floor(u);
  const pf = ((u - n) * cyc) / per;
  const dir = (n + i) & 1 ? -1 : 1;
  const e = clamp01(pf);
  let x = -0.95 * L + span * e;
  if (dir < 0) x = w - x;
  return { vis: pf <= 1, x, dir, n, ph: hash01(i, 6, n) * TAU };
}

function surf(x, b, A, wl) {
  return A * (Math.sin((x / wl) * TAU - b * 0.9) + 0.35 * Math.sin((x / (wl * 0.55)) * TAU + b * 1.3));
}

function toneKit(k, dark) {
  if (dark) return k;
  return {
    main: shadeHex(k.main, 0.5),
    light: mixHex(shadeHex(k.main, 0.9), k.light, 0.92),
    dark: k.dark,
    accent: shadeHex(k.accent, 0.95),
    second: shadeHex(k.second, 0.8),
  };
}

// ---- pieces ----------------------------------------------------------------
function sailShape(cx, y0, y1, wd, B, rb) {
  return (u, v) => {
    const rip = 0.011 * Math.sin(u * 3.4 + v * 2.6 - rb) * (0.25 + 0.75 * B);
    const x = cx + u * wd * (1 - 0.1 * B * Math.sin(Math.PI * v)) + 0.03 * B * Math.sin(Math.PI * v) * (1 - u * u) + rip;
    const y = y0 + (y1 - y0) * v + 0.05 * B * (1 - u * u) * v * v + 0.006 * Math.sin(u * 2.3 - rb * 1.3) * v;
    return [x, y];
  };
}

function drawSquareSail(ctx, kit, cx, y0, y1, wd, B, rb, emblem) {
  const P = sailShape(cx, y0, y1, wd, B, rb);
  const pts = [];
  for (let k = 0; k <= 8; k++) pts.push(P(-1 + k / 4, 0));
  for (let k = 1; k <= 6; k++) pts.push(P(1, k / 6));
  for (let k = 1; k <= 8; k++) pts.push(P(1 - k / 4, 1));
  for (let k = 1; k < 6; k++) pts.push(P(-1, 1 - k / 6));
  poly(ctx, pts);
  const g = ctx.createLinearGradient(cx - wd, 0, cx + wd, 0);
  const shade = mixHex(kit.light, kit.main, 0.22);
  g.addColorStop(0, rgba(shade, 1));
  g.addColorStop(0.45 + 0.08 * Math.sin(rb * 0.7), rgba(kit.light, 1));
  g.addColorStop(1, rgba(mixHex(kit.light, kit.main, 0.08), 1));
  ctx.fillStyle = g;
  ctx.fill();
  // moving folds
  for (let k = 0; k < 3; k++) {
    const uc = -0.62 + 0.62 * k + 0.1 * Math.sin(rb * 0.8 + k * 1.7);
    const a = [],
      c = [];
    for (let q = 0; q <= 5; q++) {
      a.push(P(uc - 0.09, q / 5));
      c.push(P(uc + 0.09, q / 5));
    }
    poly(ctx, a.concat(c.reverse()));
    ctx.fillStyle = rgba(shade, 0.5);
    ctx.fill();
  }
  poly(ctx, pts);
  ctx.strokeStyle = rgba(mixHex(kit.light, kit.main, 0.55), 0.9);
  ctx.lineWidth = 0.009;
  ctx.lineJoin = "round";
  ctx.stroke();
  if (emblem) {
    const C = P(0, 0.46);
    const sc = (y1 - y0) / 0.28;
    const ink = mixHex(kit.dark, kit.main, 0.25);
    ctx.save();
    ctx.translate(C[0], C[1]);
    ctx.scale(sc, sc);
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    ctx.lineCap = "round";
    ctx.lineWidth = 0.026;
    ctx.beginPath();
    ctx.moveTo(-0.098, 0.082);
    ctx.lineTo(0.098, -0.042);
    ctx.moveTo(0.098, 0.082);
    ctx.lineTo(-0.098, -0.042);
    ctx.stroke();
    for (const [bx, by] of [[-0.105, 0.088], [0.105, 0.088], [-0.105, -0.048], [0.105, -0.048]]) {
      ellipse(ctx, bx, by, 0.02, 0.02);
      ctx.fill();
    }
    ellipse(ctx, 0, -0.028, 0.068, 0.062);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(-0.04, 0.012, 0.08, 0.05, 0.014) : ctx.rect(-0.04, 0.012, 0.08, 0.05);
    ctx.fill();
    ctx.fillStyle = kit.light;
    ellipse(ctx, -0.027, -0.03, 0.021, 0.024);
    ctx.fill();
    ellipse(ctx, 0.027, -0.03, 0.021, 0.024);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -0.004);
    ctx.lineTo(-0.009, 0.016);
    ctx.lineTo(0.009, 0.016);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawJib(ctx, kit, B, rb) {
  const A = [0.37, -0.7],
    T = [0.9, -0.37],
    C = [0.52, -0.23];
  const bil = 0.05 * B;
  ctx.beginPath();
  ctx.moveTo(A[0], A[1]);
  ctx.quadraticCurveTo(0.66 + 0.01 * Math.sin(rb), -0.58 - bil * 0.3, T[0], T[1]);
  ctx.quadraticCurveTo(0.78 + bil + 0.012 * Math.sin(rb * 1.1 + 1), -0.26 + bil * 0.4, C[0], C[1]);
  ctx.quadraticCurveTo(0.4 - bil * 0.3, -0.46, A[0], A[1]);
  ctx.closePath();
  const g = ctx.createLinearGradient(A[0], A[1], C[0], C[1]);
  g.addColorStop(0, rgba(mixHex(kit.light, kit.main, 0.14), 1));
  g.addColorStop(1, rgba(mixHex(kit.light, kit.main, 0.4), 1));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = rgba(mixHex(kit.light, kit.main, 0.55), 0.9);
  ctx.lineWidth = 0.009;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0.42, -0.62);
  ctx.quadraticCurveTo(0.6, -0.4 + bil * 0.2, 0.62, -0.3);
  ctx.lineWidth = 0.03;
  ctx.strokeStyle = rgba(mixHex(kit.light, kit.main, 0.45), 0.5);
  ctx.stroke();
}

function drawFlag(ctx, kit, x, y, len, hgt, amp, b, ph) {
  const top = [],
    bot = [];
  const N = 9;
  for (let k = 0; k <= N; k++) {
    const s = k / N;
    const wv = amp * 0.05 * s * Math.sin(s * 7.5 - b * 5.2 + ph) + 0.006 * amp * Math.sin(b * 2 + ph);
    top.push([x + len * s * (0.9 + 0.1 * amp), y - hgt / 2 * (1 - 0.1 * s) + wv]);
    bot.push([x + len * s * (0.9 + 0.1 * amp), y + hgt / 2 * (1 - 0.95 * s * s) + wv]);
  }
  poly(ctx, top.concat(bot.reverse()));
  ctx.fillStyle = kit.accent;
  ctx.fill();
  ctx.strokeStyle = rgba(kit.light, 0.7);
  ctx.lineWidth = 0.008;
  ctx.stroke();
  ctx.fillStyle = rgba(kit.light, 0.95);
  const p = top[2];
  ellipse(ctx, p[0] + 0.005, p[1] + hgt * 0.5, 0.015, 0.015);
  ctx.fill();
}

// ---- one ship -----------------------------------------------------------------
function drawShip(ctx, S, kit, i, T, U, b, flow) {
  const B = clamp(flow * (0.8 + 0.2 * Math.sin(0.5 * b + T.ph)), 0, 1.3) * 0.9 + 0.1 * (flow > 0 ? 1 : 0);
  const rb = 2.3 * b + T.ph;
  const wood = mixHex(kit.main, kit.light, 0.3);
  const dk = kit.dark;
  // gull / lookout / gun state

  ctx.save();
  // hull
  const hull = () => {
    ctx.beginPath();
    ctx.moveTo(-0.6, -0.28);
    ctx.lineTo(-0.3, -0.28);
    ctx.lineTo(-0.3, -0.17);
    ctx.lineTo(0.3, -0.17);
    ctx.lineTo(0.3, -0.22);
    ctx.lineTo(0.64, -0.28);
    ctx.quadraticCurveTo(0.62, -0.08, 0.34, 0.07);
    ctx.lineTo(-0.3, 0.09);
    ctx.quadraticCurveTo(-0.58, 0.05, -0.62, -0.08);
    ctx.closePath();
  };

  // masts (behind sails)
  ctx.lineCap = "round";
  ctx.strokeStyle = wood;
  ctx.lineWidth = 0.028;
  for (const [mx, top] of [[-0.34, -0.7], [0.0, -1.0], [0.37, -0.78]]) {
    ctx.beginPath();
    ctx.moveTo(mx, -0.2);
    ctx.lineTo(mx, top);
    ctx.stroke();
  }
  ctx.lineWidth = 0.034;
  ctx.beginPath();
  ctx.moveTo(0.5, -0.25);
  ctx.lineTo(0.92, -0.39);
  ctx.stroke();

  // sails
  const dd = (x, y0, y1, wd, em) => {
    ctx.strokeStyle = wood;
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    ctx.moveTo(x - wd - 0.035, y0);
    ctx.lineTo(x + wd + 0.035, y0);
    ctx.stroke();
    drawSquareSail(ctx, kit, x, y0, y1, wd, B, rb + x * 5, em);
  };
  dd(-0.34, -0.62, -0.4, 0.11, false);
  dd(0.0, -0.74, -0.51, 0.18, false);
  dd(0.0, -0.46, -0.19, 0.225, true);
  dd(0.37, -0.64, -0.43, 0.13, false);
  dd(0.37, -0.39, -0.19, 0.16, false);
  drawJib(ctx, kit, B, rb);

  // hull body
  hull();
  const hg = ctx.createLinearGradient(0, -0.28, 0, 0.09);
  hg.addColorStop(0, rgba(mixHex(kit.main, kit.light, 0.28), 1));
  hg.addColorStop(0.55, rgba(kit.main, 1));
  hg.addColorStop(1, rgba(mixHex(kit.main, dk, 0.35), 1));
  ctx.fillStyle = hg;
  ctx.fill();
  ctx.save();
  hull();
  ctx.clip();
  // planks
  ctx.strokeStyle = rgba(dk, 0.55);
  ctx.lineWidth = 0.012;
  for (const py of [0.025, 0.065]) {
    ctx.beginPath();
    ctx.moveTo(-0.7, py + 0.006);
    ctx.quadraticCurveTo(0.0, py - 0.012, 0.7, py - 0.05);
    ctx.stroke();
  }
  // gold trim
  ctx.strokeStyle = kit.accent;
  ctx.lineWidth = 0.018;
  ctx.beginPath();
  ctx.moveTo(-0.7, -0.015);
  ctx.quadraticCurveTo(0.0, -0.04, 0.7, -0.1);
  ctx.stroke();
  ctx.lineWidth = 0.012;
  ctx.beginPath();
  ctx.moveTo(-0.7, -0.255);
  ctx.lineTo(-0.3, -0.255);
  ctx.moveTo(-0.3, -0.155);
  ctx.lineTo(0.3, -0.155);
  ctx.moveTo(0.3, -0.205);
  ctx.lineTo(0.7, -0.265);
  ctx.stroke();
  ctx.restore();
  // gun ports
  for (const px of [-0.16, 0.02, 0.2]) {
    ctx.fillStyle = rgba(dk, 0.92);
    ctx.fillRect(px - 0.032, -0.135, 0.064, 0.056);
    ctx.strokeStyle = rgba(kit.accent, 0.9);
    ctx.lineWidth = 0.01;
    ctx.strokeRect(px - 0.032, -0.135, 0.064, 0.056);
  }
  // stern windows
  ctx.fillStyle = kit.accent;
  ctx.fillRect(-0.57, -0.235, 0.05, 0.045);
  ctx.fillRect(-0.49, -0.235, 0.05, 0.045);
  // hull rim light
  hull();
  ctx.strokeStyle = rgba(kit.light, 0.55);
  ctx.lineWidth = 0.01;
  ctx.lineJoin = "round";
  ctx.stroke();

  // cannon flash + smoke
  {
    const P = 27 + 8 * hash01(i, 30);
    const qq = b / P + hash01(i, 31);
    const c = Math.floor(qq);
    const age = (qq - c) * P;
    const port = [-0.16, 0.02, 0.2][Math.floor(hash01(i, 32, c) * 3)];
    if (age < 3.6) {
      if (age < 0.28) {
        const a = 1 - age / 0.28;
        glow(ctx, port, -0.108, 0.14 + 0.08 * (1 - a), kit.accent, 0.95 * a);
        glow(ctx, port, -0.108, 0.07, kit.light, a);
      }
      for (let j = 0; j < 5; j++) {
        const a = clamp01((age - 0.08 - j * 0.1) / 2.9);
        if (a <= 0 || a >= 1) continue;
        const sx = port + 0.03 - 0.07 * a * (1 + 0.2 * j) + 0.02 * j * 0.3,
          sy = -0.11 - 0.09 * a - 0.014 * j;
        ellipse(ctx, sx, sy, 0.03 + 0.07 * a + 0.006 * j, 0.026 + 0.06 * a + 0.005 * j);
        ctx.fillStyle = rgba(mixHex(kit.light, dk, 0.22), 0.65 * Math.sin(Math.PI * Math.pow(a, 0.7)) * (a < 0.1 ? a * 10 : 1));
        ctx.fill();
      }
    }
  }

  // rigging
  ctx.strokeStyle = rgba(kit.light, 0.8);
  ctx.lineWidth = 0.013;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0.0, -0.98);
  ctx.lineTo(0.62, -0.28);
  ctx.moveTo(0.0, -0.98);
  ctx.lineTo(-0.58, -0.285);
  ctx.moveTo(0.37, -0.77);
  ctx.lineTo(0.9, -0.39);
  ctx.moveTo(-0.34, -0.69);
  ctx.lineTo(-0.6, -0.285);
  ctx.stroke();

  // crow's nest + lookout
  {
    const wave = fract(b / 9 + hash01(i, 40)) < 0.26;
    const wp = wave ? Math.sin(b * 9) : 0;
    const skin = mixHex(kit.light, kit.accent, 0.3);
    // body
    ctx.fillStyle = mixHex(kit.second, kit.light, 0.2);
    ctx.fillRect(-0.028, -0.86, 0.056, 0.07);
    // arm
    ctx.strokeStyle = skin;
    ctx.lineWidth = 0.022;
    ctx.lineCap = "round";
    const sh = [0.03, -0.845];
    const ang = wave ? -1.1 + 0.45 * wp : 0.9;
    const ah = [sh[0] + Math.cos(ang) * 0.055, sh[1] + Math.sin(ang) * 0.055];
    ctx.beginPath();
    ctx.moveTo(sh[0], sh[1]);
    ctx.lineTo(ah[0], ah[1]);
    ctx.stroke();
    ctx.fillStyle = skin;
    ellipse(ctx, ah[0], ah[1], 0.017, 0.017);
    ctx.fill();
    // head
    const hy = -0.895 + 0.004 * Math.sin(b * 1.7);
    ellipse(ctx, 0, hy, 0.034, 0.034);
    ctx.fill();
    ctx.fillStyle = kit.accent;
    ctx.beginPath();
    ctx.arc(0, hy, 0.037, Math.PI * 1.05, Math.PI * 1.95);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = dk;
    ellipse(ctx, 0.014, hy + 0.004, 0.006, 0.006);
    ctx.fill();
    // nest
    ctx.beginPath();
    ctx.moveTo(-0.085, -0.835);
    ctx.lineTo(0.085, -0.835);
    ctx.lineTo(0.065, -0.775);
    ctx.lineTo(-0.065, -0.775);
    ctx.closePath();
    ctx.fillStyle = mixHex(kit.main, kit.light, 0.18);
    ctx.fill();
    ctx.strokeStyle = kit.accent;
    ctx.lineWidth = 0.014;
    ctx.stroke();
  }
  // figurehead under the bowsprit + stern lantern
  {
    ctx.fillStyle = kit.accent;
    ctx.strokeStyle = kit.accent;
    ctx.lineCap = "round";
    ctx.lineWidth = 0.03;
    ctx.beginPath();
    ctx.moveTo(0.6, -0.27);
    ctx.quadraticCurveTo(0.7, -0.26, 0.72, -0.17);
    ctx.stroke();
    ellipse(ctx, 0.7, -0.3, 0.035, 0.035);
    ctx.fill();
    ctx.strokeStyle = wood;
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    ctx.moveTo(-0.63, -0.27);
    ctx.lineTo(-0.63, -0.43);
    ctx.stroke();
    const fl = 0.85 + 0.15 * Math.sin(b * 3.1 + T.ph);
    glow(ctx, -0.63, -0.46, 0.1, kit.accent, 0.55 * fl);
    ctx.fillStyle = kit.accent;
    ctx.beginPath();
    ctx.roundRect(-0.655, -0.5, 0.05, 0.065, 0.015);
    ctx.fill();
    ctx.fillStyle = kit.light;
    ellipse(ctx, -0.63, -0.468, 0.012, 0.016);
    ctx.fill();
  }
  // helmsman + wheel
  {
    const sway = 0.006 * Math.sin(b * 0.9 + T.ph);
    const skin = mixHex(kit.light, kit.accent, 0.3);
    ctx.fillStyle = mixHex(kit.second, kit.light, 0.2);
    ctx.fillRect(-0.545 + sway, -0.37, 0.058, 0.09);
    ellipse(ctx, -0.516 + sway, -0.405, 0.03, 0.03);
    ctx.fillStyle = skin;
    ctx.fill();
    ctx.fillStyle = kit.accent;
    ctx.beginPath();
    ctx.arc(-0.516 + sway, -0.405, 0.033, Math.PI * 1.0, Math.PI * 2.0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = dk;
    ellipse(ctx, -0.503 + sway, -0.4, 0.005, 0.005);
    ctx.fill();
    // wheel
    const wx = -0.445,
      wy = -0.355;
    const rot = 0.5 * Math.sin(b * 0.45 + T.ph) + 0.15 * b * 0.2;
    ctx.strokeStyle = kit.accent;
    ctx.lineWidth = 0.014;
    ellipse(ctx, wx, wy, 0.055, 0.055);
    ctx.stroke();
    ctx.lineWidth = 0.011;
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const a = rot + (k * Math.PI) / 4;
      ctx.moveTo(wx + Math.cos(a) * 0.075, wy + Math.sin(a) * 0.075);
      ctx.lineTo(wx - Math.cos(a) * 0.075, wy - Math.sin(a) * 0.075);
    }
    ctx.stroke();
    ctx.strokeStyle = skin;
    ctx.lineWidth = 0.02;
    ctx.beginPath();
    ctx.moveTo(-0.5 + sway, -0.35);
    ctx.lineTo(wx - 0.045, wy + 0.01);
    ctx.stroke();
  }
  // pennant on the main mast + bowsprit flag
  drawFlag(ctx, kit, 0.0, -1.03, 0.24, 0.085, flow, b, T.ph);

  ctx.restore();
}

export default {
  id: "pirate-ship",
  name: "Pirate ship",
  group: "adventure",
  blurb: "A lone galleon with a skull on its sail rides a single wavy line, flag waving, a small wake behind.",
  motion: "travel",
  count: { min: 0, max: 2, default: 1, noun: "Ship" },
  natural: [
    makeKit({ main: "#9a6338", light: "#f4e8c6", dark: "#2a170c", accent: "#efb63a", second: "#2f7a96" }),
    makeKit({ main: "#8a3b3b", light: "#e3dcd6", dark: "#1d1417", accent: "#e2503a", second: "#43587a" }),
    makeKit({ main: "#2f8696", light: "#ebf3ef", dark: "#0d2438", accent: "#f2c74c", second: "#27579a" }),
    makeKit({ main: "#d9cfb5", light: "#fff7df", dark: "#5b4a2a", accent: "#f0b429", second: "#4f95a3" }),
  ],
  atmosphere: "none",
  flow: { label: "Wind", help: "How hard the wind fills the sails and snaps the flag.", default: 1, min: 0, max: 1.5 },
  extras: [
    { key: "kraken", type: "toggle", label: "Kraken", default: true, help: "Now and then a tentacle rises astern, curls and sinks again." },
    { key: "gulls", type: "toggle", label: "Gull", default: true, help: "A single gull glides across the sky now and then." },
    { key: "waves", type: "range", label: "Waves", min: 0.3, max: 1.5, step: 0.05, default: 1, help: "How tall the wavy line swells and how much the ship rocks." },
  ],
  backdrop: { dark: "#08121c", light: "#e4ecf1" },
  draw(ctx, w, h, S) {
    const n = S.count | 0;
    if (n <= 0) return;
    const wind = clamp(S.flow ?? 1, 0, 1.5);
    const wv = S.extra?.waves ?? 1;
    const A = h * 0.017 * wv;
    const ys = LINE_Y[n > 1 ? 1 : 0];
    const kraken = S.extra?.kraken !== false;
    const gulls = S.extra?.gulls !== false;
    const k0 = toneKit(S.kit(0), S.dark);

    for (let i = 0; i < n; i++) {
      const kit = toneKit(S.kit(i), S.dark);
      const sc = SC[i] ?? 0.6;
      const L = Math.min(w * 0.36, h * 0.4) * S.size * (n > 1 ? sc : 1);
      const wl = Math.max(80, L * 1.9);
      const yl = h * (ys[i] ?? ys[0]);
      const ph = i * 2.1;
      const b = S.b + ph;

      // the single wavy line
      const lw = Math.max(2.5, h * 0.006);
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, rgba(kit.second, 0));
      g.addColorStop(0.1, rgba(kit.second, 0.85));
      g.addColorStop(0.9, rgba(kit.second, 0.85));
      g.addColorStop(1, rgba(kit.second, 0));
      ctx.strokeStyle = g;
      ctx.lineWidth = lw;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      const step = Math.max(8, w / 120);
      for (let x = -step; x <= w + step; x += step) {
        const y = yl + surf(x, b, A, wl);
        x === -step ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();

      const tr = track(i, S.t, w, L);

      // rare tentacle astern
      if (kraken && tr.vis) {
        const KP = 19 + 3 * i;
        const q = S.t / KP + hash01(i, 31);
        const c = Math.floor(q);
        const age = (q - c) * KP;
        const D = 5.5;
        if (age < D && hash01(i, 32, c) < 0.85) {
          const t0 = track(i, S.t - age, w, L);
          if (t0.vis) {
            const xk = t0.x - t0.dir * 1.05 * L;
            const env = Math.pow(Math.sin(Math.PI * clamp01(age / D)), 0.8);
            const Hk = 0.7 * L * env;
            const yb = yl + surf(xk, b, A, wl) + lw;
            const sp = [];
            for (let k = 0; k <= 9; k++) {
              const s = k / 9;
              const sway = Math.sin(S.b * 1.3 + s * 3.2 + ph) * 0.1 * L * s;
              sp.push([xk + sway + t0.dir * s * s * 0.2 * L * env, yb - s * Hk]);
            }
            const rib = ribbon(sp, (s) => L * (0.055 - 0.035 * s) + 1);
            curve(ctx, rib, true);
            ctx.fillStyle = mixHex(kit.second, kit.light, 0.3);
            ctx.fill();
            ctx.fillStyle = kit.light;
            for (let k = 2; k <= 7; k += 2) {
              ellipse(ctx, sp[k][0], sp[k][1], Math.max(1.8, L * 0.012), Math.max(1.8, L * 0.012));
              ctx.fill();
            }
          }
        }
      }

      if (!tr.vis) continue;

      const yS = yl + surf(tr.x, b, A, wl);
      const dydx = (surf(tr.x + 6, b, A, wl) - surf(tr.x - 6, b, A, wl)) / 12;
      const pitch = clamp(Math.atan(dydx), -0.3, 0.3) * 0.4 * tr.dir;

      // small wake
      for (let k = 0; k < 3; k++) {
        const wx = tr.x - tr.dir * (0.62 + 0.24 * k) * L;
        const wy = yl + surf(wx, b, A, wl) - lw * 1.6 - k * 0.2;
        ctx.strokeStyle = rgba(kit.light, 0.7 - 0.2 * k);
        ctx.lineWidth = Math.max(2, L * 0.016);
        ctx.beginPath();
        ctx.moveTo(wx - 0.05 * L, wy + 0.012 * L * Math.sin(S.b * 2 + k));
        ctx.quadraticCurveTo(wx, wy - 0.03 * L, wx + 0.05 * L, wy);
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(tr.x, yS + lw * 0.3);
      ctx.scale(tr.dir, 1);
      ctx.rotate(pitch);
      ctx.scale(L, L);
      ctx.translate(0, -0.06);
      ctx.lineJoin = "round";
      drawShip(ctx, S, kit, i, tr, L, b, clamp(0.35 + 0.65 * wind, 0, 1.3));
      ctx.restore();
    }

    // a gull
    if (gulls) {
      const GP = 23;
      const q = S.t / GP + 0.35;
      const c = Math.floor(q);
      const age = (q - c) * GP;
      const D = 11;
      if (age < D) {
        const u = age / D;
        const dir = hash01(0, 41, c) < 0.5 ? 1 : -1;
        let gx = lerp(-0.08, 1.08, u) * w;
        if (dir < 0) gx = w - gx;
        const gy = h * (0.16 + 0.1 * hash01(0, 42, c)) + Math.sin(u * TAU * 1.5) * h * 0.02;
        const gs = Math.max(26, Math.min(w * 0.04, h * 0.07)) * clamp(S.size, 0.7, 1.3);
        const f = Math.sin(S.b * 4.2);
        ctx.save();
        ctx.strokeStyle = k0.light;
        ctx.lineWidth = Math.max(3, gs * 0.14);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.translate(gx, gy);
        for (const sd of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(sd * gs * 0.5, -gs * (0.35 + 0.3 * f), sd * gs, gs * (0.05 - 0.28 * f));
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  },
};
