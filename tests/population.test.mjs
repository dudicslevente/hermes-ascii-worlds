import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULTS,
  STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  normalizeSettings,
  readSettings,
  writeSettings,
} from "../src/settings.js";
import { drawField, scenePose } from "../src/art.js";

test("v1 migration restores original koi and assigns ambiguous shared tint only to jellyfish", () => {
  for (const scene of ["koi", "jellyfish"]) {
    const state = readSettings({
      get(key) {
        return key === LEGACY_STORAGE_KEY
          ? { scene, colour: "custom", tint: "#ff7722", speed: 1.1 }
          : null;
      },
    });
    assert.equal(state.koiColour, "natural");
    assert.equal(state.jellyColour, "custom");
    assert.equal(state.jellyTint, "#ff7722");
    assert.equal(state.speed, 1.1);
    assert.equal(state.schemaVersion, 2);
  }
});
test("v2 takes priority, invalid JSON falls back to legacy, corrupt fields normalize safely", () => {
  assert.equal(
    readSettings({
      get(key) {
        return key === STORAGE_KEY
          ? { koiColour: "jewel" }
          : { colour: "mono" };
      },
    }).koiColour,
    "jewel",
  );
  assert.equal(
    readSettings({
      get(key) {
        if (key === STORAGE_KEY) throw Error("bad JSON");
        return { colour: "ember" };
      },
    }).jellyColour,
    "ember",
  );
  for (const value of [null, [], "wrong", 5])
    assert.deepEqual(normalizeSettings(value), DEFAULTS);
  const v = normalizeSettings({
    jellyCount: Infinity,
    jellyColors: ["#ff0000", "#bad", null, {}, "#00ff00"],
    koiColour: "bad",
    jellyColour: "bad",
  });
  assert.equal(v.jellyCount, 5);
  assert.equal(v.jellyColors.length, 10);
  assert.equal(v.jellyColors[0], "#ff0000");
  assert.equal(v.jellyColors[1], DEFAULTS.jellyColors[1]);
  assert.equal(v.jellyColors[4], "#00ff00");
  assert.equal(v.koiColour, "natural");
  assert.equal(normalizeSettings({ jellyCount: -3 }).jellyCount, 0);
  assert.equal(normalizeSettings({ jellyCount: 100 }).jellyCount, 10);
  assert.equal(normalizeSettings({ jellyCount: 3.8 }).jellyCount, 3);
});
test("habitat modes and hidden slots survive roundtrip without array aliasing", () => {
  const a = normalizeSettings({
    koiColour: "sunset",
    jellyColour: "individual",
    jellyColors: ["#123456"],
    jellyCount: 10,
  });
  let saved;
  writeSettings(
    {
      set(key, v) {
        assert.equal(key, STORAGE_KEY);
        saved = v;
      },
    },
    { ...a, jellyCount: 0 },
  );
  const b = readSettings({
    get() {
      return saved;
    },
  });
  assert.equal(b.koiColour, "sunset");
  assert.equal(b.jellyColour, "individual");
  assert.equal(
    normalizeSettings({ ...b, jellyCount: 10 }).jellyColors[0],
    "#123456",
  );
  b.jellyColors[0] = "#ffffff";
  assert.equal(a.jellyColors[0], "#123456");
  assert.equal(saved.jellyColors[0], "#123456");
  assert.equal(DEFAULTS.jellyColors[0], "#5fe2f4");
});
test("zero through ten jellyfish produce bounded finite independent geometry and stable poses", () => {
  for (let count = 0; count <= 10; count++) {
    let saves = 0;
    const gradient = { addColorStop() {} };
    const ctx = new Proxy(
      {},
      {
        set(o, k, v) {
          assert.ok(!String(v).includes("NaN"));
          o[k] = v;
          return true;
        },
        get(o, k) {
          if (k in o) return o[k];
          return (...args) => {
            if (k === "save") saves++;
            for (const v of args)
              if (typeof v === "number") assert.ok(Number.isFinite(v), k);
            return k.startsWith("create") ? gradient : undefined;
          };
        },
      },
    );
    drawField(
      ctx,
      420,
      500,
      "jellyfish",
      12,
      normalizeSettings({
        scene: "jellyfish",
        jellyCount: count,
        jellyColour: "individual",
      }),
    );
    // Each jellyfish saves twice: once for the whole animal and once for the pulsing bell.
    assert.equal(saves, count * 2);
    for (let i = 0; i < count; i++)
      assert.deepEqual(
        scenePose("jellyfish", i, 12),
        scenePose("jellyfish", i, 12),
      );
  }
});
