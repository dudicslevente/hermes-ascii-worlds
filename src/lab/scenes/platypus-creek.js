import { makeKit, TAU, clamp, clamp01, lerp, mod, smoothstep, hash01, rgba, shadeHex, mixHex, shiftHue, at, poly, curve, ellipse, glow } from "../core/util.js";

// Minimal creek: one big cartoon platypus, a short bank line on the left and a
// small water ellipse on the right. A 24 s routine, a pure function of the clock:
// idle on the bank (breathing, blink, tail slap) -> waddle to the edge, crouch,
// hop in with splash rings -> float, dive and resurface -> swim back, hop out, settle.

const P = 24;
const ease = (p) => p * p * (3 - 2 * p);
const seg = (c, a, b) => ease(clamp01((c - a) / (b - a)));

function layout(w, h, size) {
  let U = Math.min(0.22 * h, 0.12 * w) * size;
  U = clamp(U, 14, Math.min(0.125 * w, 0.27 * h));
  const cx = w / 2;
  const gy = h * 0.5 + 0.45 * U;
  return { U, gy, wy: gy + 0.22 * U, xb: cx - 1.7 * U, xw: cx + 1.7 * U, rxb: 1.4 * U, rxw: 1.5 * U, ryw: 0.3 * U };
}

// Pose of platypus i at time t: position of the belly-bottom origin, facing, squash...
function pose(i, t, L) {
  const { U, gy, wy, xb, xw } = L;
  const sc = i ? 0.8 : 1;
  const c = mod(t + (i ? 11.5 : 0), P);
  const rest = xb + 0.1 * U;
  const edge = xb + 1.0 * U;
  const fx = xw + (i ? 0.5 : -0.3) * U;
  const entry = xw - 0.75 * U;
  const outW = xw - 0.95 * U;
  const floatY = wy + 0.3 * U;
  const o = { c, sc, x: rest, y: gy, face: 1, sq: 0, rot: 0, sub: 0, hop: 0, swim: 0, thump: 0, nod: 0, ev: [] };
  const arc = (p, x0, y0, x1, y1, hgt) => {
    const e = clamp01(p);
    o.x = lerp(x0, x1, e);
    o.y = lerp(y0, y1, e) - hgt * 4 * e * (1 - e);
    o.hop = 1;
  };
  let face = 1;
  if (c < 7) {
    // idle: tail slap near 3.4 s, a nod at 5.2 s
    const s = c - 3;
    if (s > 0 && s < 1.4) o.thump = s < 0.7 ? -0.55 * smoothstep(0, 0.7, s) : -0.55 * (1 - smoothstep(0.7, 0.85, s)) + 0.12 * Math.sin((s - 0.85) * 16) * (1 - smoothstep(0.85, 1.4, s));
    const n = c - 5.2;
    if (n > 0 && n < 1.2) o.nod = Math.sin(Math.PI * n / 1.2);
  } else if (c < 9) {
    // waddle to the edge, crouch
    const wk = seg(c, 7, 8.2);
    o.x = lerp(rest, edge, wk);
    o.y = gy - 0.03 * U * Math.abs(Math.sin(wk * TAU * 2)) * Math.sin(Math.PI * wk);
    o.sq = seg(c, 8.2, 8.9) * (1 - seg(c, 8.9, 9.0));
  } else if (c < 10) {
    arc((c - 9) / 1, edge, gy, entry, floatY, 0.85 * U);
    o.rot = lerp(-0.35, 0.5, clamp01(c - 9));
    o.sq = 0.3 * (1 - clamp01((c - 9) * 5));
  } else if (c < 15.2) {
    // float and bob, drift a little
    const k = c - 10;
    o.x = lerp(entry, fx, seg(c, 10, 11.4)) + 0.12 * U * Math.sin(k * 0.8);
    o.y = floatY - 0.02 * U * Math.sin(k * 2.1);
    o.sub = 0.5 * (1 - seg(c, 10, 10.8));
    o.y += o.sub * 0.35 * U;
    o.swim = 1;
  } else if (c < 17) {
    // dive down, move on under water, hidden
    const d = seg(c, 15.2, 16.1);
    o.x = fx + 0.7 * U * seg(c, 15.5, 17);
    o.y = floatY + 1.7 * U * d;
    o.rot = 0.5 * d;
    o.sub = 1;
    o.swim = 1;
  } else if (c < 18.3) {
    const u = seg(c, 17, 17.9);
    o.x = fx + 0.7 * U + 0.1 * U * u;
    o.y = floatY + 1.7 * U * (1 - u);
    o.rot = -0.3 * (1 - u);
    o.swim = 1;
  } else if (c < 19.5) {
    const s = seg(c, 18.3, 19.4);
    o.x = lerp(fx + 0.8 * U, outW, s);
    o.y = floatY - 0.02 * U * Math.sin(c * 2.1);
    face = Math.cos(Math.PI * seg(c, 18.3, 19.0));
    o.swim = 1;
  } else if (c < 20.2) {
    o.x = outW;
    o.y = floatY;
    face = -1;
    o.sq = seg(c, 19.5, 20.2);
    o.swim = 0.4;
  } else if (c < 21.2) {
    arc(c - 20.2, outW, floatY, edge, gy, 0.8 * U);
    face = -1;
    o.rot = lerp(-0.4, 0.4, clamp01(c - 20.2));
    o.sq = 0.3 * (1 - clamp01((c - 20.2) * 4));
  } else if (c < 22.3) {
    const wk = seg(c, 21.4, 22.3);
    o.x = lerp(edge, rest, wk);
    o.y = gy - 0.03 * U * Math.abs(Math.sin(wk * TAU * 2)) * Math.sin(Math.PI * wk);
    face = -1;
    o.sq = 0.25 * (1 - seg(c, 21.2, 21.6)) * (c < 21.5 ? 1 : 0);
  } else {
    o.x = rest;
    face = Math.cos(Math.PI * seg(c, 22.3, 23.1) );
    face = -face;
  }
  o.face = face;
  // splash events: [clock start, x, amplitude]
  o.ev = [
    [10 - 0.02, entry + 0.2 * U, 1],
    [15.7, fx + 0.1 * U, 0.55],
    [17.1, fx + 0.7 * U, 0.7],
    [20.5, outW + 0.2 * U, 0.5],
  ];
  return o;
}

function drawPlatypus(ctx, S, kit, o, L, hat, b, i) {
  const U = L.U * o.sc;
  const t = b;
  const breath = Math.sin(t * 1.5 + i * 2) * (o.swim ? 0.01 : 0.02);
  const fa = Math.abs(o.face) < 0.1 ? 0.1 * (o.face < 0 ? -1 : 1) : o.face;
  const dir = o.face < 0 ? -1 : 1;
  const rim = S.dark ? mixHex(kit.main, kit.light, 0.6) : mixHex(kit.main, kit.dark, 0.3);
  const belly = mixHex(kit.main, kit.light, S.dark ? 0.75 : 0.6);
  const bodyC = S.dark ? kit.main : mixHex(kit.main, kit.dark, 0.22);
  const bill = kit.accent;
  const billHi = mixHex(kit.accent, kit.light, 0.45);
  const tailC = mixHex(kit.second, kit.dark, 0.25);
  const hatC = mixHex(kit.accent, kit.dark, 0.35);
  at(ctx, o.x, o.y, o.rot * dir, fa * U * (1 + 0.09 * o.sq), U * (1 - 0.14 * o.sq + breath), () => {
    // tail (behind body): beaver paddle with a bold diamond
    const tr = o.thump + 0.07 * Math.sin(t * 1.3) + o.swim * 0.18 * Math.sin(t * 4.5);
    at(ctx, -0.8, -0.42, tr, 1, 1, () => {
      ellipse(ctx, -0.62, 0.02, 0.62, 0.25, 0);
      ctx.fillStyle = tailC;
      ctx.fill();
      ctx.strokeStyle = rgba(mixHex(tailC, kit.light, 0.55), 0.9);
      ctx.lineWidth = 0.045;
      ctx.stroke();
      poly(ctx, [[-0.62, -0.13], [-0.36, 0.02], [-0.62, 0.17], [-0.88, 0.02]]);
      ctx.fillStyle = mixHex(tailC, kit.light, 0.8);
      ctx.fill();
    });
    // far foot + near foot
    ctx.fillStyle = mixHex(kit.accent, kit.dark, 0.25);
    ellipse(ctx, 0.4, -0.05, 0.2, 0.08);
    ctx.fill();
    // body
    ellipse(ctx, 0, -0.52, 0.98, 0.5);
    ctx.fillStyle = bodyC;
    ctx.fill();
    ctx.strokeStyle = rim;
    ctx.lineWidth = 0.05;
    ctx.stroke();
    ctx.save();
    ellipse(ctx, 0, -0.52, 0.98, 0.5);
    ctx.clip();
    ellipse(ctx, 0.05, -0.12, 0.8, 0.3);
    ctx.fillStyle = rgba(belly, 0.55);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = bill;
    ellipse(ctx, -0.35, -0.05, 0.2, 0.08);
    ctx.fill();
    // head (nods) with bill
    const nd = o.nod * 0.12;
    at(ctx, 0.72, -0.72 + nd * 0.3, nd, 1, 1, () => {
      ellipse(ctx, 0, 0, 0.4, 0.37);
      ctx.fillStyle = bodyC;
      ctx.fill();
      ctx.strokeStyle = rim;
      ctx.lineWidth = 0.05;
      ctx.stroke();
      // bill: flat rounded duck bill
      ellipse(ctx, 0.62, 0.1, 0.5, 0.17);
      ctx.fillStyle = bill;
      ctx.fill();
      ellipse(ctx, 0.62, 0.05, 0.42, 0.08);
      ctx.fillStyle = rgba(billHi, 0.7);
      ctx.fill();
      // cheek
      ellipse(ctx, 0.05, 0.12, 0.1, 0.07);
      ctx.fillStyle = rgba(billHi, 0.5);
      ctx.fill();
      // eye: carved hole with blink
      const bq = mod(t / (5.5 + 1.5 * hash01(i, 3)) + hash01(i, 4), 1);
      const blink = bq > 0.93 ? 1 - Math.abs((bq - 0.965) / 0.035) : 0;
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "#000";
      ellipse(ctx, 0.18, -0.1, 0.085, 0.095 * (1 - 0.85 * clamp01(blink)));
      ctx.fill();
      ctx.restore();
      if (hat) {
        at(ctx, 0.0, -0.3, -0.1 - 0.12 * Math.sin(clamp01((o.c - 6.0) / 1.2) * Math.PI) * (o.c > 6 && o.c < 7.2 ? 1 : 0), 1, 1, () => {
          ellipse(ctx, 0, 0.0, 0.33, 0.07);
          ctx.fillStyle = hatC;
          ctx.fill();
          ctx.strokeStyle = rgba(mixHex(hatC, kit.light, 0.5), 0.9);
          ctx.lineWidth = 0.035;
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(0, -0.02, 0.2, 0.2, 0, Math.PI, TAU);
          ctx.closePath();
          ctx.fillStyle = hatC;
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = rgba(mixHex(hatC, kit.light, 0.6), 0.9);
          ctx.fillRect(-0.19, -0.07, 0.38, 0.05);
        });
      }
    });
    // near foot
    ctx.fillStyle = kit.accent;
    ellipse(ctx, 0.6, -0.04, 0.22, 0.09);
    ctx.fill();
  });
}

function ring(ctx, x, y, rx, ry, a, lw, hex) {
  if (a <= 0.02 || rx < 0.5) return;
  ctx.strokeStyle = rgba(hex, a);
  ctx.lineWidth = lw;
  ellipse(ctx, x, y, rx, ry);
  ctx.stroke();
}

export default {
  id: "platypus-creek",
  name: "Platypus creek",
  group: "creatures",
  blurb: "A big friendly platypus naps on a bank, hops into a little pool with a splash, surfaces and hops back.",
  motion: "travel",
  count: { min: 0, max: 2, default: 1, noun: "Platypus" },
  natural: [
    makeKit({ main: "#3aa9a4", light: "#c2f0e6", dark: "#0c3a3c", accent: "#ff9a3c", second: "#2b8590" }),
    makeKit({ main: "#a0714a", light: "#ead2ae", dark: "#2e1c10", accent: "#d9691e", second: "#6e4a30" }),
    makeKit({ main: "#7088bd", light: "#d3dcf3", dark: "#1c2440", accent: "#f3a35a", second: "#566b9d" }),
  ],
  atmosphere: "none",
  flow: { label: "Current", help: "How lively the ripples are and how much the reeds sway.", default: 1, min: 0, max: 1.5 },
  extras: [
    { key: "hat", type: "toggle", label: "Tiny hat", default: true, help: "A little bowler hat on each platypus." },
    { key: "splash", type: "range", label: "Splash", min: 0, max: 1.5, step: 0.05, default: 1, help: "Size of the splash rings and droplets when it dives." },
    { key: "reeds", type: "toggle", label: "Reeds", default: true, help: "A couple of reeds beside the pool." },
  ],
  supports: { speed: true, size: true },
  backdrop: { dark: "#0a1416", light: "#e4eeec" },
  draw(ctx, w, h, S) {
    const ex = S.extra || {};
    const hat = ex.hat !== false;
    const spl = clamp(ex.splash ?? 1, 0, 1.5);
    const reeds = ex.reeds !== false;
    const flow = clamp(S.flow ?? 1, 0, 1.5);
    const n = Math.max(1, Math.min(2, S.count | 0));
    const key = `${w}|${h}|${S.size}`;
    if (S.memo.key !== key) {
      S.memo.key = key;
      S.memo.L = layout(w, h, S.size ?? 1);
    }
    const L = S.memo.L;
    const { U, gy, wy, xb, xw, rxb, rxw, ryw } = L;
    const k0 = S.kit(0);
    const line = S.dark ? mixHex(k0.light, k0.second, 0.3) : mixHex(k0.second, k0.dark, 0.25);
    const lw = Math.max(2.2, 0.05 * U);

    // water: a small ellipse with a faint tint and a light outline
    ellipse(ctx, xw, wy, rxw, ryw);
    ctx.fillStyle = rgba(S.dark ? k0.light : k0.main, 0.1);
    ctx.fill();
    ring(ctx, xw, wy, rxw, ryw, 0.5, lw, line);
    // quiet ambient ripples
    for (let k = 0; k < 2; k++) {
      const q = mod(S.b * 0.12 * (0.3 + 0.7 * flow) + k * 0.5, 1);
      ring(ctx, xw + (k ? 0.5 : -0.4) * U, wy + 0.02 * U, (0.15 + 0.5 * q) * U, (0.15 + 0.5 * q) * U * 0.3, 0.45 * (1 - q), lw * 0.8, line);
    }
    // bank: one thin line and two tufts
    ctx.lineCap = "round";
    ctx.strokeStyle = rgba(line, 0.85);
    ctx.lineWidth = lw * 1.4;
    ctx.beginPath();
    ctx.moveTo(xb - rxb, gy + 0.02 * U);
    ctx.lineTo(xb + rxb, gy + 0.02 * U);
    ctx.stroke();
    ctx.lineWidth = lw;
    for (const tx of [-0.95, -0.7]) {
      const sw = 0.03 * U * Math.sin(S.b * 0.8 * flow + tx * 5);
      ctx.beginPath();
      ctx.moveTo(xb + tx * U, gy);
      ctx.lineTo(xb + (tx - 0.07) * U + sw, gy - 0.3 * U);
      ctx.moveTo(xb + tx * U, gy);
      ctx.lineTo(xb + (tx + 0.1) * U + sw, gy - 0.4 * U);
      ctx.stroke();
    }
    // reeds
    if (reeds) {
      for (const [dx, hh] of [[1.5, 0.95], [1.85, 0.7]]) {
        const rx = xw + dx * U;
        const sw = (0.07 * U * Math.sin(S.b * 0.7 * flow + dx * 3) + 0.04 * U) * (0.4 + 0.6 * flow);
        ctx.strokeStyle = rgba(mixHex(k0.second, k0.light, 0.4), 0.95);
        ctx.lineWidth = lw * 1.5;
        ctx.beginPath();
        ctx.moveTo(rx, wy + 0.05 * U);
        ctx.quadraticCurveTo(rx + sw * 0.2, wy - hh * 0.5 * U, rx + sw, wy - hh * U);
        ctx.stroke();
        ellipse(ctx, rx + sw, wy - hh * U - 0.12 * U, 0.06 * U, 0.17 * U, sw * 0.5 / U);
        ctx.fillStyle = mixHex(k0.accent, k0.dark, 0.3);
        ctx.fill();
      }
    }

    // platypuses: far one first; clip below the water surface only over the water
    const poses = [];
    for (let i = 0; i < n; i++) poses.push(pose(i, S.t, L));
    for (let i = n - 1; i >= 0; i--) {
      const o = poses[i];
      ctx.save();
      const cyl = wy + 0.05 * U;
      ctx.beginPath();
      ctx.rect(-5, -5, w + 10, cyl + 5);
      ctx.clip();
      drawPlatypus(ctx, S, S.kit(i), o, L, hat, S.b, i);
      ctx.restore();
      // seat the body in the water: ripple at the waist while floating
      if (o.swim && o.y < wy + 1.2 * U) {
        const vis = 1 - smoothstep(0.7, 1.3, (o.y - wy) / U);
        const bobR = 1 + 0.06 * Math.sin(S.b * 1.6 + i);
        ring(ctx, o.x, wy + 0.04 * U, 1.25 * U * o.sc * bobR, 0.3 * U * o.sc * bobR, 0.55 * vis, lw, line);
        const q = mod(S.b * 0.16 + i * 0.4, 1);
        ring(ctx, o.x, wy + 0.04 * U, (1.2 + 0.9 * q) * U * o.sc, (1.2 + 0.9 * q) * U * o.sc * 0.3, 0.4 * (1 - q) * vis, lw * 0.8, line);
      }
      // splash rings and droplets
      if (spl > 0.01) {
        for (const [t0, sx, amp] of o.ev) {
          const age = mod(o.c - t0 + 0.1, P) - 0.1;
          if (age < 0 || age > 2) continue;
          for (let k = 0; k < 3; k++) {
            const a = age - k * 0.28;
            if (a < 0) continue;
            const p = clamp01(a / 1.5);
            const e = 1 - Math.pow(1 - p, 2.2);
            ring(ctx, sx, wy + 0.04 * U, (0.2 + 1.0 * amp * spl) * U * e, (0.2 + 1.0 * amp * spl) * U * e * 0.3, 0.75 * (1 - p), lw, k0.light);
          }
          if (amp > 0.8) {
            for (let k = 0; k < 6; k++) {
              const ang = lerp(-0.55, 0.55, k / 5) + (hash01(k, 5) - 0.5) * 0.3;
              const v = (1.6 + 0.8 * hash01(k, 6)) * U * amp * spl;
              const px = sx + Math.sin(ang) * v * age * 0.6;
              const py = wy - Math.cos(ang) * v * age + 2.2 * U * age * age;
              const fade = 1 - smoothstep(0.55, 1.0, age);
              if (fade > 0.05 && py < wy + 0.1 * U) {
                ellipse(ctx, px, py, 0.05 * U, 0.05 * U);
                ctx.fillStyle = rgba(k0.light, 0.9 * fade);
                ctx.fill();
              }
            }
          }
        }
      }
    }
    // front arc of the pool edge keeps bodies sitting inside the water
    ctx.strokeStyle = rgba(line, 0.65);
    ctx.lineWidth = lw * 1.2;
    ctx.beginPath();
    ctx.ellipse(xw, wy, rxw, ryw, 0, 0.12, Math.PI - 0.12);
    ctx.stroke();
  },
};
