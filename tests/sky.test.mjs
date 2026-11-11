// 1.3.0 step 2 (revised): the moon (real or chosen phase) and date seasons.
// No time-of-day grade, no location, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { moonPhase, moonName, seasonOf, skyState, moonCells, seasonalKind, describeSky, showsMoon, MOON_PHASES } from '../src/lab/core/sky.js';
import { atmosphereFlecks, atmosphereGlyphs } from '../src/lab/core/depth.js';
import { SCENES, sceneById } from '../src/lab/scenes/registry.js';
import { normalizeWorldSettings, patchWorldSettings, readWorldSettings, writeWorldSettings, resetWorldScene } from '../src/settings-v3.js';
import { memoryStorage } from '../src/lab/core/settings.js';

// USNO "Dates of Primary Phases of the Moon", 2026, Universal Time.
const USNO = {
  new: ['2026-01-18T19:52Z', '2026-04-17T11:52Z', '2026-07-14T09:43Z', '2026-11-09T07:02Z', '2026-12-09T00:52Z'],
  full: ['2026-01-03T10:03Z', '2026-05-31T08:45Z', '2026-08-28T04:18Z', '2026-11-24T14:53Z', '2026-12-24T01:28Z'],
  first: ['2026-03-25T19:18Z', '2026-06-21T21:55Z', '2026-11-17T11:48Z'],
  last: ['2026-02-09T12:43Z', '2026-09-04T07:51Z', '2026-12-30T18:59Z'],
};

test('real moon phase matches the USNO 2026 table', () => {
  for (const d of USNO.new) { const m = moonPhase(new Date(d)); assert.ok(m.illum < 0.01, `${d} ${m.illum}`); assert.ok(m.age < 0.01 || m.age > 0.99); }
  for (const d of USNO.full) { const m = moonPhase(new Date(d)); assert.ok(m.illum > 0.99, `${d} ${m.illum}`); assert.ok(Math.abs(m.age - 0.5) < 0.01); }
  for (const d of USNO.first) { const m = moonPhase(new Date(d)); assert.ok(Math.abs(m.illum - 0.5) < 0.03); assert.ok(Math.abs(m.age - 0.25) < 0.01); }
  for (const d of USNO.last) { const m = moonPhase(new Date(d)); assert.ok(Math.abs(m.illum - 0.5) < 0.03); assert.ok(Math.abs(m.age - 0.75) < 0.01); }
});

test('moon names follow the phase', () => {
  assert.equal(moonName(0.001, 0), 'new moon');
  assert.equal(moonName(0.5, 1), 'full moon');
  assert.equal(moonName(0.25, 0.5), 'first quarter moon');
  assert.equal(moonName(0.75, 0.5), 'last quarter moon');
  assert.equal(moonName(0.1, 0.1), 'waxing crescent moon');
  assert.equal(moonName(0.4, 0.8), 'waxing gibbous moon');
  assert.equal(moonName(0.6, 0.8), 'waning gibbous moon');
  assert.equal(moonName(0.9, 0.1), 'waning crescent moon');
});

test('every chosen phase is named correctly and is drawable', () => {
  const d = new Date(2026, 10, 10);
  const want = { 'waxing-crescent': 'waxing crescent moon', 'first-quarter': 'first quarter moon', 'waxing-gibbous': 'waxing gibbous moon', full: 'full moon', 'waning-gibbous': 'waning gibbous moon', 'last-quarter': 'last quarter moon', 'waning-crescent': 'waning crescent moon' };
  assert.deepEqual(Object.keys(MOON_PHASES).filter((k) => k !== 'date').sort(), Object.keys(want).sort());
  for (const [k, name] of Object.entries(want)) {
    const sky = skyState(d, { moon: 'on', moonPhase: k });
    assert.equal(sky.moon.name, name); assert.equal(sky.moon.pinned, true);
    assert.ok(moonCells(sky, sceneById('owl'), 160, 100, 5, 5.6, 800, 560).length > 40, k);
  }
});

test('today\'s real phase follows the date; hidden means no moon', () => {
  const full = skyState(new Date('2026-11-24T15:00Z'), { moon: 'on', moonPhase: 'date' });
  assert.equal(full.moon.name, 'full moon'); assert.equal(full.moon.pinned, false);
  const nw = skyState(new Date('2026-11-09T07:00Z'), {});
  assert.equal(nw.moon.name, 'new moon');
  assert.equal(moonCells(nw, sceneById('owl'), 160, 100, 5, 5.6, 800, 560).length, 0, 'nothing to draw at new moon');
  assert.match(describeSky(nw), /new moon/);
  const off = skyState(new Date(), { moon: 'off', moonPhase: 'full' });
  assert.equal(off.moon, null);
  assert.equal(moonCells(off, sceneById('owl'), 160, 100, 5, 5.6, 800, 560).length, 0);
  assert.equal(describeSky(off), 'The moon is hidden.');
  // Stable from moment to moment.
  assert.deepEqual(skyState(new Date(2026, 10, 20, 16, 20, 0), {}), skyState(new Date(2026, 10, 20, 16, 20, 1), {}));
});

test('the moon shows only where the sky is visible, at any time of day', () => {
  const sky = skyState(new Date(), { moonPhase: 'full' });
  const cells = (id) => moonCells(sky, sceneById(id), 160, 100, 5, 5.6, 800, 560).length;
  assert.equal(cells('manta-rays'), 0, 'no moon under water');
  assert.equal(cells('sleeping-cat'), 0, 'no moon indoors');
  for (const id of ['owl', 'night-sky', 'butterflies', 'fireflies', 'luna-moths', 'dandelion-seeds']) assert.ok(cells(id) > 40, id);
  for (const def of SCENES) assert.equal(showsMoon(def), ['night-sky', 'fireflies', 'luna-moths', 'owl'].includes(def.id) || ['wings', 'drift'].includes(def.group));
});

test('moon shading: waxing is lit on the right, waning on the left', () => {
  const side = (phase) => {
    const c = moonCells(skyState(new Date(), { moonPhase: phase }), sceneById('night-sky'), 160, 100, 5, 5.6, 800, 560).filter((m) => !m.halo);
    const mid = c.reduce((a, m) => a + m.col, 0) / c.length;
    return c.reduce((a, m) => a + (m.col - mid) * m.light, 0);
  };
  assert.ok(side('waxing-crescent') > 0 && side('first-quarter') > 0);
  assert.ok(side('waning-crescent') < 0 && side('last-quarter') < 0);
});

test('seasons follow the date and change only the open-air atmosphere', () => {
  const at = (m) => new Date(2026, m, 15);
  assert.deepEqual([0, 3, 6, 9, 11].map((m) => seasonOf(at(m))), ['winter', 'spring', 'summer', 'autumn', 'winter']);
  const k = (m) => seasonalKind('motes', skyState(at(m), {}));
  assert.deepEqual([3, 6, 9, 0].map(k), ['blossom', 'motes', 'leaves', 'snowfall']);
  for (const kind of ['snow', 'dust', 'none']) assert.equal(seasonalKind(kind, skyState(at(0), {})), kind);
  assert.equal(skyState(at(0), { moon: 'off' }).season, 'winter', 'hiding the moon keeps the season');
  for (const kind of ['blossom', 'leaves', 'snowfall']) {
    const f = atmosphereFlecks(900, 560, 7, kind, 0.6);
    assert.ok(f.length > 20 && f.length <= 320, `${kind} ${f.length}`);
    assert.equal(atmosphereGlyphs(kind).length, 2);
  }
  assert.ok(atmosphereFlecks(1800, 1400, 7, 'snowfall', 1).length <= 320);
});

test('settings: moon and phase persist; junk and old dev.2 fields fall back', () => {
  const store = memoryStorage();
  let s = normalizeWorldSettings({ scene: 'owl', scenes: {} });
  assert.deepEqual([s.moon, s.moonPhase], ['on', 'date']);
  s = patchWorldSettings(s, { moon: 'off', moonPhase: 'full' });
  assert.deepEqual([s.moon, s.moonPhase], ['off', 'full']);
  writeWorldSettings(store, s);
  const raw = store.get('settings.v3');
  assert.deepEqual([raw.moon, raw.moonPhase], ['off', 'full']);
  for (const gone of ['sky', 'hemisphere', 'skyTime', 'skySeason']) assert.ok(!(gone in raw), gone);
  const back = readWorldSettings(store);
  assert.deepEqual([back.moon, back.moonPhase], ['off', 'full']);
  assert.equal(resetWorldScene(back).moonPhase, 'full', 'Reset this scene keeps the moon choice');
  const junk = normalizeWorldSettings({ scenes: {}, moon: 'maybe', moonPhase: 'blue', sky: 'off', skyTime: 'dusk' });
  assert.deepEqual([junk.moon, junk.moonPhase], ['on', 'date']);
  assert.ok(!('skyTime' in junk) && !('sky' in junk));
});

test('the sky module stays offline and has no colour grade', () => {
  const src = readFileSync(new URL('../src/lab/core/sky.js', import.meta.url), 'utf8');
  // Literal API names searched in the source text; nothing is executed.
  for (const bad of ['fetch(', 'XMLHttpRequest', 'WebSocket', 'geolocation', 'navigator.', 'localStorage', 'Math.random', 'gradeFor']) assert.ok(!src.includes(bad), bad);
});
