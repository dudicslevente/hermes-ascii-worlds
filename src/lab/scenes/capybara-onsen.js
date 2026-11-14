import { makeKit, TAU, clamp, clamp01, lerp, mod, smoothstep, hash01, rgba, shadeHex, mixHex, shiftHue, at, poly, curve, ellipse, glow } from "../core/util.js";

// Minimal onsen: one chunky calm capybara soaking in a small pool ellipse, a few
// soft steam wisps, an optional yuzu on its head, and a little chick that now and
// then pops up, hops onto its back for a sit and hops away again.
// Everything is a pure function of the clocks.

const ease = (p) => p * p * (3 - 2 * p);
const seg = (c, a, b) => ease(clamp01((c - a) / (b - a)));
const FP = 30; // friend cycle
const VL = 14; // one visit

function layout(w, h, size, n) {
  const f = n > 1 ? 0.72 : 1;
  let U = Math.min(0.28 * h, 0.15 * w) * size * f;
  U = clamp(U, 14, Math.min(0.17 * w, 0.32 * h) * f);
  const cx = w / 2;
  const wy = h * 0.5 + 0.55 * U;
  const prx = n > 1 ? 4.1 * U : 2.5 * U;
  return { U, cx, wy, prx, pry: 0.4 * U, pos: n > 1 ? [cx + 1.0 * U, cx - 2.2 * U] : [cx - 0.1 * U] };
}

// Height of the top of the back above the waterline at local x (body units).
const backTop = (x) => {
  const u = clamp(x / 1.15, -1, 1);
  return -0.1 - 0.75 * Math.sqrt(1 - u * u);
};

function ring(ctx, x, y, rx, ry, a, lw, hex) {
  if (a <= 0.02 || rx < 0.5) return;
  ctx.strokeStyle = rgba(hex, a);
  ctx.lineWidth = lw;
  ellipse(ctx, x, y, rx, ry);
  ctx.stroke();
}

function drawCapy(ctx, S, kit, i, x, wy, U, face, press, yuzu, ycol) {
  const b = S.b;
  const breath = Math.sin(b * 1.1 + i * 1.7) + 0.2 * Math.sin(b * 2.3 + i);
  const rim = S.dark ? mixHex(kit.main, kit.light, 0.55) : mixHex(kit.main, kit.dark, 0.7);
  const bodyC = S.dark ? mixHex(kit.main, kit.light, 0.22) : mixHex(kit.main, kit.dark, 0.6);
  const earC = mixHex(kit.main, kit.dark, S.dark ? 0.25 : 0.6);
  const noseC = mixHex(kit.main, kit.dark, S.dark ? 0.3 : 0.55);
  // chewing, ear flick, slow blink: cycle events
  const chQ = b / (14 + 3 * hash01(i, 3)) + hash01(i, 4);
  const chU = mod(chQ, 1) * (14 + 3 * hash01(i, 3));
  const chew = chU < 4.5 ? smoothstep(0, 0.5, chU) * (1 - smoothstep(4, 4.5, chU)) : 0;
  const jaw = chew * (0.5 + 0.5 * Math.sin(b * 7)) * 0.05;
  const eT = 8 + 2 * hash01(i, 6);
  const eU = mod(b / eT + hash01(i, 7), 1) * eT;
  const flick = eU < 0.5 ? Math.sin(Math.PI * eU / 0.5) : 0;
  const bT = 6 + 1.5 * hash01(i, 8);
  const bQ = mod(b / bT + hash01(i, 9), 1);
  const blink = bQ > 0.94 ? 1 - Math.abs((bQ - 0.97) / 0.03) : 0;
  const bob = 0.012 * breath + 0.03 * press;
  at(ctx, x, wy + 0.1 * U, 0, face * U, U, () => {
    ctx.translate(0, bob);
    // body
    ellipse(ctx, 0, -0.1, 1.15, 0.75);
    ctx.fillStyle = bodyC;
    ctx.fill();
    ctx.strokeStyle = rim;
    ctx.lineWidth = 0.05;
    ctx.stroke();
    // lit back
    ellipse(ctx, -0.1, -0.58, 0.8, 0.2);
    ctx.fillStyle = rgba(mixHex(kit.main, kit.light, 0.6), S.dark ? 0.28 : 0.3);
    ctx.fill();
    // head + snout
    const nod = 0.02 * Math.sin(b * 0.6 + i);
    at(ctx, 0, nod, 0, 1, 1, () => {
      ellipse(ctx, 1.02, -0.47, 0.58, 0.46);
      ctx.fillStyle = bodyC;
      ctx.fill();
      ctx.strokeStyle = rim;
      ctx.lineWidth = 0.05;
      ctx.stroke();
      ellipse(ctx, 1.5, -0.4 + jaw, 0.36, 0.32 - jaw * 0.4);
      ctx.fillStyle = bodyC;
      ctx.fill();
      ctx.stroke();
      ellipse(ctx, 1.76, -0.52, 0.12, 0.09);
      ctx.fillStyle = noseC;
      ctx.fill();
      // ear
      at(ctx, 0.66, -0.86, -0.3 * flick, 1, 1, () => {
        ellipse(ctx, 0, 0, 0.13, 0.15);
        ctx.fillStyle = earC;
        ctx.fill();
        ctx.stroke();
      });
      // eye: carved, sleepy slit that opens a little now and then
      const open = 0.045 + 0.03 * Math.max(0, Math.sin(b * 0.4 + i * 3)) ;
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "#000";
      ellipse(ctx, 1.2, -0.63, 0.085, Math.max(0.012, open * (1 - 0.9 * clamp01(blink))));
      ctx.fill();
      ctx.restore();
      // cheek
      ellipse(ctx, 1.22, -0.36, 0.1, 0.06);
      ctx.fillStyle = rgba(kit.accent, 0.35);
      ctx.fill();
      if (yuzu) {
        at(ctx, 0.98, -0.97 + 0.01 * breath, 0.05 * Math.sin(b * 0.7), 1, 1, () => {
          ellipse(ctx, 0, -0.1, 0.19, 0.17);
          ctx.fillStyle = ycol;
          ctx.fill();
          ctx.strokeStyle = rgba(mixHex(ycol, kit.light, 0.6), 0.9);
          ctx.lineWidth = 0.035;
          ctx.stroke();
          ellipse(ctx, 0.05, -0.29, 0.09, 0.045, -0.5);
          ctx.fillStyle = kit.accent;
          ctx.fill();
        });
      }
    });
  });
}

// A little chick friend. Local unit f, +x forward, origin at the feet.
function drawChick(ctx, S, kit, x, y, f, face, sq, t, ycol) {
  const bodyC = S.dark ? ycol : mixHex(ycol, kit.dark, 0.3);
  const rim = S.dark ? mixHex(ycol, kit.light, 0.5) : mixHex(ycol, kit.dark, 0.5);
  at(ctx, x, y, 0, face * f * (1 + 0.1 * sq), f * (1 - 0.15 * sq), () => {
    ellipse(ctx, 0, -0.45, 0.52, 0.45);
    ctx.fillStyle = bodyC;
    ctx.fill();
    ctx.strokeStyle = rgba(rim, 0.8);
    ctx.lineWidth = 0.06;
    ctx.stroke();
    ellipse(ctx, 0.3, -0.95, 0.34, 0.32);
    ctx.fillStyle = bodyC;
    ctx.fill();
    ctx.stroke();
    ellipse(ctx, 0.66, -0.88, 0.17, 0.09);
    ctx.fillStyle = kit.accent;
    ctx.fill();
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "#000";
    ellipse(ctx, 0.4, -1.0, 0.075, 0.08);
    ctx.fill();
    ctx.restore();
    // tiny wing flap
    ellipse(ctx, -0.12, -0.45 + 0.02 * Math.sin(t * 6), 0.24, 0.16, 0.3);
    ctx.fillStyle = rgba(kit.accent, 0.35);
    ctx.fill();
  });
}

export default {
  id: "capybara-onsen",
  name: "Capybara onsen",
  group: "creatures",
  blurb: "A calm capybara soaks in a small hot spring while steam curls up and a little friend drops by for a sit.",
  motion: "stationary",
  count: { min: 0, max: 2, default: 1, noun: "Capybara" },
  natural: [
    makeKit({ main: "#b08657", light: "#e3c598", dark: "#4a321c", accent: "#5fb7ae", second: "#d9bd93" }),
    makeKit({ main: "#a65a3b", light: "#dc9c78", dark: "#4a2218", accent: "#5aa9b9", second: "#cf9272" }),
    makeKit({ main: "#857a6c", light: "#c4b8a6", dark: "#35302a", accent: "#6aa89b", second: "#aa9d8a" }),
    makeKit({ main: "#d6bb8c", light: "#f4e5c4", dark: "#7a5f3c", accent: "#67b4a8", second: "#e8d3a8" }),
  ],
  atmosphere: "none",
  flow: { label: "Warmth", help: "How fast the steam rises and how much the water ripples.", default: 1, min: 0, max: 1.5 },
  extras: [
    { key: "steam", type: "range", label: "Steam", min: 0, max: 1.5, step: 0.05, default: 1, help: "How many steam wisps curl up from the spring." },
    { key: "yuzu", type: "toggle", label: "Yuzu", default: true, help: "A yuzu fruit on every capybara's head." },
    { key: "friends", type: "range", label: "Friends", min: 0, max: 1.5, step: 0.05, default: 1, help: "How often a small friend hops on for a sit (none at 0, twice per cycle when high)." },
  ],
  supports: { speed: true, size: true },
  labels: { speed: "Pace", size: "Size" },
  backdrop: { dark: "#0d1315", light: "#e8ece6" },
  draw(ctx, w, h, S) {
    const n = Math.max(1, Math.min(2, S.count | 0));
    const ex = S.extra || {};
    const steam = clamp(ex.steam ?? 1, 0, 1.5);
    const yuzu = ex.yuzu ?? true;
    const friends = clamp(ex.friends ?? 1, 0, 1.5);
    const flow = clamp(S.flow ?? 1, 0, 1.5);
    const key = `${w}|${h}|${S.size}|${n}`;
    if (S.memo.key !== key) {
      S.memo.key = key;
      S.memo.L = layout(w, h, S.size ?? 1, n);
    }
    const L = S.memo.L;
    const { U, cx, wy, prx, pry } = L;
    const k0 = S.kit(0);
    const line = S.dark ? mixHex(k0.accent, k0.light, 0.25) : mixHex(k0.accent, k0.dark, 0.3);
    const lw = Math.max(2.2, 0.045 * U);
    const ycol = shiftHue(k0.second, 28, 1.7, 0.05);

    // steam wisps (behind): a few soft S-curves rising from the pool
    const steamHex = S.dark ? mixHex(k0.light, k0.accent, 0.3) : mixHex(k0.accent, k0.dark, 0.25);
    const nw = Math.round(steam * 4);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let k = 0; k < nw; k++) {
      const per = 9 / (0.45 + 0.55 * flow);
      const x0 = cx + (hash01(k, 1) - 0.5) * prx * 1.2 + (k % 2 ? 0.3 : -0.3) * U;
      const hgt = (1.5 + 0.5 * hash01(k, 3)) * U;
      for (let j = 0; j < 3; j++) {
        const a = mod(S.b / per + k * 0.27 + hash01(k, 2) - j * 0.1, 1);
        const px = x0 + Math.sin(a * 5 + k * 1.9 + S.b * 0.25) * 0.22 * U * (0.3 + a);
        const py = wy - 0.15 * U - a * hgt;
        glow(ctx, px, py, (0.2 + 0.32 * a) * U, steamHex, 0.5 * Math.sin(Math.PI * a) * Math.min(1, steam + 0.2));
      }
    }

    // the pool: a small ellipse, faint tint and a clear outline
    ellipse(ctx, cx, wy, prx, pry);
    ctx.fillStyle = rgba(S.dark ? k0.accent : k0.accent, S.dark ? 0.16 : 0.14);
    ctx.fill();
    ring(ctx, cx, wy, prx, pry, 0.75, lw * 1.2, line);

    // friend visit schedule (capybara 0)
    const fc = mod(S.t, FP);
    const visits = friends > 0.75 ? 2 : friends > 0.04 ? 1 : 0;
    const vStart = [2, 17];

    const order = n > 1 ? [1, 0] : [0];
    let press = 0;
    let chick = null;
    for (let v = 0; v < visits; v++) {
      const vc = fc - vStart[v];
      if (vc < 0 || vc > VL) continue;
      const Uc = U;
      const x0 = L.pos[0];
      const flank = (v ? -1 : 1) * 2.0 * Uc; // enter side, leave opposite side
      const fy = wy + 0.18 * Uc;
      const bx = x0 - 0.15 * Uc;
      const f = 0.5 * Uc * (0.9 + 0.1 * Math.min(1, friends));
      const topAt = (xx) => wy + 0.1 * Uc + backTop((xx - x0) / Uc) * Uc;
      let cxk, cyk, sqk = 0, face = v ? 1 : -1;
      const hop = (p, xa, ya, xb2, yb2, hh) => {
        const e = clamp01(p);
        cxk = lerp(xa, xb2, e);
        cyk = lerp(ya, yb2, e) - hh * 4 * e * (1 - e);
      };
      if (vc < 1.4) {
        const u = seg(vc, 0, 1.4);
        cxk = x0 + flank;
        cyk = lerp(fy + 1.0 * f * 1.3, fy, u);
        face = v ? 1 : -1;
      } else if (vc < 2.4) {
        hop(vc - 1.4, x0 + flank, fy, bx, topAt(bx), 0.7 * Uc);
        face = v ? 1 : -1;
        sqk = 0.35 * (1 - clamp01((vc - 1.4) * 3));
      } else if (vc < 11) {
        cxk = bx;
        cyk = topAt(bx);
        face = v ? 1 : -1;
        sqk = 0.12 * Math.max(0, Math.sin((vc - 2.4) * 0.9)) + 0.35 * (1 - smoothstep(0, 0.4, vc - 2.4));
        press = (1 - smoothstep(0, 0.5, vc - 2.4)) * (vc < 3.3 ? 1 : 0) + 0.3 * (vc > 2.4 ? 1 : 0) * (vc < 10.9 ? 1 : 0);
        face = v ? 1 : -1;
        if (vc > 6.2 && vc < 7.2) face = v ? 1 : -1;
      } else if (vc < 12) {
        hop(vc - 11, bx, topAt(bx), x0 - flank, fy, 0.7 * Uc);
        face = v ? -1 : 1;
        sqk = 0.3 * (1 - clamp01((vc - 11) * 3));
        press = 0.3 * (1 - clamp01((vc - 11) * 4));
      } else {
        const u = seg(vc, 12, VL);
        cxk = x0 - flank + (v ? -1 : 1) * 0.5 * Uc * u * -1;
        cyk = lerp(fy, fy + 1.3 * f * 1.3, u);
        face = v ? -1 : 1;
      }
      chick = { x: cxk, y: cyk, f, face, sq: sqk };
    }

    for (const i of order) {
      const kit = S.kit(i);
      const sc = i ? 0.74 : 1;
      const face = 1;
      const x = L.pos[i];
      ctx.save();
      ctx.beginPath();
      ctx.rect(-5, -5, w + 10, wy + 0.12 * U + 5);
      ctx.clip();
      drawCapy(ctx, S, kit, i, x, wy, U * sc, face, i ? 0 : press, yuzu, ycol);
      if (!i && chick) drawChick(ctx, S, S.kit(0), chick.x, chick.y, chick.f, chick.face, chick.sq, S.b, ycol);
      ctx.restore();
      // waist ripples seat the body in the water
      const rr = 1.35 * U * sc * (1 + 0.03 * Math.sin(S.b * 1.2 + i));
      ring(ctx, x - 0.05 * U, wy + 0.1 * U * sc, rr, rr * 0.3, 0.5, lw, line);
      const q = mod(S.b * 0.1 * (0.3 + 0.7 * flow) + i * 0.5, 1);
      ring(ctx, x - 0.05 * U, wy + 0.1 * U * sc, (1.35 + 0.9 * q) * U * sc, (1.35 + 0.9 * q) * U * sc * 0.3, 0.4 * (1 - q) * Math.min(1, 0.4 + flow), lw * 0.8, line);
    }
    // front arc of the pool edge
    ctx.strokeStyle = rgba(line, 0.8);
    ctx.lineWidth = lw * 1.3;
    ctx.beginPath();
    ctx.ellipse(cx, wy, prx, pry, 0, 0.12, Math.PI - 0.12);
    ctx.stroke();
  },
};
