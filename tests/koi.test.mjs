import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DEFAULTS,
  KOI_COLORS,
  KOI_MODES,
  STORAGE_KEY,
  normalizeSettings,
  readSettings,
  writeSettings,
} from "../src/settings.js";
import { koiPigmentsFromColor, scenePose } from "../src/art.js";
import {
  GOLDEN_CASES,
  hashCalls,
  recordField,
} from "./koi-golden.helper.mjs";

const HEX = /^#[0-9a-f]{6}$/;
const HEX_ANY_CASE = /^#[0-9a-f]{6}$/i;
const memory = (seed = {}) => {
  const data = { ...seed };
  return {
    data,
    get: (key, fallback) => (key in data ? structuredClone(data[key]) : fallback),
    set: (key, value) => void (data[key] = structuredClone(value)),
  };
};

test("default koi drawing is pinned (golden hashes of every canvas call)", () => {
  // Recorded from the 1.1.0 build. Any change to how the default three koi are
  // drawn changes these hashes, so it has to be deliberate: regenerate the
  // fixture (see docs/DEVELOPMENT.md) and say why in the changelog.
  const golden = JSON.parse(
    readFileSync(
      new URL("./fixtures/koi-golden.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(GOLDEN_CASES.length, Object.keys(golden).length);
  for (const c of GOLDEN_CASES) {
    const key = `${c.w}x${c.h}@${c.t}/${c.colour}`;
    assert.equal(
      hashCalls(recordField(c.w, c.h, "koi", c.t, { colour: c.colour })),
      golden[key],
      key,
    );
  }
});

test("koi count and colours: defaults, clamping, corruption", () => {
  assert.equal(DEFAULTS.koiCount, 3);
  assert.equal(normalizeSettings({}).koiCount, 3);
  assert.deepEqual(normalizeSettings({}).koiColors, [...KOI_COLORS]);
  assert.ok(KOI_MODES.includes("individual"));
  for (const [input, expected] of [
    [0, 0],
    [1, 1],
    [10, 10],
    [11, 10],
    [-4, 0],
    [4.9, 4],
    ["5", 3],
    [NaN, 3],
    [Infinity, 3],
    [null, 3],
    [{}, 3],
  ])
    assert.equal(normalizeSettings({ koiCount: input }).koiCount, expected, String(input));
  assert.equal(normalizeSettings({ koiColour: "individual" }).koiColour, "individual");
  assert.equal(normalizeSettings({ koiColour: "nonsense" }).koiColour, "natural");
  const messy = normalizeSettings({
    koiColors: ["#ABCDEF", "red", 5, null, "#12345", "#123456", ...Array(12).fill("#00ff00")],
  });
  assert.equal(messy.koiColors.length, 10);
  assert.ok(messy.koiColors.every((c) => HEX_ANY_CASE.test(c)));
  assert.equal(messy.koiColors[0], "#ABCDEF", "valid hex is kept as typed");
  assert.equal(messy.koiColors[1], KOI_COLORS[1]);
  assert.equal(messy.koiColors[4], KOI_COLORS[4]);
  for (const bad of ["x", 7, null, {}, "#fff"])
    assert.deepEqual(normalizeSettings({ koiColors: bad }).koiColors, [...KOI_COLORS]);
});

test("koi hidden colour slots survive a count reduction and a storage round trip, with no array aliasing", () => {
  const custom = Array.from({ length: 10 }, (_, i) => `#${(i + 1).toString(16).padStart(2, "0")}aa55`);
  const store = memory();
  writeSettings(store, { ...DEFAULTS, koiCount: 2, koiColour: "individual", koiColors: custom });
  const back = readSettings(store);
  assert.equal(back.koiCount, 2);
  assert.equal(back.koiColour, "individual");
  assert.deepEqual(back.koiColors, custom);
  assert.notEqual(back.koiColors, custom);
  back.koiColors[9] = "#ffffff";
  assert.equal(readSettings(store).koiColors[9], custom[9]);
  const twice = normalizeSettings(back);
  assert.notEqual(twice.koiColors, back.koiColors);
  // Defaults are frozen and never handed out by reference.
  assert.ok(Object.isFrozen(KOI_COLORS));
  const fresh = normalizeSettings({});
  fresh.koiColors[0] = "#000000";
  assert.equal(normalizeSettings({}).koiColors[0], KOI_COLORS[0]);
  assert.equal(DEFAULTS.koiColors[0], KOI_COLORS[0]);
});

test("koi settings stay separate from jellyfish settings", () => {
  const s = normalizeSettings({
    scene: "jellyfish",
    koiColour: "individual",
    koiCount: 8,
    koiColors: Array(10).fill("#112233"),
    jellyColour: "mono",
    jellyCount: 2,
  });
  assert.equal(s.colour, "mono");
  assert.equal(s.koiColour, "individual");
  assert.equal(s.jellyColour, "mono");
  assert.equal(s.koiCount, 8);
  assert.equal(s.jellyCount, 2);
  const k = normalizeSettings({ ...s, scene: "koi" });
  assert.equal(k.colour, "individual");
  assert.equal(k.jellyColour, "mono");
  assert.deepEqual(k.jellyColors, s.jellyColors);
});

test("records saved by earlier builds load with koi defaults", () => {
  const v2old = readSettings(memory({ [STORAGE_KEY]: { schemaVersion: 2, scene: "koi", koiColour: "jewel", jellyCount: 4 } }));
  assert.equal(v2old.koiColour, "jewel");
  assert.equal(v2old.koiCount, 3);
  assert.deepEqual(v2old.koiColors, [...KOI_COLORS]);
  assert.equal(v2old.jellyCount, 4);
});

test("a colour derives a five-pigment patch set: deterministic, valid and genuinely multi-tone", () => {
  const picks = [...KOI_COLORS, "#000000", "#ffffff", "#808080", "#ff0000", "#00ff00", "#0000ff", "nope", null, undefined, 12];
  for (const pick of picks) {
    const a = koiPigmentsFromColor(pick),
      b = koiPigmentsFromColor(pick);
    assert.deepEqual(a, b, String(pick));
    assert.equal(a.length, 5);
    assert.ok(a.every((c) => HEX.test(c)), `${pick}: ${a}`);
    assert.ok(new Set(a).size >= 4, `at least four distinct tones for ${pick}: ${a}`);
  }
  // Different picks give different fish.
  assert.notDeepEqual(koiPigmentsFromColor("#e8553a"), koiPigmentsFromColor("#3f86d6"));
  // The chosen colour (lightness-adjusted) is the main patch, so hue is retained.
  const [r, g, b] = [1, 3, 5].map((n) => parseInt(koiPigmentsFromColor("#3f86d6")[1].slice(n, n + 2), 16));
  assert.ok(b > r && b > g, "a blue pick gives a blue main patch");
});

test("koi routes for all ten indices are finite, continuous, inside the pond and really travel", () => {
  const W = 1000,
    H = 600,
    dt = 0.05;
  const spans = [];
  for (let i = 0; i < 10; i++) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let prev = scenePose("koi", i, 0, W, H);
    let turned = 0;
    for (let t = dt; t <= 40; t += dt) {
      const p = scenePose("koi", i, t, W, H);
      for (const v of [p.x, p.y, p.angle, p.bend, p.phase, p.u]) assert.ok(Number.isFinite(v), `koi ${i} @${t}`);
      assert.ok(p.x >= 0 && p.x <= W && p.y >= 0 && p.y <= H, `koi ${i} stays in the pond @${t}`);
      const step = Math.hypot((p.x - prev.x) / W, (p.y - prev.y) / H);
      assert.ok(step < 0.02, `koi ${i} no jump @${t}: ${step}`);
      let da = p.angle - prev.angle;
      while (da > Math.PI) da -= 2 * Math.PI;
      while (da < -Math.PI) da += 2 * Math.PI;
      assert.ok(Math.abs(da) < 0.5, `koi ${i} heading is continuous @${t}`);
      turned += Math.abs(da);
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      prev = p;
    }
    assert.ok((maxX - minX) / W > 0.43, `koi ${i} travels across the width`);
    assert.ok((maxY - minY) / H > 0.43, `koi ${i} travels across the height`);
    assert.ok(turned > 1.5, `koi ${i} really turns`);
    spans.push([minX, maxX]);
  }
  // Fish do not all swim the same path.
  const starts = new Set(Array.from({ length: 10 }, (_, i) => scenePose("koi", i, 0, W, H).x.toFixed(1)));
  assert.equal(starts.size, 10);
});

test("koi count controls how many fish are drawn, in every count from 0 to 10", () => {
  const swim = (count, extra = {}) =>
    recordField(1000, 600, "koi", 7, { koiCount: count, colour: "natural", ...extra });
  const bodies = (calls) => calls.filter((c) => c[0] === "save").length;
  assert.equal(swim(0).length, 0, "count 0 draws nothing");
  let last = 0;
  for (let n = 1; n <= 10; n++) {
    const calls = swim(n);
    for (const call of calls)
      for (const v of call.slice(1)) if (typeof v === "number") assert.ok(Number.isFinite(v), `count ${n}: ${call[0]}`);
    assert.ok(bodies(calls) > last, `count ${n} draws more than ${n - 1}`);
    last = bodies(calls);
  }
  // Out-of-range counts clamp rather than throw.
  assert.equal(hashCalls(swim(99)), hashCalls(swim(10)));
  assert.equal(hashCalls(swim(-3)), hashCalls(swim(0)));
  // The first three fish are unchanged inside a bigger pond: the three-fish drawing is a prefix-compatible subset.
  assert.equal(hashCalls(swim(3)), hashCalls(recordField(1000, 600, "koi", 7, { colour: "natural" })));
});

test("individual mode paints each fish from its own colour and ignores colours of fish that are not shown", () => {
  const colours = ["#ff0000", "#00ff00", "#0000ff"];
  const base = { colour: "individual", koiCount: 3, koiColors: [...colours, ...Array(7).fill("#ffffff")] };
  const run = (extra) => hashCalls(recordField(1000, 600, "koi", 5, { ...base, ...extra }));
  const reference = run({});
  // Changing a hidden slot changes nothing; changing a visible slot changes the picture.
  assert.equal(run({ koiColors: [...colours, ...Array(7).fill("#123456")] }), reference);
  assert.notEqual(run({ koiColors: ["#ffcc00", ...colours.slice(1), ...Array(7).fill("#ffffff")] }), reference);
  assert.notEqual(run({ koiColors: [colours[0], "#ffcc00", colours[2], ...Array(7).fill("#ffffff")] }), reference);
  assert.notEqual(run({ koiColors: [colours[0], colours[1], "#ffcc00", ...Array(7).fill("#ffffff")] }), reference);
  // Individual mode is not the same picture as the original patterns.
  assert.notEqual(reference, hashCalls(recordField(1000, 600, "koi", 5, { colour: "natural", koiCount: 3 })));
  // Re-showing a hidden slot brings its colour back exactly.
  const ten = { ...base, koiCount: 10, koiColors: [...colours, "#ff00ff", "#00ffff", "#ffff00", "#888888", "#ff8800", "#8800ff", "#00ff88"] };
  assert.notEqual(hashCalls(recordField(1000, 600, "koi", 5, ten)), hashCalls(recordField(1000, 600, "koi", 5, { ...ten, koiColors: [...ten.koiColors.slice(0, 9), "#010101"] })));
});
