import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENES } from '../src/lab/scenes/registry.js';
import { buildState } from '../src/lab/core/engine.js';
import { defaultsFor, normalizeScene } from '../src/lab/core/settings.js';
// A trace, not a pretend renderer: real browser glyph/pixel tests are separate.
// Exclude all rigid transforms so articulation must change geometry/material.
function trace(def, t, b, patch = {}, w = 900, h = 560) {
  const calls = [], props = {};
  const ignore = new Set(['save', 'restore', 'translate', 'rotate', 'setTransform', 'transform']);
  const geometry = [];
  const ctx = new Proxy(props, {
    get(obj, key) {
      if (key in obj) return obj[key];
      if (/^create.*Gradient$/.test(key)) return (...a) => { calls.push([key, ...a]); return { addColorStop(...c) { calls.push(['colorStop', ...c]); } }; };
      return (...a) => {
        for (const v of a) if (typeof v === 'number') assert.ok(Number.isFinite(v), `${def.id} ${key} finite argument`);
        if (!ignore.has(key)) { calls.push([key, ...a]); if (['scale', 'arc', 'ellipse', 'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'fillRect'].includes(key)) geometry.push([key, ...a]); }
      };
    },
    set(obj, key, value) { obj[key] = value; calls.push(['set', key, typeof value === 'object' ? '[gradient]' : value]); return true; },
  });
  const settings = normalizeScene(def, { ...defaultsFor(def), ...patch });
  def.draw(ctx, w, h, buildState(def, settings, t, b, w, h, true));
  return { calls, geometry };
}
for (const def of SCENES) {
  test(`${def.id}: deterministic pure draw and bounded finite geometry`, () => {
    const a = trace(def, 3, 1); assert.deepEqual(trace(def, 3, 1), a); assert.ok(a.geometry.length > 0);
    for (const [w, h] of [[320, 320], [375, 420], [1800, 1100]]) trace(def, 97.5, 34.1, { count: def.count.max, size: 1.6, flow: 1.5 }, w, h);
  });
  test(`${def.id}: articulation changes non-rigid geometry or appropriate glow`, () => {
    const samples = [0, 0.4, 1, 2, 5, 9].map(b => trace(def, 3, b));
    const role = ['fireflies', 'night-sky'].includes(def.id) ? 'calls' : 'geometry';
    assert.ok(new Set(samples.map(s => JSON.stringify(s[role]))).size > 1, 'not just a translated or rotated fixed drawing');
  });
}
