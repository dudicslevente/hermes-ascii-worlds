import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULTS,
  STORAGE_KEY,
  normalizeSettings,
  readSettings,
  writeSettings,
  stableHash,
  gridSize,
  resolvePalette,
  frameCap,
} from "../src/settings.js";
import { drawField, scenePose } from "../src/art.js";

test("settings reject corrupt persisted values and only retain known fields", () => {
  assert.deepEqual(normalizeSettings(null), DEFAULTS);
  assert.deepEqual(
    normalizeSettings({
      scene: "bad",
      palette: "bad",
      density: "bad",
      speed: NaN,
      paused: "yes",
      eco: 1,
      secret: "x",
    }),
    DEFAULTS,
  );
  assert.equal(normalizeSettings({ speed: 100 }).speed, 1.5);
  assert.equal(normalizeSettings({ speed: -1 }).speed, 0.1);
});
test("storage uses synchronous SDK get(key, fallback), then validates JSON", () => {
  let saved;
  const storage = {
    get(key, fallback) {
      assert.equal(key, STORAGE_KEY);
      assert.equal(fallback, null);
      return { scene: "jellyfish" };
    },
    set(key, value) {
      saved = value;
    },
  };
  assert.equal(readSettings(storage).scene, "jellyfish");
  assert.ok(writeSettings(storage, { eco: true }));
  assert.equal(saved.eco, true);
});
test("unavailable or malformed storage is nonfatal", () => {
  const unavailable = {
    get() {
      throw Error("denied");
    },
    set() {
      throw Error("quota");
    },
  };
  assert.deepEqual(readSettings(unavailable), DEFAULTS);
  assert.equal(writeSettings(unavailable, DEFAULTS), false);
});
test("spatial glyph hashes are stable and distributed", () => {
  const hashes = new Set();
  for (let x = 0; x < 100; x++) {
    assert.equal(stableHash(x, 3), stableHash(x, 3));
    hashes.add(stableHash(x, 3));
  }
  assert.equal(hashes.size, 100);
  assert.notEqual(stableHash(1, 2), stableHash(2, 1));
});
test("grid size and frame cap are bounded", () => {
  assert.deepEqual(gridSize(0, 0, "fine"), { cols: 1, rows: 1 });
  assert.deepEqual(gridSize(1e6, 1e6, "fine"), { cols: 220, rows: 150 });
  assert.ok(gridSize(320, 500, "fine").cols > gridSize(320, 500, "bold").cols);
  assert.equal(frameCap(true), 12);
  assert.equal(frameCap(false), 30);
});
test("automatic palette follows resolved system scheme", () => {
  assert.equal(resolvePalette("auto", true), "dark");
  assert.equal(resolvePalette("auto", false), "light");
  assert.equal(resolvePalette("light", true), "light");
});
test("both procedural scenes emit finite, deterministic geometry", () => {
  function record(scene) {
    const calls = [];
    const gradient = {
      addColorStop(...args) {
        calls.push(["stop", ...args]);
      },
    };
    const ctx = new Proxy(
      {},
      {
        set(o, k, v) {
          calls.push([k, typeof v === "object" ? "gradient" : v]);
          o[k] = v;
          return true;
        },
        get(o, k) {
          if (k in o) return o[k];
          return (...args) => {
            for (const arg of args)
              if (typeof arg === "number")
                assert.ok(Number.isFinite(arg), `${k}: ${arg}`);
            calls.push([k, ...args]);
            return k.startsWith("create") ? gradient : undefined;
          };
        },
      },
    );
    drawField(ctx, 320, 500, scene, 12);
    return calls;
  }
  for (const scene of ["koi", "jellyfish"]) {
    const a = record(scene);
    assert.ok(a.length > 500);
    assert.deepEqual(a, record(scene));
  }
});

test("roaming poses span the canvas, stay continuous, and follow their tangent", () => {
  for (const scene of ["koi", "jellyfish"])
    for (let i = 0; i < (scene === "koi" ? 3 : 5); i++) {
      const poses = Array.from({ length: 301 }, (_, n) =>
        scenePose(scene, i, n / 10),
      );
      const xs = poses.map((p) => p.x),
        ys = poses.map((p) => p.y);
      assert.ok(
        Math.max(...xs) - Math.min(...xs) > 0.43,
        `${scene} ${i} x travel`,
      );
      assert.ok(
        Math.max(...ys) - Math.min(...ys) > 0.43,
        `${scene} ${i} y travel`,
      );
      for (let n = 1; n < poses.length; n++) {
        const a = poses[n - 1],
          b = poses[n];
        assert.ok(Math.hypot(b.x - a.x, b.y - a.y) < 0.02, "no teleport");
        const ahead = scenePose(scene, i, n / 10 + 0.0001);
        const tangent = Math.atan2(ahead.y - b.y, ahead.x - b.x);
        assert.ok(
          Math.cos(tangent - b.angle) > 0.99999,
          "orientation follows route",
        );
      }
      const headings = poses.map((p) => p.angle);
      assert.ok(
        Math.max(...headings) - Math.min(...headings) > 1,
        "real turning",
      );
    }
});
test("colour choices and custom tint persist independently of background", () => {
  for (const colour of ["natural", "cyan", "ember", "mono", "custom"]) {
    const v = normalizeSettings({ colour, tint: "#12aBef", palette: "light" });
    assert.equal(v.colour, colour);
    assert.equal(v.tint, "#12aBef");
    assert.equal(v.palette, "light");
  }
  for (const tint of ["red", "#123", "<script>", "#gggggg", null])
    assert.equal(normalizeSettings({ tint }).tint, DEFAULTS.tint);
});
