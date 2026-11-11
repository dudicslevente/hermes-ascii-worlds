// 1.3.0 step 3: hammerhead and bait ball, anglerfish, axolotls.
import test from 'node:test';
import assert from 'node:assert/strict';
import { sceneById } from '../src/lab/scenes/registry.js';
import { buildState } from '../src/lab/core/engine.js';
import { normalizeScene, supportsFor } from '../src/lab/core/settings.js';
import { atmosphereFor, depthSupported, atmosphereFlecks } from '../src/lab/core/depth.js';
import { showsMoon } from '../src/lab/core/sky.js';
import { normalizeWorldSettings, patchWorldSettings } from '../src/settings-v3.js';
import { recordField } from './koi-golden.helper.mjs';

// Record what a scene draws: fills/strokes with the current transform origin.
function record(id, t, patch = {}, w = 900, h = 480, b = t) {
  const def = sceneById(id);
  const ops = [];
  let tx = 0, ty = 0;
  const stack = [];
  const ctx = new Proxy({}, {
    get(o, k) {
      if (k in o) return o[k];
      if (/Gradient$/.test(k)) return () => ({ addColorStop() {} });
      if (k === 'save') return () => stack.push([tx, ty]);
      if (k === 'restore') return () => ([tx, ty] = stack.pop() || [0, 0]);
      if (k === 'translate') return (x, y) => { tx += x; ty += y; };
      return (...a) => {
        for (const v of a) if (typeof v === 'number') assert.ok(Number.isFinite(v), `${id} ${String(k)} finite`);
        if (k === 'arc' || k === 'ellipse' || k === 'moveTo') ops.push({ k, x: tx + a[0], y: ty + a[1], comp: o.globalCompositeOperation || 'source-over' });
      };
    },
    set(o, k, v) { o[k] = v; return true; },
  });
  const settings = normalizeScene(def, { ...patch });
  def.draw(ctx, w, h, buildState(def, settings, t, b, w, h, true));
  return ops;
}

test('the three new habitats are registered with the controls they need', () => {
  const hh = sceneById('hammerhead'), af = sceneById('anglerfish'), ax = sceneById('axolotl');
  for (const def of [hh, af, ax]) {
    assert.ok(def, 'registered');
    assert.ok(def.count.max >= 3 && def.count.default >= 1);
    assert.equal(supportsFor(def).size, true);
    assert.equal(depthSupported(def), true);
    assert.ok(def.natural.length >= 3, `${def.id} has natural colour kits`);
    assert.ok(def.blurb && def.name);
  }
  assert.deepEqual(hh.extras.map((e) => e.key), ['ball', 'bait', 'scatter']);
  assert.deepEqual(af.extras.map((e) => e.key), ['glow', 'prey']);
  assert.deepEqual(ax.extras.map((e) => e.key), ['plants', 'activity']);
  assert.ok(hh.flow && af.flow && !ax.flow);
  assert.equal(atmosphereFor(hh), 'snow');
  assert.equal(atmosphereFor(af), 'snow');
  assert.equal(atmosphereFor(ax), 'silt');
  for (const def of [hh, af, ax]) assert.equal(showsMoon(def), false, 'no moon under water');
  assert.ok(atmosphereFlecks(900, 480, 3, 'silt', 0.6).length > 5);
});

test('hammerhead: the bait ball follows its settings and parts around a shark', () => {
  const count = (ops) => ops.filter((o) => o.k === 'ellipse').length;
  const base = record('hammerhead', 10, { count: 1, extras: { ball: true, bait: 40, scatter: 1 } });
  const more = record('hammerhead', 10, { count: 1, extras: { ball: true, bait: 80, scatter: 1 } });
  const none = record('hammerhead', 10, { count: 1, extras: { ball: false, bait: 80, scatter: 1 } });
  assert.ok(count(more) - count(base) >= 40, 'Bait fish adds fish');
  assert.ok(count(none) < count(base) - 30, 'Bait ball off removes the fish');
  // Scatter: with a shark passing, fish positions depend on the setting.
  let differs = false;
  for (const t of [12, 14, 14.75, 16, 18, 22]) {
    const a = record('hammerhead', t, { count: 2, extras: { scatter: 0 } }), b = record('hammerhead', t, { count: 2, extras: { scatter: 1.5 } });
    if (JSON.stringify(a) !== JSON.stringify(b)) differs = true;
  }
  assert.ok(differs, 'Scatter changes how far fish move away from sharks');
});

test('hammerhead sharks stay on stage at every count and size', () => {
  for (const count of [1, 2, 4]) for (const size of [0.5, 1, 1.6]) for (let t = 0; t < 90; t += 3.7) {
    for (const o of record('hammerhead', t, { count, size, depth: 0 })) {
      assert.ok(o.x > -0.25 * 900 && o.x < 1.25 * 900 && o.y > -0.25 * 480 && o.y < 1.25 * 480, `count ${count} size ${size} t ${t}`);
    }
  }
});

test('anglerfish: the lure glow follows its setting, prey can be switched off, the mouth is a real gap', () => {
  const dim = record('anglerfish', 5, { count: 1, extras: { glow: 0.3 } });
  const bright = record('anglerfish', 5, { count: 1, extras: { glow: 1.5 } });
  assert.notDeepEqual(dim, bright);
  const withPrey = record('anglerfish', 5, { count: 1, extras: { prey: true } });
  const without = record('anglerfish', 5, { count: 1, extras: { prey: false } });
  assert.ok(withPrey.length > without.length, 'the prey fish is drawn only when on');
  assert.ok(withPrey.some((o) => o.comp === 'destination-out'), 'mouth is cut out of the art');
});

test('axolotls: activity 0 keeps them home, plants can be hidden, eyes are cut out', () => {
  const still = [0, 7, 15, 30].map((t) => JSON.stringify(record('axolotl', t, { count: 1, depth: 0, extras: { activity: 0, plants: false } }).filter((o) => o.k === 'ellipse').slice(-1)));
  // Head position (last ellipses) does not wander at activity 0.
  assert.equal(new Set(still).size <= 2, true);
  const walk = [0, 3, 6, 9].map((t) => record('axolotl', t, { count: 1, depth: 0, extras: { activity: 1.5, plants: false } }));
  const xs = walk.map((ops) => ops.find((o) => o.k === 'ellipse').x);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 20, 'with activity they stroll');
  const plants = record('axolotl', 4, { count: 1, extras: { plants: true } }), bare = record('axolotl', 4, { count: 1, extras: { plants: false } });
  assert.ok(plants.length > bare.length + 20);
  assert.ok(bare.some((o) => o.comp === 'destination-out'));
});

test('koi and jellyfish keep Size, Scene strength, Current and Depth per scene', () => {
  let s = normalizeWorldSettings({ scene: 'koi', scenes: {} });
  assert.deepEqual([s.size, s.strength, s.flow, s.depth], [1, 1, 1, 0.6]);
  s = patchWorldSettings(s, { size: 1.4, strength: 0.5, flow: 0, depth: 0 });
  assert.deepEqual([s.scenes.koi.size, s.scenes.koi.strength, s.scenes.koi.flow, s.scenes.koi.depth], [1.4, 0.5, 0, 0]);
  assert.equal(s.scenes.jellyfish.size, 1, 'the other scene is untouched');
  s = patchWorldSettings(s, { size: 99, strength: -1, flow: 9 });
  assert.deepEqual([s.size, s.strength, s.flow], [1.6, 0.2, 1.5]);
  // A 1.2.0 record (no new fields) gets the defaults.
  const old = normalizeWorldSettings({ schemaVersion: 3, scene: 'jellyfish', scenes: { jellyfish: { count: 4 } } });
  assert.deepEqual([old.count, old.size, old.depth], [4, 1, 0.6]);
});

test('koi/jellyfish art: defaults are 1.2.0, and every new control changes the drawing', () => {
  for (const scene of ['koi', 'jellyfish']) {
    const base = { koiCount: 6, jellyCount: 7 };
    const plain = JSON.stringify(recordField(900, 480, scene, 9, base));
    assert.equal(JSON.stringify(recordField(900, 480, scene, 9, { ...base, size: 1, flow: 1, depth: 0 })), plain);
    for (const extra of [{ size: 1.4 }, { flow: 0 }, { depth: 1 }]) assert.notEqual(JSON.stringify(recordField(900, 480, scene, 9, { ...base, ...extra })), plain, `${scene} ${JSON.stringify(extra)}`);
  }
});

test('the Moon section belongs only to scenes that can show a moon', () => {
  assert.equal(showsMoon(sceneById('koi')), false);
  assert.equal(showsMoon(sceneById('night-sky')), true);
  assert.equal(showsMoon(sceneById('butterflies')), true);
  assert.equal(showsMoon(sceneById('axolotl')), false);
});
