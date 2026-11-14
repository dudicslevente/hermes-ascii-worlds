// Beehive (minimal): a small honeycomb cluster of big cells in the middle, a few big cute bees
// flying around it. Rare event: one bee does the waggle dance. Queen and honey drip as small extras.
import { makeKit, TAU, clamp, clamp01, lerp, smoothstep, hash01, rgba, shadeHex, mixHex, poly, ellipse, glow } from "../core/util.js";

// Cell centres in hex units (pointy-top), rank = fill order.
const S3 = Math.sqrt(3);
const CELLS = [[0, 0, 0], [-S3 / 2, -1.5, 3], [S3 / 2, -1.5, 5], [-S3, 0, 1], [S3, 0, 2], [-S3 / 2, 1.5, 4], [S3 / 2, 1.5, 6]];

function hexPath(ctx, x, y, r) {
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = TAU * (k / 6) - Math.PI / 2;
    k ? ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

function drawBee(ctx, S, kit, x, y, u, dir, tilt, phase, queen) {
  const flap = Math.sin(TAU * 3.2 * S.b + phase);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(dir * u, u);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // wings
  for (let k = 0; k < 2; k++) {
    ctx.save();
    ctx.translate(-0.05 - k * 0.12, -0.34);
    ctx.rotate(-0.7 - k * 0.4 + flap * (queen ? 0.15 : 0.45));
    ctx.fillStyle = rgba(kit.light, 0.7 - 0.15 * k);
    ellipse(ctx, 0, -0.3, 0.2, 0.42);
    ctx.fill();
    ctx.restore();
  }
  // abdomen with two stripes
  ctx.fillStyle = rgba(kit.main, 1);
  ellipse(ctx, -0.38, 0, 0.62, 0.44);
  ctx.fill();
  ctx.fillStyle = rgba(kit.dark, 0.9);
  for (const sx of [-0.5, -0.2]) {
    const hh = 0.44 * Math.sqrt(Math.max(0.02, 1 - ((sx + 0.38) / 0.62) ** 2)) * 0.92;
    ellipse(ctx, sx, 0, 0.09, hh);
    ctx.fill();
  }
  // thorax + head
  ctx.fillStyle = rgba(mixHex(kit.main, kit.light, 0.45), 1);
  ellipse(ctx, 0.12, 0, 0.36, 0.38);
  ctx.fill();
  ctx.fillStyle = rgba(mixHex(kit.main, kit.light, 0.25), 1);
  ellipse(ctx, 0.5, 0.02, 0.32, 0.3);
  ctx.fill();
  // eye + cheek
  ctx.fillStyle = rgba(kit.dark, 1);
  ellipse(ctx, 0.58, -0.04, 0.085, 0.1);
  ctx.fill();
  ctx.fillStyle = rgba(kit.accent, 0.7);
  ellipse(ctx, 0.52, 0.12, 0.07, 0.04);
  ctx.fill();
  // antennae
  ctx.strokeStyle = rgba(kit.dark, 0.9);
  ctx.lineWidth = 0.07;
  ctx.beginPath();
  ctx.moveTo(0.62, -0.22);
  ctx.quadraticCurveTo(0.8, -0.5, 0.95, -0.45);
  ctx.stroke();
  if (queen) {
    ctx.fillStyle = rgba(kit.accent, 1);
    poly(ctx, [[0.3, -0.34], [0.34, -0.62], [0.46, -0.46], [0.58, -0.64], [0.6, -0.3]]);
    ctx.fill();
  }
  ctx.restore();
}

export default {
  id: "beehive",
  name: "Beehive",
  group: "lairs",
  blurb: "A few friendly bees circle a small honeycomb, and now and then one waggle-dances.",
  motion: "travel",
  count: { min: 0, max: 8, default: 5, noun: "Bee" },
  natural: [
    makeKit({ main: "#f2b81c", light: "#fff0a8", dark: "#2b1a06", accent: "#ff9a2a", second: "#d98a12" }),
    makeKit({ main: "#e8861c", light: "#ffd8a0", dark: "#2c1404", accent: "#ffd23d", second: "#b85a10" }),
    makeKit({ main: "#f2b81c", light: "#fff0a8", dark: "#2b1a06", accent: "#ff9a2a", second: "#d98a12" }),
    makeKit({ main: "#f1de72", light: "#fffbd6", dark: "#3a2c0a", accent: "#ffa83a", second: "#d2b448" }),
    makeKit({ main: "#e8861c", light: "#ffd8a0", dark: "#2c1404", accent: "#ffd23d", second: "#b85a10" }),
    makeKit({ main: "#f2b81c", light: "#fff0a8", dark: "#2b1a06", accent: "#ff9a2a", second: "#d98a12" }),
    makeKit({ main: "#c4b73a", light: "#f1efa0", dark: "#1f2a0a", accent: "#92d450", second: "#7fa832" }),
  ],
  atmosphere: "none",
  extras: [
    { key: "honey", type: "range", label: "Honey", min: 0, max: 1.5, step: 0.05, default: 1, help: "How many comb cells are filled with glowing honey, and how brightly." },
    { key: "dance", type: "toggle", label: "Waggle dance", default: true, help: "Now and then one bee waggles a little figure eight." },
    { key: "queen", type: "toggle", label: "Queen", default: true, help: "A larger crowned queen rests beside the comb." },
  ],
  supports: { speed: true, size: true },
  backdrop: { dark: "#130f08", light: "#f1e9d6" },
  draw(ctx, w, h, S) {
    const n = Math.max(0, Math.min(8, S.count | 0));
    if (!n) return;
    const X = S.extra || {};
    const honey = clamp(X.honey ?? 1, 0, 1.5), danceOn = X.dance ?? true, queenOn = X.queen ?? true;
    const k0 = S.kit(0), b = S.b, t = S.t;
    const cx = w * 0.5, cy = h * 0.47;
    const c = Math.min(0.08 * S.min * S.size, w / 9, h / 6.6);
    const bu = Math.min(0.07 * S.min * S.size, c * 0.7);

    // ---- comb ----
    const breathe = 0.85 + 0.15 * Math.sin(TAU * 0.12 * b);
    if (honey > 0.05) glow(ctx, cx, cy, c * 3.6, k0.accent, 0.14 * Math.min(1, honey) * breathe);
    ctx.lineJoin = "round";
    let lowest = null;
    for (const [dx, dy, rank] of CELLS) {
      const x = cx + dx * c * 1.14, y = cy + dy * c * 1.14;
      const lv = clamp01(honey * 1.4 - rank * 0.1);
      ctx.fillStyle = rgba(k0.second, 0.3);
      hexPath(ctx, x, y, c * 0.93);
      ctx.fill();
      if (lv > 0.03) {
        const g = ctx.createRadialGradient(x - c * 0.2, y - c * 0.25, 0, x, y, c * 0.85);
        g.addColorStop(0, rgba(mixHex(k0.accent, k0.light, 0.5), lv));
        g.addColorStop(1, rgba(k0.accent, lv * (0.85 + 0.15 * breathe)));
        ctx.fillStyle = g;
        hexPath(ctx, x, y, c * 0.68);
        ctx.fill();
      }
      ctx.strokeStyle = rgba(mixHex(k0.second, k0.light, 0.5), 1);
      ctx.lineWidth = Math.max(3, c * 0.16);
      hexPath(ctx, x, y, c * 0.86);
      ctx.stroke();
      if (dy === 1.5 && dx > 0 && lv > 0.3) lowest = [x, y, lv];
    }
    // ---- honey drip ----
    if (lowest && honey > 0.3) {
      const q = t / 8 + 0.3, cyc = Math.floor(q), age = (q - cyc) * 8;
      const x0 = lowest[0], y0 = lowest[1] + c * 1.0;
      let dyy = 0, a = lowest[2];
      const grow = smoothstep(0, 2.6, age), fall = smoothstep(2.6, 4, age);
      const sz = c * (0.1 + 0.14 * grow);
      const yy = y0 + c * 0.25 * grow + c * 2.2 * fall * fall;
      a *= 1 - smoothstep(3.4, 4, age);
      if (age < 4 && a > 0.02) {
        ctx.fillStyle = rgba(k0.accent, a);
        if (fall < 0.01) {
          ctx.beginPath();
          ctx.moveTo(x0 - sz * 0.8, y0 - c * 0.12);
          ctx.quadraticCurveTo(x0 - sz * 0.6, yy - sz, x0, yy + sz * 0.4);
          ctx.quadraticCurveTo(x0 + sz * 0.6, yy - sz, x0 + sz * 0.8, y0 - c * 0.12);
          ctx.fill();
          ellipse(ctx, x0, yy + sz * 0.1, sz, sz * 1.1);
          ctx.fill();
        } else {
          ellipse(ctx, x0, yy, sz, sz * 1.25);
          ctx.fill();
        }
      }
    }

    // ---- queen ----
    const qx = clamp(cx - c * 3.6, bu * 2.2, w - bu * 2.2), qy = cy + c * 1.6 + Math.sin(TAU * 0.15 * b) * c * 0.08;
    if (queenOn) drawBee(ctx, S, k0, qx, qy, bu * 1.45, 1, -0.12 + 0.05 * Math.sin(TAU * 0.12 * b), 0, true);

    // ---- bees ----
    const per = 18, q = t / per, cyc = Math.floor(q), age = (q - cyc) * per;
    const dancer = Math.floor(hash01(cyc, 11) * n);
    const du = (age - 4) / 6;
    const wgt = danceOn && du >= 0 && du <= 1 ? smoothstep(0, 0.18, du) * (1 - smoothstep(0.82, 1, du)) : 0;
    const ax = Math.min(w * 0.4, c * 4.6 + bu * 2), ay = Math.min(h * 0.36, c * 3 + bu * 2);
    for (let i = 0; i < n; i++) {
      const kit = S.kit(i);
      const f1 = 0.05 + 0.04 * hash01(i, 1), f2 = 0.065 + 0.04 * hash01(i, 2);
      const p1 = TAU * hash01(i, 3), p2 = TAU * hash01(i, 4);
      const pos = (tt) => [
        cx + ax * Math.sin(TAU * f1 * tt + p1),
        cy + ay * Math.sin(TAU * f2 * tt + p2) * 0.9 + Math.sin(TAU * 0.3 * b + i) * bu * 0.25,
      ];
      let [x, y] = pos(t);
      const [x2, y2] = pos(t + 0.15);
      let vx = x2 - x, tl = clamp((y2 - y) / (Math.abs(vx) + 1e-3), -1, 1) * 0.35;
      let dir = vx >= 0 ? 1 : -1, tilt = dir * tl * 0.0 + tl * dir * 0.6 * (dir > 0 ? 1 : 1);
      if (i === dancer && wgt > 0) {
        const sx = clamp(cx + c * 4.3, bu * 2.5, w - bu * 2.5), sy = cy - c * 2.4;
        const ph = TAU * 0.16 * (du * 6);
        const ex = sx + Math.sin(ph) * bu * 1.5, ey = sy + Math.sin(2 * ph) * bu * 0.9;
        x = lerp(x, ex, wgt);
        y = lerp(y, ey, wgt);
        const wig = Math.sin(TAU * 2.2 * (du * 6)) * 0.3;
        tilt = lerp(tilt, wig, wgt);
        dir = wgt > 0.5 ? 1 : dir;
      }
      drawBee(ctx, S, kit, x, y, bu, dir, tilt, i * 1.7, false);
    }
  },
};
