export const JELLY_COLORS = Object.freeze([
  "#5fe2f4",
  "#b99eff",
  "#5fe2f4",
  "#b99eff",
  "#5fe2f4",
  "#ff9a76",
  "#89e0ac",
  "#f4b2df",
  "#f1d178",
  "#86b6ff",
]);
// Ten distinct starting colours for Individual koi mode. Natural mode ignores
// them, so existing users see exactly what they saw before.
export const KOI_COLORS = Object.freeze([
  "#e8553a",
  "#3f86d6",
  "#f0a93c",
  "#2fb59a",
  "#b05bd6",
  "#e8739a",
  "#7ab648",
  "#58c0e6",
  "#d6c04c",
  "#8f78e0",
]);
export const KOI_MODES = Object.freeze([
  "natural",
  "jewel",
  "sunset",
  "pastel",
  "forest",
  "cyan",
  "ember",
  "mono",
  "custom",
  "individual",
]);
export const JELLY_MODES = Object.freeze([
  "natural",
  "cyan",
  "ember",
  "mono",
  "custom",
  "individual",
]);
export const DEFAULTS = Object.freeze({
  schemaVersion: 2,
  scene: "koi",
  palette: "auto",
  density: "fine",
  colour: "natural",
  tint: "#79e6ee",
  koiColour: "natural",
  koiTint: "#79e6ee",
  koiCount: 3,
  koiColors: KOI_COLORS,
  jellyColour: "natural",
  jellyTint: "#79e6ee",
  jellyCount: 5,
  jellyColors: JELLY_COLORS,
  speed: 0.65,
  paused: false,
  eco: false,
});
export const STORAGE_KEY = "settings.v2";
export const LEGACY_STORAGE_KEY = "settings.v1";
const validTint = (v, fallback) =>
  typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
export function normalizeSettings(value) {
  const v =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const choose = (key, options) =>
    options.includes(v[key]) ? v[key] : DEFAULTS[key];
  const scene = choose("scene", ["koi", "jellyfish"]);
  const activeKoi = scene === "koi";
  const koiColour = KOI_MODES.includes(v.koiColour)
    ? v.koiColour
    : activeKoi && KOI_MODES.includes(v.colour)
      ? v.colour
      : "natural";
  const jellyColour = JELLY_MODES.includes(v.jellyColour)
    ? v.jellyColour
    : !activeKoi && JELLY_MODES.includes(v.colour)
      ? v.colour
      : "natural";
  const koiTint = validTint(
    v.koiTint,
    activeKoi ? validTint(v.tint, DEFAULTS.koiTint) : DEFAULTS.koiTint,
  );
  const jellyTint = validTint(
    v.jellyTint,
    !activeKoi ? validTint(v.tint, DEFAULTS.jellyTint) : DEFAULTS.jellyTint,
  );
  return {
    schemaVersion: 2,
    scene,
    palette: choose("palette", ["auto", "light", "dark"]),
    density: choose("density", ["fine", "balanced", "bold"]),
    colour: activeKoi ? koiColour : jellyColour,
    tint: activeKoi ? koiTint : jellyTint,
    koiColour,
    koiTint,
    koiCount:
      typeof v.koiCount === "number" && Number.isFinite(v.koiCount)
        ? Math.max(0, Math.min(10, Math.floor(v.koiCount)))
        : 3,
    koiColors: Array.from({ length: 10 }, (_, i) =>
      validTint(Array.isArray(v.koiColors) ? v.koiColors[i] : null, KOI_COLORS[i]),
    ),
    jellyColour,
    jellyTint,
    jellyCount:
      typeof v.jellyCount === "number" && Number.isFinite(v.jellyCount)
        ? Math.max(0, Math.min(10, Math.floor(v.jellyCount)))
        : 5,
    jellyColors: Array.from({ length: 10 }, (_, i) =>
      validTint(
        Array.isArray(v.jellyColors) ? v.jellyColors[i] : null,
        JELLY_COLORS[i],
      ),
    ),
    speed:
      typeof v.speed === "number" && Number.isFinite(v.speed)
        ? Math.max(0.1, Math.min(1.5, v.speed))
        : DEFAULTS.speed,
    paused: typeof v.paused === "boolean" ? v.paused : DEFAULTS.paused,
    eco: typeof v.eco === "boolean" ? v.eco : DEFAULTS.eco,
  };
}
export function readSettings(storage) {
  try {
    const current = storage.get(STORAGE_KEY, null);
    if (current && typeof current === "object" && !Array.isArray(current))
      return normalizeSettings(current);
  } catch {
    /* Try legacy storage independently, including malformed JSON. */
  }
  try {
    const old = storage.get(LEGACY_STORAGE_KEY, null);
    if (old && typeof old === "object" && !Array.isArray(old)) {
      // The old shared tint has no reliable habitat ownership. Keep it for
      // jellyfish and restore the original koi patches rather than leak it.
      return normalizeSettings({
        ...old,
        koiColour: "natural",
        koiTint: DEFAULTS.koiTint,
        jellyColour: old.colour,
        jellyTint: old.tint,
      });
    }
  } catch {
    /* Local preferences must never prevent the artwork from starting. */
  }
  return normalizeSettings(null);
}
export function writeSettings(storage, settings) {
  try {
    storage.set(STORAGE_KEY, normalizeSettings(settings));
    return true;
  } catch {
    return false;
  }
}
export function browserStorage() {
  return {
    get(key) {
      const raw = localStorage.getItem(`ascii-worlds.${key}`);
      return raw ? JSON.parse(raw) : null;
    },
    set(key, value) {
      localStorage.setItem(`ascii-worlds.${key}`, JSON.stringify(value));
    },
  };
}
export function stableHash(x, y, seed = 0) {
  let n =
    Math.imul(x + 13, 374761393) ^
    Math.imul(y + 31, 668265263) ^
    Math.imul(seed + 7, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
}
export function gridSize(width, height, density) {
  const step = { fine: 4.5, balanced: 6.5, bold: 9 }[density] || 8;
  return {
    cols: Math.max(1, Math.min(220, Math.floor(width / step))),
    rows: Math.max(1, Math.min(150, Math.floor(height / (step * 1.12)))),
  };
}
export function resolvePalette(setting, dark) {
  return setting === "auto" ? (dark ? "dark" : "light") : setting;
}
export function frameCap(eco) {
  return eco ? 12 : 30;
}

// ---- Background mode preferences and tiny in-module stores ----
// Shown on the Background layer and in the Check background report so a console or a bug
// report can tell exactly which build is running. Kept equal to package.json
// by a unit test.
export const PLUGIN_VERSION = "1.1.0";
export const BACKGROUND_KEY = "background.v1";
export const BACKGROUND_MIN = 0.08;
// The catalog build (npm run build:catalog) rewrites this to false and removes
// the code between @chat-area markers, leaving only the Whole window placement.
const CHAT_AREA = true;
export const BACKGROUND_MAX = 0.6;
export const BACKGROUND_DEFAULTS = Object.freeze({
  schemaVersion: 1,
  enabled: false,
  strength: 0.28,
  // "behind" draws under the chat and needs the host's opaque wrappers cleared;
  // "front" draws over everything at low strength and never depends on them.
  placement: CHAT_AREA ? "behind" : "front",
  // Deprecated since 1.3.0 and ignored. Clearing every wrapper above the chat
  // is now part of Background mode itself, because the old two-level toggle
  // never reached the wrappers a live Desktop paints. The field is still read
  // and written so values saved by 1.2.x stay valid.
  extraTransparency: false,
});
export function normalizeBackground(value) {
  const v =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    schemaVersion: 1,
    // Only a literal true turns the layer on; anything odd means off.
    enabled: v.enabled === true,
    strength:
      typeof v.strength === "number" && Number.isFinite(v.strength)
        ? Math.max(BACKGROUND_MIN, Math.min(BACKGROUND_MAX, v.strength))
        : BACKGROUND_DEFAULTS.strength,
    placement: CHAT_AREA && v.placement !== "front" ? "behind" : "front",
    extraTransparency: v.extraTransparency === true,
  };
}
export function readBackground(storage) {
  try {
    return normalizeBackground(storage.get(BACKGROUND_KEY, null));
  } catch {
    return normalizeBackground(null);
  }
}
export function writeBackground(storage, value) {
  try {
    storage.set(BACKGROUND_KEY, normalizeBackground(value));
    return true;
  } catch {
    return false;
  }
}
// Minimal subscribe/get/set store. Listener errors never break the setter.
export function createStore(initial) {
  let value = initial;
  const listeners = new Set();
  return {
    get: () => value,
    set(next) {
      value = next;
      for (const fn of [...listeners]) {
        try {
          fn(value);
        } catch {
          /* One broken listener must not block the others. */
        }
      }
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    size: () => listeners.size,
  };
}
export function createBackgroundStore(storage) {
  const store = createStore(readBackground(storage));
  return {
    get: store.get,
    subscribe: store.subscribe,
    size: store.size,
    // Accepts a partial patch; validates, persists, then notifies.
    set(patch) {
      const next = normalizeBackground({ ...store.get(), ...patch });
      const saved = writeBackground(storage, next);
      store.set(next);
      return saved;
    },
  };
}
