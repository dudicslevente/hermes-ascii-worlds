// Colour modes shared by every scene. A scene supplies natural colour kits;
// the named palettes, monochrome, a custom tint and per-creature colours are
// resolved here so every scene gets every mode through the same code path.
import { makeKit, kitFromHex } from "./util.js";

export const COLOUR_MODES = Object.freeze([
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
export const COLOUR_LABELS = Object.freeze({
  natural: "Natural",
  jewel: "Jewel / teal and violet",
  sunset: "Sunset / coral and plum",
  pastel: "Pastel / rose and sky",
  forest: "Forest / jade and gold",
  cyan: "Cyan / lilac",
  ember: "Warm / ember",
  mono: "Monochrome",
  custom: "Custom tint",
  individual: "Individual colours",
});
export const SLOTS = 10;
export const DEFAULT_TINT = "#79e6ee";

const BASES = Object.freeze({
  cyan: ["#5fe2f4", "#b99eff", "#5fe2f4", "#b99eff", "#5fe2f4", "#b99eff", "#5fe2f4", "#b99eff", "#5fe2f4", "#b99eff"],
  ember: ["#ff9b4d", "#e77854", "#ffb768", "#e86e49", "#f69d5f", "#ff9b4d", "#e77854", "#ffb768", "#e86e49", "#f69d5f"],
  jewel: [
    "#1fc9b2", "#be55e5", "#3f86d6", "#e4b44f", "#15a6c9",
    "#c44f9f", "#5cc27a", "#7a62e0", "#e0736a", "#2f9e8f",
  ],
  sunset: [
    "#f16b67", "#bc467f", "#f2b24c", "#e8845a", "#8e4a8f",
    "#ffb88a", "#d4546a", "#c97a3d", "#f48f6e", "#a64570",
  ],
  pastel: [
    "#e897b9", "#8cbbd0", "#b0d69e", "#c9b4e8", "#f5d38e",
    "#9fd6c8", "#f0b6a8", "#a9b8e8", "#d7c0a2", "#bfe0a0",
  ],
  forest: [
    "#4aaf92", "#a3bc59", "#d2a44b", "#5d8f5a", "#8aa66a",
    "#2f7f6a", "#c4b35a", "#6aa07e", "#9b8a4a", "#3d8f7f",
  ],
});
const MONO = Object.freeze([
  makeKit({ main: "#cdd3d6", light: "#f4f6f7", dark: "#566066", accent: "#9aa6ab", second: "#b4bcc0" }),
  makeKit({ main: "#b9c0c4", light: "#e6eaec", dark: "#4a545a", accent: "#8a969c", second: "#a2abb0" }),
  makeKit({ main: "#dde2e4", light: "#ffffff", dark: "#626d73", accent: "#a8b2b7", second: "#c4cacd" }),
]);

// Starting colours for a scene's ten individual slots: its natural mains,
// repeated, so switching to Individual mode starts from what was on screen.
export function slotDefaults(def) {
  return Array.from({ length: SLOTS }, (_, i) => def.natural[i % def.natural.length].main);
}

// The kit used for entity i under the given (validated) settings.
export function resolveKit(def, settings, i) {
  const slot = i % SLOTS;
  switch (settings.colour) {
    case "mono":
      return MONO[i % MONO.length];
    case "custom":
      return kitFromHex(settings.tint);
    case "individual":
      return kitFromHex(settings.colors[slot]);
    case "natural":
      return def.natural[i % def.natural.length];
    default:
      return kitFromHex((BASES[settings.colour] || BASES.jewel)[slot]);
  }
}
export function modesFor(def) {
  return def.individual === false ? COLOUR_MODES.filter((m) => m !== "individual") : COLOUR_MODES;
}
