// Exact draw-call fingerprint of a Lab scene, used to prove that Depth 0 is
// the 1.2.0 drawing. Records every canvas call and property write, including
// transforms, so any change in geometry, order or material changes the hash.
import { createHash } from 'node:crypto';
export const GOLDEN_CASES = [
  { t: 3, b: 1, w: 900, h: 560, patch: {} },
  { t: 41.7, b: 19.3, w: 375, h: 420, patch: { size: 1.4, flow: 1.3 }, max: true },
  { t: 118.2, b: 77.9, w: 1400, h: 820, patch: { strength: 0.6 }, max: true },
];
export function fingerprint(def, buildState, normalizeScene, defaultsFor, c, extra = {}) {
  const calls = [];
  const props = {};
  const ctx = new Proxy(props, {
    get(obj, key) {
      if (key in obj) return obj[key];
      if (/^create.*Gradient$/.test(key)) return (...a) => { calls.push([key, ...a]); return { addColorStop(...s) { calls.push(['stop', ...s]); } }; };
      return (...a) => { calls.push([key, ...a]); };
    },
    set(obj, key, value) { obj[key] = value; calls.push(['set', key, typeof value === 'object' ? '[obj]' : value]); return true; },
  });
  const patch = { ...defaultsFor(def), ...c.patch, ...(c.max ? { count: def.count.max } : {}), ...extra };
  const settings = normalizeScene(def, patch);
  def.draw(ctx, c.w, c.h, buildState(def, settings, c.t, c.b, c.w, c.h, true));
  return createHash('sha256').update(JSON.stringify(calls)).digest('hex').slice(0, 20);
}
