import { makeKit, TAU, clamp, clamp01, lerp, smoothstep, hash01, rgba, shadeHex, mixHex, poly, ellipse } from "../core/util.js";

// Minimal snake: a snake and an apple on empty backdrop. It follows an invisible Hamiltonian cycle (with safe
// shortcuts), gliding smoothly round every turn. The sim is incremental in S.memo and always equals a replay from t=0.
const DT = 0.16;        // seconds of S.t per move
const TRAIL_LIFE = 14;  // moves a vacated cell keeps its afterimage
// Bounded rounds prevent an hours-long replay after resize/settings changes.
// The last half-second fades out; the next round fades in from the same seed.
const ROUND_STEPS = 4096;
const ROUND_SECONDS = ROUND_STEPS * DT;

function makeCycle(cols, rows) {
  const order = [];
  for (let x = 0; x < cols; x++) order.push(x);
  for (let y = 1; y < rows; y++) {
    if (y & 1) for (let x = cols - 1; x >= 1; x--) order.push(y * cols + x);
    else for (let x = 1; x < cols; x++) order.push(y * cols + x);
  }
  for (let y = rows - 1; y >= 1; y--) order.push(y * cols);
  const idx = new Int32Array(cols * rows);
  order.forEach((c, k) => { idx[c] = k; });
  return { order, idx };
}

function newSim(cols, rows, i) {
  const N = cols * rows;
  const { order, idx } = makeCycle(cols, rows);
  const start = 3 + Math.floor(hash01(i, 70) * (N - 6));
  const sim = {
    cols, rows, N, order, idx, i,
    cap: clamp(Math.round(N * 0.3), 4, 30),
    segs: [order[start], order[start - 1], order[start - 2]],
    prev: [order[start - 1], order[start - 2], order[start - 3 + N * (start < 3 ? 1 : 0)] ?? order[start - 2]],
    k: 0, apples: 0, appleK: 0, trail: [], apple: -1,
  };
  sim.apple = pickApple(sim);
  return sim;
}

function pickApple(sim) {
  const occ = new Set(sim.segs);
  let c = Math.floor(hash01(sim.i, 71, sim.apples) * sim.N);
  for (let n = 0; n < sim.N; n++) {
    if (!occ.has(c)) return c;
    c = (c + 1) % sim.N;
  }
  return (sim.segs[0] + 1) % sim.N;
}

function step(sim) {
  const { cols, rows, N, idx, order } = sim;
  const head = sim.segs[0];
  const tail = sim.segs[sim.segs.length - 1];
  const hi = idx[head];
  const da = (idx[sim.apple] - hi + N) % N;
  const dt = (idx[tail] - hi + N) % N;
  let best = 1;
  if (sim.segs.length < N * 0.45) {
    const hx = head % cols, hy = (head / cols) | 0;
    for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
      const x = hx + dx, y = hy + dy;
      if (x < 0 || y < 0 || x >= cols || y >= rows) continue;
      const d = (idx[y * cols + x] - hi + N) % N;
      if (d >= 1 && d <= da && d < dt - 1 && d > best) best = d;
    }
  }
  const nh = order[(hi + best) % N];
  sim.prev = sim.segs.slice();
  const ns = [nh, ...sim.segs];
  const ate = nh === sim.apple;
  if (ate && sim.segs.length < sim.cap) {
    // grow: tail stays
  } else {
    const gone = ns.pop();
    sim.trail.push({ cell: gone, k: sim.k + 1 });
    if (sim.trail.length > TRAIL_LIFE + 2) sim.trail.shift();
  }
  // previous positions per new segment: each follows the one ahead; a grown tail stays put
  sim.prev = ns.map((_, j) => (j < sim.prev.length ? sim.prev[j] : sim.prev[sim.prev.length - 1]));
  sim.segs = ns;
  sim.k++;
  if (ate) { sim.apples++; sim.apple = pickApple(sim); sim.appleK = sim.k; }
}

function advance(sim, k) {
  // k is always within one bounded round; never render a partial replay.
  while (sim.k < k) step(sim);
}

function chaikin(pts, it) {
  for (let n = 0; n < it; n++) {
    const out = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    out.push(pts[pts.length - 1]);
    pts = out;
  }
  return pts;
}

function ribbonPoly(sp, half) {
  const n = sp.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = sp[Math.max(0, i - 1)], b = sp[Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    const hw = half(i / (n - 1));
    L.push([sp[i][0] - dy * hw, sp[i][1] + dx * hw]);
    R.push([sp[i][0] + dy * hw, sp[i][1] - dx * hw]);
  }
  return L.concat(R.reverse());
}

export default {
  id: "snake-game",
  name: "Snake",
  group: "play",
  blurb: "A little snake glides after an apple on an invisible grid, turning smoothly and never getting stuck.",
  motion: "stationary",
  count: { min: 0, max: 3, default: 1, noun: "Snake" },
  natural: [
    makeKit({ main: "#8fd23c", light: "#e4f8b6", dark: "#27440f", accent: "#ff5a4a", second: "#4fa24a" }),
    makeKit({ main: "#2fc0b4", light: "#c4f5ee", dark: "#0d3b3a", accent: "#ffb43c", second: "#2a8fa6" }),
    makeKit({ main: "#ff9a3c", light: "#ffe6b8", dark: "#5a2c06", accent: "#e8464f", second: "#d8662a" }),
    makeKit({ main: "#a07cf0", light: "#e6dcff", dark: "#2c1a5a", accent: "#ff7ab0", second: "#7a5ad0" }),
  ],
  atmosphere: "none",
  extras: [
    { key: "grid", type: "range", label: "Grid dots", min: 0, max: 1.5, step: 0.05, default: 0.5, help: "Sparse dots that hint at the invisible grid the snake moves on." },
    { key: "board", type: "range", label: "Board area", min: 0.6, max: 1.5, step: 0.05, default: 1, help: "How much of the stage the invisible play area covers: bigger means more cells to roam." },
    { key: "trail", type: "toggle", label: "Soft trail", default: true, help: "A fading afterimage where the tail has just been." },
  ],
  supports: { speed: true, size: true },
  labels: { speed: "Pace", size: "Size" },
  backdrop: { dark: "#0a120d", light: "#e8efe6" },
  draw(ctx, w, h, S) {
    const n = S.count | 0;
    if (n <= 0) return;
    const board = S.extra?.board ?? 1;
    const gridA = S.extra?.grid ?? 0.5;
    const trailOn = S.extra?.trail !== false;
    let c = clamp(S.min * 0.085 * S.size, 16, 110);
    const a = clamp(0.62 * board, 0.3, 0.94);
    let tc = Math.max(4, Math.floor((w * a) / c));
    let tr = Math.max(4, Math.floor((h * a) / c));
    let pc = tc, pr = tr, ox = 0, oy = 0, dx = 0, dy = 0;
    if (n > 1) {
      if (w >= h) { pc = Math.max(4, Math.floor((tc - (n - 1)) / n)); dx = (pc + 1) * c; }
      else { pr = Math.max(4, Math.floor((tr - (n - 1)) / n)); dy = (pr + 1) * c; }
    }
    pr &= ~1;
    if (pr < 4) pr = 4;
    const fit = Math.min(1, (w * 0.96) / (pc * c + dx * (n - 1)), (h * 0.96) / (pr * c + dy * (n - 1)));
    dx *= fit; dy *= fit; c *= fit;
    const totW = pc * c + dx * (n - 1), totH = pr * c + dy * (n - 1);
    ox = (w - totW) / 2; oy = (h - totH) / 2;

    const key = `${pc}|${pr}|${n}`;
    let M = S.memo.snk;
    if (!M || M.key !== key) M = S.memo.snk = { key, sims: [] };
    const round = Math.floor(S.t / ROUND_SECONDS);
    const phase = S.t - round * ROUND_SECONDS;
    const fade = (round ? smoothstep(0, 0.5, phase) : 1) * (1 - smoothstep(ROUND_SECONDS - 0.5, ROUND_SECONDS, phase));
    ctx.save();
    if (fade < 1) ctx.globalAlpha *= fade;
    const kf = phase / DT;
    const k = Math.max(0, Math.floor(kf));
    const fr = clamp01(kf - k);

    for (let i = 0; i < n; i++) {
      let sim = M.sims[i];
      if (!sim || sim.k > k) sim = M.sims[i] = newSim(pc, pr, i);
      advance(sim, k);
      const kit = S.kit(i);
      const bx = ox + dx * i, by = oy + dy * i;
      const P = (cell) => [bx + ((cell % sim.cols) + 0.5) * c, by + (((cell / sim.cols) | 0) + 0.5) * c];

      // sparse grid dots
      if (gridA > 0.02) {
        ctx.fillStyle = rgba(kit.second, clamp01(0.5 * gridA));
        const r = Math.max(2.2, c * 0.075);
        for (let y = 0; y < sim.rows; y += 2) {
          for (let x = 0; x < sim.cols; x += 2) {
            ellipse(ctx, bx + (x + 0.5) * c, by + (y + 0.5) * c, r, r);
            ctx.fill();
          }
        }
      }

      // soft afterimage
      if (trailOn) {
        for (const t of sim.trail) {
          const age = (k + fr - t.k) / TRAIL_LIFE;
          if (age <= 0 || age >= 1) continue;
          const p = P(t.cell);
          ctx.fillStyle = rgba(kit.second, 0.42 * (1 - age) * (1 - age));
          ellipse(ctx, p[0], p[1], c * 0.3, c * 0.3);
          ctx.fill();
        }
      }

      // apple
      {
        const ap = P(sim.apple);
        const born = smoothstep(0, 0.45, (k - sim.appleK + fr) * DT);
        const pulse = 1 + 0.05 * Math.sin(S.b * 2.2 + i);
        const r = c * 0.34 * born * pulse;
        ctx.fillStyle = kit.accent;
        ellipse(ctx, ap[0] - r * 0.22, ap[1] + r * 0.1, r * 0.95, r);
        ctx.fill();
        ellipse(ctx, ap[0] + r * 0.22, ap[1] + r * 0.1, r * 0.95, r);
        ctx.fill();
        ctx.fillStyle = kit.second;
        ctx.save();
        ctx.translate(ap[0] + r * 0.35, ap[1] - r * 0.95);
        ctx.rotate(-0.5);
        ellipse(ctx, 0, 0, r * 0.6, r * 0.28);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = kit.second;
        ctx.lineWidth = Math.max(2, c * 0.06);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(ap[0], ap[1] - r * 0.7);
        ctx.lineTo(ap[0] - r * 0.05, ap[1] - r * 1.15);
        ctx.stroke();
      }

      // snake body
      const raw = sim.segs.map((cell, j) => {
        const q = P(cell), p0 = P(sim.prev[j]);
        return [lerp(p0[0], q[0], fr), lerp(p0[1], q[1], fr)];
      });
      const sp = chaikin(raw, 2);
      const rib = ribbonPoly(sp, (s) => c * (0.36 - 0.2 * Math.pow(s, 1.1)));
      poly(ctx, rib);
      ctx.fillStyle = kit.main;
      ctx.fill();
      // stripe
      ctx.strokeStyle = rgba(kit.light, 0.75);
      ctx.lineWidth = Math.max(2.5, c * 0.12);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      const s0 = Math.floor(sp.length * 0.14), s1 = Math.floor(sp.length * 0.86);
      for (let j = s0; j <= s1; j++) j === s0 ? ctx.moveTo(sp[j][0], sp[j][1]) : ctx.lineTo(sp[j][0], sp[j][1]);
      ctx.stroke();

      // head
      const hp = raw[0], nk = raw[Math.min(1, raw.length - 1)];
      let hx = hp[0] - nk[0], hy = hp[1] - nk[1];
      const hl = Math.hypot(hx, hy) || 1;
      hx /= hl; hy /= hl;
      const px = -hy, py = hx;
      const tl = Math.max(0, Math.sin(S.b * 2.1 + i * 1.7)) ** 2 * c * 0.5;
      if (tl > 1) {
        ctx.strokeStyle = kit.accent;
        ctx.lineWidth = Math.max(2, c * 0.06);
        ctx.beginPath();
        const tx = hp[0] + hx * c * 0.4, ty = hp[1] + hy * c * 0.4;
        const ex = hp[0] + hx * (c * 0.4 + tl), ey = hp[1] + hy * (c * 0.4 + tl);
        ctx.moveTo(tx, ty);
        ctx.lineTo(ex, ey);
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex + hx * c * 0.1 + px * c * 0.1, ey + hy * c * 0.1 + py * c * 0.1);
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex + hx * c * 0.1 - px * c * 0.1, ey + hy * c * 0.1 - py * c * 0.1);
        ctx.stroke();
      }
      ctx.fillStyle = kit.main;
      ellipse(ctx, hp[0] + hx * c * 0.08, hp[1] + hy * c * 0.08, c * 0.46, c * 0.4, Math.atan2(hy, hx));
      ctx.fill();
      for (const sd of [-1, 1]) {
        const ex = hp[0] + hx * c * 0.14 + px * sd * c * 0.19, ey = hp[1] + hy * c * 0.14 + py * sd * c * 0.19;
        ctx.fillStyle = kit.light;
        ellipse(ctx, ex, ey, c * 0.13, c * 0.13);
        ctx.fill();
        ctx.fillStyle = shadeHex(kit.main, 0.3);
        ellipse(ctx, ex + hx * c * 0.04, ey + hy * c * 0.04, c * 0.065, c * 0.065);
        ctx.fill();
      }
    }
    ctx.restore();
  },
};
