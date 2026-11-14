// Validated, bounded, per-scene settings. Every stored value is checked on
// every read: wrong types fall back to defaults, numbers are clamped and
// non-finite numbers are rejected. Nothing here touches the DOM except
// browserStorage(), which fails soft.
import { SLOTS, DEFAULT_TINT, modesFor, slotDefaults } from "./palettes.js";
import { DEPTH_DEFAULT, depthSupported } from "./depth.js";

export const SCHEMA_VERSION = 1;
export const STORAGE_NS = "ascii-lab.v1.";
export const LIMITS = Object.freeze({
  speed: [0.1, 2],
  size: [0.5, 1.6],
  strength: [0.2, 1],
  flow: [0, 1.5],
  depth: [0, 1],
});
export const DENSITIES = Object.freeze(["fine", "balanced", "bold"]);
export const TONES = Object.freeze(["auto", "dark", "light"]);
export const MAX_RECORD_BYTES = 4096;

const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const validHex = (v, fallback) =>
  typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : fallback;
const num = (v, [lo, hi], fallback) => (isNum(v) ? Math.max(lo, Math.min(hi, v)) : fallback);

// Which universal controls a scene exposes. Anything false is hidden in the
// UI and ignored by normalisation, so there are no fake controls.
export function supportsFor(def) {
  const s = def.supports || {};
  return {
    count: s.count !== false,
    speed: s.speed !== false,
    size: s.size !== false,
    strength: false,
    density: true,
    colour: true,
    flow: Boolean(def.flow),
    depth: depthSupported(def),
  };
}

export function defaultsFor(def) {
  const extras = {};
  for (const e of def.extras || []) extras[e.key] = e.default;
  return {
    schemaVersion: SCHEMA_VERSION,
    count: def.count.default,
    speed: 1,
    size: 1,
    flow: def.flow ? (def.flow.default ?? 1) : 1,
    strength: 1,
    depth: depthSupported(def) ? DEPTH_DEFAULT : 0,
    density: "fine",
    colour: "natural",
    tint: DEFAULT_TINT,
    colors: slotDefaults(def),
    extras,
  };
}

export function normalizeScene(def, value) {
  const d = defaultsFor(def);
  const v = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const modes = modesFor(def);
  const extras = {};
  const rawExtras = v.extras && typeof v.extras === "object" && !Array.isArray(v.extras) ? v.extras : {};
  for (const e of def.extras || []) {
    const raw = rawExtras[e.key];
    extras[e.key] =
      e.type === "toggle"
        ? typeof raw === "boolean"
          ? raw
          : e.default
        : num(raw, [e.min, e.max], e.default);
  }
  const rawCount = v.count;
  return {
    schemaVersion: SCHEMA_VERSION,
    count: isNum(rawCount)
      ? Math.max(def.count.min, Math.min(def.count.max, Math.floor(rawCount)))
      : d.count,
    speed: num(v.speed, LIMITS.speed, d.speed),
    size: num(v.size, LIMITS.size, d.size),
    flow: def.flow ? num(v.flow, [def.flow.min ?? LIMITS.flow[0], def.flow.max ?? LIMITS.flow[1]], d.flow) : 1,
    // Compatibility field only: Background opacity is the single opacity control.
    strength: 1,
    // Records from 1.2.0 have no depth and get the default. Scenes without
    // depth support are pinned to 0 so a stale value can never leak in.
    depth: depthSupported(def) ? num(v.depth, LIMITS.depth, d.depth) : 0,
    density: DENSITIES.includes(v.density) ? v.density : d.density,
    colour: modes.includes(v.colour) ? v.colour : d.colour,
    tint: validHex(v.tint, d.tint),
    colors: Array.from({ length: SLOTS }, (_, i) =>
      validHex(Array.isArray(v.colors) ? v.colors[i] : null, d.colors[i]),
    ),
    extras,
  };
}

export function normalizePrefs(value, ids) {
  const v = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    schemaVersion: SCHEMA_VERSION,
    scene: ids.includes(v.scene) ? v.scene : ids[0],
    tone: TONES.includes(v.tone) ? v.tone : "dark",
    eco: v.eco === true,
    paused: v.paused === true,
    chat: v.chat === true,
  };
}

// Records written before schemaVersion existed used one flat object with
// string-typed numbers allowed by an early draft. Only fields that pass
// validation are kept; the migrated record is written back on the next edit.
export function migrateScene(def, raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return normalizeScene(def, null);
  if (raw.schemaVersion === SCHEMA_VERSION) return normalizeScene(def, raw);
  const legacy = { ...raw };
  for (const key of ["count", "speed", "size", "strength", "flow"]) {
    if (typeof legacy[key] === "string" && legacy[key].trim() !== "" && Number.isFinite(Number(legacy[key])))
      legacy[key] = Number(legacy[key]);
  }
  if (typeof legacy.color === "string" && legacy.colour === undefined) legacy.colour = legacy.color;
  return normalizeScene(def, legacy);
}

// ---- storage -------------------------------------------------------------
export function memoryStorage() {
  const m = new Map();
  return {
    persistent: false,
    get: (key) => (m.has(key) ? JSON.parse(m.get(key)) : null),
    set: (key, value) => void m.set(key, JSON.stringify(value)),
    remove: (key) => void m.delete(key),
    keys: () => [...m.keys()],
  };
}
export function browserStorage(ls = globalThis.localStorage) {
  const storage = {
    persistent: true,
    get(key) {
      const raw = ls.getItem(STORAGE_NS + key);
      if (!raw || raw.length > MAX_RECORD_BYTES) return null;
      return JSON.parse(raw);
    },
    set(key, value) {
      const text = JSON.stringify(value);
      if (text.length > MAX_RECORD_BYTES) throw new Error("Record too large");
      try {
        ls.setItem(STORAGE_NS + key, text);
      } catch (error) {
        storage.persistent = false;
        throw error;
      }
    },
    remove(key) {
      try {
        ls.removeItem(STORAGE_NS + key);
      } catch (error) {
        storage.persistent = false;
        throw error;
      }
    },
  };
  return storage;
}
export function readScene(storage, def) {
  try {
    return migrateScene(def, storage.get(`scene.${def.id}`));
  } catch {
    return normalizeScene(def, null);
  }
}
export function writeScene(storage, def, settings) {
  try {
    storage.set(`scene.${def.id}`, normalizeScene(def, settings));
    return true;
  } catch {
    return false;
  }
}
export function resetScene(storage, def) {
  try {
    storage.remove(`scene.${def.id}`);
  } catch {
    /* A failing store must never stop the reset of the in-memory settings. */
  }
  return defaultsFor(def);
}
export function readPrefs(storage, ids) {
  try {
    return normalizePrefs(storage.get("prefs"), ids);
  } catch {
    return normalizePrefs(null, ids);
  }
}
export function writePrefs(storage, prefs, ids) {
  try {
    storage.set("prefs", normalizePrefs(prefs, ids));
    return true;
  } catch {
    return false;
  }
}

// ---- rendering parameters derived from settings --------------------------
export function gridSize(width, height, density) {
  const step = { fine: 4.5, balanced: 6.5, bold: 9 }[density] || 8;
  return {
    cols: Math.max(1, Math.min(220, Math.floor(width / step))),
    rows: Math.max(1, Math.min(150, Math.floor(height / (step * 1.12)))),
  };
}
export const frameCap = (eco) => (eco ? 12 : 30);
// Articulation (wingbeats, tail waves, breathing) follows speed more gently
// than travel does, so slow scenes still move and fast scenes do not flap
// unnaturally. Exactly equals travel time at speed 1.
export const beatFromTravel = (t, speed) => t * Math.pow(speed, -0.4);
export const beatRate = (speed) => Math.pow(speed, 0.6);
