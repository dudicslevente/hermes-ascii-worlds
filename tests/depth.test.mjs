// 1.3.0 engine: depth layers, atmosphere and flocking.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SCENES, sceneById } from '../src/lab/scenes/registry.js';
import { buildState } from '../src/lab/core/engine.js';
import { defaultsFor, normalizeScene, supportsFor } from '../src/lab/core/settings.js';
import { depthOf, placeAtDepth, atmosphereFor, atmosphereFlecks, depthSupported, DEPTH_DEFAULT } from '../src/lab/core/depth.js';
import { flockAt, STEP } from '../src/lab/core/flock.js';
import { normalizeWorldSettings, patchWorldSettings, readWorldSettings, writeWorldSettings } from '../src/settings-v3.js';
import { memoryStorage } from '../src/lab/core/settings.js';
import { GOLDEN_CASES, fingerprint } from './lab-golden.helper.mjs';

const goldens = JSON.parse(readFileSync(new URL('./fixtures/lab-v1.2.0-draw-goldens.json', import.meta.url))).goldens;

test('depth 0 draws every Lab scene exactly as 1.2.0 did (draw-call goldens)', () => {
  // The eighteen 1.2.0 Lab scenes are pinned; scenes added later have no 1.2.0 drawing.
  assert.equal(Object.keys(goldens).length, 18);
  for (const def of SCENES.filter((d) => goldens[d.id])) {
    const now = GOLDEN_CASES.map((c) => fingerprint(def, buildState, normalizeScene, defaultsFor, c, { depth: 0 }));
    assert.deepEqual(now, goldens[def.id], `${def.id} changed at depth 0`);
  }
});

test('free schooling off keeps the fish school on its 1.2.0 route at depth 0', () => {
  const def = sceneById('tiny-fish-school');
  const now = GOLDEN_CASES.map((c) => fingerprint(def, buildState, normalizeScene, defaultsFor, c, { depth: 0, extras: { cohesion: 1, free: false } }));
  assert.deepEqual(now, goldens['tiny-fish-school']);
});

test('depth buckets are deterministic, monotonic in Depth, and keep creature 0 in the main plane', () => {
  for (let i = 0; i < 60; i++) {
    assert.equal(depthOf(i, 0).layer, 'mid');
    assert.equal(depthOf(i, 0.6), depthOf(i, 0.6));
    // Raising depth only moves creatures out of mid; it never reshuffles.
    let seen = 'mid';
    for (const d of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
      const L = depthOf(i, d).layer;
      if (seen !== 'mid') assert.equal(L, seen, `creature ${i} moved ${seen} -> ${L}`);
      seen = L;
    }
  }
  for (const d of [0.3, 1]) assert.equal(depthOf(0, d).layer, 'mid');
  const at1 = Array.from({ length: 400 }, (_, i) => depthOf(i + 1, 1).layer);
  const share = (n) => at1.filter((x) => x === n).length / at1.length;
  assert.ok(share('far') > 0.3 && share('far') < 0.55, 'about two fifths far at full depth');
  assert.ok(share('near') > 0.08 && share('near') < 0.25, 'a few near at full depth');
  const far = depthOf(at1.indexOf('far') + 1, 1);
  assert.ok(far.scale < 1 && far.pace < 1);
});

test('placeAtDepth: mid returns the same context and state object; far scales size and slows travel only', () => {
  const ctx = {}, farCtx = {};
  const S = { size: 1, t: 10, b: 7, depthOf: (i) => depthOf(i, 1), layer: (n) => (n === 'far' ? farCtx : null) };
  const mid = placeAtDepth(ctx, S, 0);
  assert.equal(mid.ctx, ctx); assert.equal(mid.S, S);
  const i = Array.from({ length: 50 }, (_, k) => k).find((k) => depthOf(k, 1).layer === 'far');
  const far = placeAtDepth(ctx, S, i);
  assert.equal(far.ctx, farCtx);
  assert.ok(far.S.size < 1 && far.S.t < 10);
  assert.equal(far.S.b, 7, 'articulation clock unchanged: far wings beat at a natural rate');
  // No layered renderer: fall back to the scene's own context.
  const plain = placeAtDepth(ctx, { ...S, layer: () => null }, i);
  assert.equal(plain.ctx, ctx);
});

test('atmosphere: ocean snow, air motes, indoor dust; none for night sky and fireflies', () => {
  const kinds = Object.fromEntries(SCENES.map((d) => [d.id, atmosphereFor(d)]));
  assert.equal(kinds['night-sky'], 'none');
  assert.equal(kinds.fireflies, 'none');
  for (const id of ['manta-rays', 'bubbles', 'tiny-fish-school', 'solitary-whale']) assert.equal(kinds[id], 'snow');
  for (const id of ['butterflies', 'swallows', 'ginkgo-leaves']) assert.equal(kinds[id], 'motes');
  for (const id of ['owl', 'sleeping-cat']) assert.equal(kinds[id], 'dust');
  assert.equal(atmosphereFor(null), 'none');
});

test('atmosphere flecks are pure, inside the stage, sparse and scale with Depth', () => {
  const a = atmosphereFlecks(900, 560, 12.5, 'snow', 0.6);
  assert.deepEqual(atmosphereFlecks(900, 560, 12.5, 'snow', 0.6), a);
  assert.deepEqual(atmosphereFlecks(900, 560, 12.5, 'snow', 0), []);
  assert.deepEqual(atmosphereFlecks(900, 560, 12.5, 'none', 1), []);
  for (const f of a) {
    assert.ok(f.x >= 0 && f.x < 900 && f.y >= 0 && f.y < 560);
    assert.ok(f.a > 0 && f.a <= 1);
  }
  const full = atmosphereFlecks(900, 560, 12.5, 'snow', 1);
  assert.ok(full.length > a.length && full.length <= 140);
  // Huge stages are capped, never thousands of flecks.
  assert.ok(atmosphereFlecks(1800, 1400, 3, 'snow', 1).length <= 140);
  // Flecks move: travel time changes positions, slowly.
  const b = atmosphereFlecks(900, 560, 12.5 + 1 / 30, 'snow', 0.6);
  const moved = a.filter((f, k) => b[k] && Math.hypot(b[k].x - f.x, b[k].y - f.y) > 0).length;
  assert.ok(moved > 0);
});

test('Depth setting: default for layered scenes, pinned to 0 where unsupported, old records migrate', () => {
  for (const def of SCENES) {
    const want = depthSupported(def) ? DEPTH_DEFAULT : 0;
    assert.equal(defaultsFor(def).depth, want, def.id);
    assert.equal(supportsFor(def).depth, depthSupported(def));
    // A 1.2.0 record has no depth field.
    const { depth, ...old } = defaultsFor(def);
    assert.equal(normalizeScene(def, old).depth, want);
  }
  const night = sceneById('night-sky');
  assert.equal(depthSupported(night), false);
  assert.equal(normalizeScene(night, { depth: 1 }).depth, 0, 'a stale value cannot leak into night sky');
  const manta = sceneById('manta-rays');
  assert.equal(normalizeScene(manta, { depth: 7 }).depth, 1);
  assert.equal(normalizeScene(manta, { depth: -1 }).depth, 0);
  assert.equal(normalizeScene(manta, { depth: 'deep' }).depth, DEPTH_DEFAULT);
  assert.equal(normalizeScene(manta, { depth: NaN }).depth, DEPTH_DEFAULT);
});

test('Depth persists per scene through the v3 envelope', () => {
  const store = memoryStorage();
  let s = patchWorldSettings(normalizeWorldSettings({ scene: 'manta-rays', scenes: {} }), { depth: 0.25 });
  assert.equal(s.depth, 0.25);
  assert.ok(writeWorldSettings(store, s));
  s = readWorldSettings(store);
  assert.equal(s.scenes['manta-rays'].depth, 0.25);
  assert.equal(s.scenes.bubbles.depth, DEPTH_DEFAULT, 'other scenes keep their own value');
  s = patchWorldSettings(s, { scene: 'bubbles', depth: 0 });
  assert.equal(s.scenes['manta-rays'].depth, 0.25);
  assert.equal(s.scenes.bubbles.depth, 0);
});

test('buildState exposes depth helpers without a layered renderer', () => {
  const def = sceneById('bubbles');
  const S = buildState(def, normalizeScene(def, {}), 1, 1, 400, 300, true);
  assert.equal(S.depth, DEPTH_DEFAULT);
  assert.equal(S.layer('far'), null);
  assert.equal(S.memo, null);
  assert.equal(typeof S.depthOf(3).layer, 'string');
});

// ---- flocking -------------------------------------------------------------
const nearest = (f) => f.map((p, i) => Math.min(...f.filter((_, j) => j !== i).map((q) => Math.hypot(q.x - p.x, q.y - p.y))));

test('flock: seeking is reproducible and independent of history', () => {
  const a = flockAt({}, 'k', 16, 50, 900, 560);
  const m = {};
  for (let t = 0; t < 30; t += 0.5) flockAt(m, 'k', 16, t, 900, 560);
  flockAt(m, 'k', 16, 80, 900, 560); // a long jump re-seeds
  const back = flockAt(m, 'k', 16, 50, 900, 560); // and so does going back
  assert.deepEqual(back, a);
});

test('flock: playing forward gives the same school at any frame rate', () => {
  const m1 = {}, m2 = {};
  let r1, r2;
  for (let t = 0; t <= 9; t += 1 / 30) r1 = flockAt(m1, 'k', 12, t, 900, 560);
  for (let t = 0; t <= 9; t += 1 / 12) r2 = flockAt(m2, 'k', 12, t, 900, 560);
  assert.deepEqual(flockAt(m1, 'k', 12, 9.5, 900, 560), flockAt(m2, 'k', 12, 9.5, 900, 560));
});

test('flock: stays on stage, keeps its spacing, turns smoothly and never produces NaN', () => {
  for (const n of [1, 12, 40]) {
    const m = {};
    let prev = null, minSpacing = Infinity, sumSpacing = 0, k = 0;
    for (let t = 0; t <= 90; t += 1 / 30) {
      const f = flockAt(m, 'k', n, t, 900, 560);
      assert.equal(f.length, n);
      for (const b of f) {
        assert.ok(Number.isFinite(b.x + b.y + b.heading + b.turn));
        assert.ok(b.x >= 0 && b.x <= 900 && b.y >= 0 && b.y <= 560, `n=${n} boid left the stage`);
      }
      if (prev) for (let i = 0; i < n; i++) {
        const dh = Math.abs(((f[i].heading - prev[i].heading + Math.PI * 3) % (2 * Math.PI)) - Math.PI);
        assert.ok(dh < 0.1, 'turn rate is limited: headings sweep, never snap');
      }
      if (n > 1 && t > 10) { const nn = nearest(f); minSpacing = Math.min(minSpacing, ...nn); sumSpacing += nn.reduce((a, b) => a + b, 0) / n; k++; }
      prev = f;
    }
    if (n > 1) assert.ok(sumSpacing / k > 25 && sumSpacing / k < 90, `n=${n} mean spacing ${sumSpacing / k}`);
  }
});

test('flock: the school travels around the stage over time', () => {
  const m = {}, centres = [];
  for (let t = 0; t <= 120; t += 1 / 30) {
    const f = flockAt(m, 'k', 16, t, 900, 560);
    if (Math.round(t * 30) % 300 === 0) centres.push(f.reduce((a, b) => [a[0] + b.x / 16, a[1] + b.y / 16], [0, 0]));
  }
  const xs = centres.map((c) => c[0]), ys = centres.map((c) => c[1]);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 250 && Math.max(...ys) - Math.min(...ys) > 120);
});

test('flock: resizing rescales the school instead of scattering it; memos are independent', () => {
  const m = {};
  for (let t = 0; t <= 5; t += STEP) flockAt(m, 'k', 10, t, 900, 560);
  const wide = flockAt(m, 'k', 10, 5 + STEP, 1400, 560);
  for (const b of wide) assert.ok(b.x >= 0 && b.x <= 1400);
  const other = {};
  flockAt(other, 'k', 10, 3, 900, 560);
  assert.notEqual(other.k, m.k);
  // Changing the population re-seeds instead of indexing missing boids.
  assert.equal(flockAt(m, 'k', 14, 6, 1400, 560).length, 14);
});

test('free schooling draws through the flock and stays finite', () => {
  const def = sceneById('tiny-fish-school');
  assert.ok(def.extras.some((e) => e.key === 'free' && e.type === 'toggle' && e.default === false));
  const memo = {};
  const settings = normalizeScene(def, { count: 20, extras: { free: true } });
  let calls = 0;
  const ctx = new Proxy({}, { get: (o, k) => (k in o ? o[k] : /Gradient$/.test(k) ? () => ({ addColorStop() {} }) : (...a) => { calls++; for (const v of a) if (typeof v === 'number') assert.ok(Number.isFinite(v)); }), set: (o, k, v) => ((o[k] = v), true) });
  for (const t of [0, 1, 2, 30]) def.draw(ctx, 900, 560, buildState(def, settings, t, t, 900, 560, true, null, memo));
  assert.ok(memo.school && memo.school.boids.length === 20);
  assert.ok(calls > 0);
});
