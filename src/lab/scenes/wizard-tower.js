// Wizard's tower, minimal: one big charming wizard (pointy hat, swaying beard, robe, staff with a
// glowing orb) next to a small cauldron with rising bubbles and a vapour curl. Optional floating
// candles and a small cat. Every ~15 s he flourishes the wand and a short ring of sparks arcs out.
// No room, no walls: the stage is empty. All motion is a pure function of S.b.
import { makeKit, clamp, clamp01, lerp, smoothstep, easeInOut, easeOut, hash01, rgba, mixHex, shadeHex, ellipse, glow, poly, curve } from "../core/util.js";

const PERIOD = 15;
const CAST_D = 3.4;
const RELEASE = 1.55; // seconds into the cast when the sparks leave the wand

// ---- spell timeline ------------------------------------------------------
function spell(T, delay) {
  const t = T - delay;
  const c = Math.floor(t / PERIOD);
  const a = t - (c * PERIOD + 4 + 1.5 * hash01(c, 41));
  const live = a > -0.01 && a < CAST_D;
  const raise = live ? smoothstep(0, 0.7, a) * (1 - smoothstep(2.4, 3.3, a)) : 0;
  const swing = live ? easeInOut(clamp01((a - 0.55) / 0.95)) * (1 - smoothstep(1.9, 2.7, a)) : 0;
  return { a, live, raise, swing, flare: live ? smoothstep(1.2, 1.9, a) * (1 - smoothstep(2.4, 3.4, a)) : 0 };
}

// wand geometry in the wizard's local unit space (feet at 0,0; +x forward; 1 = wizard height)
function wandPose(sp, b) {
  const hx = lerp(0.2, 0.3, sp.raise), hy = lerp(-0.4, -0.8, sp.raise) + 0.006 * Math.sin(b * 1.3);
  const ang = -1.05 + 1.35 * sp.swing;
  return { hx, hy, ang, tx: hx + 0.2 * Math.cos(ang), ty: hy + 0.2 * Math.sin(ang) };
}

// on a light page the engine darkens ink; pre-shade so the pale parts (beard, candles) still read
function tone(S, k) {
  if (S.dark) return k;
  return Object.freeze({ main: shadeHex(k.main, 0.7), light: shadeHex(k.light, 0.82), dark: shadeHex(k.dark, 0.4), accent: shadeHex(k.accent, 0.6), second: shadeHex(k.second, 0.7) });
}

// ---- pieces --------------------------------------------------------------
// neutral mid-grey tinted by the kit's dark colour (for inanimate things: cauldron, cat)
function grey(S, k, lift = 0) {
  const base = S.dark ? "#a2a2aa" : "#8a8a92";
  const g = mixHex(base, k.dark, S.dark ? 0.2 : 0.3);
  return lift ? mixHex(g, "#ffffff", lift) : g;
}
function star4(ctx, x, y, r, hex, a) {
  ctx.fillStyle = rgba(hex, a);
  ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.28, y - r * 0.28); ctx.lineTo(x + r, y); ctx.lineTo(x + r * 0.28, y + r * 0.28);
  ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.28, y + r * 0.28); ctx.lineTo(x - r, y); ctx.lineTo(x - r * 0.28, y - r * 0.28);
  ctx.closePath();
  ctx.fill();
}

function drawBook(ctx, S, x, y, kit, sp, delay) {
  const b = S.b, s = 0.155;
  const bob = 0.022 * Math.sin(b * 0.8 + delay), tilt = -0.14 + 0.05 * Math.sin(b * 0.6 + delay);
  const cover = mixHex(kit.accent, kit.dark, 0.45);
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.rotate(tilt);
  ctx.scale(s, s);
  glow(ctx, 0, -0.1, 1.9, kit.accent, 0.12 + 0.2 * sp.flare);
  ctx.fillStyle = rgba(kit.accent, 1);
  poly(ctx, [[-1.2, 0.28], [0, 0.46], [1.2, 0.28], [1.2, -0.66], [0, -0.48], [-1.2, -0.66]]);
  ctx.fill();
  ctx.fillStyle = rgba(kit.light, 1);
  poly(ctx, [[-1.08, 0.16], [0, 0.34], [0, -0.4], [-1.08, -0.54]]); ctx.fill();
  poly(ctx, [[0.04, 0.34], [1.08, 0.16], [1.08, -0.54], [0.04, -0.4]]); ctx.fill();
  // turning leaf every ~6 s
  const q = (b + delay * 2) / 6, f = q - Math.floor(q);
  if (f < 0.3) {
    const u = f / 0.3, cx = Math.cos(Math.PI * u), lift = Math.sin(Math.PI * u) * 0.35;
    ctx.fillStyle = rgba(mixHex(kit.light, kit.accent, 0.18), 1);
    poly(ctx, [[0.02, 0.34], [cx * 1.06, 0.16 - lift], [cx * 1.06, -0.54 - lift], [0.02, -0.4]]);
    ctx.fill();
  }
  // faint text lines
  ctx.strokeStyle = rgba(kit.accent, 0.85);
  ctx.lineWidth = 0.12;
  for (let r = 0; r < 3; r++) {
    const yy = -0.34 + r * 0.22;
    ctx.beginPath(); ctx.moveTo(-0.9, yy - 0.05 * (1 + r * 0.0) + 0.0); ctx.lineTo(-0.2, yy + 0.07); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0.2, yy + 0.07); ctx.lineTo(r === 2 ? 0.55 : 0.9, yy - 0.05); ctx.stroke();
  }
  ctx.strokeStyle = rgba(shadeHex(cover, 0.6), 1);
  ctx.lineWidth = 0.16;
  ctx.beginPath(); ctx.moveTo(0, 0.34); ctx.lineTo(0, -0.42); ctx.stroke();
  ctx.restore();
  // two motes rising off the pages
  for (let j = 0; j < 2; j++) {
    const qq = b / 3.4 + j * 0.5 + delay * 0.1, u = qq - Math.floor(qq);
    ctx.fillStyle = rgba(j ? kit.light : kit.accent, Math.sin(Math.PI * u) * 0.9);
    ellipse(ctx, x + (j ? 0.05 : -0.05) + 0.03 * Math.sin(u * 6 + j), y - 0.07 - 0.2 * u, 0.012, 0.012);
    ctx.fill();
  }
}

function drawWizard(ctx, S, X, Y, k, dir, kit, sp, delay) {
  const b = S.b;
  const sway = Math.sin(b * 0.9 + delay);
  const breathe = 1 + 0.008 * Math.sin(b * 1.4);
  const wood = mixHex(kit.second, kit.dark, 0.35);
  const woodHi = mixHex(wood, kit.light, 0.35);
  const robe = kit.main;
  const robeShade = shadeHex(kit.main, 0.7);
  const robeLight = mixHex(kit.main, kit.light, 0.35);
  const hatCol = shadeHex(kit.main, 0.68);
  const skin = mixHex(kit.light, kit.accent, 0.22);
  const wp = wandPose(sp, b);
  ctx.save();
  ctx.translate(X, Y);
  ctx.scale(dir * k, k * breathe);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // floating spellbook on the staff side
  drawBook(ctx, S, -0.7, -0.66, kit, sp, delay);

  // gnarled staff with a glowing orb
  const orbPulse = 1 + 0.14 * Math.sin(b * 2.1) + 0.5 * sp.flare;
  const sx = -0.34, oy = -1.07;
  const pts = [];
  for (let j = 0; j <= 8; j++) { const yy = -j * 0.118; pts.push([sx + 0.012 * Math.sin(j * 2.1 + 0.5) + 0.01 * Math.sin(j * 5.3) + 0.004 * sway * j * 0.12, yy]); }
  ctx.strokeStyle = rgba(wood, 1);
  ctx.lineWidth = 0.038;
  curve(ctx, pts); ctx.stroke();
  ctx.strokeStyle = rgba(woodHi, 0.9);
  ctx.lineWidth = 0.012;
  curve(ctx, pts.map((p) => [p[0] - 0.01, p[1]])); ctx.stroke();
  ctx.fillStyle = rgba(wood, 1);
  for (const [kx, ky] of [[pts[3][0] + 0.012, pts[3][1]], [pts[6][0] - 0.012, pts[6][1] - 0.02]]) { ellipse(ctx, kx, ky, 0.026, 0.02, 0.4); ctx.fill(); }
  // claw cradle
  ctx.strokeStyle = rgba(wood, 1);
  ctx.lineWidth = 0.026;
  const top = pts[8];
  ctx.beginPath(); ctx.moveTo(top[0], top[1] + 0.02); ctx.quadraticCurveTo(top[0] - 0.08, top[1] - 0.02, top[0] - 0.05, oy - 0.0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(top[0], top[1] + 0.02); ctx.quadraticCurveTo(top[0] + 0.08, top[1] - 0.02, top[0] + 0.05, oy - 0.0); ctx.stroke();
  const ox = top[0];
  glow(ctx, ox, oy, 0.21 * orbPulse, kit.accent, 0.5 + 0.3 * sp.flare);
  ctx.fillStyle = rgba(kit.accent, 1);
  ellipse(ctx, ox, oy, 0.06 * (0.96 + 0.06 * orbPulse), 0.06 * (0.96 + 0.06 * orbPulse)); ctx.fill();
  ctx.fillStyle = rgba(kit.light, 0.95);
  ellipse(ctx, ox - 0.016, oy - 0.018, 0.022, 0.022); ctx.fill();
  // ring of motes around the orb
  for (let j = 0; j < 5; j++) {
    const an = b * 0.9 + j * 1.2566, cx = Math.cos(an), sy = Math.sin(an);
    const mx = ox + cx * 0.115, my = oy + sy * 0.04 - cx * 0.03;
    const depth = 0.5 + 0.5 * sy;
    ctx.fillStyle = rgba(j % 2 ? kit.light : kit.accent, 0.5 + 0.5 * depth);
    ellipse(ctx, mx, my, 0.011 + 0.008 * depth, 0.011 + 0.008 * depth); ctx.fill();
  }

  // robe with side shading, trim, belt, patches
  const hemL = -0.28 + 0.012 * sway, hemR = 0.29 + 0.012 * sway;
  const rg = ctx.createLinearGradient(-0.3, 0, 0.3, 0);
  rg.addColorStop(0, rgba(shadeHex(robe, 0.6), 1)); rg.addColorStop(0.45, rgba(robe, 1)); rg.addColorStop(0.62, rgba(robe, 1)); rg.addColorStop(0.7, rgba(robeShade, 1)); rg.addColorStop(1, rgba(robeShade, 1));
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.moveTo(-0.13, -0.64);
  ctx.quadraticCurveTo(-0.18, -0.3, hemL, 0);
  for (let j = 1; j <= 6; j++) ctx.lineTo(lerp(hemL, hemR, j / 6), j % 2 ? 0.0 : -0.014);
  ctx.quadraticCurveTo(0.18, -0.3, 0.13, -0.64);
  ctx.quadraticCurveTo(0, -0.7, -0.13, -0.64);
  ctx.closePath();
  ctx.fill();
  // hem trim
  ctx.fillStyle = rgba(kit.accent, 1);
  ctx.beginPath();
  ctx.moveTo(hemL + 0.003, -0.075); ctx.quadraticCurveTo(0, -0.06, hemR - 0.003, -0.075);
  ctx.lineTo(hemR - 0.002, -0.032); ctx.quadraticCurveTo(0, -0.018, hemL + 0.002, -0.032);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgba(kit.light, 0.95);
  for (let j = 0; j < 5; j++) { const hx = lerp(hemL + 0.05, hemR - 0.05, j / 4); ellipse(ctx, hx, -0.052 + 0.006 * Math.sin(j * 1.5), 0.01, 0.01); ctx.fill(); }
  // belt + buckle
  ctx.strokeStyle = rgba(kit.accent, 1);
  ctx.lineWidth = 0.035;
  ctx.beginPath(); ctx.moveTo(-0.15, -0.4); ctx.quadraticCurveTo(0, -0.37, 0.15, -0.4); ctx.stroke();
  ctx.fillStyle = rgba(kit.light, 1);
  ctx.beginPath(); ctx.rect(-0.03, -0.425, 0.06, 0.05); ctx.fill();
  ctx.fillStyle = rgba(robeShade, 1);
  ctx.beginPath(); ctx.rect(-0.015, -0.412, 0.03, 0.024); ctx.fill();
  // moon + stars patches
  ctx.fillStyle = rgba(kit.light, 0.95);
  ellipse(ctx, -0.075, -0.2, 0.05, 0.05); ctx.fill();
  ctx.fillStyle = rgba(robeShade, 1);
  ellipse(ctx, -0.055, -0.212, 0.044, 0.044); ctx.fill();
  star4(ctx, 0.085, -0.25, 0.034, kit.accent, 1);
  star4(ctx, 0.06, -0.15, 0.024, kit.light, 1);
  star4(ctx, -0.12, -0.3, 0.018, kit.light, 0.9);

  // staff arm: sleeve + cuff + hand
  ctx.strokeStyle = rgba(robeShade, 1);
  ctx.lineWidth = 0.088;
  ctx.beginPath(); ctx.moveTo(-0.1, -0.58); ctx.lineTo(-0.3, -0.45); ctx.stroke();
  ctx.strokeStyle = rgba(robe, 1);
  ctx.lineWidth = 0.062;
  ctx.beginPath(); ctx.moveTo(-0.1, -0.58); ctx.lineTo(-0.3, -0.45); ctx.stroke();
  ctx.strokeStyle = rgba(kit.accent, 1);
  ctx.lineWidth = 0.03;
  ctx.beginPath(); ctx.moveTo(-0.27, -0.485); ctx.lineTo(-0.3, -0.45); ctx.stroke();
  ctx.fillStyle = rgba(skin, 1);
  ellipse(ctx, sx + 0.014, -0.44, 0.034, 0.034); ctx.fill();

  // beard: long, wavy, light
  const bw = (f) => 0.022 * Math.sin(b * 1.2 + 0.7 - f * 3.6);
  ctx.strokeStyle = rgba(shadeHex(kit.main, 0.5), 1);
  ctx.lineWidth = 0.024;
  curve(ctx, [[-0.08, -0.67], [-0.115 + bw(0.2), -0.56], [-0.1 + bw(0.5), -0.44], [-0.05 + bw(0.8), -0.33], [0.01 + bw(1), -0.24], [0.06 + bw(0.8), -0.33], [0.1 + bw(0.5), -0.44], [0.12 + bw(0.2), -0.56], [0.115, -0.67]], true);
  ctx.stroke();
  ctx.fillStyle = rgba(kit.light, 1);
  curve(ctx, [[-0.08, -0.67], [-0.115 + bw(0.2), -0.56], [-0.1 + bw(0.5), -0.44], [-0.05 + bw(0.8), -0.33], [0.01 + bw(1), -0.24], [0.06 + bw(0.8), -0.33], [0.1 + bw(0.5), -0.44], [0.12 + bw(0.2), -0.56], [0.115, -0.67]], true);
  ctx.fill();
  ctx.strokeStyle = rgba(mixHex(kit.light, kit.main, 0.35), 0.9);
  ctx.lineWidth = 0.014;
  curve(ctx, [[-0.02, -0.6], [-0.04 + bw(0.4), -0.48], [0.0 + bw(0.7), -0.38], [0.01 + bw(1), -0.28]]); ctx.stroke();
  curve(ctx, [[0.05, -0.6], [0.07 + bw(0.4), -0.5], [0.04 + bw(0.7), -0.4]]); ctx.stroke();
  // moustache
  ctx.fillStyle = rgba(kit.light, 1);
  ellipse(ctx, 0.0, -0.665, 0.055, 0.022, 0.12); ctx.fill();
  ellipse(ctx, 0.09, -0.665, 0.045, 0.02, -0.12); ctx.fill();

  // head, nose, brows, eyes
  ctx.fillStyle = rgba(skin, 1);
  ellipse(ctx, 0.035, -0.71, 0.092, 0.088); ctx.fill();
  ctx.fillStyle = rgba(mixHex(skin, kit.accent, 0.2), 1);
  ellipse(ctx, 0.12, -0.69, 0.034, 0.03); ctx.fill();
  const bl = (b + delay * 3) % 5.2;
  const lid = bl < 0.16 ? Math.sin((bl / 0.16) * Math.PI) : 0;
  ctx.fillStyle = rgba(kit.dark, 1);
  for (const ex of [0.02, 0.083]) { ellipse(ctx, ex, -0.715, 0.016, 0.02 * (1 - 0.9 * lid)); ctx.fill(); }
  ctx.strokeStyle = rgba(kit.light, 1);
  ctx.lineWidth = 0.026;
  ctx.beginPath(); ctx.moveTo(-0.01, -0.742); ctx.lineTo(0.045, -0.752 + 0.004 * lid); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0.062, -0.752 + 0.004 * lid); ctx.lineTo(0.112, -0.74); ctx.stroke();

  // hat: bent cone, band + buckle, star on the tip
  const tw = 0.03 * Math.sin(b * 1.0 + 0.4);
  const tipX = -0.24 + tw, tipY = -1.0 + 0.012 * Math.sin(b * 1.0 + 1.0);
  ctx.fillStyle = rgba(hatCol, 1);
  curve(ctx, [[-0.1, -0.78], [-0.08, -0.88], [-0.1, -0.97], [tipX, tipY], [-0.12 + tw * 0.4, -1.0 + 0.012], [0.01, -0.93], [0.08, -0.86], [0.14, -0.78]], true);
  ctx.fill();
  ctx.fillStyle = rgba(mixHex(hatCol, kit.light, 0.25), 0.9);
  curve(ctx, [[0.0, -0.8], [0.05, -0.87], [0.0, -0.93], [0.07, -0.87], [0.115, -0.8]], true); ctx.fill();
  ctx.fillStyle = rgba(kit.light, 1);
  ctx.beginPath();
  ctx.moveTo(-0.1, -0.78); ctx.lineTo(-0.094, -0.815); ctx.lineTo(0.13, -0.815); ctx.lineTo(0.14, -0.78);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgba(kit.accent, 1);
  ctx.beginPath(); ctx.rect(0.0, -0.822, 0.05, 0.05); ctx.fill();
  ctx.fillStyle = rgba(hatCol, 1);
  ctx.beginPath(); ctx.rect(0.013, -0.809, 0.024, 0.024); ctx.fill();
  ctx.fillStyle = rgba(mixHex(hatCol, kit.light, 0.45), 1);
  ellipse(ctx, 0.035, -0.77, 0.18, 0.032); ctx.fill();
  glow(ctx, tipX - 0.01, tipY - 0.01, 0.07, kit.accent, 0.45);
  star4(ctx, tipX - 0.012, tipY - 0.012, 0.038 * (0.9 + 0.2 * Math.sin(b * 2.4)), kit.accent, 1);

  // wand arm in front: sleeve, cuff, hand, wand
  ctx.strokeStyle = rgba(robeShade, 1);
  ctx.lineWidth = 0.088;
  ctx.beginPath(); ctx.moveTo(0.1, -0.58); ctx.lineTo(wp.hx, wp.hy); ctx.stroke();
  ctx.strokeStyle = rgba(robeLight, 1);
  ctx.lineWidth = 0.064;
  ctx.beginPath(); ctx.moveTo(0.1, -0.58); ctx.lineTo(wp.hx, wp.hy); ctx.stroke();
  const al = Math.hypot(wp.hx - 0.1, wp.hy + 0.58) || 1;
  const cux = wp.hx - (wp.hx - 0.1) / al * 0.045, cuy = wp.hy - (wp.hy + 0.58) / al * 0.045;
  ctx.strokeStyle = rgba(kit.accent, 1);
  ctx.lineWidth = 0.034;
  ctx.beginPath(); ctx.moveTo(cux, cuy); ctx.lineTo(wp.hx - (wp.hx - 0.1) / al * 0.02, wp.hy - (wp.hy + 0.58) / al * 0.02); ctx.stroke();
  ctx.strokeStyle = rgba(kit.light, 1);
  ctx.lineWidth = 0.026;
  ctx.beginPath(); ctx.moveTo(wp.hx, wp.hy); ctx.lineTo(wp.tx, wp.ty); ctx.stroke();
  ctx.fillStyle = rgba(skin, 1);
  ellipse(ctx, wp.hx, wp.hy, 0.036, 0.036); ctx.fill();
  const tw2 = 0.4 + 0.6 * sp.raise;
  glow(ctx, wp.tx, wp.ty, 0.06 + 0.05 * tw2, kit.accent, 0.3 + 0.5 * tw2);
  ctx.restore();
}

function drawSparks(ctx, S, X, Y, k, dir, kit, sp, amt) {
  if (!sp.live || amt <= 0) return;
  const sa = sp.a - RELEASE;
  const life = 1.9;
  if (sa < 0 || sa > life) return;
  const rp = wandPose({ raise: 1, swing: easeInOut(clamp01((RELEASE - 0.55) / 0.95)) }, S.b);
  const cx = X + dir * k * rp.tx, cy = Y + k * rp.ty;
  const n = Math.round(10 * amt);
  const e = easeOut(sa / life);
  for (let j = 0; j < n; j++) {
    const f = n > 1 ? j / (n - 1) : 0.5;
    const th = lerp(-2.5, 0.1, f);
    const R = 0.62 * k * (0.7 + 0.3 * hash01(j, 7));
    for (let tr = 2; tr >= 0; tr--) {
      const st = sa - tr * 0.07;
      if (st < 0) continue;
      const r = R * easeOut(clamp01(st / life));
      const x = cx + dir * r * Math.cos(th), y = cy + r * Math.sin(th) + 0.1 * k * st * st;
      const fade = smoothstep(0, 0.12, sa) * (1 - smoothstep(0.95, life, sa)) * (tr ? 0.35 / tr : 1);
      const rad = k * (0.026 - 0.008 * e) * (tr ? 0.7 : 1);
      ctx.fillStyle = rgba(j % 2 ? kit.light : kit.accent, fade);
      ellipse(ctx, x, y, rad, rad);
      ctx.fill();
    }
  }
  glow(ctx, cx, cy, 0.25 * k, kit.accent, 0.4 * (1 - smoothstep(0, 0.6, sa)));
}

function drawCauldron(ctx, S, px, Y, u, kit, sp) {
  const b = S.b;
  const R = 0.2 * u;
  const iron = grey(S, kit, 0), ironHi = grey(S, kit, 0.3), ironLo = shadeHex(iron, 0.62);
  const rimY = Y - 0.25 * u;
  const liquid = mixHex(kit.accent, kit.light, 0.1);
  // legs
  ctx.fillStyle = rgba(ironLo, 1);
  for (const sx of [-1, 0.0, 1]) {
    ctx.beginPath();
    ctx.moveTo(px + sx * 0.13 * u - 0.03 * u, Y - 0.06 * u);
    ctx.lineTo(px + sx * 0.14 * u + 0.03 * u, Y - 0.06 * u);
    ctx.lineTo(px + sx * 0.16 * u + (sx ? 0.012 * u * sx : 0), Y + 0.002 * u);
    ctx.lineTo(px + sx * 0.14 * u - 0.025 * u, Y + 0.002 * u);
    ctx.closePath(); ctx.fill();
  }
  // handles (rings on each side)
  ctx.strokeStyle = rgba(ironHi, 1);
  ctx.lineWidth = 0.022 * u;
  for (const sx of [-1, 1]) {
    ctx.beginPath(); ctx.ellipse(px + sx * R * 1.1, rimY + 0.045 * u, 0.045 * u, 0.04 * u, 0, 0, Math.PI * 2); ctx.stroke();
  }
  // body, banded shading
  const bg = ctx.createLinearGradient(px - R, 0, px + R, 0);
  bg.addColorStop(0, rgba(ironLo, 1)); bg.addColorStop(0.35, rgba(iron, 1)); bg.addColorStop(0.6, rgba(iron, 1)); bg.addColorStop(0.7, rgba(ironHi, 1)); bg.addColorStop(1, rgba(iron, 1));
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.moveTo(px - R * 0.97, rimY);
  ctx.bezierCurveTo(px - R * 1.3, Y - 0.1 * u, px - R * 0.8, Y - 0.04 * u, px, Y - 0.04 * u);
  ctx.bezierCurveTo(px + R * 0.8, Y - 0.04 * u, px + R * 1.3, Y - 0.1 * u, px + R * 0.97, rimY);
  ctx.closePath(); ctx.fill();
  // body glow from the brew
  glow(ctx, px, rimY + 0.03 * u, 0.2 * u, kit.accent, 0.18 + 0.25 * sp.flare);
  // rim
  ctx.fillStyle = rgba(ironHi, 1);
  ellipse(ctx, px, rimY, R * 1.0, 0.052 * u); ctx.fill();
  ctx.fillStyle = rgba(ironLo, 1);
  ellipse(ctx, px, rimY + 0.004 * u, R * 0.88, 0.04 * u); ctx.fill();
  glow(ctx, px, rimY - 0.02 * u, 0.32 * u, kit.accent, 0.2 + 0.3 * sp.flare);
  ctx.fillStyle = rgba(liquid, 1);
  ellipse(ctx, px, rimY + 0.008 * u, R * 0.8, 0.032 * u); ctx.fill();
  const nb = 4;
  for (let i = 0; i < nb; i++) {
    const per = 2.6 - 0.3 * sp.flare;
    const q = b / per + i / nb;
    const c = Math.floor(q), f = q - c;
    const ox = (hash01(i, 5, c) - 0.5) * 1.0 * R;
    const rr = u * (0.012 + 0.026 * smoothstep(0, 0.6, f));
    const y = rimY - 0.01 * u - easeOut(f) * (0.17 + 0.07 * hash01(i, 9, c)) * u;
    const al = smoothstep(0, 0.12, f) * (1 - smoothstep(0.82, 1, f));
    ctx.fillStyle = rgba(i % 2 ? kit.light : liquid, 0.95 * al);
    ellipse(ctx, px + ox, y, rr, rr); ctx.fill();
  }
  // vapour curl
  const segs = 16;
  let prev = null;
  for (let s = 0; s <= segs; s++) {
    const f = s / segs;
    const x = px + Math.sin(f * 6.0 - b * 1.1) * 0.06 * u * (0.3 + f) + 0.03 * u * f;
    const y = rimY - 0.12 * u - f * 0.5 * u;
    if (prev) {
      ctx.strokeStyle = rgba(kit.light, (1 - f) * 0.6 * smoothstep(0, 0.12, f) * (0.8 + 0.2 * Math.sin(b * 0.7)));
      ctx.lineWidth = u * (0.04 - 0.024 * f);
      ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(x, y); ctx.stroke();
    }
    prev = [x, y];
  }
}

function drawCandle(ctx, S, x, y, u, kit, i, sp) {
  const b = S.b;
  const cx = x + Math.sin(b * 0.45 + i * 1.7) * 0.012 * u;
  const cy = y + Math.sin(b * 0.8 + i * 2.1) * 0.025 * u;
  const wh = 0.058 * u, ht = 0.12 * u;
  const fl = 1 + 0.08 * Math.sin(b * 7 + i * 3) + 0.15 * sp.flare;
  glow(ctx, cx, cy - ht - 0.03 * u, 0.15 * u * fl, kit.accent, 0.4 + 0.25 * sp.flare);
  ctx.fillStyle = rgba(kit.light, 1);
  ctx.beginPath(); ctx.rect(cx - wh / 2, cy - ht, wh, ht); ctx.fill();
  // melted pool + drips that slowly lengthen and reset
  ctx.fillStyle = rgba(mixHex(kit.light, kit.accent, 0.2), 1);
  ellipse(ctx, cx, cy - ht, wh * 0.6, 0.014 * u); ctx.fill();
  for (let d = 0; d < 2; d++) {
    const q = b / 14 + i * 0.37 + d * 0.5, f = q - Math.floor(q);
    const len = (0.02 + 0.05 * f) * u + d * 0.01 * u;
    const dx = cx + (d ? 0.016 : -0.018) * u;
    ctx.fillStyle = rgba(kit.light, 1);
    ctx.beginPath(); ctx.rect(dx - 0.007 * u, cy - ht, 0.014 * u, len); ctx.fill();
    ellipse(ctx, dx, cy - ht + len, 0.011 * u, 0.011 * u); ctx.fill();
  }
  ctx.fillStyle = rgba(kit.accent, 1);
  ctx.beginPath();
  ctx.moveTo(cx - 0.02 * u, cy - ht);
  ctx.quadraticCurveTo(cx - 0.03 * u, cy - ht - 0.045 * u * fl, cx + 0.004 * u, cy - ht - 0.09 * u * fl);
  ctx.quadraticCurveTo(cx + 0.034 * u, cy - ht - 0.04 * u * fl, cx + 0.02 * u, cy - ht);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgba(kit.light, 0.9);
  ellipse(ctx, cx, cy - ht - 0.02 * u, 0.008 * u, 0.018 * u * fl); ctx.fill();
}

function drawCat(ctx, S, x, Y, u, kit, sp) {
  const b = S.b;
  const s = 0.36 * u;
  const col = grey(S, kit, 0.05), colHi = grey(S, kit, 0.35), colLo = shadeHex(col, 0.7);
  ctx.save();
  ctx.translate(x, Y);
  ctx.scale(-s, s);
  ctx.lineCap = "round";
  const sw = Math.sin(b * 1.1) * 0.22 + (sp.live ? 0.1 * Math.sin(b * 6) : 0);
  ctx.strokeStyle = rgba(col, 1);
  ctx.lineWidth = 0.13;
  ctx.beginPath();
  ctx.moveTo(0.2, -0.08);
  ctx.bezierCurveTo(0.7, -0.05, 0.75 + sw * 0.3, -0.5, 0.45 + sw, -0.75 + sw * 0.1);
  ctx.stroke();
  ctx.strokeStyle = rgba(colLo, 1);
  ctx.lineWidth = 0.045;
  ctx.beginPath(); ctx.moveTo(0.62 + sw * 0.3, -0.5); ctx.lineTo(0.46 + sw, -0.75 + sw * 0.1); ctx.stroke();
  const bg = ctx.createLinearGradient(-0.3, 0, 0.3, 0);
  bg.addColorStop(0, rgba(col, 1)); bg.addColorStop(1, rgba(colLo, 1));
  ctx.fillStyle = bg;
  ellipse(ctx, 0, -0.34, 0.33, 0.34 * (1 + 0.02 * Math.sin(b * 1.6))); ctx.fill();
  ctx.fillStyle = rgba(colHi, 1);
  ellipse(ctx, -0.12, -0.3, 0.14, 0.2); ctx.fill();   // chest patch
  const hx = -0.12, hy = -0.82;
  ctx.fillStyle = rgba(col, 1);
  ellipse(ctx, hx, hy, 0.26, 0.23); ctx.fill();
  for (const sx of [-1, 1]) {
    ctx.fillStyle = rgba(col, 1);
    ctx.beginPath(); ctx.moveTo(hx + sx * 0.23, hy - 0.08); ctx.lineTo(hx + sx * 0.18, hy - 0.4); ctx.lineTo(hx + sx * 0.02, hy - 0.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rgba(mixHex(colHi, kit.accent, 0.35), 1);
    ctx.beginPath(); ctx.moveTo(hx + sx * 0.19, hy - 0.14); ctx.lineTo(hx + sx * 0.16, hy - 0.31); ctx.lineTo(hx + sx * 0.07, hy - 0.2); ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = rgba(colHi, 1);
  ellipse(ctx, -0.12, -0.04, 0.11, 0.06); ctx.fill();
  const bl = (b + 1.7) % 6.1;
  const lid = bl < 0.2 ? Math.sin((bl / 0.2) * Math.PI) : 0;
  for (const ex of [-0.22, -0.02]) {
    ctx.fillStyle = rgba(kit.accent, 1);
    ellipse(ctx, ex, hy - 0.01, 0.062, 0.075 * (1 - 0.9 * lid)); ctx.fill();
    ctx.fillStyle = rgba(kit.dark, 1);
    ellipse(ctx, ex, hy - 0.01, 0.016, 0.06 * (1 - 0.9 * lid)); ctx.fill();
  }
  ctx.fillStyle = rgba(mixHex(colHi, kit.accent, 0.5), 1);
  ellipse(ctx, hx - 0.12, hy + 0.07, 0.026, 0.02); ctx.fill();
  ctx.strokeStyle = rgba(colHi, 0.9);
  ctx.lineWidth = 0.02;
  for (const sy of [-1, 1]) { ctx.beginPath(); ctx.moveTo(hx - 0.2, hy + 0.08); ctx.lineTo(hx - 0.42, hy + 0.08 + sy * 0.06); ctx.stroke(); }
  ctx.restore();
}

// ---- scene ---------------------------------------------------------------
export default {
  id: "wizard-tower",
  name: "Wizard's tower",
  group: "lairs",
  blurb: "A wizard stirs a small bubbling cauldron and, now and then, flourishes his wand to send a ring of sparks arcing out.",
  motion: "stationary",
  count: { min: 0, max: 2, default: 1, noun: "Wizard" },
  natural: [
    makeKit({ main: "#7b4fc4", light: "#cdb2f5", dark: "#2a1850", accent: "#5ee6cc", second: "#a86ee0" }),
    makeKit({ main: "#2c9d9b", light: "#a8ece4", dark: "#0f3a3e", accent: "#ffc95c", second: "#52c4b0" }),
    makeKit({ main: "#c43a52", light: "#f4a8b4", dark: "#4a1220", accent: "#ffb347", second: "#e0607a" }),
    makeKit({ main: "#3f9a56", light: "#b4eebc", dark: "#143a20", accent: "#c4f26a", second: "#62c47a" }),
  ],
  atmosphere: "none",
  extras: [
    { key: "candles", type: "range", label: "Candles", min: 0, max: 1.5, step: 0.05, default: 1, help: "How many candles float and bob near the cauldron (up to three)." },
    { key: "sparks", type: "range", label: "Sparks", min: 0, max: 1.5, step: 0.05, default: 1, help: "How many sparks the spell ring throws out." },
    { key: "cat", type: "toggle", label: "Cat familiar", default: true, help: "A small cat that blinks and swishes its tail." },
  ],
  supports: { speed: true, size: true },
  labels: { speed: "Pace", size: "Size" },
  backdrop: { dark: "#100d1a", light: "#ece8f2" },
  draw(ctx, w, h, S) {
    const n = clamp(S.count | 0, 0, 2);
    if (n < 1) return;
    const ex = S.extra || {};
    const candleAmt = clamp(ex.candles ?? 1, 0, 1.5);
    const sparkAmt = clamp(ex.sparks ?? 1, 0, 1.5);
    const cat = ex.cat ?? true;
    const sz = clamp(S.size ?? 1, 0.5, 1.6);
    const k0 = tone(S, S.kit(0));

    // layout: positions relative to the cauldron, then centred as a group
    const k2 = 0.8;
    const wizRel = -0.62;
    const w2Rel = 0.62 * k2 + 0.1;
    const catRel = n > 1 ? w2Rel + 0.88 : 0.44;
    const lo = wizRel - 0.95;
    let hi = cat ? catRel + 0.12 : 0.22;
    if (n > 1) hi = Math.max(hi, w2Rel + 0.3 * k2, cat ? catRel + 0.12 : 0);
    const span = hi - lo;
    const u = Math.min(S.min * 0.54 * sz, h * 0.6, (w * 0.9) / span);
    const px = w / 2 - ((lo + hi) / 2) * u;
    const Y = h / 2 + 0.56 * u;

    const sp0 = spell(S.b, 0);
    drawCauldron(ctx, S, px, Y, u, k0, sp0);
    if (cat) drawCat(ctx, S, px + catRel * u, Y, u, tone(S, S.kit(n > 1 ? 1 : 0)), sp0);

    const nc = Math.round(2 * candleAmt);
    const cpos = [[-0.2, -0.86], [0.2, -0.97], [0.0, -1.2]];
    for (let i = 0; i < nc; i++) drawCandle(ctx, S, px + cpos[i][0] * u, Y + cpos[i][1] * u, u, k0, i, sp0);

    drawWizard(ctx, S, px + wizRel * u, Y, u, 1, k0, sp0, 0);
    drawSparks(ctx, S, px + wizRel * u, Y, u, 1, k0, sp0, sparkAmt);
    if (n > 1) {
      const k1 = tone(S, S.kit(1));
      const sp1 = spell(S.b, 1.6);
      const X2 = px + w2Rel * u;
      drawWizard(ctx, S, X2, Y, u * k2, -1, k1, sp1, 1.3);
      drawSparks(ctx, S, X2, Y, u * k2, -1, k1, sp1, sparkAmt);
    }
  },
};
