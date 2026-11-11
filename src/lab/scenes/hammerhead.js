import { placeAtDepth } from "../core/depth.js";
import { makeKit, TAU, clamp, lerp, fract, roam, poly, curve, ribbon, ellipse, hash01, noise1, rgba, mixHex } from "../core/util.js";

// Hammerheads circling a bait ball, seen from above. Local shark frame: the
// spine runs from the nose (s = 0) to the tail tip (s = 1); L is body length.
// The body swims with a travelling S-wave on the articulation clock. The bait
// ball is a mill of small silver fish on closed orbits around a slowly drifting
// centre; fish near a shark's head are pushed aside, so a pass tears a hole in
// the ball that closes again behind it. Everything is a pure function of time.

const N = 16;

function ballCentre(t, w, h, flow) {
  const r = roam(0, t, w, h, { rate: 0.035, ax: 0.08 + 0.05 * flow, ay: 0.06 + 0.04 * flow, cx: 0.5, cy: 0.52, seed: 31 });
  return [r.x, r.y];
}

// Where shark i is at time t. Circling sharks orbit the ball and every so
// often swing in close for a pass; free sharks (no ball, or far away) roam.
function sharkAt(i, t, w, h, c) {
  if (!c.circle) {
    const r = roam(i, t, w, h, { rate: 0.05 + 0.02 * hash01(i, 4), ax: c.ax, ay: c.ay, seed: 17 });
    return [r.x, r.y];
  }
  const [bx, by] = ballCentre(t, w, h, c.flow);
  // Everyone circles the same way, evenly spaced, so they never cross.
  const th = 0.7 + (i * TAU) / c.n + c.omega * t;
  // A pass: once every ~18-26 s the orbit swings in through the ball.
  const P = 18 + 8 * hash01(i, 5);
  const q = fract(t / P + hash01(i, 6));
  // The dip is spread over about a third of the cycle, so the shark curves in
  // across the ball and back out instead of darting in and reversing.
  const pass = q > 0.32 && q < 0.68 ? 0.5 - 0.5 * Math.cos((TAU * (q - 0.32)) / 0.36) : 0;
  let r = c.orbit * (1 + 0.12 * Math.sin(0.23 * t + hash01(i, 7) * TAU)) * (1 - 0.6 * pass);
  const rx = Math.max(c.rb * 0.6, Math.min(r, bx - c.margin, w - bx - c.margin)),
    ry = Math.max(c.rb * 0.6, Math.min(r * 0.86, by - c.margin, h - by - c.margin));
  return [bx + rx * Math.cos(th), by + ry * Math.sin(th)];
}

function pose(i, t, w, h, c) {
  const d = 0.15;
  const a = sharkAt(i, t - d, w, h, c),
    m = sharkAt(i, t, w, h, c),
    e = sharkAt(i, t + d, w, h, c);
  const h0 = Math.atan2(m[1] - a[1], m[0] - a[0]),
    h1 = Math.atan2(e[1] - m[1], e[0] - m[0]);
  let dh = h1 - h0;
  dh = ((dh + Math.PI * 3) % TAU) - Math.PI;
  return { x: m[0], y: m[1], hd: Math.atan2(e[1] - a[1], e[0] - a[0]), turn: clamp(dh / d, -1.2, 1.2) };
}

// Half width of the body at s: a narrow neck under the hammer, the widest
// point just behind the pectorals, then a long taper into the tail.
function halfWidth(s, L) {
  if (s > 0.86) return L * lerp(0.012, 0.003, (s - 0.86) / 0.14);
  const u = Math.pow(Math.min(1, s / 0.9), 0.72);
  return L * Math.max(0.012, 0.07 * Math.pow(Math.sin(Math.PI * u), 1.15));
}

function spineOf(p, L, S, i, amp) {
  const ch = Math.cos(p.hd),
    sh = Math.sin(p.hd);
  const om = TAU * (0.55 + 0.12 * hash01(i, 8));
  const bend = clamp(p.turn * 0.14, -0.16, 0.16);
  const sp = [];
  for (let k = 0; k < N; k++) {
    const s = k / (N - 1);
    const ly = L * amp * (0.012 + 0.085 * Math.pow(s, 1.7)) * Math.sin(om * S.b - TAU * 0.8 * s + hash01(i, 9) * TAU) + bend * s * s * L;
    const lx = L * (0.4 - s);
    sp.push([p.x + ch * lx - sh * ly, p.y + sh * lx + ch * ly]);
  }
  return sp;
}

function drawShark(ctx, kit, sp, L) {
  const dir = (k) => {
    const a = sp[Math.max(0, k - 1)],
      b = sp[Math.min(N - 1, k + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(a[0] - b[0]) / len, (a[1] - b[1]) / len]; // towards the nose
  };
  const nrm = (d) => [-d[1], d[0]];
  const at = (k, f, l) => {
    const d = dir(k),
      n = nrm(d);
    return [sp[k][0] + d[0] * f * L + n[0] * l * L, sp[k][1] + d[1] * f * L + n[1] * l * L];
  };
  const fin = mixHex(kit.second, kit.dark, 0.15);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // pectoral fins: long, swept back
  const kp = Math.round(0.3 * (N - 1));
  for (const side of [1, -1]) {
    const hw = halfWidth(kp / (N - 1), L) / L;
    poly(ctx, [at(kp, 0.03, side * hw * 0.8), at(kp, -0.12, side * (hw + 0.13)), at(kp, -0.1, side * (hw + 0.1)), at(kp, -0.06, side * hw * 0.8)]);
    ctx.fillStyle = fin;
    ctx.fill();
  }
  // pelvic fins
  const kv = Math.round(0.63 * (N - 1));
  for (const side of [1, -1]) {
    const hw = halfWidth(kv / (N - 1), L) / L;
    poly(ctx, [at(kv, 0.01, side * hw * 0.7), at(kv, -0.05, side * (hw + 0.04)), at(kv, -0.04, side * hw * 0.7)]);
    ctx.fillStyle = fin;
    ctx.fill();
  }
  // lower tail lobe, slightly to one side of the long upper lobe
  const kt = Math.round(0.87 * (N - 1));
  poly(ctx, [at(kt, 0.02, 0.004), at(kt, -0.07, 0.045), at(kt, -0.035, 0.008)]);
  ctx.fillStyle = fin;
  ctx.fill();

  // body
  curve(ctx, ribbon(sp, (s) => halfWidth(s, L)), true);
  ctx.fillStyle = kit.main;
  ctx.fill();
  // darker back with a pale edge where the flanks catch the light
  curve(ctx, ribbon(sp.slice(1, N - 2), (s) => halfWidth(s * 0.8 + 0.05, L) * 0.42), true);
  ctx.fillStyle = mixHex(kit.main, kit.dark, 0.35);
  ctx.fill();
  curve(ctx, ribbon(sp, (s) => halfWidth(s, L) * 0.86), true);
  ctx.strokeStyle = rgba(kit.light, 0.55);
  ctx.lineWidth = Math.max(1, L * 0.008);
  ctx.stroke();
  // first dorsal fin, seen edge-on from above
  curve(ctx, [at(Math.round(0.28 * (N - 1)), 0.01, 0), at(Math.round(0.34 * (N - 1)), 0, 0.006), at(Math.round(0.42 * (N - 1)), 0, 0.012)]);
  ctx.strokeStyle = rgba(mixHex(kit.light, "#ffffff", 0.3), 0.9);
  ctx.lineWidth = Math.max(1.2, L * 0.016);
  ctx.stroke();

  // the hammer (cephalofoil): wide, slightly swept, notched in the middle
  const H = 0.135;
  const half = [[0.03, 0], [0.048, 0.035], [0.042, 0.085], [0.026, 0.118], [0.004, H], [-0.022, H - 0.004], [-0.032, 0.1], [-0.04, 0.05], [-0.05, 0.02]];
  const outline = half.map(([f, l]) => at(0, f - 0.01, l)).concat(half.slice().reverse().map(([f, l]) => at(0, f - 0.01, -l)));
  curve(ctx, outline, true);
  ctx.fillStyle = mixHex(kit.main, kit.light, 0.12);
  ctx.fill();
  ctx.strokeStyle = rgba(kit.light, 0.85);
  ctx.lineWidth = Math.max(1.2, L * 0.012);
  ctx.stroke();
  for (const side of [1, -1]) {
    const e = at(0, -0.01, side * (H - 0.012));
    ellipse(ctx, e[0], e[1], L * 0.015, L * 0.015);
    ctx.fillStyle = kit.dark;
    ctx.fill();
    ellipse(ctx, e[0], e[1], L * 0.007, L * 0.007);
    ctx.fillStyle = rgba(kit.light, 0.9);
    ctx.fill();
  }
}

// One bait fish: a slim silver body with a tail tick. flash makes it glint as
// its flank turns to the light.
function drawBait(ctx, x, y, hd, len, base, flash, a) {
  const ch = Math.cos(hd),
    sh = Math.sin(hd);
  const col = mixHex(base, "#ffffff", 0.15 + 0.55 * flash);
  ctx.globalAlpha = a;
  ellipse(ctx, x, y, len * 0.5, len * 0.16, hd);
  ctx.fillStyle = col;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - ch * len * 0.42, y - sh * len * 0.42);
  ctx.lineTo(x - ch * len * 0.72 - sh * len * 0.14, y - sh * len * 0.72 + ch * len * 0.14);
  ctx.moveTo(x - ch * len * 0.42, y - sh * len * 0.42);
  ctx.lineTo(x - ch * len * 0.72 + sh * len * 0.14, y - sh * len * 0.72 - ch * len * 0.14);
  ctx.strokeStyle = col;
  ctx.lineWidth = Math.max(1, len * 0.09);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export default {
  id: "hammerhead",
  name: "Hammerhead and bait ball",
  group: "ocean",
  blurb: "Hammerheads circle a swirling ball of silver fish and now and then cut straight through it.",
  motion: "travel",
  count: { min: 0, max: 4, default: 2, noun: "Hammerhead" },
  natural: [
    makeKit({ main: "#7d8c94", light: "#dfe8ec", dark: "#26313a", accent: "#c8d8e0", second: "#66767f" }),
    makeKit({ main: "#8b8576", light: "#ece4d2", dark: "#2f2b24", accent: "#d8cdb3", second: "#726c5f" }),
    makeKit({ main: "#6e8496", light: "#dbe7f1", dark: "#1f2c38", accent: "#bcd2e3", second: "#5b6f80" }),
  ],
  flow: { label: "Current", help: "How far the current carries the bait ball around.", default: 1, min: 0, max: 1.5 },
  extras: [
    { key: "ball", type: "toggle", label: "Bait ball", default: true, help: "A ball of small fish the sharks circle. Off, the sharks just cruise." },
    { key: "bait", type: "range", label: "Bait fish", min: 12, max: 90, step: 1, default: 40, help: "How many fish are in the bait ball." },
    { key: "scatter", type: "range", label: "Scatter", min: 0, max: 1.5, step: 0.05, default: 1, help: "How far the ball parts when a shark swims through." },
  ],
  backdrop: { dark: "#06141d", light: "#e1ecef" },
  draw(ctx, w, h, S) {
    const flow = S.flow == null ? 1 : S.flow;
    const ex = S.extra || {};
    const ball = ex.ball !== false;
    const nBait = ball ? Math.round(clamp(ex.bait ?? 40, 12, 90)) : 0;
    const scatter = clamp(ex.scatter ?? 1, 0, 1.5);
    const rb = 0.15 * S.min * Math.sqrt(nBait / 48) * (0.8 + 0.2 * S.size);
    const L0 = S.min * S.size * 0.34;
    const c = {
      flow,
      n: Math.max(1, S.count),
      omega: 0.28,
      rb,
      orbit: rb + L0 * 0.75,
      margin: L0 * 0.6 + 6,
      ax: clamp(0.48 - (L0 * 0.6 + 8) / w, 0.05, 0.4),
      ay: clamp(0.48 - (L0 * 0.6 + 8) / h, 0.05, 0.4),
    };

    // Shark poses first: the ball needs to know where the heads are.
    const sharks = [];
    for (let i = 0; i < S.count; i++) {
      const d = placeAtDepth(ctx, S, i);
      const circle = ball && d.D.layer !== "far";
      const L = d.S.min * d.S.size * 0.34 * (0.94 + 0.12 * hash01(i, 1));
      const p = pose(i, d.S.t, w, h, { ...c, circle });
      const sp = spineOf(p, L, d.S, i, 1 + 0.12 * Math.min(1, Math.abs(p.turn)));
      sharks.push({ i, d, L, p, sp });
    }
    const draw = (sh) => drawShark(sh.d.ctx, sh.d.S.kit(sh.i), sh.sp, sh.L);
    for (const sh of sharks) if (sh.d.D.layer === "far") draw(sh);

    if (nBait) {
      const [bx, by] = ballCentre(S.t, w, h, flow);
      const base = mixHex(S.kit(0).light, "#cfe3ec", 0.55);
      const len = Math.max(7, S.min * 0.024 * (0.85 + 0.3 * S.size));
      const heads = sharks.filter((s) => s.d.D.layer !== "far").map((s) => [s.sp[0][0], s.sp[0][1], s.L]);
      for (let j = 0; j < nBait; j++) {
        // A mill: evenly spaced rings (a sunflower layout), every fish
        // orbiting the same way. Inner rings turn faster, so the ball swirls
        // and shears without fish piling onto each other.
        const ring = Math.sqrt((j + 0.5) / nBait);
        const rho = rb * (0.12 + 0.88 * ring) * (1 + 0.06 * Math.sin(S.t * 0.4 + j));
        const om = 0.75 - 0.4 * ring;
        const phi = j * 2.399963229728653 + om * S.t;
        let x = bx + rho * Math.cos(phi) + noise1(S.t * 0.5 + j * 3.1, j) * rb * 0.035,
          y = by + rho * Math.sin(phi) * 0.86 + noise1(S.t * 0.45 + j * 1.7, j + 40) * rb * 0.035;
        let hd = phi + Math.PI / 2;
        // Panic: pushed straight away from any shark head that comes close.
        for (const [hx, hy, L] of heads) {
          const dx = x - hx,
            dy = y - hy,
            dist = Math.hypot(dx, dy) || 1;
          const R = (rb * 0.55 + L * 0.22) * scatter;
          if (dist < R) {
            const k = (R - dist) / R;
            x += (dx / dist) * (R - dist) * 0.9;
            y += (dy / dist) * (R - dist) * 0.9;
            hd = Math.atan2(Math.sin(hd) * (1 - k) + (dy / dist) * k, Math.cos(hd) * (1 - k) + (dx / dist) * k);
          }
        }
        const flash = Math.max(0, Math.cos(2 * phi + S.b * 0.6 + j * 0.7));
        drawBait(ctx, x, y, hd, len, base, flash, 0.78 + 0.22 * hash01(j, 64));
      }
    }
    for (const sh of sharks) if (sh.d.D.layer === "mid") draw(sh);
    for (const sh of sharks) if (sh.d.D.layer === "near") draw(sh);
  },
};
