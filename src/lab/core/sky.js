// Moon and season from the local date only. No network, no location, no
// time-of-day colour grade: the scenes always keep their own colours.
// Pure functions of a Date (plus preferences), so tests can freeze time.
const RAD = Math.PI / 180;
export const MOON_MODES = Object.freeze(["on", "off"]);
// "date" follows the real phase for today; the rest pin a phase. New moon is
// not offered: it is the one phase with nothing to draw.
export const MOON_PHASES = Object.freeze({
  date: null,
  "waxing-crescent": 0.125,
  "first-quarter": 0.25,
  "waxing-gibbous": 0.375,
  full: 0.5,
  "waning-gibbous": 0.625,
  "last-quarter": 0.75,
  "waning-crescent": 0.875,
});
export const SEASONS = Object.freeze(["winter", "spring", "summer", "autumn"]);

const julian = (date) => date.getTime() / 86400000 + 2440587.5;

// Meeus, Astronomical Algorithms ch. 48 (low precision phase angle).
// Returns { age } in [0, 1) (0 new, 0.5 full) and { illum } in [0, 1].
export function moonPhase(date) {
  const T = (julian(date) - 2451545) / 36525;
  const D = (297.8501921 + 445267.1114034 * T) * RAD;
  const M = (357.5291092 + 35999.0502909 * T) * RAD;
  const Mp = (134.9633964 + 477198.8675055 * T) * RAD;
  const i =
    180 - D / RAD -
    6.289 * Math.sin(Mp) +
    2.1 * Math.sin(M) -
    1.274 * Math.sin(2 * D - Mp) -
    0.658 * Math.sin(2 * D) -
    0.214 * Math.sin(2 * Mp) -
    0.11 * Math.sin(D);
  const illum = (1 + Math.cos(i * RAD)) / 2;
  const elong = (((180 - i) % 360) + 360) % 360;
  return { age: elong / 360, illum };
}

const illumAt = (age) => (1 - Math.cos(2 * Math.PI * age)) / 2;

export function moonName(age, illum) {
  if (illum < 0.03) return "new moon";
  if (illum > 0.97) return "full moon";
  const waxing = age < 0.5;
  if (Math.abs(illum - 0.5) < 0.06) return waxing ? "first quarter moon" : "last quarter moon";
  return (waxing ? "waxing " : "waning ") + (illum < 0.5 ? "crescent" : "gibbous") + " moon";
}

// Meteorological seasons by local month (northern hemisphere).
export function seasonOf(date) {
  const m = date.getMonth();
  return m === 11 || m < 2 ? "winter" : m < 5 ? "spring" : m < 8 ? "summer" : "autumn";
}

// Everything a frame needs. prefs = { moon, moonPhase }.
// moon is null when the moon is switched off; season is always the date's.
export function skyState(date, prefs = {}) {
  const season = seasonOf(date);
  if (prefs.moon === "off") return { season, moon: null };
  const pinned = Object.hasOwn(MOON_PHASES, prefs.moonPhase) ? MOON_PHASES[prefs.moonPhase] : null;
  let { age, illum } = pinned === null ? moonPhase(date) : { age: pinned, illum: illumAt(pinned) };
  // The phase changes by about 0.0014 an hour: three decimals keep a
  // long-running scene from re-shading the moon on every frame.
  age = Math.round(age * 1000) / 1000;
  illum = Math.round(illum * 1000) / 1000;
  return { season, moon: { age, illum, name: moonName(age, illum), pinned: pinned !== null } };
}

// ---- moon -------------------------------------------------------------------
// Scenes that can see the sky: open air, the owl and the night scenes. Never
// under water or indoors.
const OPEN_AIR = new Set(["wings", "drift"]);
const SKY_SCENES = new Set(["night-sky", "fireflies", "luna-moths", "owl"]);
export function showsMoon(def) {
  return Boolean(def) && (SKY_SCENES.has(def.id) || OPEN_AIR.has(def.group));
}

// Moon glyph cells for a stage, as [{ col, row, light, halo }]. Each cell is
// shaded from a sphere lit at the moon's phase angle, so the terminator curves
// the way it does in the sky: waxing is lit on the right, waning on the left.
export function moonCells(sky, def, cols, rows, cellW, cellH, w, h) {
  if (!sky || !sky.moon || !showsMoon(def)) return [];
  const { age, illum } = sky.moon;
  if (illum < 0.03) return [];
  const R = Math.max(0.055 * Math.min(w, h), 4.5 * cellW);
  // A fixed spot in the upper right.
  const cx = w * 0.78,
    cy = h * 0.22;
  const phi = age * 2 * Math.PI;
  // Sun direction seen from the viewer (+z towards us): behind the moon at
  // new (age 0), behind us at full (age 0.5), to the side at the quarters.
  const sx = Math.sin(phi),
    sz = -Math.cos(phi);
  const out = [];
  const reach = R * 1.7;
  const c0 = Math.max(0, Math.floor((cx - reach) / cellW)),
    c1 = Math.min(cols - 1, Math.floor((cx + reach) / cellW));
  const r0 = Math.max(0, Math.floor((cy - reach) / cellH)),
    r1 = Math.min(rows - 1, Math.floor((cy + reach) / cellH));
  for (let row = r0; row <= r1; row++)
    for (let col = c0; col <= c1; col++) {
      const x = ((col + 0.5) * cellW - cx) / R,
        y = ((row + 0.5) * cellH - cy) / R;
      const d2 = x * x + y * y;
      if (d2 <= 1) {
        const z = Math.sqrt(1 - d2);
        // Lambert light from the sun direction; a faint earthshine on the
        // dark side keeps the whole disc readable at a crescent.
        const lit = Math.max(0, x * sx + z * sz);
        out.push({ col, row, light: Math.min(1, lit * 1.15) * 0.92 + 0.07, halo: false });
      } else if (d2 < 2.9 && illum > 0.25) {
        const k = (1 - (Math.sqrt(d2) - 1) / 0.7) * illum;
        if (k > 0.18) out.push({ col, row, light: k * 0.32, halo: true });
      }
    }
  return out;
}

// ---- seasons ----------------------------------------------------------------
// Air atmospheres follow the date's season; ocean and indoor ones do not.
export function seasonalKind(kind, sky) {
  if (!sky || kind !== "motes") return kind;
  return { spring: "blossom", summer: "motes", autumn: "leaves", winter: "snowfall" }[sky.season] || kind;
}

// A one-line, screen-reader friendly description for the Settings page.
export function describeSky(sky) {
  if (!sky || !sky.moon) return "The moon is hidden.";
  const { name, illum, pinned } = sky.moon;
  const lit = `${Math.round(illum * 100)}% lit`;
  if (pinned) return `Showing a ${name} (${lit}).`;
  if (illum < 0.03) return "Today is a new moon, so there is nothing to show. Pick a phase to see it.";
  return `Today: ${name} (${lit}).`;
}
