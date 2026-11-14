// Penguin slide (calm loop). One soft pale-warm ice slab (plateau + gentle slope) with a bright top edge, a small teal pool
// at its foot, and a few big penguins. Per-penguin loop (closed form, no state):
//   plateau waddle -> belly-slide down the slope (snow spray) -> splash into the pool -> dive, turn, dolphin-leap onto the
//   small ice step at the foot -> waddle up the walking ledge that runs parallel to (and below) the slide lane -> plateau.
// Timing is chosen so at most one penguin is on the plateau and the slide lane is free whenever a walker is near its ends.
import { makeKit, TAU, clamp, clamp01, lerp, hash01, rgba, mixHex, shadeHex, shiftHue, smoothstep, at, curve, ellipse } from "../core/util.js";

const ss = smoothstep;
const turnFace = (u) => { const c = Math.cos(Math.PI * ss(0, 1, u)); return Math.sign(c || 1) * Math.max(0.28, Math.abs(c)); };
const mod = (a, n) => ((a % n) + n) % n;

// timeline (seconds)
const SLD = 2.2, DIVE = 1.0, TURN = 0.5, LEAP = 1.2, SET = 0.5, CL = 6.4;
const POOL = DIVE + TURN + LEAP;
const RUN = SLD + POOL + SET + CL;

function schedule(n) {
  if (n <= 1) return { Pd: 4.5, Tl: RUN + 4.5, S: RUN + 4.5 };
  const S = Math.min(8, (RUN - 0.9) / (n - 1));
  const Tl = n * S;
  return { Pd: Tl - RUN, Tl, S };
}

function palette(S, K) {
  const d = S.dark;
  const ice0 = mixHex(mixHex(K.light, "#ffffff", 0.3), K.accent, 0.32);
  const wat0 = shiftHue(K.second, -26, 1.1);
  return {
    ice: d ? ice0 : shadeHex(mixHex(K.accent, K.light, 0.4), 0.66),
    edge: d ? mixHex(ice0, "#ffffff", 0.45) : shadeHex(mixHex(K.accent, K.light, 0.3), 0.6),
    water: d ? wat0 : shadeHex(wat0, 0.72),
    waterTop: d ? mixHex(wat0, "#ffffff", 0.35) : shadeHex(wat0, 0.6),
    snow: d ? mixHex(K.light, "#ffffff", 0.5) : mixHex(K.second, K.dark, 0.3),
  };
}

function layout(w, h, size) {
  const H = clamp(Math.min(0.2 * h, 0.115 * w) * Math.pow(size, 0.6), 22, 0.25 * h);
  const xs = 0.05 * w, xa = 0.34 * w, xb = 0.6 * w, xp1 = 0.92 * w;
  const dx = xb - xa;
  const dy = Math.min(0.27 * h, 0.4 * dx);
  const D = 1.2 * H;
  const yP = (h - (dy + 2.95 * H)) / 2 + 1.0 * H;
  const yF = yP + dy;
  const yW = yF + D + 0.08 * H;
  const kk = 0.1;
  const sm = (u) => (Math.sqrt(u * u + kk * kk) + u) / 2;
  const G = (x) => yP + dy * (sm((x - xa) / dx) - sm((x - xa) / dx - 1));
  const tt = (x) => Math.atan2(G(x + 2) - G(x - 2), 4);
  // walking ledge: D below the slope surface (parallel lane), rising to the plateau at its top-left end
  const off = (x) => D * ss(xa - 0.12 * w, xa - 0.03 * w, x);
  const Wk = (x) => G(x) + off(x);
  const wt = (x) => Math.atan2(Wk(x + 2) - Wk(x - 2), 4);
  const xLand = xb - 0.03 * w;
  const xT = xa - 0.12 * w;
  return { w, H, xs, xa, xb, xp1, dx, dy, D, yP, yF, yW, G, tt, wt, off, Wk, xLand, xT, V: (xLand - xT) / CL };
}

// penguin facing +x; origin = body centre; H = full height. fa = flipper angle back (rad)
function drawPenguin(ctx, K, H, o, dark) {
  const rim = rgba(mixHex(K.light, "#ffffff", 0.5), dark ? 0.95 : 0.85);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const fa = o.fa || 0, step = o.step || 0;
  const back = dark ? mixHex(K.main, K.light, 0.3) : mixHex(K.main, K.dark, 0.5);
  const white = mixHex(K.light, "#ffffff", 0.8);
  if (o.feet !== false) {
    for (const k of [0, 1]) {
      const lift = Math.max(0, Math.sin(step + k * Math.PI)) * 0.06 * H;
      ellipse(ctx, (k ? 0.1 : -0.06) * H, 0.5 * H - lift, 0.12 * H, 0.045 * H);
      ctx.fillStyle = K.accent;
      ctx.fill();
    }
  }
  const flip = (px, py, ang, fn) => at(ctx, px, py, ang, 1, 1, fn);
  flip(-0.17 * H, -0.02 * H, 0.25 + fa * 0.7, () => {
    ellipse(ctx, 0, 0.12 * H, 0.07 * H, 0.22 * H);
    ctx.fillStyle = mixHex(back, K.dark, 0.3);
    ctx.fill();
  });
  const pts = [[0.02, -0.5], [0.2, -0.4], [0.25, -0.15], [0.32, 0.2], [0.18, 0.46], [-0.1, 0.5], [-0.3, 0.38], [-0.32, 0.05], [-0.22, -0.3]].map(([x, y]) => [x * H, y * H]);
  curve(ctx, pts, true);
  const g = ctx.createLinearGradient(-0.3 * H, 0, 0.3 * H, 0);
  g.addColorStop(0, mixHex(back, K.dark, 0.1));
  g.addColorStop(1, mixHex(back, K.light, 0.14));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = rim;
  ctx.lineWidth = Math.max(1.8, 0.036 * H);
  ctx.stroke();
  ellipse(ctx, 0.1 * H, 0.13 * H, 0.17 * H, 0.31 * H, 0.04);
  ctx.fillStyle = white;
  ctx.fill();
  ellipse(ctx, 0.11 * H, -0.3 * H, 0.105 * H, 0.1 * H);
  ctx.fillStyle = white;
  ctx.fill();
  const bl = o.blink ? 0.2 : 1;
  ellipse(ctx, 0.14 * H, -0.31 * H, 0.052 * H, 0.052 * H * bl);
  ctx.fillStyle = mixHex(K.dark, "#000000", 0.5);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0.2 * H, -0.3 * H);
  ctx.lineTo(0.39 * H, -0.25 * H);
  ctx.lineTo(0.21 * H, -0.19 * H);
  ctx.closePath();
  ctx.fillStyle = K.accent;
  ctx.fill();
  flip(0.02 * H, -0.04 * H, 0.18 + fa, () => {
    ellipse(ctx, 0, 0.13 * H, 0.075 * H, 0.23 * H);
    ctx.fillStyle = mixHex(back, K.light, 0.14);
    ctx.fill();
    ctx.strokeStyle = rim;
    ctx.lineWidth = Math.max(1.4, 0.028 * H);
    ctx.stroke();
  });
}

// penguin lying on its belly (side view), head at +x, belly (white) at the bottom. origin = body centre
function drawProne(ctx, K, H, o, dark) {
  const rim = rgba(mixHex(K.light, "#ffffff", 0.5), dark ? 0.95 : 0.85);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const back = dark ? mixHex(K.main, K.light, 0.3) : mixHex(K.main, K.dark, 0.5);
  const white = mixHex(K.light, "#ffffff", 0.8);
  const fa = o.fa || 0;
  // feet trailing behind
  for (const k of [0, 1]) {
    ellipse(ctx, (-0.55 - 0.03 * k) * H, (0.03 + 0.06 * k) * H, 0.08 * H, 0.035 * H, 0.2);
    ctx.fillStyle = K.accent;
    ctx.fill();
  }
  const pts = [[0.5, 0.0], [0.42, -0.16], [0.22, -0.27], [-0.08, -0.28], [-0.36, -0.2], [-0.54, -0.05], [-0.5, 0.07], [-0.32, 0.2], [0.0, 0.28], [0.26, 0.23], [0.44, 0.13]].map(([x, y]) => [x * H, y * H]);
  curve(ctx, pts, true);
  const g = ctx.createLinearGradient(0, -0.28 * H, 0, 0.28 * H);
  g.addColorStop(0, mixHex(back, K.dark, 0.15));
  g.addColorStop(0.55, back);
  g.addColorStop(0.62, white);
  g.addColorStop(1, white);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = rim;
  ctx.lineWidth = Math.max(1.8, 0.036 * H);
  ctx.stroke();
  // head patch, eye, beak
  ellipse(ctx, 0.33 * H, -0.04 * H, 0.14 * H, 0.15 * H);
  ctx.fillStyle = white;
  ctx.fill();
  ellipse(ctx, 0.38 * H, -0.09 * H, 0.05 * H, 0.05 * H * (o.blink ? 0.2 : 1));
  ctx.fillStyle = mixHex(K.dark, "#000000", 0.5);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0.46 * H, -0.08 * H);
  ctx.lineTo(0.66 * H, 0.0);
  ctx.lineTo(0.46 * H, 0.04 * H);
  ctx.closePath();
  ctx.fillStyle = K.accent;
  ctx.fill();
  // flipper swept back along the side
  at(ctx, 0.12 * H, 0.04 * H, 0.18 + 0.2 * fa, 1, 1, () => {
    ellipse(ctx, -0.17 * H, 0, 0.22 * H, 0.065 * H);
    ctx.fillStyle = mixHex(back, K.light, 0.14);
    ctx.fill();
    ctx.strokeStyle = rim;
    ctx.lineWidth = Math.max(1.4, 0.028 * H);
    ctx.stroke();
  });
}

// ---- per-penguin pose at local time a ----
function poseAt(L, sch, a) {
  const { H, xa, xb, G, tt, wt, Wk, xLand, xT, V, yW, w } = L;
  const { Pd } = sch;
  const T1 = Pd, T2 = T1 + SLD, T3 = T2 + POOL, T4 = T3 + SET;
  const o = { x: xa, y: 0, rot: 0, face: 1, sc: 1, fa: 0, step: 0, blink: false, phase: "", wet: false, feet: true, lie: false, sq: 1, pa: 0, rp: 0 };
  const stand = (x, y0, sc = 1) => { o.x = x; o.sc = sc; o.y = y0 - 0.5 * H * sc; };
  const waddle = (rate) => { o.step = a * rate; o.fa = 0.18 + 0.2 * Math.sin(o.step); return Math.abs(Math.sin(o.step)) * 0.022 * H; };
  if (a < T1) {
    o.phase = "plateau";
    // arrive at the top of the ledge, turn, wait a moment, waddle to the lip, lean
    const tw = Math.max(1.2, Math.min((xa - xT) / V, Pd - 0.9));
    const lean = 0.5, turn = 0.4;
    const wait = Math.max(0, Pd - tw - lean - turn);
    const t1 = turn, t2 = turn + wait, t3 = t2 + tw;
    if (a < t1) {
      const u = a / turn;
      stand(xT, G(xT));
      o.face = -turnFace(u);
      o.rot = 0.04 * Math.sin(u * Math.PI);
      o.fa = 0.25 * Math.sin(u * Math.PI);
    } else if (a < t2) {
      stand(xT, G(xT));
      o.face = 1;
      o.fa = 0.1;
      o.blink = a > t1 + 0.35 * wait && a < t1 + 0.35 * wait + 0.18;
    } else if (a < t3) {
      const u = (a - t2) / tw;
      const x = lerp(xT, xa, u);
      const bob = waddle(7.2);
      stand(x, G(x) - bob);
      o.face = 1;
      o.rot = 0.05 + 0.07 * Math.sin(o.step);
    } else {
      const u = clamp01((a - t3) / lean);
      stand(xa, G(xa));
      o.face = 1;
      o.rot = lerp(0.05, 0.2, ss(0, 1, u)) + 0.03 * Math.sin(u * 30) * u;
      o.fa = 0.2 + 0.7 * ss(0.2, 1, u);
    }
  } else if (a < T2) {
    o.phase = "slide";
    const u = (a - T1) / SLD;
    const p = 0.3 * u + 0.7 * u * u;
    const x = lerp(xa, xb, p);
    const t = tt(x);
    const pr = ss(0, 0.16, u);
    const thick = 0.3 * H;
    const upY = G(x) - 0.5 * H;
    const lieY = G(x) - Math.cos(t) * thick;
    o.y = lerp(upY, lieY, pr);
    o.x = lerp(x, x + Math.sin(t) * thick, pr);
    o.rot = lerp(0.2, Math.PI / 2 + t, pr);
    o.fa = lerp(0.9, 1.15, pr);
    o.pa = ss(0.07, 0.15, u);
    o.rp = t;
  } else if (a < T3) {
    o.phase = "pool";
    o.wet = true;
    const e = a - T2;
    const yS = G(xb) - 0.3 * H;
    const xe0 = xb + 0.1 * w, xe1 = xb + 0.15 * w, xe2 = xb + 0.18 * w;
    const FALL = 0.5;
    if (e < FALL) {
      // ballistic off the end of the slope into the pool
      const u = e / FALL;
      o.x = lerp(xb, xe0, u);
      o.y = lerp(yS, yW + 0.05 * H, u * u);
      o.rot = lerp(Math.PI / 2 + tt(xb), Math.PI / 2 + 0.85, ss(0, 1, u));
      o.fa = 1.1;
      o.pa = 1;
      o.rp = o.rot - Math.PI / 2;
    } else if (e < DIVE) {
      const u = (e - FALL) / (DIVE - FALL);
      o.x = lerp(xe0, xe1, ss(0, 1, u));
      o.y = lerp(yW + 0.05 * H, yW + 0.44 * H, Math.sin(u * Math.PI / 2));
      o.rot = lerp(Math.PI / 2 + 0.85, Math.PI / 2 + 0.2, ss(0, 1, u));
      o.fa = 1.1;
      o.pa = 1;
      o.rp = o.rot - Math.PI / 2;
    } else if (e < DIVE + TURN) {
      const u = (e - DIVE) / TURN;
      o.x = lerp(xe1, xe2, ss(0, 1, u));
      o.y = yW + lerp(0.44, 0.38, u) * H;
      o.face = turnFace(u);
      o.rot = lerp(Math.PI / 2 + 0.2, -Math.PI / 2 - 0.35, ss(0, 1, u));
      o.fa = 0.6;
      o.pa = 1;
      o.rp = lerp(0.2, 1.12, ss(0, 1, u));
    } else {
      const u = (e - DIVE - TURN) / LEAP;
      const yStart = yW + 0.38 * H;
      const yLand = Wk(xLand) - 0.5 * H * 0.95;
      const Ap = 0.85 * H;
      o.x = lerp(xe2, xLand, u);
      o.y = lerp(yStart, yLand, u) - Ap * 4 * u * (1 - u);
      const dxu = xLand - xe2;
      const dyu = yLand - yStart - Ap * 4 * (1 - 2 * u);
      const ra = Math.atan2(dxu, -dyu);
      o.face = -1;
      o.sc = lerp(1, 0.95, u);
      o.rot = lerp(ra, -0.04, ss(0.65, 1, u));
      o.pa = 1 - ss(0.6, 0.8, u);
      o.rp = Math.atan2(-dyu, -dxu);
      o.fa = lerp(0.7, 0.25, ss(0.55, 1, u));
      o.feet = true;
      o.wet = o.y + 0.5 * H > yW && u < 0.45;
    }
  } else if (a < T4) {
    o.phase = "settle";
    const u = (a - T3) / SET;
    stand(xLand, Wk(xLand), 0.95);
    o.face = -1;
    o.sq = 1 - 0.08 * Math.sin(Math.min(1, u * 2) * Math.PI) * (1 - ss(0.5, 1, u));
    o.fa = 0.7 * (1 - ss(0, 0.6, u)) + 0.2;
    o.rot = 0.04 * Math.sin(u * 14) * (1 - u);
  } else {
    o.phase = "climb";
    const u = (a - T4) / CL;
    const x = lerp(xLand, xT, u);
    const bob = waddle(7.2);
    stand(x, Wk(x) - bob, 0.95);
    o.face = -1;
    o.rot = 0.45 * wt(x) - 0.1 + 0.07 * Math.sin(o.step);
  }
  return o;
}

function itemsAt(L, sch, n, t) {
  const items = [];
  for (let i = 0; i < n; i++) {
    const a = mod(t - i * sch.S, sch.Tl);
    const o = poseAt(L, sch, a);
    o.i = i;
    o.a = a;
    items.push(o);
  }
  return items;
}

export const _internals = { layout, schedule, poseAt, itemsAt, RUN, SLD, POOL, SET, CL };

function splash(ctx, col, H, x, y, age, str, seed) {
  if (age < 0 || age > 1.1) return;
  const u = age / 1.1;
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI * (0.2 + 0.6 * ((k + hash01(seed, k)) / 5));
    const v = (0.7 + 0.5 * hash01(seed, k + 9)) * str;
    const px = x + Math.cos(a) * v * 0.3 * H * age * 2;
    const py = y + Math.sin(a) * v * 0.45 * H * age * 2 + 0.7 * H * str * age * age;
    ctx.beginPath();
    ctx.arc(px, py, Math.max(1.6, 0.03 * H * str * (1 - u * 0.6)), 0, TAU);
    ctx.fillStyle = rgba(col, 0.85 * (1 - u));
    ctx.fill();
  }
  ctx.strokeStyle = rgba(col, 0.7 * (1 - u));
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, 0.08 * H * str + 0.45 * H * str * u), Math.max(0.01, 0.02 * H + 0.06 * H * u), 0, Math.PI, TAU);
  ctx.stroke();
}

export default {
  id: "penguin-slide",
  name: "Penguin slide",
  group: "creatures",
  blurb: "A few penguins waddle along the ice, belly-slide down, splash into the pool, and hop out to climb back up.",
  motion: "stationary",
  count: { min: 0, max: 4, default: 3, noun: "Penguin" },
  natural: [
    makeKit({ main: "#4d6788", light: "#f6fafc", dark: "#17202e", accent: "#ff9a2e", second: "#7cc3e6" }),
    makeKit({ main: "#7893ad", light: "#e9f2f7", dark: "#26374b", accent: "#ffb34d", second: "#69b6d8" }),
    makeKit({ main: "#b3c3cf", light: "#fbfdff", dark: "#56697a", accent: "#f5c168", second: "#8fcfe2" }),
    makeKit({ main: "#5b6676", light: "#dde4ea", dark: "#12161d", accent: "#ff8a3d", second: "#5fa6cc" }),
  ],
  atmosphere: "none",
  flow: { label: "Swell", help: "How much the pool surface heaves.", default: 1, min: 0, max: 1.5 },
  extras: [
    { key: "snow", type: "range", label: "Snow", min: 0, max: 1.5, step: 0.05, default: 0.6, help: "A few soft snowflakes drifting down." },
    { key: "chicks", type: "toggle", label: "Chick", default: true, help: "A small fluffy chick watches from the plateau." },
    { key: "slide", type: "toggle", label: "Belly slide", default: true, help: "On: they belly-slide down with a spray of snow. Off: they just waddle down the slope." },
  ],
  supports: { speed: true, size: true },
  backdrop: { dark: "#0a1420", light: "#e6eff4" },
  draw(ctx, w, h, S) {
    ctx.globalAlpha = 1;
    const ex = S.extra || {};
    const snowAmt = ex.snow ?? 0.6, chickOn = ex.chicks ?? true, slideOn = ex.slide ?? true;
    const n = S.count;
    if (n < 1) return;
    const flow = S.flow == null ? 1 : S.flow;
    const key = `${w}|${h}|${S.size}|${n}`;
    if (S.memo.key !== key) {
      S.memo.key = key;
      S.memo.L = layout(w, h, S.size ?? 1);
      S.memo.sch = schedule(n);
    }
    const L = S.memo.L, sch = S.memo.sch;
    const { H, xs, xa, xb, xp1, D, yP, yF, yW, G, Wk } = L;
    const dark = S.dark;
    const K0 = S.kit(0);
    const P = palette(S, K0);
    const lw = Math.max(2.4, H * 0.03);
    const amp = 0.01 * h * flow + 0.2;
    const wl = (x) => yW + amp * Math.sin(x * 0.03 - S.b * 1.1);

    const xL0 = xa - 0.12 * w;
    // ---- ice slab: ONE soft shape, bright top edge ----
    const thick = D + 0.35 * H;
    const xr = xb + 0.012 * w;
    ctx.beginPath();
    ctx.moveTo(xs, G(xs));
    for (let x = xs; x <= xr; x += 6) ctx.lineTo(x, G(x));
    ctx.lineTo(xr, G(xr) + thick);
    for (let x = xr; x >= xs; x -= 12) ctx.lineTo(x, G(x) + thick * (0.85 + 0.15 * ss(xs, xs + 0.06 * w, x)));
    ctx.lineTo(xs - 0.012 * w, G(xs) + 0.5 * thick);
    ctx.closePath();
    const ig = ctx.createLinearGradient(0, yP, 0, yF + thick);
    ig.addColorStop(0, rgba(P.ice, dark ? 0.18 : 0.16));
    ig.addColorStop(1, rgba(P.ice, dark ? 0.06 : 0.07));
    ctx.fillStyle = ig;
    ctx.fill();
    // bright top strip along the whole surface (the lit snow)
    ctx.beginPath();
    for (let x = xs; x <= xr; x += 6) x === xs ? ctx.moveTo(x, G(x)) : ctx.lineTo(x, G(x));
    for (let x = xr; x >= xs; x -= 6) ctx.lineTo(x, G(x) + 0.32 * H);
    ctx.closePath();
    ctx.fillStyle = rgba(P.edge, dark ? 0.13 : 0.12);
    ctx.fill();
    // slide lane: brighter band between the surface and the ledge
    ctx.beginPath();
    const xl0 = xL0, xl1 = xb + 0.008 * w;
    for (let x = xl0; x <= xl1; x += 6) x === xl0 ? ctx.moveTo(x, G(x)) : ctx.lineTo(x, G(x));
    for (let x = xl1; x >= xl0; x -= 6) ctx.lineTo(x, Wk(x));
    ctx.closePath();
    ctx.fillStyle = rgba(P.edge, dark ? 0.2 : 0.2);
    ctx.fill();
    // bright top edge
    ctx.strokeStyle = rgba(P.edge, dark ? 0.95 : 0.85);
    ctx.lineWidth = lw * 1.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (let x = xs; x <= xr; x += 6) x === xs ? ctx.moveTo(x, G(x)) : ctx.lineTo(x, G(x));
    ctx.stroke();
    // walking ledge: a subtle step line parallel to the slide lane
    ctx.strokeStyle = rgba(P.edge, dark ? 0.85 : 0.75);
    ctx.lineWidth = lw * 1.2;
    ctx.beginPath();
    for (let x = xl0; x <= xl1; x += 6) x === xl0 ? ctx.moveTo(x, Wk(x)) : ctx.lineTo(x, Wk(x));
    ctx.stroke();

    // ---- pool ----
    const dW = 0.75 * H;
    const xp0 = xb + 0.012 * w;
    ctx.beginPath();
    ctx.moveTo(xp0, wl(xb));
    for (let x = xb; x <= xp1; x += 8) ctx.lineTo(x, wl(x));
    ctx.quadraticCurveTo(xp1 + 0.01 * w, yW + dW * 0.2, xp1 - 0.05 * w, yW + dW);
    ctx.lineTo(xb + 0.04 * w, yW + dW);
    ctx.quadraticCurveTo(xp0, yW + dW * 0.8, xp0, wl(xb));
    ctx.closePath();
    const wg = ctx.createLinearGradient(0, yW - 4, 0, yW + dW);
    wg.addColorStop(0, rgba(P.water, dark ? 0.55 : 0.5));
    wg.addColorStop(1, rgba(P.water, dark ? 0.16 : 0.14));
    ctx.fillStyle = wg;
    ctx.fill();
    ctx.strokeStyle = rgba(P.waterTop, dark ? 0.95 : 0.9);
    ctx.lineWidth = lw * 1.3;
    ctx.beginPath();
    for (let x = xp0; x <= xp1; x += 8) x === xp0 ? ctx.moveTo(x, wl(x)) : ctx.lineTo(x, wl(x));
    ctx.stroke();

    // ---- snow ----
    const nf = Math.round(12 * snowAmt);
    for (let k = 0; k < nf; k++) {
      const sp = 10 + 8 * hash01(k, 3);
      const yy = mod(hash01(k, 1) * h + S.t * sp, h);
      const xx = hash01(k, 2) * w + Math.sin(S.t * 0.4 + k) * 8;
      const fade = Math.min(ss(0, 0.06 * h, yy), 1 - ss(0.9 * h, h, yy));
      ctx.beginPath();
      ctx.arc(xx, yy, 1.6 + 1.1 * hash01(k, 4), 0, TAU);
      ctx.fillStyle = rgba(P.snow, 0.55 * fade);
      ctx.fill();
    }

    // ---- chick ----
    if (chickOn) {
      const cx = xs + 0.045 * w, c = 0.4 * H;
      const q = S.t / 9 + 0.3, ph = (q - Math.floor(q)) * 9;
      const hop = ph < 0.5 ? Math.sin((ph / 0.5) * Math.PI) * 0.12 * H : 0;
      const kc = { main: mixHex(K0.main, K0.light, 0.55), light: K0.light, dark: K0.dark, accent: K0.accent, second: K0.second };
      at(ctx, cx, G(cx) - c * 0.5 - hop, 0.02 * Math.sin(S.b * 1.6), 1, 1, () => drawPenguin(ctx, kc, c, { fa: 0.1 * Math.sin(S.b * 2), blink: ph > 5 && ph < 5.15 }, dark));
    }

    // ---- penguins ----
    const items = itemsAt(L, sch, n, S.t);
    for (const o of items) {
      if (!slideOn && o.phase === "slide") {
        // waddle down the slope upright instead of lying down
        o.rot = 0.1 + 0.08 * Math.sin(o.a * 8);
        o.y = G(o.x) - 0.5 * H;
        o.fa = 0.2 + 0.25 * Math.sin(o.a * 8);
        o.step = o.a * 8;
        o.lie = false;
        o.pa = 0;
        o.feet = true;
      }
    }
    items.sort((p, q) => (p.phase === "climb" ? 0 : 1) - (q.phase === "climb" ? 0 : 1));
    for (const it of items) {
      const kk = S.kit(it.i);
      const K = dark ? kk : { main: mixHex(kk.main, kk.dark, 0.4), light: kk.light, dark: kk.dark, accent: shadeHex(kk.accent, 0.92), second: kk.second };
      const cyc = Math.floor((S.t - it.i * sch.S) / sch.Tl);
      const blink = it.blink || (hash01(it.i, 8, cyc) > 0.3 && mod(it.a, 6) < 0.15);
      const o = { ...it, blink };
      const paint = () => {
        const base = ctx.globalAlpha;
        if (it.pa < 0.999) {
          ctx.globalAlpha = base * (1 - it.pa);
          at(ctx, it.x, it.y, it.rot, it.face * it.sc, it.sc * it.sq, () => drawPenguin(ctx, K, H, o, dark));
        }
        if (it.pa > 0.001) {
          ctx.globalAlpha = base * it.pa;
          at(ctx, it.x, it.y, it.rp, it.face * it.sc, it.sc, () => drawProne(ctx, K, H, o, dark));
        }
        ctx.globalAlpha = base;
      };
      if (it.wet) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(-10, -10, w + 20, 10 + yW);
        ctx.clip();
        paint();
        ctx.restore();
        ctx.save();
        ctx.beginPath();
        ctx.rect(-10, yW, w + 20, h);
        ctx.clip();
        ctx.globalAlpha = 0.62;
        paint();
        ctx.restore();
      } else paint();
    }

    // ---- effects: snow spray behind sliders, splashes, landing puff ----
    const T1 = sch.Pd, T2 = T1 + SLD, T3 = T2 + POOL;
    for (const it of items) {
      const a = it.a;
      if (slideOn && a >= T1 + 0.2 && a < T2 + 0.5) {
        for (let k = 0; k < 6; k++) {
          const lag = 0.09 * (k + 1);
          const tk = a - lag;
          if (tk < T1 + 0.2 || tk > T2) continue;
          const u = (tk - T1) / SLD;
          const xk = lerp(xa, xb, 0.3 * u + 0.7 * u * u);
          const life = lag / 0.6;
          const px = xk - 0.03 * H * k - 0.05 * H;
          const py = G(xk) - 0.1 * H - 0.18 * H * life - 0.05 * H * hash01(k, 3);
          ctx.beginPath();
          ctx.arc(px, py, Math.max(1.6, (0.05 - 0.006 * k) * H), 0, TAU);
          ctx.fillStyle = rgba(P.snow, 0.8 * (1 - life));
          ctx.fill();
        }
      }
      splash(ctx, P.waterTop, H, xb + 0.1 * w, wl(xb + 0.1 * w) - 1, a - T2 - 0.45, 0.8, it.i * 7 + 1);
      const xj = xb + 0.17 * w;
      splash(ctx, P.waterTop, H, xj, wl(xj) - 1, a - (T2 + DIVE + TURN) - 0.1, 0.55, it.i * 7 + 3);
      const ag = a - T3;
      if (ag >= 0 && ag < 0.6) {
        const u = ag / 0.6;
        for (let k = 0; k < 4; k++) {
          const dir = k < 2 ? 1 : -1;
          ctx.beginPath();
          ctx.arc(L.xLand + dir * (0.1 + 0.12 * u * (1 + (k % 2))) * H, Wk(L.xLand) - 0.05 * H - 0.15 * H * u * (1 + 0.5 * (k % 2)), Math.max(1.5, 0.04 * H * (1 - u * 0.6)), 0, TAU);
          ctx.fillStyle = rgba(P.snow, 0.8 * (1 - u));
          ctx.fill();
        }
      }
    }
  },
};
