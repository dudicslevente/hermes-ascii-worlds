import { makeKit, TAU, clamp, clamp01, lerp, smoothstep, hash01, rgba, shadeHex, mixHex, ribbon, curve, poly, ellipse, glow } from "../core/util.js";

// Minimal rooftop ninja: one big cartoon ninja hopping over 3 flat roof slabs, a small moon, a long scarf.
const SEQ = [0, 1, 2, 1];   // roof visited per hop
const SD = 1.25;            // stand time on a roof (s)
const JD = 0.95;            // jump time (s)
const HP = SD + JD;

// pose = [headx,heady, hipx,hipy, shx,shy, fFx,fFy, kFx,kFy, fBx,fBy, kBx,kBy, hFx,hFy, eFx,eFy, hBx,hBy, eBx,eBy]
const STAND = [0.02, -0.85, 0, -0.45, 0, -0.7, 0.1, 0, 0.09, -0.22, -0.1, 0, -0.08, -0.23, 0.1, -0.47, 0.07, -0.6, -0.11, -0.47, -0.07, -0.6];
const CROUCH = [0.14, -0.66, -0.06, -0.3, 0.06, -0.52, 0.16, 0, 0.2, -0.2, -0.12, 0, -0.02, -0.22, -0.15, -0.3, -0.02, -0.4, -0.22, -0.35, -0.08, -0.43];
const STRETCH = [0.18, -0.82, 0, -0.45, 0.1, -0.7, 0.3, -0.28, 0.17, -0.32, -0.26, -0.2, -0.12, -0.35, 0.32, -0.7, 0.2, -0.68, -0.18, -0.62, -0.08, -0.62];
const TUCK = [0.14, -0.78, 0, -0.45, 0.06, -0.65, 0.2, -0.2, 0.24, -0.45, 0.06, -0.17, 0.14, -0.4, 0.26, -0.5, 0.2, -0.62, 0.2, -0.42, 0.12, -0.56];
const mixPose = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const ease = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };

function layout(w, h, S) {
  const m = S.memo;
  const key = `${w}|${h}|${S.size}`;
  if (m.lay && m.lay.key === key) return m.lay;
  const rw = Math.min(w * 0.22, h * 0.5);
  const gap = rw * 0.5;
  const total = 3 * rw + 2 * gap;
  const x0 = (w - total) / 2;
  const tops = [0.74 * h, 0.64 * h, 0.76 * h];
  const roofs = tops.map((top, j) => ({ x0: x0 + j * (rw + gap), x1: x0 + j * (rw + gap) + rw, top, c: x0 + j * (rw + gap) + rw / 2 }));
  const H = Math.min(h * 0.36, rw * 1.7) * S.size;
  m.lay = { key, rw, gap, roofs, H, bh: Math.max(10, h * 0.1) };
  return m.lay;
}

// where is ninja i at time t? Returns world feet position, flip angle, facing, pose.
function ninjaAt(i, t, L, shur) {
  const { roofs, rw, H } = L;
  const off = i * HP * 1.33;
  const u = (t + off) / HP;
  const k = Math.floor(u);
  const s = (u - k) * HP;
  const ra = SEQ[((k % 4) + 4) % 4], rb = SEQ[(((k + 1) % 4) + 4) % 4];
  const sh = (i - 1) * rw * 0.2;
  const ax = roofs[ra].c + sh, ay = roofs[ra].top;
  const bx = roofs[rb].c + sh, by = roofs[rb].top;
  const dir = bx >= ax ? 1 : -1;
  const out = { k, s, dir, ax, ay, throwAmt: 0, rot: 0, x: ax, y: ay, pose: STAND };
  if (s < SD) {
    const crouchIn = smoothstep(SD - 0.38, SD, s);
    const land = (1 - smoothstep(0, 0.32, s)) * 0.85;
    const c = Math.max(crouchIn, land);
    let p = mixPose(STAND, CROUCH, c);
    if (shur && hash01(i, 5, k) < 0.5) {
      const th = ease((s - 0.25) / 0.2) * (1 - ease((s - 0.72) / 0.25));
      out.throwAmt = th;
      p = p.slice();
      p[14] = lerp(p[14], 0.42, th); p[15] = lerp(p[15], -0.66, th);
      p[16] = lerp(p[16], 0.24, th); p[17] = lerp(p[17], -0.64, th);
    }
    const br = Math.sin(t * 2.4 + i) * 0.006;
    p = p.slice();
    p[1] += br; p[5] += br;
    out.pose = p;
  } else {
    const u2 = (s - SD) / JD;
    const e = ease(u2);
    const arc = H * (0.5 + 0.35 * Math.abs(by - ay) / Math.max(1, H));
    out.x = lerp(ax, bx, u2 * 0.5 + e * 0.5);
    out.y = lerp(ay, by, e) - Math.sin(Math.PI * u2) * arc;
    out.rot = TAU * ease((u2 - 0.08) / 0.84);
    const tk = Math.sin(Math.PI * clamp01((u2 - 0.08) / 0.84));
    const lead = mixPose(CROUCH, STRETCH, smoothstep(0, 0.2, u2));
    out.pose = mixPose(lead, TUCK, tk);
    out.pose = mixPose(out.pose, STAND, smoothstep(0.88, 1, u2) * 0.6);
  }
  return out;
}

function neckWorld(n, H) {
  const cx = 0, cy = -0.45 * H;
  const lx = 0.06 * H - cx, ly = -0.74 * H - cy;
  const c = Math.cos(n.rot), s = Math.sin(n.rot);
  const rx = cx + lx * c - ly * s, ry = cy + lx * s + ly * c;
  return [n.x + n.dir * rx, n.y + ry];
}

function drawNinja(ctx, kit, n, H, rb, L, t, i, shur) {
  const p = n.pose;
  const P = (k) => [p[k] * H, p[k + 1] * H];
  const limb = (a, b, c, col, wd) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = wd;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.lineTo(c[0], c[1]);
    ctx.stroke();
  };
  const head = P(0), hip = P(2), sh = P(4);
  const bodyW = H * 0.3, limbW = H * 0.14;
  const dark = shadeHex(kit.main, 0.78);

  // scarf (long ribbon trailing the neck's recent path)
  const sp = [];
  const dt = 0.05;
  for (let k = 0; k < 11; k++) {
    const nk = ninjaAt(i, t - k * dt, L, shur);
    const q = neckWorld(nk, H);
    const sway = Math.sin(rb * 3 - k * 0.7 + i) * H * 0.012 * k;
    sp.push([q[0] - n.dir * H * 0.03 * k, q[1] + H * 0.012 * k + sway]);
  }
  // convert into current local frame
  const c = Math.cos(-n.rot), s = Math.sin(-n.rot);
  const cx = 0, cy = -0.45 * H;
  const loc = sp.map(([wx, wy]) => {
    const dx = (wx - n.x) * n.dir, dy = wy - n.y;
    const lx = dx - cx, ly = dy - cy;
    return [cx + lx * c - ly * s, cy + lx * s + ly * c];
  });

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // back limbs
  limb(hip, P(12), P(10), dark, limbW);
  limb(sh, P(20), P(18), dark, limbW * 0.9);
  // torso
  ctx.strokeStyle = kit.main;
  ctx.lineWidth = bodyW;
  ctx.beginPath();
  ctx.moveTo(hip[0], hip[1]);
  ctx.lineTo(sh[0], sh[1]);
  ctx.stroke();
  // belt in accent
  ctx.strokeStyle = kit.accent;
  ctx.lineWidth = H * 0.04;
  const bx = lerp(hip[0], sh[0], 0.12), by = lerp(hip[1], sh[1], 0.12);
  ctx.beginPath();
  ctx.moveTo(bx - bodyW * 0.45, by + H * 0.01);
  ctx.lineTo(bx + bodyW * 0.45, by - H * 0.01);
  ctx.stroke();
  // scarf
  curve(ctx, ribbon(loc, (f) => H * (0.08 - 0.045 * f)), true);
  ctx.fillStyle = kit.accent;
  ctx.fill();
  // head
  ctx.fillStyle = kit.main;
  ellipse(ctx, head[0], head[1], H * 0.19, H * 0.19);
  ctx.fill();
  ctx.fillStyle = kit.light;
  ctx.beginPath();
  ctx.roundRect(head[0] - H * 0.01, head[1] - H * 0.05, H * 0.2, H * 0.1, H * 0.05);
  ctx.fill();
  ctx.fillStyle = shadeHex(kit.main, 0.5);
  ellipse(ctx, head[0] + H * 0.045, head[1], H * 0.027, H * 0.032);
  ctx.fill();
  ellipse(ctx, head[0] + H * 0.125, head[1], H * 0.027, H * 0.032);
  ctx.fill();
  // headband
  ctx.strokeStyle = kit.accent;
  ctx.lineWidth = H * 0.05;
  ctx.beginPath();
  ctx.moveTo(head[0] - H * 0.18, head[1] - H * 0.08);
  ctx.quadraticCurveTo(head[0] + H * 0.02, head[1] - H * 0.12, head[0] + H * 0.18, head[1] - H * 0.08);
  ctx.stroke();
  // front limbs
  limb(hip, P(8), P(6), kit.main, limbW);
  limb(sh, P(16), P(14), kit.main, limbW * 0.9);
  // hands + feet: light dots
  ctx.fillStyle = kit.light;
  for (const k of [6, 14]) {
    ellipse(ctx, p[k] * H, p[k + 1] * H, H * 0.06, H * 0.06);
    ctx.fill();
  }
}

function star(ctx, x, y, r, rot, col, a) {
  const pts = [];
  for (let k = 0; k < 8; k++) {
    const rr = k & 1 ? r * 0.38 : r;
    const an = rot + (k * TAU) / 8;
    pts.push([x + Math.cos(an) * rr, y + Math.sin(an) * rr]);
  }
  poly(ctx, pts);
  ctx.fillStyle = rgba(col, a);
  ctx.fill();
}

export default {
  id: "rooftop-ninja",
  name: "Rooftop ninja",
  group: "adventure",
  blurb: "A cartoon ninja with a long scarf somersaults between a few quiet rooftops under a small moon.",
  motion: "travel",
  count: { min: 0, max: 3, default: 1, noun: "Ninja" },
  natural: [
    makeKit({ main: "#6a73c4", light: "#d5daf5", dark: "#171b3d", accent: "#f0503c", second: "#9aa4e8" }),
    makeKit({ main: "#4c9a62", light: "#d2efd0", dark: "#10281a", accent: "#f2cc3c", second: "#86c88a" }),
    makeKit({ main: "#c9505a", light: "#f6d6d8", dark: "#3a1218", accent: "#fbf4f0", second: "#e8909a" }),
    makeKit({ main: "#2f9aa0", light: "#c8eeee", dark: "#0c2a2e", accent: "#f08a3a", second: "#6cc8c8" }),
  ],
  atmosphere: "none",
  extras: [
    { key: "moon", type: "toggle", label: "Moon", default: true, help: "A small moon disc in the corner of the sky." },
    { key: "lanterns", type: "toggle", label: "Lanterns", default: true, help: "A glowing paper lantern on each end rooftop." },
    { key: "shuriken", type: "toggle", label: "Shuriken", default: true, help: "Now and then the ninja flings a spinning star across the gap." },
  ],
  supports: { speed: true, size: true },
  backdrop: { dark: "#0a0c14", light: "#e9e8ee" },
  draw(ctx, w, h, S) {
    const n = S.count | 0;
    if (n <= 0) return;
    const L = layout(w, h, S);
    const k0 = S.kit(0);
    const shur = S.extra?.shuriken !== false;
    const { roofs, H, bh } = L;
    const lw = Math.max(2.5, h * 0.006);

    if (S.extra?.moon !== false) {
      const r = S.min * 0.055;
      ctx.fillStyle = rgba(k0.light, 0.9);
      ellipse(ctx, w * 0.84, h * 0.2, r, r);
      ctx.fill();
    }

    // roof slabs: a lit top edge and a quiet fade below
    for (const r of roofs) {
      const g = ctx.createLinearGradient(0, r.top, 0, r.top + bh);
      g.addColorStop(0, rgba(k0.second, 0.4));
      g.addColorStop(1, rgba(k0.second, 0));
      ctx.fillStyle = g;
      ctx.fillRect(r.x0, r.top, r.x1 - r.x0, bh);
      ctx.fillStyle = rgba(mixHex(k0.second, k0.light, 0.5), 0.95);
      ctx.beginPath();
      ctx.roundRect(r.x0 - lw, r.top - lw * 0.5, r.x1 - r.x0 + lw * 2, lw * 1.4, lw * 0.7);
      ctx.fill();
    }

    if (S.extra?.lanterns !== false) {
      [[roofs[0], roofs[0].x0 + (roofs[0].x1 - roofs[0].x0) * 0.14, 0], [roofs[2], roofs[2].x1 - (roofs[2].x1 - roofs[2].x0) * 0.14, 1]].forEach(([r, x, j]) => {
        const sway = Math.sin(S.b * 1.1 + j * 2) * H * 0.02;
        const top = r.top - H * 0.42;
        ctx.strokeStyle = rgba(mixHex(k0.second, k0.light, 0.4), 0.9);
        ctx.lineWidth = lw;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x, r.top);
        ctx.lineTo(x, top);
        ctx.stroke();
        const ly = top + H * 0.09;
        glow(ctx, x + sway, ly, H * 0.24, k0.accent, 0.4);
        ctx.fillStyle = k0.accent;
        ellipse(ctx, x + sway, ly, H * 0.045, H * 0.06);
        ctx.fill();
      });
    }

    for (let i = 0; i < n; i++) {
      const kit = S.kit(i);
      const sc = 1 - 0.14 * i;
      const Hi = H * sc;
      const nn = ninjaAt(i, S.t, { ...L, H: Hi }, shur);
      ctx.save();
      ctx.translate(nn.x, nn.y);
      ctx.scale(nn.dir, 1);
      ctx.translate(0, -0.45 * Hi);
      ctx.rotate(nn.rot);
      ctx.translate(0, 0.45 * Hi);
      drawNinja(ctx, kit, nn, Hi, S.b + i, { ...L, H: Hi }, S.t, i, shur);
      ctx.restore();
      // shuriken from this and the previous hop
      if (shur) {
        for (const kk of [nn.k - 1, nn.k]) {
          if (hash01(i, 5, kk) >= 0.5) continue;
          const off = i * HP * 1.33;
          const tRel = kk * HP - off + 0.45;
          const a = S.t - tRel;
          if (a < 0 || a > 1.6) continue;
          const ra = SEQ[((kk % 4) + 4) % 4], rb = SEQ[(((kk + 1) % 4) + 4) % 4];
          const sx0 = roofs[ra].c + (i - 1) * L.rw * 0.2;
          const dr = roofs[rb].c >= roofs[ra].c ? 1 : -1;
          const x = sx0 + dr * (Hi * 0.35 + a * L.rw * 1.5);
          const y = roofs[ra].top - Hi * 0.66 + a * Hi * 0.05;
          star(ctx, x, y, Hi * 0.12, a * 18 * dr, kit.accent, 1 - smoothstep(1.1, 1.6, a));
        }
      }
    }
  },
};
