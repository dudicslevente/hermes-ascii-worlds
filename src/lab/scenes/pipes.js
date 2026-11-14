import { makeKit, TAU, clamp, lerp, mod, smoothstep, hash01, rgba, shadeHex, mixHex } from "../core/util.js";

// Pipes: two metal pipes with bolted collars carry liquid and rings of air to
// an outlet. One pipe falls into a pool, the other throws a jet into it. The
// liquid, the stream, the jet and the pool all take the colour kit, so any
// colour mode recolours the whole scene. Everything is a pure function of the
// two clocks (S.t travel, S.b articulation): bubbles, spray, ripples and drips
// are deterministic cycles, so no state is kept.

const REF = 742; // reference stage height the proportions were drawn at

// ---- geometry --------------------------------------------------------------
const norm2 = (x, y) => {
  const l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
};

// A pipe centre line through waypoints with circular elbows, resampled every
// 2 px. at(s) returns position, tangent and normal by arclength.
class Pipe {
  constructor(way, r, wOut, wIn, capY) {
    const raw = [],
      marks = [];
    let s = 0,
      prev = way[0];
    raw.push(way[0]);
    for (let i = 1; i < way.length - 1; i++) {
      const P = way[i],
        a = way[i - 1],
        b = way[i + 1];
      const di = norm2(P[0] - a[0], P[1] - a[1]),
        dout = norm2(b[0] - P[0], b[1] - P[1]);
      const A = [P[0] - di[0] * r, P[1] - di[1] * r],
        B = [P[0] + dout[0] * r, P[1] + dout[1] * r];
      const C = [A[0] + dout[0] * r, A[1] + dout[1] * r];
      const sg = di[0] * dout[1] - di[1] * dout[0] > 0 ? 1 : -1;
      s += Math.hypot(A[0] - prev[0], A[1] - prev[1]);
      marks.push(s);
      s += (Math.PI * r) / 2;
      marks.push(s);
      const v0 = [A[0] - C[0], A[1] - C[1]];
      for (let k = 0; k <= 28; k++) {
        const th = sg * (k / 28) * (Math.PI / 2);
        raw.push([C[0] + v0[0] * Math.cos(th) - v0[1] * Math.sin(th), C[1] + v0[0] * Math.sin(th) + v0[1] * Math.cos(th)]);
      }
      prev = B;
    }
    raw.push(way[way.length - 1]);
    const cum = [0];
    for (let i = 1; i < raw.length; i++) cum.push(cum[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
    this.L = cum[cum.length - 1];
    this.pts = [];
    let j = 0;
    for (let d = 0; d <= this.L; d += 2) {
      while (j < raw.length - 2 && cum[j + 1] < d) j++;
      const t = (d - cum[j]) / (cum[j + 1] - cum[j] || 1);
      this.pts.push({ x: raw[j][0] + (raw[j + 1][0] - raw[j][0]) * t, y: raw[j][1] + (raw[j + 1][1] - raw[j][1]) * t });
    }
    const n = this.pts.length;
    for (let k = 0; k < n; k++) {
      const a = this.pts[Math.max(0, k - 1)],
        b = this.pts[Math.min(n - 1, k + 1)],
        t = norm2(b.x - a.x, b.y - a.y);
      this.pts[k].tx = t[0];
      this.pts[k].ty = t[1];
    }
    this.marks = marks;
    this.wOut = wOut;
    this.wIn = wIn;
    this.hw = wIn / 2;
    this.capY = capY;
    this.sStart = capY - way[0][1];
  }
  at(s) {
    const f = clamp(s / 2, 0, this.pts.length - 1.001),
      i = Math.floor(f),
      t = f - i,
      a = this.pts[i],
      b = this.pts[i + 1];
    const tx = a.tx + (b.tx - a.tx) * t,
      ty = a.ty + (b.ty - a.ty) * t;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, tx, ty, nx: -ty, ny: tx };
  }
}

function layout(w, h, min, size) {
  const wOut = 0.115 * min * size,
    wIn = wOut * 0.74;
  const r = Math.min(0.12 * w, 0.165 * h, Math.max(0.115 * min, wOut * 0.62));
  const cap = h * 0.055,
    top = -0.05 * h;
  const A = new Pipe([[0.12 * w, top], [0.12 * w, 0.27 * h], [0.36 * w, 0.27 * h], [0.36 * w, 0.6 * h]], r, wOut, wIn, cap);
  const B = new Pipe([[0.86 * w, top], [0.86 * w, 0.14 * h], [0.62 * w, 0.14 * h], [0.62 * w, 0.52 * h], [0.8 * w, 0.52 * h]], r, wOut, wIn, cap);
  return { A, B, wOut, yp: h * 0.865 };
}

// ---- drawing helpers -------------------------------------------------------
function polyOff(ctx, P, lat, s0, s1, step) {
  ctx.beginPath();
  for (let s = s0, f = true; s <= s1; s += step) {
    const q = P.at(s),
      px = q.x + q.nx * lat,
      py = q.y + q.ny * lat;
    if (f) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
    f = false;
  }
}
function line(ctx, P, lat, lw, col, a = 1) {
  polyOff(ctx, P, lat, 0, P.L, 6);
  ctx.lineWidth = Math.max(0.2, lw);
  ctx.strokeStyle = col;
  ctx.globalAlpha = a;
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.globalAlpha = 1;
}
function ring(ctx, x, y, r, a = 1) {
  r = Math.max(0.3, r);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = `rgba(205,238,255,${0.12 * a})`;
  ctx.fill();
  ctx.lineWidth = Math.max(1.3, r * 0.2);
  ctx.strokeStyle = `rgba(240,252,255,${0.95 * a})`;
  ctx.stroke();
  if (r > 4.5) {
    ctx.beginPath();
    ctx.arc(x, y, r * 0.66, Math.PI * 1.08, Math.PI * 1.58);
    ctx.lineWidth = Math.max(1.2, r * 0.17);
    ctx.strokeStyle = `rgba(255,255,255,${a})`;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + r * 0.4, y + r * 0.36, Math.max(0.8, r * 0.1), 0, TAU);
    ctx.fillStyle = `rgba(255,255,255,${0.8 * a})`;
    ctx.fill();
  }
}

// One kit becomes the liquid's five tones.
function tones(k, dark) {
  // On a light page the liquid is inked darker so it reads against the paper.
  if (!dark)
    return {
      deep: shadeHex(k.main, 0.4),
      mid: shadeHex(k.main, 0.66),
      light: shadeHex(k.main, 0.92),
      hi: mixHex(k.main, k.light, 0.5),
      cav: shadeHex(k.main, 0.28),
      splash: shadeHex(k.main, 0.7),
      accent: shadeHex(k.accent, 0.8),
    };
  return {
    deep: shadeHex(k.main, 0.62),
    mid: k.main,
    light: mixHex(k.main, k.light, 0.45),
    hi: k.light,
    cav: k.dark,
    splash: mixHex(k.light, k.main, 0.3),
    accent: k.accent,
  };
}
// Metal: bright steel on dark, dark steel on light.
const METAL = {
  dark: { out: "#34475c", body: "#8496ac", inner: "#b3c2d3", hi: "#f4f8fc", lo: "#52657b", cavRim: "#0a1620" },
  light: { out: "#1b2735", body: "#4a5d75", inner: "#6d829b", hi: "#aebdcf", lo: "#243345", cavRim: "#0f1b27" },
};

function collar(ctx, P, s, mouth, e) {
  const q = P.at(s),
    a = Math.atan2(q.ty, q.tx);
  const hl = (mouth ? 12 : 9.5) * e,
    hw = P.wOut / 2 + (mouth ? 12 : 8) * e;
  ctx.save();
  ctx.translate(q.x, q.y);
  ctx.rotate(a);
  ctx.fillStyle = "#0b1118";
  ctx.fillRect(-hl - 3 * e, -hw - 3 * e, 2 * hl + 6 * e, 2 * hw + 6 * e);
  ctx.fillStyle = "#7a899c";
  ctx.fillRect(-hl, -hw, 2 * hl, 2 * hw);
  ctx.fillStyle = "#cfd9e5";
  ctx.fillRect(-hl, -hw, hl * 0.7, 2 * hw);
  ctx.fillStyle = "#47546a";
  ctx.fillRect(hl * 0.35, -hw, hl * 0.65, 2 * hw);
  ctx.fillStyle = "#dfe7f0";
  ctx.globalAlpha = 0.9;
  for (const sg of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(0, sg * (hw - 4.5 * e), 2.4 * e, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#0f161e";
  ctx.lineWidth = 1.2 * e;
  ctx.beginPath();
  ctx.moveTo(-hl * 0.1, -hw + e);
  ctx.lineTo(-hl * 0.1, hw - e);
  ctx.stroke();
  ctx.restore();
}

function valve(ctx, vx, vy, e, acc) {
  ctx.fillStyle = "#18212b";
  ctx.fillRect(vx - 20 * e, vy - 26 * e, 40 * e, 28 * e);
  ctx.fillStyle = "#6c7b8f";
  ctx.fillRect(vx - 18 * e, vy - 24 * e, 36 * e, 24 * e);
  ctx.fillStyle = "#c6d1de";
  ctx.fillRect(vx - 18 * e, vy - 24 * e, 10 * e, 24 * e);
  ctx.fillStyle = "#9aa8b9";
  ctx.fillRect(vx - 4 * e, vy - 52 * e, 8 * e, 28 * e);
  const wy = vy - 74 * e;
  ctx.strokeStyle = acc;
  ctx.lineWidth = 6 * e;
  ctx.beginPath();
  ctx.arc(vx, wy, 24 * e, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = shadeHex(acc, 1.45);
  ctx.lineWidth = 2 * e;
  ctx.beginPath();
  ctx.arc(vx, wy, 24 * e, Math.PI * 1.05, Math.PI * 1.6);
  ctx.stroke();
  ctx.strokeStyle = shadeHex(acc, 0.8);
  ctx.lineWidth = 4 * e;
  for (let k = 0; k < 3; k++) {
    const a = (k * Math.PI) / 3 + 0.3;
    ctx.beginPath();
    ctx.moveTo(vx + Math.cos(a) * 24 * e, wy + Math.sin(a) * 24 * e);
    ctx.lineTo(vx - Math.cos(a) * 24 * e, wy - Math.sin(a) * 24 * e);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(vx, wy, 6 * e, 0, TAU);
  ctx.fillStyle = "#e9eef4";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(vx, wy, 2.4 * e, 0, TAU);
  ctx.fillStyle = "#4b5868";
  ctx.fill();
}

function gaugeBody(ctx, g, stemLen, e) {
  ctx.fillStyle = "#18212b";
  ctx.fillRect(g.x + g.r - 2 * e, g.y - 7 * e, stemLen + 2 * e, 14 * e);
  ctx.fillStyle = "#8795a8";
  ctx.fillRect(g.x + g.r, g.y - 5 * e, stemLen, 10 * e);
  ctx.beginPath();
  ctx.arc(g.x, g.y, g.r + 6 * e, 0, TAU);
  ctx.fillStyle = "#18212b";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(g.x, g.y, g.r + 4 * e, 0, TAU);
  ctx.fillStyle = "#b7c3d1";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(g.x, g.y, g.r - e, 0, TAU);
  ctx.fillStyle = "#0c2a39";
  ctx.fill();
  ctx.strokeStyle = "#e6f2fb";
  ctx.lineWidth = 1.6 * e;
  for (let k = 0; k <= 10; k++) {
    const a = Math.PI * (0.75 + k * 0.15),
      r1 = g.r - 3 * e,
      r2 = g.r - (k % 5 === 0 ? 9 : 6) * e;
    ctx.beginPath();
    ctx.moveTo(g.x + Math.cos(a) * r1, g.y + Math.sin(a) * r1);
    ctx.lineTo(g.x + Math.cos(a) * r2, g.y + Math.sin(a) * r2);
    ctx.stroke();
  }
}

// ---- the scene --------------------------------------------------------------
const PERIODS = [3.1, 4.3, 3.6]; // drip cycle seconds

export default {
  id: "pipes",
  name: "Pipes",
  group: "quiet",
  blurb: "Liquid and bubbles are pushed through bolted pipes into a pool.",
  motion: "travel",
  count: { min: 0, max: 2, default: 2, noun: "Pipe" },
  natural: [
    makeKit({ main: "#1b86d6", light: "#c4eeff", dark: "#06202f", accent: "#e0583c", second: "#3eaef0" }),
    makeKit({ main: "#1f9ed8", light: "#cdf3ff", dark: "#062433", accent: "#e8743c", second: "#4cc0f2" }),
  ],
  atmosphere: "none",
  flow: {
    label: "Pressure",
    help: "How hard the liquid is pushed: the jet, the spray and the gauge.",
    default: 1,
    min: 0,
    max: 1.5,
  },
  extras: [
    {
      key: "bubbles",
      type: "range",
      label: "Bubbles",
      min: 0,
      max: 1.5,
      step: 0.05,
      default: 1,
      help: "How many bubbles ride in the liquid. 0 gives clear liquid.",
    },
    {
      key: "fittings",
      type: "toggle",
      label: "Valve and gauge",
      default: true,
      help: "A valve wheel on the left pipe and a pressure gauge on the right pipe.",
    },
  ],
  labels: { size: "Pipe size", count: "Pipes" },
  backdrop: { dark: "#07121b", light: "#eef2f5" },
  draw(ctx, w, h, S) {
    const n = S.count,
      min = S.min,
      sc = clamp(min / REF, 0.4, 2),
      e = sc * S.size;
    const key = `${w}|${h}|${S.size}`;
    let G = S.memo && S.memo.pipesLayout && S.memo.pipesLayout.key === key ? S.memo.pipesLayout : null;
    if (!G) {
      G = { key, ...layout(w, h, min, S.size) };
      if (S.memo) S.memo.pipesLayout = G;
    }
    const { A, B, yp } = G;
    const pipes = [A, B].slice(0, n);
    const press = S.flow === undefined ? 1 : S.flow;
    const bub = S.extra && S.extra.bubbles !== undefined ? S.extra.bubbles : 1;
    const fit = !(S.extra && S.extra.fittings === false);
    const dark = S.dark !== false;
    const k0 = S.kit(0),
      k1 = S.kit(1);
    const tn = [tones(k0, dark), tones(k1, dark)];
    const M = dark ? METAL.dark : METAL.light;
    const ink = (a) => (dark ? `rgba(235,250,255,${a})` : rgba(tn[0].mid, a));
    const crest = dark ? k0.light : shadeHex(k0.main, 0.5);
    const t = S.t,
      b = S.b;
    const yw = (x, off = 0) => yp + off + (4 * Math.sin(x * 0.02 / sc + b * 1.6) + 2.6 * Math.sin(x * 0.047 / sc - b * 1.1) + 1.4 * Math.sin(x * 0.11 / sc + b * 2.3)) * sc;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // ---- wall: sparse tile-corner crosses, tinted by the liquid -------------
    {
      const T0 = h * 0.2;
      ctx.strokeStyle = dark ? rgba(k0.light, 0.5) : rgba(shadeHex(k0.main, 0.6), 0.45);
      ctx.lineWidth = 1.7 * sc;
      for (let ty = 0; ty < h / T0 + 1; ty++) {
        const off = ty & 1 ? T0 / 2 : 0;
        for (let tx = -1; tx < w / T0 + 1; tx++) {
          const cx = tx * T0 + off,
            cy = ty * T0;
          ctx.beginPath();
          ctx.moveTo(cx - 6 * sc, cy);
          ctx.lineTo(cx + 6 * sc, cy);
          ctx.moveTo(cx, cy - 8 * sc);
          ctx.lineTo(cx, cy + 8 * sc);
          ctx.stroke();
        }
      }
      // drifting dust, a deterministic function of the travel clock
      const ny = h * 0.88,
        cnt = Math.round(clamp((w * h) / 4500, 20, 120));
      for (let i = 0; i < cnt; i++) {
        const v = lerp(4, 14, hash01(i, 3)) * sc,
          y = ny - mod(hash01(i, 2) * ny + v * t, ny + 8 * sc) + 4 * sc,
          x = hash01(i, 1) * w + Math.sin(b * 0.5 + hash01(i, 5) * TAU) * 4 * sc;
        const a = lerp(0.25, 0.7, hash01(i, 4)) * (0.5 + 0.5 * Math.sin(b * 1.3 + hash01(i, 5) * TAU));
        ctx.beginPath();
        ctx.arc(x, y, lerp(0.7, 1.6, hash01(i, 6)) * sc, 0, TAU);
        ctx.fillStyle = dark ? rgba(k0.light, a) : rgba(shadeHex(k0.main, 0.6), a);
        ctx.fill();
      }
    }

    // ---- pipe bodies and liquid base -----------------------------------------
    pipes.forEach((P, pi) => {
      const T = tn[pi],
        wd = P.wOut,
        L = P.L;
      line(ctx, P, 7 * e, wd + 14 * e, dark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.12)");
      line(ctx, P, 0, wd + 5 * e, M.out);
      line(ctx, P, 0, wd, M.body);
      line(ctx, P, 0, wd - 5 * e, M.inner);
      line(ctx, P, -wd * 0.435, 5 * e, M.hi, 0.95);
      line(ctx, P, wd * 0.435, 5 * e, M.lo, 0.95);
      line(ctx, P, 0, P.wIn + 4 * e, M.cavRim);
      line(ctx, P, 0, P.wIn, T.cav);
      // the dry stub above the inlet: grate bars
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, P.capY);
      ctx.clip();
      const q0 = P.at(P.sStart);
      ctx.strokeStyle = "#6b8296";
      ctx.lineWidth = 2 * e;
      ctx.globalAlpha = 0.55;
      for (let y = 0; y < P.capY; y += 7 * e) {
        ctx.beginPath();
        ctx.moveTo(q0.x - P.hw, y);
        ctx.lineTo(q0.x + P.hw, y);
        ctx.stroke();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      // liquid, clipped below the inlet
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, P.capY, w, h);
      ctx.clip();
      line(ctx, P, 0, P.wIn, T.deep);
      line(ctx, P, 0, P.wIn * 0.8, T.mid);
      line(ctx, P, -P.wIn * 0.06, P.wIn * 0.52, T.light, 0.9);

      // flowing chevrons: the middle of the tube runs fastest
      const hw = P.hw,
        sp = 30 * sc,
        ph = mod(t * 120 * sc, sp);
      for (let pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass ? T.deep : T.hi;
        ctx.lineWidth = (pass ? 3.2 : 2.2) * e;
        ctx.globalAlpha = pass ? 0.3 : 0.22;
        for (let s0 = ph - sp + (pass ? sp / 2 : 0); s0 < P.L + sp; s0 += sp) {
          ctx.beginPath();
          for (let k = -8; k <= 8; k++) {
            const u = k / 8,
              q = P.at(s0 + (1 - u * u) * 10 * sc),
              lat = u * hw * 0.9;
            if (k === -8) ctx.moveTo(q.x + q.nx * lat, q.y + q.ny * lat);
            else ctx.lineTo(q.x + q.nx * lat, q.y + q.ny * lat);
          }
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      // froth where the liquid enters
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.beginPath();
      ctx.moveTo(q0.x - hw, P.capY);
      for (let k = 0; k <= 16; k++) ctx.lineTo(q0.x - hw + k * ((hw * 2) / 16), P.capY + (8 + 5 * Math.sin(b * 5 + k * 1.7 + pi)) * e);
      ctx.lineTo(q0.x + hw, P.capY);
      ctx.closePath();
      ctx.fill();
      if (bub > 0) {
        for (let i = 0; i < 34; i++) {
          const px = q0.x + Math.sin(i * 12.9 + b * (1.1 + (i % 3) * 0.45)) * hw * 0.86,
            py = P.capY + (6 + Math.abs(Math.sin(i * 7.3 + b * (1.7 + (i % 4) * 0.3))) * (30 + (i % 5) * 5)) * e;
          ring(ctx, px, py, (2.2 + (i % 4) * 1.1) * e, 0.85 * Math.min(1, bub));
        }
      }
      // bubbles pushed along. Each is a deterministic cycle: speed from a
      // parabolic profile, drifting to the top side of horizontal runs.
      const span = P.L - P.sStart - 8 * e,
        speed = 118 * sc;
      const nb = Math.round(18 * bub),
        nm = Math.round(70 * bub);
      for (let j = 0; j < nb + nm; j++) {
        const micro = j >= nb,
          sd = (micro ? 1000 + (j - nb) : j) + pi * 5000;
        const r = (micro ? lerp(1.2, 2.8, hash01(sd, 1)) : hash01(sd, 2) < 0.3 ? lerp(8, 12, hash01(sd, 3)) : lerp(4, 8, hash01(sd, 3))) * e;
        const m = Math.max(0.1, hw - r - 2 * e);
        const lp0 = (hash01(sd, 4) * 2 - 1) * m;
        const v = speed * (1 - 0.45 * (lp0 / hw) ** 2) * (0.85 + 0.3 * hash01(sd, 5));
        const s = P.sStart + mod(hash01(sd, 6) * span + v * t, span);
        const u = (s - P.sStart) / span;
        const al = smoothstep(0, 0.04, u) * (1 - smoothstep(0.95, 1, u));
        if (al < 0.02) continue;
        const q = P.at(s),
          nu = -q.tx,
          wup = smoothstep(0, 0.6, Math.abs(nu)) * 0.8;
        const lp = lerp(lp0, Math.sign(nu) * m, wup);
        const wob = Math.sin(TAU * (b * (0.3 + 0.4 * hash01(sd, 7)) + hash01(sd, 8))) * (micro ? 1.2 : 2.6) * e;
        const l = clamp(lp + wob, -m, m),
          px = q.x + q.nx * l,
          py = q.y + q.ny * l;
        if (micro) {
          ctx.beginPath();
          ctx.arc(px, py, r, 0, TAU);
          ctx.fillStyle = `rgba(235,250,255,${0.8 * al})`;
          ctx.fill();
        } else ring(ctx, px, py, r, al);
      }
      ctx.restore();

      // glass gloss, rivets, collars
      line(ctx, P, -hw * 0.42, hw * 0.17, "#ffffff", 0.3);
      line(ctx, P, hw * 0.55, hw * 0.07, "#ffffff", 0.14);
      line(ctx, P, -hw * 0.42, hw * 0.07, "#ffffff", 0.3);
      for (let s = 30 * e; s < P.L - 20 * e; s += 44 * e) {
        const q = P.at(s);
        for (const sgn of [-1, 1]) {
          const px = q.x + q.nx * sgn * (wd / 2 - 3.2 * e),
            py = q.y + q.ny * sgn * (wd / 2 - 3.2 * e);
          ctx.beginPath();
          ctx.arc(px, py, 2.2 * e, 0, TAU);
          ctx.fillStyle = "rgba(205,216,228,0.75)";
          ctx.fill();
          ctx.beginPath();
          ctx.arc(px + 0.5 * e, py + 0.5 * e, e, 0, TAU);
          ctx.fillStyle = "#1a232d";
          ctx.fill();
        }
      }
      const cs = P.marks.map((mk, i) => mk + (i % 2 ? 15 : -15) * e);
      cs.push(P.sStart + 8 * e, P.L - 7 * e);
      cs.forEach((s, i) => collar(ctx, P, s, i === cs.length - 1, e));
    });

    // ---- valve and gauge ------------------------------------------------------
    if (fit && n >= 1) valve(ctx, w * 0.245, h * 0.27 - A.wOut / 2, e, tn[0].accent);
    if (fit && n >= 2) {
      const g = { x: w * 0.62 - B.wOut / 2 - 46 * e, y: h * 0.33, r: 25 * e };
      gaugeBody(ctx, g, B.wOut / 2 + 24 * e, e);
      ctx.strokeStyle = tn[1].accent;
      ctx.lineWidth = 3 * e;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r - 3 * e, Math.PI * 1.65, Math.PI * 2.25);
      ctx.stroke();
      const na = Math.PI * (0.75 + 0.15 * (4.2 + 4 * press * 0.7 + Math.sin(b * 1.9) * 0.35 + Math.sin(b * 7.3) * 0.08));
      ctx.strokeStyle = shadeHex(tn[1].accent, 1.3);
      ctx.lineWidth = 2.4 * e;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.lineTo(g.x + Math.cos(na) * (g.r - 5 * e), g.y + Math.sin(na) * (g.r - 5 * e));
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(g.x, g.y, 3 * e, 0, TAU);
      ctx.fillStyle = "#f4f8fc";
      ctx.fill();
    }
    // glints on the collars
    for (let i = 0; i < 6; i++) {
      const P = pipes[i & 1];
      if (!P) continue;
      const q = P.at(P.marks[(i >> 1) % P.marks.length] + 15 * e * ((i >> 1) % 2 ? 1 : -1)),
        a = Math.max(0, Math.sin(b * 1.6 + i * 2.1)) ** 6;
      if (a < 0.05) continue;
      const k = (5 + 6 * a) * e;
      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      ctx.lineWidth = 1.6 * e;
      ctx.beginPath();
      ctx.moveTo(q.x - k, q.y);
      ctx.lineTo(q.x + k, q.y);
      ctx.moveTo(q.x, q.y - k * 1.3);
      ctx.lineTo(q.x, q.y + k * 1.3);
      ctx.stroke();
    }

    // ---- the pool: it takes the colour of the liquid that falls into it -----
    {
      const T0 = tn[0],
        T1 = n >= 2 ? tn[1] : tn[0];
      const wave = (off, ph) => {
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let px = 0; px <= w; px += 6 * sc) ctx.lineTo(px, yw(px + ph, off));
        ctx.lineTo(w, h);
        ctx.closePath();
      };
      wave(-7 * sc, 140);
      ctx.fillStyle = rgba(shadeHex(k0.main, 0.55), 0.55);
      ctx.fill();
      wave(0, 0);
      const gx = ctx.createLinearGradient(w * 0.3, 0, w * 0.7, 0);
      gx.addColorStop(0, rgba(mixHex(T0.mid, T0.hi, 0.2), 0.78));
      gx.addColorStop(1, rgba(mixHex(T1.mid, T1.hi, 0.2), 0.78));
      ctx.fillStyle = gx;
      ctx.fill();
      const gy = ctx.createLinearGradient(0, yp - 8 * sc, 0, h);
      gy.addColorStop(0, rgba(k0.dark, 0));
      gy.addColorStop(1, rgba(k0.dark, 0.5));
      wave(0, 0);
      ctx.fillStyle = gy;
      ctx.fill();
      for (let k = 1; k <= 4; k++) {
        ctx.beginPath();
        for (let px = 0, f = true; px <= w; px += 6 * sc) {
          const py = yw(px) + (k * (h - yp)) / 5 + 3 * sc * Math.sin(px * 0.03 / sc + b * (1 + k * 0.3) + k);
          if (f) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
          f = false;
        }
        ctx.strokeStyle = rgba(crest, 0.28);
        ctx.lineWidth = 1.6 * sc;
        ctx.stroke();
      }
      for (const [off, lw, al] of [[0, 3.2, 0.95], [7, 1.6, 0.35]]) {
        ctx.beginPath();
        for (let px = 0, f = true; px <= w; px += 5 * sc) {
          const py = yw(px) + off * sc;
          if (f) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
          f = false;
        }
        ctx.strokeStyle = rgba(crest, al);
        ctx.lineWidth = lw * sc;
        ctx.stroke();
      }
      for (let px = 14 * sc; px < w; px += 31 * sc) {
        ctx.beginPath();
        ctx.arc(px + Math.sin(b + px) * 3 * sc, yw(px) - 2 * sc, (1.6 + ((px * 7) % 5) * 0.5) * sc, 0, TAU);
        ctx.strokeStyle = "rgba(255,255,255,.75)";
        ctx.lineWidth = 1.2 * sc;
        ctx.stroke();
      }
      if (bub > 0) {
        for (let i = 0; i < 26; i++) {
          const r = lerp(1.8, 6, hash01(i, 11)) * sc,
            v = lerp(10, 30, hash01(i, 12)) * sc,
            x0 = hash01(i, 13) * w,
            rise = h - yp;
          const y = h - 2 - mod(hash01(i, 14) * rise + v * t, rise);
          ring(ctx, x0 + Math.sin(b * 1.4 + hash01(i, 15) * TAU) * 3 * sc, y, r, 0.8);
        }
      }
    }

    // ---- stream from pipe A, jet from pipe B ----------------------------------
    const g = 900 * sc;
    const ea = A.at(A.L - 1),
      landA = yw(ea.x);
    if (n >= 1) {
      const w0 = A.wIn * 0.88,
        w1 = A.wIn * 0.5;
      const gr = ctx.createLinearGradient(ea.x - w0 / 2, 0, ea.x + w0 / 2, 0);
      gr.addColorStop(0, tn[0].deep);
      gr.addColorStop(0.45, tn[0].light);
      gr.addColorStop(1, tn[0].mid);
      ctx.beginPath();
      ctx.moveTo(ea.x - w0 / 2, ea.y);
      ctx.lineTo(ea.x + w0 / 2, ea.y);
      ctx.lineTo(ea.x + w1 / 2, landA);
      ctx.lineTo(ea.x - w1 / 2, landA);
      ctx.closePath();
      ctx.fillStyle = gr;
      ctx.fill();
      ctx.setLineDash([12 * sc, 11 * sc]);
      ctx.lineDashOffset = -t * 210 * sc;
      ctx.lineCap = "butt";
      for (const [ox, a, lw] of [[-0.22, 0.65, 4], [0.18, 0.4, 3]]) {
        ctx.beginPath();
        ctx.moveTo(ea.x + ox * w0, ea.y);
        ctx.lineTo(ea.x + ox * w1, landA);
        ctx.strokeStyle = `rgba(230,248,255,${a})`;
        ctx.lineWidth = lw * e;
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.lineCap = "round";
    }
    let landX = ea.x,
      eb = null,
      vx0 = 0;
    if (n >= 2) {
      eb = B.at(B.L - 1);
      const tf = Math.sqrt((2 * Math.max(1, yp - eb.y)) / g);
      vx0 = Math.min((120 + 70 * press) * sc, Math.max(0, (w - 12 * sc - eb.x) / tf));
      landX = eb.x + vx0 * tf;
      const pts = [];
      for (let i = 0; i <= 28; i++) {
        const tt = (tf * i) / 28;
        pts.push([eb.x + vx0 * tt, eb.y + 0.5 * g * tt * tt]);
      }
      for (const [kk, col, a] of [[1, tn[1].deep, 0.95], [0.74, tn[1].mid, 1], [0.42, tn[1].light, 0.95]]) {
        for (let i = 0; i < pts.length - 1; i++) {
          const u = i / (pts.length - 1),
            wd = (B.wIn * 0.9 * (1 - u) + 13 * e * u) * kk;
          ctx.beginPath();
          ctx.moveTo(pts[i][0], pts[i][1]);
          ctx.lineTo(pts[i + 1][0] + 0.5, pts[i + 1][1]);
          ctx.lineWidth = Math.max(0.3, wd);
          ctx.strokeStyle = col;
          ctx.globalAlpha = a;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      ctx.beginPath();
      pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1] - 3 * e) : ctx.moveTo(p[0], p[1] - 3 * e)));
      ctx.setLineDash([9 * sc, 12 * sc]);
      ctx.lineDashOffset = -t * 230 * sc;
      ctx.strokeStyle = "rgba(235,250,255,.75)";
      ctx.lineWidth = 3 * e;
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ---- spray, splash, ripples, drips: deterministic cycles ------------------
    const drop = (x, y, r, a, col) => {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.3, r), 0, TAU);
      ctx.fillStyle = ink(0.9 * a);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.3, r + 0.8 * sc), 0, TAU);
      ctx.strokeStyle = rgba(col, 0.6 * a);
      ctx.lineWidth = sc;
      ctx.stroke();
    };
    const streak = (x, y, vx, vy, r, a) => {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - vx * 0.018, y - vy * 0.018);
      ctx.strokeStyle = ink(0.45 * a);
      ctx.lineWidth = Math.max(0.3, r * 1.1);
      ctx.stroke();
    };
    if (eb) {
      const N = Math.round(70 * clamp(press, 0, 1.5));
      for (let j = 0; j < N; j++) {
        const per = lerp(0.5, 0.9, hash01(j, 31)),
          q = t / per + hash01(j, 32),
          c = Math.floor(q),
          age = (q - c) * per;
        const vx = lerp(0.6, 1.3, hash01(j, c, 33)) * vx0 * 1.15,
          vy = lerp(-60, 30, hash01(j, c, 34)) * sc,
          r = lerp(1.2, 3.3, hash01(j, c, 35)) * sc;
        const x = eb.x + 3 * sc + vx * age,
          y = eb.y + lerp(-0.8, 0.8, hash01(j, c, 36)) * B.hw * 0.8 + vy * age + 0.5 * g * age * age;
        const a = clamp(((per - age) / per) * 1.6, 0, 1);
        if (y > yw(x) + 4 * sc || x > w || a <= 0) continue;
        streak(x, y, vx, vy + g * age, r, a);
        drop(x, y, r, a, tn[1].splash);
      }
    }
    if (n >= 1) {
      const N = Math.round(95 * clamp(press, 0, 1.5) * 0.7 + 25);
      for (let j = 0; j < N; j++) {
        const per = lerp(0.5, 1, hash01(j, 41)),
          q = t / per + hash01(j, 42),
          c = Math.floor(q),
          age = (q - c) * per;
        const fromA = j % 2 === 0 || !eb;
        const ox = (fromA ? ea.x : landX) + lerp(-14, 14, hash01(j, c, 43)) * sc;
        const vx = lerp(-95, 95, hash01(j, c, 44)) * sc * (fromA ? 1 : 1.3),
          vy = -lerp(90, 260, hash01(j, c, 45)) * sc,
          r = lerp(1.3, 3.8, hash01(j, c, 46)) * sc;
        const x = ox + vx * age,
          y0 = (fromA ? landA : yp) - sc,
          y = y0 + vy * age + 0.5 * g * age * age;
        const a = clamp(((per - age) / per) * 1.6, 0, 1);
        if (y > yw(x) + 4 * sc || a <= 0 || age < 0.02) continue;
        streak(x, y, vx, vy + g * age, r, a);
        drop(x, y, r, a, tn[0].splash);
      }
    }
    // ripples where the water lands (and where drips land)
    const ripple = (x, age) => {
      if (age < 0 || age >= 1) return;
      for (const kk of [1, 0.62]) {
        ctx.beginPath();
        ctx.ellipse(x, yw(x) + 3 * sc, (6 + age * 95) * kk * sc, (2 + age * 17) * kk * sc, 0, 0, TAU);
        ctx.strokeStyle = rgba(crest, 0.75 * (1 - age));
        ctx.lineWidth = Math.max(0.5, 2 - age) * sc;
        ctx.stroke();
      }
    };
    if (n >= 1)
      for (let j = 0; j < 8; j++) {
        const q = t * 0.8 + j / 4,
          c = Math.floor(q);
        const base = j < 4 ? ea.x : eb ? landX : ea.x;
        if (j >= 4 && !eb) continue;
        ripple(base + lerp(-10, 10, hash01(j, c, 51)) * sc, q - c);
      }
    PERIODS.forEach((per, d) => {
      const onB = d === 2;
      if ((onB && n < 2) || n < 1) return;
      const x = [0.205, 0.27, 0.715][d] * w,
        ys = (onB ? 0.52 : 0.27) * h + (onB ? B.wOut : A.wOut) / 2 + 3 * e;
      const c = mod(t + hash01(d, 61) * 3, per),
        grow = 1.3;
      if (c < grow) {
        const u = c / grow,
          r = (1 + 3.2 * u) * sc;
        ctx.beginPath();
        ctx.ellipse(x, ys + r * 0.9 * u, r * 0.82, r * (1 + 0.55 * u), 0, 0, TAU);
        ctx.fillStyle = ink(0.95);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,.9)";
        ctx.lineWidth = 1.2 * sc;
        ctx.stroke();
      } else {
        const tt = c - grow,
          y = ys + 0.5 * g * 1.1 * tt * tt,
          wy = yw(x);
        if (y < wy) {
          ctx.beginPath();
          ctx.ellipse(x, y, 2.6 * sc, 5.4 * sc, 0, 0, TAU);
          ctx.fillStyle = ink(0.95);
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,.8)";
          ctx.lineWidth = 1.2 * sc;
          ctx.stroke();
        } else {
          const tland = Math.sqrt((2 * Math.max(0, wy - ys)) / (g * 1.1));
          ripple(x, 0.35 + (tt - tland) * 0.8);
        }
      }
    });
  },
};
