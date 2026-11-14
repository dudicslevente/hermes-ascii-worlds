// Dragon's hoard (minimal): one cute dragon curled asleep on a small mound of gold.
// Layers: breathing, smoke curls, rare eye-open with glowing slit, small flame puff.
import { makeKit, TAU, clamp, clamp01, lerp, smoothstep, hash01, rgba, shadeHex, mixHex, poly, curve, ellipse, glow } from "../core/util.js";

const SLOTS = [[], [[0.55, 0.72]], [[0.3, 0.7], [0.72, 0.72]]];

// One event per cycle: returns u in 0..1 while active, else -1.
function ev(t, i, ch, period, dur, lead) {
  const q = t / period + hash01(i, ch), c = Math.floor(q);
  const age = (q - c) * period - lead * period;
  return age >= 0 && age <= dur ? age / dur : -1;
}

function star(ctx, x, y, r, hex, a) {
  ctx.fillStyle = rgba(hex, a);
  poly(ctx, [[x, y - r], [x + r * 0.22, y - r * 0.22], [x + r, y], [x + r * 0.22, y + r * 0.22], [x, y + r], [x - r * 0.22, y + r * 0.22], [x - r, y], [x - r * 0.22, y - r * 0.22]]);
  ctx.fill();
}

function tri(ctx, ax, ay, bx, by, cx, cy) { poly(ctx, [[ax, ay], [bx, by], [cx, cy]]); }

function drawDragon(ctx, S, i, X, Y, R, flip, gold, smoke, fireOn) {
  const kit = S.kit(i), b = S.b, t = S.t;
  const breath = Math.sin(TAU * 0.2 * b + i);
  const bs = 1 + 0.035 * breath;
  const eyeU = ev(t, i, 3, 15, 3, 0.35);
  const eyeK = eyeU < 0 ? 0 : Math.sin(Math.PI * eyeU) ** 0.5;
  const fireU = fireOn ? ev(t, i, 7, 17, 2.2, 0.75) : -1;
  const sway = Math.sin(TAU * 0.11 * b + i * 2);
  // quick tail flick every ~9 s
  const fq = t / 9 + hash01(i, 11), fa = (fq - Math.floor(fq)) * 9;
  const flick = fa < 1.4 ? Math.sin(Math.PI * fa / 1.4) * Math.sin(fa * 11) : 0;
  const shade = shadeHex(kit.main, 0.62), shade2 = shadeHex(kit.main, 0.45);
  const mid = mixHex(kit.main, kit.light, 0.3), hi = mixHex(kit.main, kit.light, 0.6);

  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(flip * R, R);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // ---- body (behind the mound) ----
  ctx.save();
  ctx.translate(0, -0.5);
  ctx.save();
  ctx.translate(0.15, -0.34);
  ctx.scale(1, bs);
  ctx.translate(-0.15, 0.34);
  const TX = 0.2, TY = -0.78, TRX = 1.0, TRY = 0.66;
  // torso with 3 tone bands
  const g = ctx.createLinearGradient(0, TY - TRY, 0, TY + TRY);
  g.addColorStop(0, rgba(hi, 1));
  g.addColorStop(0.22, rgba(hi, 1));
  g.addColorStop(0.3, rgba(kit.main, 1));
  g.addColorStop(0.7, rgba(kit.main, 1));
  g.addColorStop(0.78, rgba(shade, 1));
  g.addColorStop(1, rgba(shade, 1));
  ctx.fillStyle = g;
  ellipse(ctx, TX, TY, TRX, TRY);
  ctx.fill();
  // belly band with plates (clipped to torso)
  ctx.save();
  ellipse(ctx, TX, TY, TRX, TRY);
  ctx.clip();
  ctx.fillStyle = rgba(mixHex(kit.light, kit.main, 0.15), 1);
  ellipse(ctx, -0.25, -0.34, 0.8, 0.2, -0.22);
  ctx.fill();
  ctx.strokeStyle = rgba(kit.main, 0.75);
  ctx.lineWidth = 0.035;
  for (let k = 0; k < 5; k++) {
    const x0 = -0.8 + k * 0.24;
    ctx.beginPath();
    ctx.moveTo(x0, -0.5 + k * 0.045);
    ctx.quadraticCurveTo(x0 - 0.08, -0.38 + k * 0.045, x0 + 0.02, -0.2 + k * 0.045);
    ctx.stroke();
  }
  // scale arcs on the flank
  ctx.strokeStyle = rgba(shade, 0.55);
  ctx.lineWidth = 0.03;
  for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) {
    const sx = 0.0 + k * 0.28 + (r ? 0.14 : 0), sy = -0.9 + r * 0.2;
    ctx.beginPath(); ctx.arc(sx, sy, 0.1, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
  }
  ctx.restore();
  // folded wing (behind the torso rim): arm + membrane with scalloped edge + ribs
  const SH = [-0.1, -1.18], WR = [0.2, -1.5];
  const tips = [[0.78, -1.42], [1.02, -1.12], [0.9, -0.82]];
  ctx.fillStyle = rgba(shade, 1);
  curve(ctx, [SH, WR, tips[0], [0.66, -1.24], tips[1], [0.9, -0.98], tips[2], [0.5, -0.9], [0.2, -0.95]], true);
  ctx.fill();
  // darker membrane panels between ribs
  ctx.fillStyle = rgba(mixHex(kit.main, shade, 0.4), 1);
  poly(ctx, [WR, tips[0], [0.66, -1.24], [0.4, -1.2]]); ctx.fill();
  poly(ctx, [WR, tips[1], [0.9, -0.98], [0.5, -1.05]]); ctx.fill();
  ctx.strokeStyle = rgba(kit.light, 1);
  ctx.lineWidth = 0.05;
  ctx.beginPath(); ctx.moveTo(SH[0], SH[1]); ctx.lineTo(WR[0], WR[1]); ctx.stroke();
  ctx.lineWidth = 0.035;
  for (const tp of tips) { ctx.beginPath(); ctx.moveTo(WR[0], WR[1]); ctx.lineTo(tp[0], tp[1]); ctx.stroke(); }
  ctx.fillStyle = rgba(kit.accent, 1);
  ellipse(ctx, WR[0], WR[1], 0.05, 0.05); ctx.fill();

  ctx.strokeStyle = rgba(kit.light, 0.9); ctx.lineWidth = 0.03;
  curve(ctx, [SH, [0.0, -0.98], [0.2, -0.95]]); ctx.stroke();
  // rim light along the top of the back
  ctx.strokeStyle = rgba(kit.light, 0.95);
  ctx.lineWidth = 0.045;
  ctx.beginPath(); ctx.ellipse(TX, TY, TRX - 0.02, TRY - 0.02, 0, 1.12 * Math.PI, 1.9 * Math.PI); ctx.stroke();
  // spined back ridge
  ctx.fillStyle = rgba(kit.accent, 1);
  for (let k = 0; k < 7; k++) {
    const an = Math.PI * (1.2 + k * 0.1);
    const px = TX + Math.cos(an) * TRX, py = TY + Math.sin(an) * TRY;
    const nxn = Math.cos(an) * 0.66, nyn = Math.sin(an) * 1.0;
    const nl = Math.hypot(nxn, nyn);
    const ux = nxn / nl, uy = nyn / nl, hgt = 0.14 + 0.09 * Math.sin(Math.PI * (k + 0.5) / 7);
    tri(ctx, px - uy * 0.075 - ux * 0.03, py + ux * 0.075 - uy * 0.03, px + ux * hgt + 0.03, py + uy * hgt, px + uy * 0.075 - ux * 0.03, py - ux * 0.075 - uy * 0.03);
    ctx.fill();
  }
  ctx.restore();

  // ---- head resting on the front ----
  let nx = 0, ny = 0;
  const hx = -1.02, hy = -0.5 + 0.012 * breath;
  const HS = 1.22;
  ctx.save();
  ctx.translate(hx + 0.3, hy); ctx.scale(HS, HS); ctx.translate(-(hx + 0.3), -hy);
  // frill / ear fins behind the skull
  ctx.fillStyle = rgba(mid, 1);
  tri(ctx, hx + 0.3, hy - 0.16, hx + 0.62, hy - 0.3, hx + 0.38, hy + 0.04); ctx.fill();
  tri(ctx, hx + 0.34, hy + 0.0, hx + 0.62, hy - 0.04, hx + 0.4, hy + 0.2); ctx.fill();
  // horn (back-swept, curved) + small second horn
  ctx.fillStyle = rgba(mixHex(kit.accent, kit.light, 0.35), 1);
  curve(ctx, [[hx + 0.02, hy - 0.3], [hx + 0.02, hy - 0.58], [hx - 0.08, hy - 0.84], [hx + 0.18, hy - 0.6], [hx + 0.2, hy - 0.3]], true);
  ctx.fill();
  ctx.fillStyle = rgba(kit.accent, 1);
  tri(ctx, hx + 0.26, hy - 0.26, hx + 0.5, hy - 0.42, hx + 0.4, hy - 0.12); ctx.fill();
  // skull + snout, banded shading
  const hg = ctx.createLinearGradient(0, hy - 0.4, 0, hy + 0.38);
  hg.addColorStop(0, rgba(hi, 1)); hg.addColorStop(0.28, rgba(hi, 1));
  hg.addColorStop(0.36, rgba(kit.main, 1)); hg.addColorStop(0.72, rgba(kit.main, 1));
  hg.addColorStop(0.8, rgba(shade, 1)); hg.addColorStop(1, rgba(shade, 1));
  ctx.fillStyle = hg;
  ellipse(ctx, hx, hy, 0.48, 0.38); ctx.fill();
  ellipse(ctx, hx - 0.46, hy + 0.1, 0.4, 0.25, 0.08); ctx.fill();
  // rim light on the skull + snout top
  ctx.strokeStyle = rgba(kit.light, 0.95);
  ctx.lineWidth = 0.045;
  ctx.beginPath(); ctx.ellipse(hx, hy, 0.46, 0.36, 0, 1.15 * Math.PI, 1.8 * Math.PI); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(hx - 0.46, hy + 0.1, 0.38, 0.23, 0.08, 1.1 * Math.PI, 1.6 * Math.PI); ctx.stroke();
  // jaw line + gentle smile
  ctx.strokeStyle = rgba(shade2, 1);
  ctx.lineWidth = 0.04;
  ctx.beginPath();
  ctx.moveTo(hx - 0.8, hy + 0.2);
  ctx.quadraticCurveTo(hx - 0.45, hy + 0.3, hx - 0.05, hy + 0.2);
  ctx.quadraticCurveTo(hx + 0.02, hy + 0.17, hx + 0.05, hy + 0.1);
  ctx.stroke();
  // little chin plates
  ctx.strokeStyle = rgba(hi, 0.8);
  ctx.lineWidth = 0.03;
  for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.moveTo(hx - 0.5 + k * 0.22, hy + 0.3); ctx.lineTo(hx - 0.48 + k * 0.22, hy + 0.36); ctx.stroke(); }
  // cheek blush
  ctx.fillStyle = rgba(kit.accent, 0.45);
  ellipse(ctx, hx + 0.02, hy + 0.1, 0.1, 0.06); ctx.fill();
  // brow ridge, eye
  const ex = hx - 0.14, ey = hy - 0.05;
  ctx.strokeStyle = rgba(kit.light, 1);
  ctx.lineWidth = 0.05;
  ctx.beginPath(); ctx.moveTo(ex - 0.2, ey - 0.15); ctx.quadraticCurveTo(ex, ey - 0.27, ex + 0.2, ey - 0.17); ctx.stroke();
  ctx.strokeStyle = rgba(shade2, 1);
  ctx.lineWidth = 0.065;
  ctx.beginPath(); ctx.moveTo(ex - 0.2, ey - 0.08); ctx.quadraticCurveTo(ex, ey - 0.2, ex + 0.2, ey - 0.1); ctx.stroke();
  if (eyeK > 0.02) {
    glow(ctx, ex, ey, 0.34 * eyeK + 0.05, kit.accent, 0.9 * eyeK);
    ctx.fillStyle = rgba(kit.accent, 1);
    ellipse(ctx, ex, ey, 0.11, 0.05 + 0.07 * eyeK); ctx.fill();
    ctx.fillStyle = rgba(kit.dark, 1);
    ellipse(ctx, ex, ey, 0.025, 0.04 + 0.06 * eyeK); ctx.fill();
  }
  ctx.strokeStyle = rgba(kit.dark, 1 - 0.85 * eyeK);
  ctx.lineWidth = 0.065;
  ctx.beginPath(); ctx.arc(ex, ey - 0.03, 0.125, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke();
  ctx.lineWidth = 0.03;
  for (let k = 0; k < 3; k++) {
    const a = 0.2 * Math.PI - k * 0.13;
    ctx.beginPath();
    ctx.moveTo(ex + 0.125 * Math.cos(a * 1.0 + 0.0), ey - 0.03 + 0.125 * Math.sin(0.12 * Math.PI + k * 0.17));
    ctx.lineTo(ex + 0.2 + 0.02 * k, ey + 0.06 + 0.05 * k);
    ctx.stroke();
  }
  // nostril
  nx = (hx - 0.78 - hx - 0.3) * HS + hx + 0.3; ny = hy + 0.02 * HS;
  ctx.fillStyle = rgba(kit.dark, 0.9);
  ellipse(ctx, hx - 0.74, hy + 0.02, 0.045, 0.03, -0.3); ctx.fill();
  ctx.restore();
  ctx.restore();

  // ---- gold mound ----
  const mh = 0.6 * gold, mw = 1.5 * (0.7 + 0.3 * gold);
  const mg = ctx.createLinearGradient(0, -mh, 0, 0.02);
  mg.addColorStop(0, rgba(mixHex(kit.second, kit.light, 0.45), 1));
  mg.addColorStop(1, rgba(kit.second, 1));
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.moveTo(-mw, 0.02);
  ctx.bezierCurveTo(-mw, -mh * 1.15, -mw * 0.5, -mh * 1.1, 0, -mh);
  ctx.bezierCurveTo(mw * 0.5, -mh * 1.1, mw, -mh * 1.15, mw, 0.02);
  ctx.quadraticCurveTo(0, 0.12, -mw, 0.02);
  ctx.fill();
  const coins = [[-0.95, -0.12], [-0.6, -0.2], [-0.25, -0.12], [0.2, -0.2], [0.6, -0.14], [1.0, -0.1], [0.0, -0.3]];
  for (let k = 0; k < coins.length; k++) {
    const [cx, cy] = coins[k];
    if (Math.abs(cx) > mw * 0.9) continue;
    const yy = cy * gold * 1.25;
    ctx.fillStyle = rgba(kit.light, 0.9);
    ellipse(ctx, cx, yy, 0.12, 0.06, (k % 3 - 1) * 0.15); ctx.fill();
    ctx.fillStyle = rgba(kit.second, 0.85);
    ellipse(ctx, cx, yy + 0.012, 0.075, 0.03, (k % 3 - 1) * 0.15); ctx.fill();
  }
  for (let k = 0; k < 3; k++) {
    const c = [[-0.6, -0.3], [0.45, -0.28], [0.05, -0.5]][k];
    const tw = Math.pow(0.5 + 0.5 * Math.sin(TAU * (0.12 * b + hash01(i, k + 20)) + k * 2.1), 3);
    if (tw > 0.05) star(ctx, c[0], c[1] * gold * 1.25 - 0.04, 0.12 + 0.1 * tw, kit.accent, 0.4 + 0.6 * tw);
  }

  // ---- front paws ----
  ctx.save();
  ctx.translate(0, -0.5);
  ctx.fillStyle=rgba(kit.main,1);
  for (let k = 0; k < 2; k++) {
    const px = -0.55 + k * 0.36, py = 0.04 - k * 0.04;
    ctx.fillStyle = rgba(shade2, 1);
    ellipse(ctx, px, py + 0.012, 0.225, 0.14); ctx.fill();
    ctx.fillStyle = rgba(hi, 1);
    ellipse(ctx, px, py, 0.2, 0.12); ctx.fill();
    ctx.strokeStyle = rgba(kit.light, 0.9); ctx.lineWidth = 0.03;
    ctx.beginPath(); ctx.ellipse(px, py, 0.19, 0.11, 0, 1.15 * Math.PI, 1.8 * Math.PI); ctx.stroke();
    ctx.fillStyle = rgba(kit.light, 1);
    for (let c = 0; c < 3; c++) { const cy = py - 0.07 + c * 0.07; tri(ctx, px - 0.14, cy - 0.04, px - 0.34, cy + 0.03, px - 0.14, cy + 0.04); ctx.fill(); }
  }

  ctx.restore();

  // ---- tail, curled in front of the mound ----
  ctx.save();
  ctx.translate(0, -0.4);
  const tipLift = 0.05 * sway - 0.16 * flick;
  const spine = [[0.95, -0.7], [1.38, -0.46], [1.26, -0.15], [0.8, -0.04], [0.3, -0.1], [-0.05, -0.2 + tipLift]];
  const hw = [0.2, 0.17, 0.13, 0.095, 0.065, 0.04];
  const L = [], Rr = [], U = [];
  for (let k = 0; k < spine.length; k++) {
    const a = spine[Math.max(0, k - 1)], c = spine[Math.min(spine.length - 1, k + 1)];
    let dx = c[0] - a[0], dy = c[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    L.push([spine[k][0] - dy * hw[k], spine[k][1] + dx * hw[k]]);
    Rr.push([spine[k][0] + dy * hw[k], spine[k][1] - dx * hw[k]]);
    U.push([spine[k][0] + dy * hw[k] * 0.3, spine[k][1] - dx * hw[k] * 0.3]);
  }
  ctx.fillStyle = rgba(kit.main, 1);
  curve(ctx, L.concat(Rr.slice().reverse()), true);
  ctx.fill();
  // light underside band + rim on the outer edge
  ctx.strokeStyle = rgba(hi, 0.9); ctx.lineWidth = 0.05;
  curve(ctx, L.slice(0, 5)); ctx.stroke();
  ctx.strokeStyle = rgba(shade, 0.9); ctx.lineWidth = 0.045;
  curve(ctx, Rr.slice(0, 5)); ctx.stroke();
  // small spikes along the tail
  ctx.fillStyle = rgba(kit.accent, 1);
  for (let k = 0; k < 4; k++) {
    const p = Rr[k], q = spine[k];
    const dx = p[0] - q[0], dy = p[1] - q[1], l = Math.hypot(dx, dy) || 1;
    const s = 0.1 - 0.015 * k;
    tri(ctx, p[0] - dy / l * 0.05, p[1] + dx / l * 0.05, p[0] + dx / l * s * 1.3, p[1] + dy / l * s * 1.3, p[0] + dy / l * 0.05, p[1] - dx / l * 0.05);
    ctx.fill();
  }
  // spade tip
  {
    const tp = spine[5], pr = spine[4];
    const ang = Math.atan2(tp[1] - pr[1], tp[0] - pr[0]) + 0.25 * flick;
    ctx.save();
    ctx.translate(tp[0], tp[1]);
    ctx.rotate(ang);
    ctx.fillStyle = rgba(kit.accent, 1);
    curve(ctx, [[-0.02, 0], [0.05, -0.15], [-0.2, -0.02], [0.05, 0.15]], true);
    ctx.fill();
    ctx.fillStyle = rgba(kit.light, 0.55);
    ellipse(ctx, -0.04, 0, 0.05, 0.025); ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  ctx.save();
  ctx.translate(0, -0.5);
  // ---- smoke curls ----
  if (smoke > 0.02) {
    for (let k = 0; k < 3; k++) {
      const q = t / 4.2 + k / 3 + hash01(i, 30), u = q - Math.floor(q);
      const px = nx - 0.05 - 0.45 * u + 0.1 * Math.sin(TAU * (u * 1.2 + k * 0.3));
      const py = ny - 0.12 - 0.85 * u;
      const a = Math.sin(Math.PI * u) * 0.5 * clamp(smoke, 0, 1.2) * (1 + 0.15 * breath);
      ctx.fillStyle = rgba(kit.light, a);
      ellipse(ctx, px, py, 0.07 + 0.14 * u, 0.06 + 0.12 * u); ctx.fill();
    }
  }
  // ---- flame puff ----
  if (fireU >= 0) {
    const s = Math.sin(Math.PI * fireU), grow = smoothstep(0, 0.35, fireU);
    const fx = nx - 0.08, fy = ny - 0.02, len = 0.7 * grow * s ** 0.5;
    glow(ctx, fx - len * 0.4, fy - len * 0.1, 0.5 * s + 0.05, kit.accent, 0.55 * s);
    ctx.fillStyle = rgba(kit.accent, 0.95 * Math.min(1, s * 2));
    curve(ctx, [[fx, fy - 0.05], [fx - len * 0.5, fy - 0.2 * s - 0.1], [fx - len, fy - 0.12 - 0.1 * s], [fx - len * 0.55, fy + 0.1 * s], [fx, fy + 0.07]], true);
    ctx.fill();
    ctx.fillStyle = rgba(kit.light, 0.9 * Math.min(1, s * 2));
    curve(ctx, [[fx, fy - 0.02], [fx - len * 0.35, fy - 0.07], [fx - len * 0.62, fy - 0.05], [fx - len * 0.3, fy + 0.04], [fx, fy + 0.03]], true);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

export default {
  id: "dragon-hoard",
  name: "Dragon's hoard",
  group: "lairs",
  blurb: "A small dragon sleeps curled on its gold, breathing smoke, and now and then cracks one eye open.",
  motion: "stationary",
  count: { min: 0, max: 2, default: 1, noun: "Dragon" },
  natural: [
    makeKit({ main: "#3fb070", light: "#c4f0c0", dark: "#123022", accent: "#ffb340", second: "#e2b94e" }),
    makeKit({ main: "#d04a42", light: "#ffc4a8", dark: "#3a1210", accent: "#ffc94a", second: "#e6a43c" }),
    makeKit({ main: "#4a82dc", light: "#c4dcff", dark: "#121e44", accent: "#8fe0ff", second: "#d8c070" }),
    makeKit({ main: "#9b62d8", light: "#e4c8ff", dark: "#2a1244", accent: "#ff9fd8", second: "#e8c070" }),
  ],
  atmosphere: "none",
  extras: [
    { key: "gold", type: "range", label: "Hoard", min: 0.3, max: 1.5, step: 0.05, default: 1, help: "How big the mound of gold is." },
    { key: "smoke", type: "range", label: "Smoke", min: 0, max: 1.5, step: 0.05, default: 1, help: "Smoke curling from the nostrils." },
    { key: "fire", type: "toggle", label: "Fire", default: true, help: "A small snore-flame now and then." },
  ],
  supports: { speed: true, size: true },
  labels: { speed: "Pace", size: "Size" },
  backdrop: { dark: "#120c0a", light: "#efe6dc" },
  draw(ctx, w, h, S) {
    const n = Math.max(0, Math.min(2, S.count | 0));
    if (!n) return;
    const X = S.extra || {};
    const gold = clamp(X.gold ?? 1, 0.3, 1.5), smoke = clamp(X.smoke ?? 1, 0, 1.5), fireOn = X.fire ?? true;
    const slots = SLOTS[n];
    let R = 0.27 * S.min * S.size * (n === 2 ? 0.8 : 1);
    R = Math.min(R, w / (n === 2 ? 8.4 : 4.6), h * 0.3);
    for (let i = 0; i < n; i++) {
      const [fx, fy] = slots[i];
      drawDragon(ctx, S, i, fx * w, fy * h + R * 0.05, R, i % 2 ? -1 : 1, gold, smoke, fireOn);
    }
  },
};
