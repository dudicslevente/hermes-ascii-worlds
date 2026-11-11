// Depth: three glyph layers (far, mid, near) and a quiet far atmosphere.
// Pure functions only: no clock, no Math.random, no DOM. A frame stays a
// function of (size, time, settings), so renderAt() reproduces it exactly.
//
// Depth 0 means "one plane": every creature is mid, no atmosphere is drawn and
// the sampler takes exactly the 1.2.0 path. Larger values spread a population
// across the layers and fade the far plane towards the water or the air.
import { TAU, clamp01, fract, hash01, noise1, smoothstep } from "./util.js";

export const LAYERS = Object.freeze(["far", "mid", "near"]);
export const DEPTH_DEFAULT = 0.6;

// Bucket traits. Far creatures are smaller, slower and drawn faintly behind
// the rest; near ones are a little larger and quicker and hide what is behind.
const TRAITS = Object.freeze({
  far: Object.freeze({ layer: "far", scale: 0.7, pace: 0.62, z: 0 }),
  mid: Object.freeze({ layer: "mid", scale: 1, pace: 1, z: 0.5 }),
  near: Object.freeze({ layer: "near", scale: 1.2, pace: 1.18, z: 1 }),
});

// Deterministic depth bucket of creature i at depth amount d in [0, 1]. The
// draw is stable: raising Depth only moves more creatures out of mid, it never
// reshuffles the ones already placed. Creature 0 always stays mid, so a
// population of one keeps the hero in the main plane.
export function depthOf(i, d) {
  if (!(d > 0) || i === 0) return TRAITS.mid;
  const u = hash01(i, 911, 3);
  if (u < 0.42 * d) return TRAITS.far;
  if (u > 1 - 0.16 * d) return TRAITS.near;
  return TRAITS.mid;
}

// Per-creature drawing target and state. A far creature gets a smaller size
// and a slower travel clock (parallax); the articulation clock S.b is kept so
// its wings and fins still beat at a natural rate. Mid returns S unchanged.
export function placeAtDepth(ctx, S, i) {
  const D = S.depthOf ? S.depthOf(i) : TRAITS.mid;
  if (D.layer === "mid") return { ctx, S, D };
  const target = (S.layer && S.layer(D.layer)) || ctx;
  return { ctx: target, S: { ...S, size: S.size * D.scale, t: S.t * D.pace }, D };
}

// Which atmosphere a scene gets. A scene may set def.atmosphere explicitly;
// otherwise its group decides. Night sky and fireflies stay clean: their
// whole point is a few lights on darkness.
const BY_GROUP = { ocean: "snow", wings: "motes", drift: "motes", quiet: "dust" };
// Scenes made of a few lights on darkness: specks would only compete.
const BY_ID = { "night-sky": "none", fireflies: "none" };
export function atmosphereFor(def) {
  if (!def) return "none";
  if (typeof def.atmosphere === "string") return def.atmosphere;
  if (Object.hasOwn(BY_ID, def.id)) return BY_ID[def.id];
  return BY_GROUP[def.group] || "none";
}

// A scene has a Depth control when it has an atmosphere or declares that it
// spreads its creatures across layers (def.layered).
export function depthSupported(def) {
  return Boolean(def) && (def.layered === true || atmosphereFor(def) !== "none");
}

const KINDS = {
  // Marine snow: pale flecks sinking slowly with a soft sideways sway.
  snow: { tint: "#d4ecf2", lightTint: "#3c5f6b", density: 1 / 5200, fall: 0.018, side: 0.006, sway: 0.02, alpha: 1 },
  // Pollen/dust on the air: warm, fewer, rising and drifting sideways.
  motes: { tint: "#f2e3bd", lightTint: "#6b5a38", density: 1 / 13000, fall: -0.008, side: 0.012, sway: 0.026, alpha: 0.95 },
  // Pond silt: a few soft, slow, greenish specks hanging in still water.
  silt: { tint: "#cfe0c4", lightTint: "#56684a", density: 1 / 9000, fall: 0.004, side: 0.005, sway: 0.018, alpha: 0.85 },
  // Seasonal air (sky.js seasonalKind): spring blossom, autumn leaf flecks
  // swaying as they fall, winter snow falling a little faster and straighter.
  blossom: { tint: "#f7c6d4", lightTint: "#9a5368", density: 1 / 3000, fall: 0.006, side: 0.014, sway: 0.03, alpha: 0.95 , deepAlpha: 0.9 },
  leaves: { tint: "#eaa45e", lightTint: "#8c5427", density: 1 / 3300, fall: 0.016, side: 0.01, sway: 0.045, alpha: 0.95 , deepAlpha: 0.9 },
  snowfall: { tint: "#f4f8ff", lightTint: "#58637a", density: 1 / 2000, fall: 0.03, side: 0.004, sway: 0.016, alpha: 1, cap: 320 , deepAlpha: 0.9 },
  // Indoor dust: very few, very slow, hanging in the light.
  dust: { tint: "#efe2c8", lightTint: "#5f5444", density: 1 / 22000, fall: -0.003, side: 0.004, sway: 0.012, alpha: 0.85 },
};

// Atmosphere flecks for one frame. Each fleck is one glyph in one cell: it is
// placed directly, not painted and re-sampled, because a painted dot that
// straddles a cell border lights a 2x2 block and reads as grit, not snow.
// Two sub-depths move at different rates, which is the parallax: the deeper
// flecks are dimmer, smaller glyphs and slower.
// Returns [{ x, y, a, deep }] in stage coordinates.
export function atmosphereFlecks(w, h, t, kind, amount) {
  const k = KINDS[kind];
  if (!k || !(amount > 0)) return [];
  const n = Math.max(0, Math.min(k.cap || 140, Math.round(w * h * k.density * amount)));
  const unit = Math.min(w, h);
  const out = [];
  for (let j = 0; j < n; j++) {
    // Two thirds deep for the quiet atmospheres; seasonal air flips that so
    // most flecks sit close enough to be noticed.
    const deep = k.deepAlpha ? j % 3 === 0 : j % 3 !== 0;
    const rate = deep ? 0.55 : 1;
    const fall = k.fall * (0.7 + 0.6 * hash01(j, 2, 40)) * rate;
    const side = k.side * (hash01(j, 3, 40) * 2 - 1) * rate;
    // Each fleck wraps around the stage; the span includes a margin so it
    // fades in and out off-screen instead of popping at an edge.
    const span = 1.12;
    const fy = fract(hash01(j, 1, 40) + (t * fall * unit) / (h * span));
    const fx = fract(hash01(j, 0, 40) + (t * side * unit) / (w * span));
    const sway = noise1(t * 0.13 * rate + j * 1.7, j + 70) * k.sway * unit * rate;
    const x = (fx * span - 0.06) * w + sway;
    const y = (k.fall >= 0 ? fy : 1 - fy) * span * h - 0.06 * h;
    // Breathing brightness, plus a fade near the top and bottom edges.
    const pulse = 0.6 + 0.4 * Math.sin(TAU * (t * (0.05 + 0.07 * hash01(j, 5, 40)) + hash01(j, 6, 40)));
    const edge = smoothstep(-0.04, 0.08, y / h) * (1 - smoothstep(0.92, 1.04, y / h));
    const a = clamp01(k.alpha * (deep ? k.deepAlpha || 0.6 : 1) * pulse * edge);
    if (a < 0.08 || x < 0 || x >= w || y < 0 || y >= h) continue;
    out.push({ x, y, a, deep });
  }
  return out;
}

// Glyphs per kind as [deep, shallow]. At fine density a cell is about 4.5 px,
// so "." and "," shrink to a single pixel: seasonal kinds use inkier glyphs
// and are told apart by colour (white snow, amber leaf flecks, pink blossom).
const GLYPH_PAIRS = { snowfall: [":", "*"], leaves: [":", "*"], blossom: [":", "o"] };
export function atmosphereGlyphs(kind) {
  return GLYPH_PAIRS[kind] || [":", "+"];
}

// Ink for an atmosphere: a pale tint on dark water/air, a muted one on light.
export function atmosphereInk(kind, dark) {
  const k = KINDS[kind];
  return k ? (dark ? k.tint : k.lightTint) : null;
}
