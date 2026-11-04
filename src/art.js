import { KOI_COLORS } from "./settings.js";
// The vector field is never shown directly. It is sampled into glyph cells.
const TAU = Math.PI * 2;
function shape(ctx, points) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}
// Swimming rhythm. A wave travels from the head to the tail: the head hardly
// moves, the tail swings widest, and the whole body bends a little the other
// way so the fish looks like it pushes against the water.
const KOI_BEAT = 6.4; // radians per second of animation time
const KOI_WAVELENGTH = 4.6; // radians along the body (about one wave per body)
function fishSpine(s, length, t, phase, bend = 0) {
  const swing = 0.06 * Math.pow(s, 1.7);
  return [
    (0.47 - s) * length,
    Math.sin(s * KOI_WAVELENGTH - t * KOI_BEAT + phase) * length * swing +
      length * bend * s * s,
  ];
}
function fishWidth(s, length) {
  return (
    length *
    (0.019 +
      0.117 *
        Math.pow(Math.sin(Math.PI * (s * 0.91 + 0.06)), 0.8) *
        (1 - s * 0.7))
  );
}
// Alternate pigments replace actual body patches, not a single-hue screen tint.
const KOI_PIGMENTS = {
  jewel: ["#f2eddd", "#1fc9b2", "#be55e5", "#15305b", "#e4b44f"],
  sunset: ["#ffe2bd", "#f16b67", "#bc467f", "#593561", "#f2b24c"],
  pastel: ["#f5e7ed", "#e897b9", "#8cbbd0", "#8878ae", "#b0d69e"],
  forest: ["#e4e9c5", "#4aaf92", "#a3bc59", "#234a57", "#d2a44b"],
};
// Derives a five-pigment koi set (cream base, main patch, hue-shifted second
// patch, dark ink, warm gold) from one hex colour. Pure arithmetic: the same
// input always yields the same output, with no randomness or lookups.
const clamp01 = (n) => Math.max(0, Math.min(1, n));
function hexToHsl(hex) {
  const [r, g, b] = [1, 3, 5].map((n) => parseInt(hex.slice(n, n + 2), 16) / 255);
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    l = (max + min) / 2,
    d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  return [(h * 60 + 360) % 360, d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)), l];
}
function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = clamp01(s);
  l = clamp01(l);
  const c = (1 - Math.abs(2 * l - 1)) * s,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return (
    "#" +
    [r, g, b]
      .map((n) => Math.round((n + m) * 255).toString(16).padStart(2, "0"))
      .join("")
  );
}
function mixHex(a, b, t) {
  const pa = [1, 3, 5].map((n) => parseInt(a.slice(n, n + 2), 16)),
    pb = [1, 3, 5].map((n) => parseInt(b.slice(n, n + 2), 16));
  return (
    "#" +
    pa
      .map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0"))
      .join("")
  );
}
export function koiPigmentsFromColor(hex) {
  const valid = typeof hex === "string" && /^#[0-9a-f]{6}$/i.test(hex);
  const [h, s, l] = hexToHsl(valid ? hex : "#e8553a");
  // Keep the main patch readable on both pond backgrounds without changing
  // its hue, and give very pale or grey picks a little body.
  const main = hslToHex(h, s, Math.max(0.3, Math.min(0.72, l)));
  return [
    mixHex("#f4eedd", main, 0.1),
    main,
    hslToHex(h + 38, s * 0.92, Math.max(0.36, Math.min(0.74, l + 0.07))),
    hslToHex(h, Math.min(0.5, s * 0.6 + 0.1), 0.17),
    mixHex("#e6b450", main, 0.14),
  ];
}
function koi(
  ctx,
  x,
  y,
  length,
  angle,
  t,
  phase,
  variant,
  bend = 0,
  mode = "natural",
  pigments = null,
) {
  const pig = pigments || KOI_PIGMENTS[mode];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const tail = fishSpine(1, length, t, phase, bend);
  // The tail fin is a trailing part: it lags the spine and flicks wider.
  const sway = Math.sin(t * KOI_BEAT - 1.3 - phase * 0) * length * 0.06;
  const before = fishSpine(0.94, length, t, phase, bend);
  const finTurn = -Math.atan2(tail[1] - before[1], length * 0.06) * 1.1;
  // Paired pectoral fins and a split, ribbed caudal fin.
  ctx.fillStyle = "rgba(223,201,159,.38)";
  ctx.strokeStyle = "rgba(247,223,180,.42)";
  ctx.lineWidth = length * 0.003;
  for (const side of [-1, 1]) {
    // The paired fins row slowly, out of step with each other.
    const row = 1 + 0.18 * Math.sin(t * 2.6 + phase + (side > 0 ? 0 : 1.6));
    ctx.save();
    ctx.translate(length * 0.12, side * length * 0.075);
    ctx.scale(1, row);
    ctx.translate(-length * 0.12, -side * length * 0.075);
    ctx.beginPath();
    ctx.moveTo(length * 0.12, side * length * 0.075);
    ctx.bezierCurveTo(
      length * 0.08,
      side * length * 0.19,
      -length * 0.13,
      side * length * 0.24,
      -length * 0.16,
      side * length * 0.16,
    );
    ctx.quadraticCurveTo(
      -length * 0.04,
      side * length * 0.08,
      length * 0.12,
      side * length * 0.075,
    );
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(length * 0.1, side * length * 0.075);
      ctx.quadraticCurveTo(
        0,
        side * length * (0.12 + i * 0.01),
        -length * (0.07 + i * 0.02),
        side * length * (0.19 - i * 0.008),
      );
      ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.translate(tail[0], tail[1]);
    ctx.rotate(finTurn);
    ctx.translate(-tail[0], -tail[1]);
    ctx.beginPath();
    ctx.moveTo(...tail);
    ctx.bezierCurveTo(
      tail[0] - length * 0.08,
      tail[1] + side * length * 0.08,
      tail[0] - length * 0.21,
      tail[1] + side * length * 0.15 + sway,
      tail[0] - length * 0.19,
      tail[1] + side * length * 0.105 + sway,
    );
    ctx.quadraticCurveTo(
      tail[0] - length * 0.1,
      tail[1] + side * length * 0.025,
      tail[0] - length * 0.09,
      tail[1] + sway,
    );
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath();
      ctx.moveTo(...tail);
      ctx.quadraticCurveTo(
        tail[0] - length * 0.08,
        tail[1] + side * length * i * 0.014,
        tail[0] - length * (0.08 + i * 0.02),
        tail[1] + side * length * i * 0.021 + sway,
      );
      ctx.stroke();
    }
    ctx.restore();
  }
  const outline = [];
  for (let i = 0; i <= 40; i++) {
    const s = i / 40,
      p = fishSpine(s, length, t, phase, bend);
    outline.push([p[0], p[1] + fishWidth(s, length)]);
  }
  for (let i = 40; i >= 0; i--) {
    const s = i / 40,
      p = fishSpine(s, length, t, phase, bend);
    outline.push([p[0], p[1] - fishWidth(s, length)]);
  }
  ctx.save();
  shape(ctx, outline);
  ctx.clip();
  const base = ctx.createLinearGradient(0, -length * 0.13, 0, length * 0.13);
  base.addColorStop(0, "#a79575");
  base.addColorStop(0.35, pig?.[0] || "#fff3d2");
  base.addColorStop(0.64, "#e9ddbf");
  base.addColorStop(1, "#8f8266");
  ctx.fillStyle = base;
  ctx.fillRect(-length, -length, length * 2, length * 2);
  // Large overlapping patches follow the spine, not the screen grid.
  const patches =
    variant === 1
      ? [
          [0.13, 0.07, 0.11, "#d49b42"],
          [0.39, -0.045, 0.16, "#25292b"],
          [0.68, 0.025, 0.12, "#b57e2d"],
          [0.82, -0.03, 0.08, "#242c2d"],
        ]
      : [
          [0.06, 0, 0.09, "#cb3e25"],
          [0.27, -0.025, 0.14, "#e14c2d"],
          [0.48, 0.045, 0.12, "#b32d20"],
          [0.72, -0.022, 0.13, "#e54e2c"],
          [0.37, 0.055, 0.06, "#232c2f"],
          [0.83, 0.025, 0.055, "#25292a"],
        ];
  for (const [s, offset, radius, color] of patches) {
    const p = fishSpine(s, length, t, phase, bend);
    // Individual colours put the chosen hue on every fish, so the gold
    // variant fish alternates main patch and gold accent instead of ink + gold.
    ctx.fillStyle = pig
      ? pig[
          color.startsWith("#2")
            ? 3
            : variant === 1
              ? pigments && s < 0.5
                ? 1
                : 4
              : 1 + (s > 0.4 ? 1 : 0)
        ]
      : color;
    ctx.beginPath();
    ctx.ellipse(
      p[0],
      p[1] + length * offset,
      length * radius,
      length * radius * 0.65,
      0.4 + s,
      0,
      TAU,
    );
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(
      p[0] - length * radius * 0.5,
      p[1] - length * offset * 0.4,
      length * radius * 0.75,
      length * radius * 0.48,
      -0.5,
      0,
      TAU,
    );
    ctx.fill();
  }
  // A quiet spine highlight and gill arcs preserve anatomy at small sizes.
  ctx.strokeStyle = "rgba(255,247,211,.32)";
  ctx.lineWidth = length * 0.012;
  ctx.beginPath();
  for (let i = 0; i < 30; i++) {
    const p = fishSpine(i / 36, length, t, phase, bend);
    i ? ctx.lineTo(...p) : ctx.moveTo(...p);
  }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = "rgba(73,66,49,.4)";
  ctx.lineWidth = length * 0.004;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(
      length * 0.28,
      side * length * 0.045,
      length * 0.035,
      length * 0.04,
      side * 0.4,
      -0.7,
      1.7,
    );
    ctx.stroke();
    ctx.fillStyle = "#c7a451";
    ctx.beginPath();
    ctx.ellipse(
      length * 0.363,
      side * length * 0.043,
      length * 0.014,
      length * 0.012,
      0,
      0,
      TAU,
    );
    ctx.fill();
    ctx.fillStyle = "#171f21";
    ctx.beginPath();
    ctx.arc(length * 0.368, side * length * 0.043, length * 0.008, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
// Full-domain closed routes, with pulse-integrated propulsion and tangent heading.
export function scenePose(scene, index, time, width = 1, height = 1) {
  const phase = index * 2.19 + (scene === "jellyfish" ? 0.6 : 0);
  const rate = scene === "jellyfish" ? 0.14 : 0.155;
  const clock = time + 0.22 * (Math.sin(time * 1.8 + phase) - Math.sin(phase));
  const u = clock * rate + phase;
  const x = 0.5 + 0.37 * Math.sin(u) + 0.035 * Math.sin(u * 2 + phase);
  const y = 0.5 + 0.36 * Math.sin(u + 1.15 + index * 0.29);
  const dx = width * (0.37 * Math.cos(u) + 0.07 * Math.cos(2 * u + phase));
  const dy = height * 0.36 * Math.cos(u + 1.15 + index * 0.29);
  const ddx = width * (-0.37 * Math.sin(u) - 0.14 * Math.sin(2 * u + phase));
  const ddy = -height * 0.36 * Math.sin(u + 1.15 + index * 0.29);
  const bend = Math.max(
    -0.13,
    Math.min(0.13, ((dx * ddy - dy * ddx) / (dx * dx + dy * dy)) * 0.08),
  );
  return {
    x: x * width,
    y: y * height,
    angle: Math.atan2(dy, dx),
    phase,
    u,
    bend,
  };
}
function jelly(ctx, pose, radius, t, lilac, tint) {
  ctx.save();
  ctx.translate(pose.x, pose.y);
  ctx.rotate(pose.angle + Math.PI / 2);
  const phase = pose.phase;
  const r = radius;
  // A jellyfish swims in pulses: the bell snaps shut quickly, then relaxes
  // slowly while the tentacles trail behind and straighten out.
  const stroke = Math.sin(t * 3.4 + phase);
  const squeeze = stroke > 0 ? Math.pow(stroke, 0.75) : stroke * 0.55;
  const drag = Math.sin(t * 3.4 + phase - 1.2);
  const bellX = 1 - 0.14 * squeeze;
  const bellY = 1 + 0.1 * squeeze;
  const rgb = tint
    ? [1, 3, 5].map((n) => parseInt(tint.slice(n, n + 2), 16))
    : lilac
      ? [185, 158, 255]
      : [95, 226, 244];
  const color = (alpha, light = 1) =>
    `rgba(${Math.min(255, Math.round(rgb[0] * light))},${Math.min(255, Math.round(rgb[1] * light))},${Math.min(255, Math.round(rgb[2] * light))},${alpha})`;
  const turn = Math.sin(pose.u + phase) * 0.35;
  // Continuous marginal strands, increasingly curled in the trailing wake.
  for (let i = 0; i < 26; i++) {
    const q = i / 25 - 0.5,
      length = r * (2.05 + (i % 7) * 0.19);
    ctx.beginPath();
    for (let j = 0; j <= 90; j++) {
      const s = j / 90;
      const wave =
        Math.sin(s * 9 - t * 2.6 + i * 0.54) *
        (0.025 + s * 0.2) *
        (1 + 0.28 * drag);
      const curl = Math.sin(s * 19 - t * 1.8 + i) * s * s * 0.1;
      const x = q * r * 1.8 * bellX + r * (wave + curl + turn * s * s),
        y = r * 0.12 + s * length * (1 + 0.07 * drag);
      j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.strokeStyle = color(0.45 + (i % 4) * 0.12);
    ctx.lineWidth = Math.max(1.3, r * (0.014 + (i % 3) * 0.004));
    ctx.stroke();
  }
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    for (let j = 0; j <= 120; j++) {
      const s = j / 120;
      const winding = s * (10 + i * 0.6) - t * 2 + i * 0.9;
      const spread = (i - 3) * 0.25;
      const x =
        r *
        (spread * bellX +
          Math.sin(winding) * s * 0.42 * (1 + 0.25 * drag) +
          turn * s * s);
      const y =
        r *
        (0.13 +
          s * (3.1 + i * 0.12) * (1 + 0.07 * drag) +
          Math.cos(winding) * s * 0.16);
      j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.lineWidth = Math.max(1.6, r * 0.021);
    ctx.strokeStyle = color(0.78, 1.15);
    ctx.stroke();
  }
  // Broad oral-arm folds, each with two illuminated ruffled edges.
  for (let arm = 0; arm < 5; arm++)
    for (let edge = -1; edge <= 1; edge++) {
      ctx.beginPath();
      for (let j = 0; j <= 100; j++) {
        const s = j / 100,
          fold = Math.sin(s * 32 + arm * 1.7 - t * 3);
        const x =
          r *
          ((arm - 2) * 0.18 * bellX +
            Math.sin(s * 8 - t * 2.2 + arm) * s * 0.24 * (1 + 0.4 * drag) +
            turn * s * s +
            edge * (0.035 + 0.045 * fold));
        const y = r * (0.12 + s * (1.65 + arm * 0.12));
        j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.lineWidth = r * (edge === 0 ? 0.085 : 0.022);
      ctx.strokeStyle = color(edge === 0 ? 0.3 : 0.82, edge === 0 ? 0.8 : 1.12);
      ctx.stroke();
    }
  ctx.save();
  ctx.scale(bellX, bellY);
  // Project a shaded hemispherical mesh. Changing yaw reveals dimensional ribs.
  const yaw = Math.sin(pose.u * 1.3 + phase) * 0.48;
  const point = (v, a) => {
    const ring = Math.sin((v * Math.PI) / 2),
      depth = Math.cos(a) * ring;
    return [
      r * (Math.sin(a) * ring + yaw * depth * 0.18),
      r * (-0.96 * Math.cos((v * Math.PI) / 2) + depth * 0.22),
    ];
  };
  // Tessellate at glyph-visible detail, not at subpixel mesh density. The ribs
  // below retain the fine structure without thousands of redundant fills.
  const bands = 12,
    segments = 24;
  for (let band = 0; band < bands; band++)
    for (let segment = 0; segment < segments; segment++) {
      const v = band / bands,
        a = (segment / segments) * Math.PI - Math.PI / 2,
        b = ((segment + 1) / segments) * Math.PI - Math.PI / 2;
      const light =
        0.43 + 0.34 * Math.cos(a + 0.65) + 0.15 * Math.cos(v * 9 + a * 4);
      shape(ctx, [
        point(v, a),
        point(v, b),
        point((band + 1) / bands, b),
        point((band + 1) / bands, a),
      ]);
      ctx.fillStyle = color(0.9, light);
      ctx.fill();
    }
  for (let i = 0; i <= 20; i++) {
    const a = (i / 20) * Math.PI - Math.PI / 2;
    ctx.beginPath();
    for (let j = 0; j <= 32; j++) {
      const p = point(j / 32, a);
      j ? ctx.lineTo(...p) : ctx.moveTo(...p);
    }
    ctx.strokeStyle = color(i % 3 === 0 ? 0.92 : 0.42, 1.1);
    ctx.lineWidth = r * (i % 3 === 0 ? 0.019 : 0.01);
    ctx.stroke();
  }
  for (let j = 4; j <= 18; j += 2) {
    ctx.beginPath();
    for (let i = 0; i <= 64; i++) {
      const p = point(j / 22, (i / 64) * Math.PI - Math.PI / 2);
      i ? ctx.lineTo(...p) : ctx.moveTo(...p);
    }
    ctx.strokeStyle = color(0.38, 1.2);
    ctx.lineWidth = r * 0.012;
    ctx.stroke();
  }
  // Double elliptical rim and luminous scalloped marginal organs.
  for (let k = 0; k < 2; k++) {
    ctx.beginPath();
    ctx.ellipse(0, r * (0.025 + k * 0.045), r, r * 0.22, 0, 0, TAU);
    ctx.strokeStyle = color(k ? 0.6 : 1, 1.22);
    ctx.lineWidth = r * (k ? 0.018 : 0.034);
    ctx.stroke();
  }
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * TAU;
    ctx.beginPath();
    ctx.arc(
      Math.sin(a) * r * 0.97,
      Math.cos(a) * r * 0.22 + r * 0.04,
      r * 0.025,
      0,
      TAU,
    );
    ctx.fillStyle = color(0.9, 1.3);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}
// Relative koi lengths. The first three are the original sizes; the seven
// extras shrink steadily so a crowded pond stays readable. Ten is the cap to
// limit CPU use and visual clutter, as for jellyfish.
const KOI_SIZES = Object.freeze([1, 0.86, 0.75, 0.62, 0.55, 0.5, 0.46, 0.42, 0.39, 0.36]);
export function drawField(ctx, width, height, scene, time, settings = {}) {
  const min = Math.min(width, height),
    tall = height > width * 1.12;
  const clampCount = (n, fallback) =>
    Number.isFinite(n) ? Math.max(0, Math.min(10, Math.floor(n))) : fallback;
  const count =
    scene === "koi"
      ? clampCount(settings.koiCount, 3)
      : clampCount(settings.jellyCount, 5);
  for (let i = count - 1; i >= 0; i--) {
    const pose = scenePose(scene, i, time, width, height);
    if (scene === "koi")
      koi(
        ctx,
        pose.x,
        pose.y,
        min * (tall ? 0.57 : 0.48) * KOI_SIZES[i],
        pose.angle,
        time * 1.65,
        pose.phase,
        i === 1 || (i > 2 && i % 2 === 0) ? 1 : 0,
        pose.bend,
        settings.colour,
        settings.colour === "individual"
          ? koiPigmentsFromColor(settings.koiColors?.[i] ?? KOI_COLORS[i])
          : null,
      );
    else
      jelly(
        ctx,
        pose,
        min *
          0.19 *
          ([1, 0.8, 0.6, 0.43, 0.34][i] ?? 0.38 + ((i * 7) % 5) * 0.065),
        time,
        i % 2 === 1,
        settings.colour === "individual" ? settings.jellyColors?.[i] : null,
      );
  }
}
