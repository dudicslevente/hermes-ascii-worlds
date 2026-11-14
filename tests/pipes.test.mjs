// Pipes habitat: registration, determinism, bounds and colour.
import test from 'node:test';
import assert from 'node:assert/strict';
import { sceneById } from '../src/lab/scenes/registry.js';
import { buildState } from '../src/lab/core/engine.js';
import { normalizeScene, supportsFor, defaultsFor } from '../src/lab/core/settings.js';
import { depthSupported, atmosphereFor } from '../src/lab/core/depth.js';
import { showsMoon } from '../src/lab/core/sky.js';
import { WORLD_IDS, normalizeWorldSettings, patchWorldSettings } from '../src/settings-v3.js';

// A recording context: every call is kept, numbers must be finite, arc and
// ellipse radii must be non-negative (a negative radius throws in a browser).
function record(patch = {}, t = 12, { w = 900, h = 480, dark = true, b = t, memo = null } = {}) {
  const def = sceneById('pipes');
  const ops = [];
  const stack = [];
  const ctx = new Proxy({}, {
    get(o, k) {
      if (k in o) return o[k];
      if (/Gradient$/.test(k)) return () => ({ addColorStop(_, c) { ops.push({ k: 'stop', c }); } });
      if (k === 'save') return () => stack.push(1);
      if (k === 'restore') return () => stack.pop();
      return (...a) => {
        for (const v of a) if (typeof v === 'number') assert.ok(Number.isFinite(v), `${String(k)} got a non-finite number`);
        if (k === 'arc') assert.ok(a[2] >= 0, `arc radius ${a[2]}`);
        if (k === 'ellipse') assert.ok(a[2] >= 0 && a[3] >= 0, `ellipse radii ${a[2]} ${a[3]}`);
        ops.push({ k, a });
      };
    },
    set(o, k, v) {
      if (typeof v === 'number') assert.ok(Number.isFinite(v), `${String(k)} set to a non-finite number`);
      if (k === 'fillStyle' || k === 'strokeStyle') ops.push({ k, c: String(v) });
      o[k] = v;
      return true;
    },
  });
  const settings = normalizeScene(def, patch);
  assert.equal(stack.length, 0);
  def.draw(ctx, w, h, buildState(def, settings, t, b, w, h, dark, null, memo));
  assert.equal(stack.length, 0, 'save/restore are balanced');
  return ops;
}

test('pipes is registered with the controls it needs', () => {
  const def = sceneById('pipes');
  assert.ok(def, 'registered');
  assert.ok(WORLD_IDS.includes('pipes'));
  assert.equal(def.group, 'quiet');
  assert.ok(def.blurb && def.name && def.natural.length >= 2);
  assert.deepEqual(def.count, { min: 0, max: 2, default: 2, noun: 'Pipe' });
  assert.deepEqual(def.extras.map((e) => e.key), ['bubbles', 'fittings']);
  assert.equal(supportsFor(def).flow, true);
  assert.equal(supportsFor(def).size, true);
  assert.equal(depthSupported(def), false, 'indoor scene: no depth layers');
  assert.equal(atmosphereFor(def), 'none');
  assert.equal(showsMoon(def), false, 'no moon indoors');
  assert.equal(defaultsFor(def).count, 2);
});

test('pipes: counts 1 and 2 add pipes', () => {
  const one = record({ count: 1 }).length, two = record({ count: 2 }).length;
  assert.ok(one > 300 && two > one + 300, `${one} < ${two}`);
});

test('pipes: a frame is a pure function of the clocks and settings', () => {
  const a = JSON.stringify(record({ count: 2 }, 31.4)), b = JSON.stringify(record({ count: 2 }, 31.4));
  assert.equal(a, b);
  assert.notEqual(a, JSON.stringify(record({ count: 2 }, 32.9)));
  // the geometry memo must not change what is drawn
  const memo = {};
  assert.equal(JSON.stringify(record({ count: 2 }, 9, { memo })), JSON.stringify(record({ count: 2 }, 9)));
  assert.equal(JSON.stringify(record({ count: 2 }, 9, { memo })), JSON.stringify(record({ count: 2 }, 9)), 'cached layout');
});

test('pipes: finite and valid at extreme settings, sizes and stages', () => {
  for (const [w, h] of [[900, 480], [420, 300], [300, 640], [1800, 1000]])
    for (const size of [0.5, 1, 1.6]) for (const flow of [0, 1, 1.5]) for (const dark of [true, false])
      for (const t of [0, 7.31, 600.5])
        record({ count: 2, size, flow, extras: { bubbles: 1.5, fittings: true } }, t, { w, h, dark });
  record({ count: 2, extras: { bubbles: 0, fittings: false }, flow: 0 }, 5);
});

test('pipes: Bubbles and Valve and gauge change the picture', () => {
  const circles = (ops) => ops.filter((o) => o.k === 'arc').length;
  const many = record({ count: 2, extras: { bubbles: 1.5 } }), none = record({ count: 2, extras: { bubbles: 0 } });
  assert.ok(circles(many) > circles(none) + 80, 'bubbles add rings');
  const on = record({ count: 2, extras: { fittings: true } }).length, off = record({ count: 2, extras: { fittings: false } }).length;
  assert.ok(on > off + 20, 'fittings add the valve wheel and the gauge');
  const calm = JSON.stringify(record({ count: 2, flow: 0 }, 14)), hard = JSON.stringify(record({ count: 2, flow: 1.5 }, 14));
  assert.notEqual(calm, hard, 'Pressure changes the jet');
});

test('pipes: every colour mode recolours the pool as well as the liquid', () => {
  // Collect all colour strings used; the pool's gradient stops come from the kit.
  const colours = (patch) => new Set(record({ count: 2, ...patch }, 12).filter((o) => o.c).map((o) => o.c));
  const water = colours({ colour: 'natural' });
  const lava = colours({ colour: 'ember' });
  const stops = (patch) => record({ count: 2, ...patch }, 12).filter((o) => o.k === 'stop').map((o) => o.c);
  const w = stops({ colour: 'natural' }), l = stops({ colour: 'ember' });
  assert.ok(w.length >= 6, 'pool and stream gradients are present');
  assert.notDeepEqual(w, l, 'gradient stops (pool, stream) follow the colour mode');
  // pool-specific: the horizontal pool gradient stops are rgba() of the kit
  const poolStops = (patch) => stops(patch).filter((c) => c.startsWith('rgba('));
  assert.notDeepEqual(poolStops({ colour: 'natural' }), poolStops({ colour: 'custom', tint: '#ff7722' }));
  assert.notDeepEqual([...water].sort(), [...lava].sort());
  assert.notDeepEqual(poolStops({ colour: 'natural' }), poolStops({ colour: 'mono' }));
});

test('pipes: settings persist in the v3 envelope and normalise', () => {
  let s = patchWorldSettings(normalizeWorldSettings(null), { scene: 'pipes', count: 1, size: 1.3, flow: 1.2, extras: { bubbles: 0.5, fittings: false, bogus: 3 } });
  assert.equal(s.scene, 'pipes');
  assert.equal(s.count, 1);
  assert.deepEqual(s.extras, { bubbles: 0.5, fittings: false });
  s = patchWorldSettings(s, { count: 99, flow: 99 });
  assert.equal(s.count, 2);
  assert.equal(s.flow, 1.5);
  s = patchWorldSettings(s, { scene: 'owl' });
  s = patchWorldSettings(s, { scene: 'pipes' });
  assert.equal(s.extras.fittings, false, 'the pipes record is kept when switching scenes');
});
