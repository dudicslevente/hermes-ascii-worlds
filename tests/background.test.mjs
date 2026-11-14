import test from "node:test";
import assert from "node:assert/strict";
import {
  BACKGROUND_DEFAULTS,
  BACKGROUND_KEY,
  STORAGE_KEY,
  normalizeBackground,
  readBackground,
  readSettings,
  writeBackground,
  createStore,
  createBackgroundStore,
} from "../src/settings.js";
import { backgroundCss } from "../src/background.js";

const memory = (seed = {}) => {
  const data = { ...seed };
  return {
    data,
    get: (k, f) => (k in data ? data[k] : f),
    set: (k, v) => {
      data[k] = JSON.parse(JSON.stringify(v));
    },
  };
};

test("background defaults are off, 28 percent, no extra transparency", () => {
  assert.deepEqual(normalizeBackground(undefined), BACKGROUND_DEFAULTS);
  assert.equal(BACKGROUND_DEFAULTS.enabled, false);
  assert.equal(BACKGROUND_DEFAULTS.strength, 0.28);
  assert.equal(BACKGROUND_DEFAULTS.extraTransparency, false);
});

test("background normalisation clamps strength and rejects non-boolean flags", () => {
  assert.equal(normalizeBackground({ strength: 5 }).strength, 0.6);
  assert.equal(normalizeBackground({ strength: -1 }).strength, 0.01);
  assert.equal(normalizeBackground({ strength: "0.4" }).strength, 0.28);
  assert.equal(normalizeBackground({ strength: NaN }).strength, 0.28);
  assert.equal(normalizeBackground({ strength: Infinity }).strength, 0.28);
  assert.equal(normalizeBackground({ enabled: "true" }).enabled, false);
  assert.equal(normalizeBackground({ enabled: 1 }).enabled, false);
  assert.equal(normalizeBackground({ enabled: true }).enabled, true);
  assert.equal(normalizeBackground({ extraTransparency: "yes" }).extraTransparency, false);
  assert.deepEqual(Object.keys(normalizeBackground({ evil: 1, enabled: true })), [
    "schemaVersion",
    "opacityVersion",
    "enabled",
    "strength",
    "placement",
    "extraTransparency",
  ]);
  // Placement accepts only the two known values; anything else is behind.
  assert.equal(BACKGROUND_DEFAULTS.placement, "behind");
  assert.equal(normalizeBackground({ placement: "front" }).placement, "front");
  for (const bad of ["Front", "top", 1, null, {}, ["front"]])
    assert.equal(normalizeBackground({ placement: bad }).placement, "behind");
});

test("corrupted or throwing background storage falls back to off", () => {
  for (const bad of ["{", 42, [], null, "x"])
    assert.deepEqual(readBackground(memory({ [BACKGROUND_KEY]: bad })), BACKGROUND_DEFAULTS);
  const throwing = {
    get() {
      throw new SyntaxError("bad json");
    },
    set() {
      throw new Error("denied");
    },
  };
  assert.deepEqual(readBackground(throwing), BACKGROUND_DEFAULTS);
  assert.equal(writeBackground(throwing, {}), false);
});

test("background key is separate and settings.v2 is untouched", () => {
  const storage = memory();
  const store = createBackgroundStore(storage);
  store.set({ enabled: true, strength: 0.4 });
  assert.deepEqual(Object.keys(storage.data), [BACKGROUND_KEY]);
  assert.ok(!(STORAGE_KEY in storage.data));
  assert.deepEqual(storage.data[BACKGROUND_KEY], {
    schemaVersion: 1,
    opacityVersion: 1,
    enabled: true,
    strength: 0.4,
    placement: "behind",
    extraTransparency: false,
  });
  assert.equal(readSettings(storage).schemaVersion, 2);
});

test("store subscribe, unsubscribe and listener isolation", () => {
  const store = createStore(1);
  const seen = [];
  const off = store.subscribe((v) => seen.push(["a", v]));
  store.subscribe(() => {
    throw new Error("broken listener");
  });
  store.subscribe((v) => seen.push(["c", v]));
  store.set(2);
  assert.deepEqual(seen, [["a", 2], ["c", 2]]);
  off();
  store.set(3);
  assert.deepEqual(seen.at(-1), ["c", 3]);
  assert.equal(seen.filter((s) => s[0] === "a").length, 1);
  assert.equal(store.size(), 2);
});

test("background store persists clamped patches and notifies once per set", () => {
  const storage = memory();
  const store = createBackgroundStore(storage);
  const seen = [];
  const off = store.subscribe((v) => seen.push(v.strength));
  store.set({ strength: 9 });
  store.set({ extraTransparency: true });
  assert.deepEqual(seen, [0.6, 0.6]);
  assert.equal(createBackgroundStore(storage).get().extraTransparency, true);
  off();
  assert.equal(store.size(), 0);
});

test("stylesheet clears the chain of wrappers around the chat using only the documented hook, scoped to our attribute", () => {
  const css = backgroundCss("behind");
  // Above the chat surface: required on a live Desktop, where the host paints colours on wrappers many levels up.
  assert.ok(css.includes("body :has([data-chat-surface])"));
  // The body element itself is opaque on a live window and sits above the layer, so it has its own line.
  assert.ok(css.split("\n").some((l) => l.trim() === 'html[data-ascii-worlds-bg="on"] body,'));
  // Inside the chat surface, around the message list.
  assert.ok(css.includes('[data-chat-surface] :has([data-slot="aui_thread-viewport"])'));
  // Every selector is scoped under our own attribute so the rules vanish with the layer.
  const selectors = css.split("{")[0].split(",").map((x) => x.trim()).filter(Boolean);
  assert.ok(selectors.length >= 5);
  for (const sel of selectors)
    assert.ok(sel.startsWith('html[data-ascii-worlds-bg="on"]'), sel);
  // The only declaration is a transparent background, with !important, the form that was proven by hand on a live window.
  assert.equal(css.split("{")[1].split("}")[0].trim(), "background: transparent !important;");
  // !important appears exactly once, only on that declaration.
  assert.equal(css.split("!important").length - 1, 1);
  // In front draws over the app and needs no rules at all.
  assert.equal(backgroundCss("front"), "");
});

test("build version constant matches package.json", async () => {
  const { readFile } = await import("node:fs/promises");
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const { PLUGIN_VERSION } = await import("../src/settings.js");
  assert.equal(PLUGIN_VERSION, pkg.version);
});

test("this release keeps reading preferences and background keys stored by earlier builds", () => {
  assert.equal(STORAGE_KEY, "settings.v2");
  assert.equal(BACKGROUND_KEY, "background.v1");
  const storage = memory({
    "background.v1": { schemaVersion: 1, enabled: true, strength: 0.4, placement: "front", extraTransparency: true },
    "settings.v2": { scene: "jellyfish", palette: "dark", eco: true, speed: 1.2 },
  });
  const bg = readBackground(storage);
  assert.equal(bg.placement, "front");
  assert.equal(bg.enabled, true);
  assert.equal(bg.strength, 0.4);
  const s = readSettings(storage);
  assert.equal(s.scene, "jellyfish");
  assert.equal(s.palette, "auto", "a saved light or dark appearance is ignored: the artwork follows the Hermes theme");
  assert.equal(s.eco, true);
  assert.equal(s.speed, 1.2);
});

test("plugin.yaml, package.json and the built plugin agree on the version and the Hermes floor", async () => {
  const { readFile } = await import("node:fs/promises");
  const read = (p) => readFile(new URL(p, import.meta.url), "utf8");
  const pkg = JSON.parse(await read("../package.json"));
  const yaml = await read("../plugin.yaml");
  assert.match(yaml, new RegExp(`^version: "${pkg.version.replace(/\./g, "\\.")}"$`, "m"));
  assert.match(yaml, /^name: ascii-worlds$/m);
  assert.match(yaml, /^requires_hermes: ">=\d+\.\d+\.\d+"$/m);
  const built = await read("../desktop/plugin.js");
  assert.ok(built.split("\n")[0].includes(`v${pkg.version} `), "built header matches");
});
