// Retro arcade, minimal: one to three arcade cabinets standing far apart in empty space. Each
// screen plays a bold attract loop (chomper maze, invaders, brick breaker) made of chunky
// game-pixels; a glowing marquee, a joystick and two buttons. No hall, no ceiling, no floor.
// All motion is a pure function of S.b.
import { makeKit, TAU, clamp, clamp01, lerp, mod, smoothstep, easeInOut, hash01, rgba, mixHex, shadeHex, ellipse, glow } from "../core/util.js";

const GW = 12, GH = 10; // game pixels on a screen

const tri = (x) => Math.abs(mod(x, 2) - 1); // 0..1..0 triangle wave
function tone(S, k) {
  if (S.dark) return k;
  return Object.freeze({ main: shadeHex(k.main, 0.78), light: shadeHex(k.light, 0.8), dark: shadeHex(k.dark, 0.5), accent: shadeHex(k.accent, 0.82), second: shadeHex(k.second, 0.75) });
}

// ---- the three attract loops (game-pixel space: 0..12 x 0..10) -------------
function gameChomper(ctx, t, k) {
  const wall = rgba(mixHex(k.main, k.light, 0.15), 0.95);
  ctx.fillStyle = wall;
  ctx.fillRect(3.5, 3.5, 5, 3); // inner block
  ctx.strokeStyle = rgba(mixHex(k.main, k.light, 0.15), 0.85);
  ctx.lineWidth = 0.6;
  ctx.strokeRect(0.5, 0.5, 11, 9);
  const P = 32;
  const pos = (s) => {
    s = mod(s, P);
    if (s < 9) return [1.5 + s, 1.5, 0];
    if (s < 16) return [10.5, 1.5 + (s - 9), Math.PI / 2];
    if (s < 25) return [10.5 - (s - 16), 8.5, Math.PI];
    return [1.5, 8.5 - (s - 25), -Math.PI / 2];
  };
  const sc = t * 3.6;
  for (let d = 0; d < 16; d++) {
    const sd = d * 2;
    const m = mod(sd - sc, P);
    const al = 1 - smoothstep(25, 29, m);
    if (al < 0.02 || m < 0.5) continue;
    const [x, y] = pos(sd);
    ctx.fillStyle = rgba(k.light, al);
    ctx.fillRect(x - 0.35, y - 0.35, 0.7, 0.7);
  }
  // ghost trailing behind
  const [gx, gy] = pos(sc - 8);
  ctx.fillStyle = rgba(mixHex(k.main, k.light, 0.6), 1);
  ctx.beginPath();
  ctx.arc(gx, gy - 0.1, 0.95, Math.PI, 0);
  ctx.lineTo(gx + 0.95, gy + 0.9);
  ctx.lineTo(gx + 0.32, gy + 0.5);
  ctx.lineTo(gx - 0.32, gy + 0.9);
  ctx.lineTo(gx - 0.95, gy + 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = rgba(k.dark, 1);
  ctx.fillRect(gx - 0.5, gy - 0.4, 0.38, 0.48);
  ctx.fillRect(gx + 0.15, gy - 0.4, 0.38, 0.48);
  // chomper
  const [cx, cy, dir] = pos(sc);
  const m = 0.12 + 0.5 * Math.abs(Math.sin(t * 9));
  ctx.fillStyle = rgba(k.accent, 1);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, 1.1, dir + m, dir + TAU - m);
  ctx.closePath();
  ctx.fill();
}

function drawAlien(ctx, x, y, frame, col) {
  ctx.fillStyle = col;
  ctx.fillRect(x + 1, y, 1, 1);
  ctx.fillRect(x, y + 1, 3, 1);
  ctx.fillRect(x + (frame ? 0 : 1), y + 2, 1, 1);
  ctx.fillRect(x + 2 - (frame ? 0 : 1) + (frame ? 0 : 0), y + 2, 1, 1);
  if (!frame) ctx.fillRect(x, y + 2, 0, 0);
}
function gameInvaders(ctx, t, k) {
  const L = 13;
  const tg = mod(t, L);
  const step = Math.floor(tg);
  const off = step % 2;
  const order = [4, 1, 3, 0, 5, 2];
  const kill = [];
  for (let s = 0; s < 6; s++) kill[order[s]] = s;
  // shots
  const ks = Math.min(5, Math.floor(tg / 2));
  const tk = tg - ks * 2;
  const target = order[ks];
  const tc = target % 3, tr = Math.floor(target / 3);
  const colX = (c) => 0.5 + c * 4 + off;
  const hitT = 1.55;
  const ax = (c) => 0.5 + c * 4 + 1.5; // aligned (odd phase) bullet x
  const prevTarget = ks > 0 ? order[ks - 1] : target;
  const fromX = ks > 0 ? ax(prevTarget % 3) : 6;
  const shipX = tg < 12 ? lerp(fromX, ax(tc), easeInOut(clamp01(tk / 0.8))) : ax(order[5] % 3);
  const lapIn = smoothstep(12.2, 13, tg);
  for (let a = 0; a < 6; a++) {
    const c = a % 3, r = Math.floor(a / 3);
    const dead = tg >= 2 * kill[a] + hitT;
    const isTarget = a === target && tk >= hitT - 0.2 && tk < hitT;
    let al = dead ? lapIn : 1;
    if (tg >= 12) al = lapIn;
    if (al < 0.03) continue;
    const col = rgba(r ? k.accent : k.light, al * (isTarget && Math.floor(tk * 20) % 2 ? 0.4 : 1));
    drawAlien(ctx, colX(c), 1 + r * 4, step % 2, col);
  }
  // ship
  ctx.fillStyle = rgba(k.light, 1);
  ctx.fillRect(shipX - 1.5, 9, 3, 1);
  ctx.fillRect(shipX - 0.5, 8.2, 1, 0.8);
  // bullet
  if (tg < 12 && tk >= 1 && tk < hitT) {
    const f = (tk - 1) / (hitT - 1);
    const ty = 1 + tr * 4 + 3;
    const y = lerp(8, ty, f);
    ctx.fillStyle = rgba(k.accent, 1);
    ctx.fillRect(ax(tc) - 0.45, y, 0.9, 1.5);
  }
  // pop
  if (tg < 12 && tk >= hitT && tk < hitT + 0.3) {
    const f = (tk - hitT) / 0.3;
    ctx.fillStyle = rgba(k.light, 1 - f);
    ctx.fillRect(colX(tc) + 1 - f, 1 + tr * 4 + 1 - f, 1 + 2 * f, 1 + 2 * f);
  }
}

function gameBreaker(ctx, t, k) {
  const L = 14;
  const tg = mod(t, L);
  const lapIn = smoothstep(13, 14, tg);
  for (let i = 0; i < 12; i++) {
    const r = Math.floor(i / 6), c = i % 6;
    const gone = tg > 1.5 + i * 0.95;
    const al = gone ? lapIn : 1;
    if (al < 0.03) continue;
    ctx.fillStyle = rgba(r ? k.light : k.accent, al);
    ctx.fillRect(c * 2 + 0.1, 1 + r * 1.6, 1.8, 1.1);
  }
  const bx = 0.6 + tri(t * 0.3 + 0.2) * 10.8;
  const by = 4.2 + tri(t * 0.36) * 3.6;
  const px = clamp(lerp(6, bx, 0.9), 1.5, 10.5);
  ctx.fillStyle = rgba(k.light, 1);
  ctx.fillRect(px - 1.5, 9, 3, 0.9);
  ctx.beginPath();
  ctx.arc(bx, by, 0.6, 0, TAU);
  ctx.fill();
}

// ---- pieces ---------------------------------------------------------------
function drawCabinet(ctx, S, x, Y, u, k, i, glowK) {
  const b = S.b;
  const bodyC = k.main;
  const rim = mixHex(k.main, k.light, 0.45);
  const sx0 = -0.2, sy0 = -0.88, sw = 0.4, sh = 0.3333;
  if (glowK > 0) glow(ctx, x, Y + (sy0 + sh / 2) * u, 0.7 * u * Math.min(1, glowK * 0.85 + 0.15), k.second, 0.22 * glowK);
  ctx.save();
  ctx.translate(x, Y);
  ctx.scale(u, u);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  // body
  ctx.fillStyle = rgba(bodyC, 1);
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(-0.26, -1.0, 0.52, 0.62, 0.03) : ctx.rect(-0.26, -1.0, 0.52, 0.62);
  ctx.fill();
  ctx.beginPath();
  ctx.rect(-0.25, -0.4, 0.5, 0.4);
  ctx.fill();
  // control panel (overhang, lighter)
  ctx.fillStyle = rgba(rim, 1);
  ctx.beginPath();
  ctx.moveTo(-0.3, -0.38);
  ctx.lineTo(-0.27, -0.52);
  ctx.lineTo(0.27, -0.52);
  ctx.lineTo(0.3, -0.38);
  ctx.closePath();
  ctx.fill();
  // coin slot
  ctx.fillStyle = rgba(k.accent, 1);
  ctx.fillRect(-0.045, -0.24, 0.09, 0.045);
  // marquee
  ctx.fillStyle = rgba(k.accent, 0.95);
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(-0.23, -0.985, 0.46, 0.07, 0.03) : ctx.rect(-0.23, -0.985, 0.46, 0.07);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(-0.23, -0.985, 0.46, 0.07);
  ctx.clip();
  const hx = -0.3 + tri(b * 0.25 + i * 0.37) * 0.6;
  ctx.fillStyle = rgba(k.light, 0.9);
  ctx.fillRect(hx - 0.045, -0.985, 0.09, 0.07);
  ctx.restore();
  // screen: backdrop + game
  ctx.fillStyle = rgba(rim, 1);
  ctx.fillRect(sx0 - 0.018, sy0 - 0.018, sw + 0.036, sh + 0.036);
  ctx.fillStyle = rgba(S.dark ? mixHex(k.dark, k.second, 0.5) : mixHex(k.dark, k.second, 0.12), 1);
  ctx.fillRect(sx0, sy0, sw, sh);
  ctx.save();
  ctx.beginPath();
  ctx.rect(sx0, sy0, sw, sh);
  ctx.clip();
  ctx.translate(sx0, sy0);
  const ps = sw / GW;
  ctx.scale(ps, ps);
  const T = b + i * 3.7;
  const g = i % 3;
  if (g === 0) gameChomper(ctx, T, k);
  else if (g === 1) gameInvaders(ctx, T, k);
  else gameBreaker(ctx, T, k);
  ctx.restore();
  // joystick
  const tilt = Math.sin(b * 1.7 + i * 2) * 0.35;
  ctx.fillStyle = rgba(k.dark, 1);
  ellipse(ctx, -0.13, -0.44, 0.04, 0.02);
  ctx.fill();
  ctx.strokeStyle = rgba(k.light, 1);
  ctx.lineWidth = 0.02;
  ctx.beginPath();
  ctx.moveTo(-0.13, -0.44);
  ctx.lineTo(-0.13 + Math.sin(tilt) * 0.1, -0.44 - Math.cos(tilt) * 0.1);
  ctx.stroke();
  ctx.fillStyle = rgba(k.accent, 1);
  ellipse(ctx, -0.13 + Math.sin(tilt) * 0.11, -0.44 - Math.cos(tilt) * 0.11, 0.032, 0.032);
  ctx.fill();
  // buttons
  const press = (n) => (Math.sin(b * 3.1 + i + n * 1.9) > 0.85 ? 0.012 : 0);
  ctx.fillStyle = rgba(k.second, 1);
  ellipse(ctx, 0.06, -0.445 + press(0), 0.028, 0.028);
  ctx.fill();
  ctx.fillStyle = rgba(k.accent, 1);
  ellipse(ctx, 0.14, -0.445 + press(1), 0.028, 0.028);
  ctx.fill();
  ctx.restore();
}

// ---- scene ----------------------------------------------------------------
export default {
  id: "retro-arcade",
  name: "Retro arcade",
  group: "play",
  blurb: "A few arcade cabinets stand glowing in the quiet, each running a tiny attract-mode game.",
  motion: "stationary",
  count: { min: 0, max: 3, default: 2, noun: "Cabinet" },
  natural: [
    makeKit({ main: "#d23a8c", light: "#ffd2ee", dark: "#240818", accent: "#ffd23a", second: "#3ad0ff" }),
    makeKit({ main: "#1fa6c8", light: "#c8f6ff", dark: "#06202a", accent: "#ff7a3a", second: "#8a6cff" }),
    makeKit({ main: "#e8602c", light: "#ffe2c4", dark: "#2a0e06", accent: "#4affa8", second: "#ffc83a" }),
    makeKit({ main: "#7a4cff", light: "#e2d8ff", dark: "#140a2e", accent: "#b8ff3a", second: "#ff4c9a" }),
  ],
  atmosphere: "none",
  extras: [
    { key: "glow", type: "range", label: "Glow", min: 0, max: 1.5, step: 0.05, default: 1, help: "A soft halo of light around each screen. 0 keeps the screens dry." },
  ],
  supports: { speed: true, size: true },
  labels: { size: "Cabinet size", count: "Cabinets" },
  backdrop: { dark: "#0b0a14", light: "#ece9f2" },
  draw(ctx, w, h, S) {
    const n = clamp(S.count | 0, 0, 3);
    if (n <= 0) return;
    const ex = S.extra || {};
    const glowK = clamp(ex.glow ?? 1, 0, 1.5);
    const sz = clamp(S.size ?? 1, 0.5, 1.6);
    const stack = n > 1 && w < h * 1.1;
    const pos = [];
    let u;
    if (!stack) {
      const gap = 1.26; // centre-to-centre in units of u
      const lo = -0.3, hiC = (n - 1) * gap + 0.3;
      const hi = hiC;
      const span = hi - lo;
      u = Math.min(S.min * 0.5 * sz, h * 0.62, (w * 0.92) / span);
      const x0 = w / 2 - ((lo + hi) / 2) * u;
      const Y = h / 2 + 0.5 * u;
      for (let i = 0; i < n; i++) pos.push([x0 + i * gap * u, Y]);
    } else {
      u = Math.min(S.min * 0.5 * sz, (h / n) * 0.78, w * 0.4);
      for (let i = 0; i < n; i++) pos.push([w / 2 + (i % 2 ? 0.28 : -0.28) * Math.min(w * 0.45, 1.2 * u) , h * ((i + 0.5) / n) + 0.5 * u]);
    }
    for (let i = 0; i < n; i++) drawCabinet(ctx, S, pos[i][0], pos[i][1], u, tone(S, S.kit(i)), i, glowK);
  },
};
