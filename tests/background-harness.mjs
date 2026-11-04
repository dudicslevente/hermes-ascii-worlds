// Background mode tests against a FAKE host page (tests/fixtures/host-bg.html).
// The page imitates only what the docs tell us; it is not Hermes Desktop.
// Needs: PLAYWRIGHT_MODULE, CHROMIUM_PATH, and ASCII_WORLDS_HARNESS (a dir that
// holds browser-deps/ with prebuilt react modules; see prepare-react.mjs).
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const project = fileURLToPath(new URL('..', import.meta.url));
const harness = process.env.ASCII_WORLDS_HARNESS || fileURLToPath(new URL('./.harness', import.meta.url));
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
await mkdir(project + 'evidence', { recursive: true });
const server = createServer(async (req, res) => {
  try {
    const p = req.url.split('?')[0];
    const target = p === '/plugin.js' ? project + 'desktop/plugin.js'
      : p.startsWith('/browser-deps/') ? harness + '/' + p.slice(1)
      : p === '/' ? project + 'tests/fixtures/host-bg.html'
      : project + 'tests/' + p.slice(1);
    const data = await readFile(target);
    res.setHeader('Content-Type', target.endsWith('.html') ? 'text/html' : 'text/javascript');
    res.end(data);
  } catch { res.statusCode = 404; res.end('nf'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
const result = { checks: [], notes: [] };
const errors = [], warnings = [], requests = [];
const INSTR = () => {
  window.instrument = { activeFrames: new Set(), ro: 0, io: 0, listeners: 0 };
  const i = window.instrument, raf = requestAnimationFrame, caf = cancelAnimationFrame;
  window.requestAnimationFrame = (fn) => { const id = raf.call(window, (t) => { i.activeFrames.delete(id); fn(t); }); i.activeFrames.add(id); return id; };
  window.cancelAnimationFrame = (id) => { i.activeFrames.delete(id); caf.call(window, id); };
  for (const [name, key] of [['ResizeObserver', 'ro'], ['IntersectionObserver', 'io']]) {
    const B = window[name];
    window[name] = class extends B { constructor(cb) { super(cb); i[key]++; this.t = true; } disconnect() { super.disconnect(); if (this.t) { i[key]--; this.t = false; } } };
  }
  const add = document.addEventListener.bind(document), rem = document.removeEventListener.bind(document);
  document.addEventListener = (n, f, o) => { if (n === 'visibilitychange') i.listeners++; return add(n, f, o); };
  document.removeEventListener = (n, f, o) => { if (n === 'visibilitychange') i.listeners--; return rem(n, f, o); };
};
async function open(query = '', { viewport = { width: 1000, height: 650 }, scheme = 'dark', reduced = 'no-preference', seed } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, colorScheme: scheme, reducedMotion: reduced });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) warnings.push(m.text()); });
  page.on('request', (r) => requests.push(r.url()));
  await page.addInitScript(INSTR);
  if (seed) await page.addInitScript((s) => { for (const [k, v] of Object.entries(s)) localStorage.setItem('mock-ascii:' + k, v); }, seed);
  await page.goto(base + query);
  if (query.includes('api=none')) await page.waitForFunction(() => window.hostTest);
  else await page.waitForFunction(() => document.querySelector('.aw-canvas')?.width > 10);
  return page;
}
// Structural signature of everything the host owns (not the pane/titlebar React trees).
const SIG = () => JSON.stringify({
  html: [...document.documentElement.attributes].map((a) => a.name + '=' + a.value),
  head: document.head.innerHTML,
  body: [...document.body.children].map((e) => e.tagName + ':' + e.id + ':' + [...e.attributes].map((a) => a.name).join(',')),
  chat: document.querySelector('[data-chat-surface]').outerHTML,
});
const count = (page, sel) => page.locator(sel).count();
const layerSel = 'body > div[data-ascii-worlds-bg="layer"]', styleSel = 'style[data-ascii-worlds-bg-style]';
async function shotDiff(page, clip) {
  // Count pixels that differ from the clip's dominant colour (the page background).
  const buf = await page.screenshot({ clip });
  return page.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data, seen = new Map();
    for (let i = 0; i < d.length; i += 4) { const k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]; seen.set(k, (seen.get(k) || 0) + 1); }
    const top = [...seen.entries()].sort((a, b) => b[1] - a[1])[0][0];
    let diff = 0; for (let i = 0; i < d.length; i += 4) { const k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2]; if (Math.abs((k >> 16) - (top >> 16)) + Math.abs(((k >> 8) & 255) - ((top >> 8) & 255)) + Math.abs((k & 255) - (top & 255)) > 12) diff++; }
    return diff;
  }, buf.toString('base64'));
}
const emptyChat = { x: 40, y: 420, width: 520, height: 200 }; // lower chat area, no text there
const openBg = async () => {}; // the Background section is always expanded on the settings page
const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('mock-ascii:background.v1') || 'null'));
const ok = (name) => result.checks.push(name);
try {
  // (a) OFF by default: nothing injected, chat looks unchanged.
  let page = await open();
  const offSig = await page.evaluate(SIG);
  assert.equal(await count(page, layerSel), 0); assert.equal(await count(page, styleSel), 0);
  assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-ascii-worlds-bg')), false);
  assert.equal(await page.evaluate(() => localStorage.getItem('mock-ascii:background.v1')), null);
  const offBg = await page.evaluate(() => getComputedStyle(document.querySelector('[data-chat-surface]')).backgroundColor);
  assert.notEqual(offBg, 'rgba(0, 0, 0, 0)');
  const offDiff = await shotDiff(page, emptyChat); assert.equal(offDiff, 0, 'empty chat area is a flat colour when off');
  assert.equal(await page.locator('#tb-right button').innerText(), 'Background off');
  await page.screenshot({ path: project + 'evidence/v1.2-background-off.png' });
  ok('(a) off by default: zero layers, zero style tags, no html attribute, nothing stored, chat surface opaque and flat');

  // (b) ON via the pane's native checkbox.
  await openBg(page);
  await page.locator('[name=bgEnabled]').check();
  await page.waitForTimeout(700);
  assert.equal(await count(page, layerSel), 1); assert.equal(await count(page, styleSel), 1);
  assert.equal(await page.evaluate(() => document.querySelectorAll('[data-ascii-worlds-bg="layer"]').length), 1);
  assert.equal(await page.evaluate(() => document.documentElement.getAttribute('data-ascii-worlds-bg')), 'on');
  const layer = await page.evaluate(() => { const l = document.querySelector(layerSel_()); const s = getComputedStyle(l); function layerSel_() { return 'body > div[data-ascii-worlds-bg="layer"]'; } return { pos: s.position, pe: s.pointerEvents, z: s.zIndex, us: s.userSelect, aria: l.getAttribute('aria-hidden'), canvases: l.querySelectorAll('canvas').length, op: getComputedStyle(l.querySelector('canvas')).opacity, w: l.getBoundingClientRect().width, h: l.getBoundingClientRect().height }; });
  assert.deepEqual({ ...layer, op: Number(layer.op) }, { pos: 'fixed', pe: 'none', z: '-1', us: 'none', aria: 'true', canvases: 1, op: 0.28, w: 1000, h: 650 });
  const transp = await page.evaluate(() => ['[data-chat-surface]', '[data-slot="aui_thread-viewport"]'].map((s) => getComputedStyle(document.querySelector(s)).backgroundColor));
  assert.deepEqual(transp, ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0)']);
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#chatwrap')).backgroundColor), 'rgba(0, 0, 0, 0)', 'the wrapper above the chat is cleared while on');
  // click and hover still reach the chat
  const hit = await page.evaluate(() => { const r = document.querySelector('#chat-btn').getBoundingClientRect(); return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2).id; });
  assert.equal(hit, 'chat-btn');
  await page.locator('#chat-btn').click(); assert.equal(await page.evaluate(() => window.__clicks), 1);
  ok('(b) on: exactly one fixed z-index -1 layer with one canvas, pointer-events none, chat click reaches the chat, surface, viewport and the wrapper above the chat computed transparent');
  // (c) Clearing the wrappers above and inside the chat is part of Background mode itself (v1.3):
  // the art shows through the host's opaque wrappers with no extra setting.
  await page.waitForTimeout(700);
  assert.ok((await page.locator(styleSel).textContent()).includes('body :has([data-chat-surface])'));
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#chatwrap')).backgroundColor), 'rgba(0, 0, 0, 0)');
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('#main')).backgroundColor), 'rgba(0, 0, 0, 0)');
  const shownDiff = await shotDiff(page, emptyChat);
  assert.ok(shownDiff > 300, 'art pixels visible through the chat: ' + shownDiff);
  result.notes.push(`art-visible pixels in empty chat region (dark, 28%): ${shownDiff} of ${emptyChat.width * emptyChat.height}`);
  assert.equal(await page.locator(styleSel).count(), 1);
  assert.equal(await page.locator('[name=bgExtra]').count(), 0, 'the old Extra transparency control is gone');
  await page.screenshot({ path: project + 'evidence/v1.2-background-on-dark.png' });
  assert.equal((await stored(page)).enabled, true);
  await page.locator('[name=bgStrength]').fill('60'); await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('[data-ascii-worlds-bg="layer"] canvas')).opacity), '0.6');
  await page.locator('[name=bgStrength]').fill('8'); await page.waitForTimeout(100);
  assert.equal((await stored(page)).strength, 0.08);
  await page.locator('[name=bgStrength]').fill('28');
  ok('(c) the ancestor-clearing rules are part of Background mode, art shows through opaque wrappers with no extra toggle; strength slider clamps 8-60 percent and persists');

  // live sync: pane scene edit reaches background engine
  const before = await page.evaluate(() => document.querySelector('[data-ascii-worlds-bg="layer"] canvas').width);
  await page.locator('[name=scene]').selectOption('jellyfish'); await page.waitForTimeout(500);
  assert.ok(await shotDiff(page, emptyChat) > 100);
  await page.locator('[name=scene]').selectOption('koi');
  ok('live sync: pane scene changes keep the background drawing');

  // title-bar toggle off -> byte-identical page
  await page.locator('#tb-right button').click(); await page.waitForTimeout(150);
  assert.equal(await page.locator('#tb-right button').innerText(), 'Background off');
  assert.equal(await page.evaluate(SIG), offSig);
  assert.equal(await page.locator('[name=bgEnabled]').isChecked(), false);
  assert.equal((await stored(page)).enabled, false);
  // palette command toggles on, then panic path off even with the pane closed
  assert.equal(await page.evaluate(() => hostTest.runPalette()), true);
  await page.waitForTimeout(150); assert.equal(await count(page, layerSel), 1);
  await page.evaluate(() => { for (const r of [document.querySelector('#root')]) r.innerHTML = ''; });
  await page.locator('#tb-right button').click(); await page.waitForTimeout(100);
  assert.equal(await page.evaluate(SIG), offSig);
  assert.equal(await page.evaluate(() => hostTest.contributions.find((c) => c.area === 'palette').data.label), 'ASCII Worlds: toggle background');
  ok('(c2) title-bar button and palette command toggle it; off restores a byte-identical host (head, html attrs, body children, chat outerHTML) and persists enabled=false');
  await page.context().close();

  // (d) mount/dispose cycles
  page = await open('', { seed: { 'background.v1': JSON.stringify({ schemaVersion: 1, enabled: true, strength: 0.3, extraTransparency: true }) } });
  await page.waitForTimeout(300);
  assert.equal(await count(page, layerSel), 1); assert.equal(await count(page, styleSel), 1);
  for (let n = 0; n < 4; n++) {
    await page.evaluate(() => hostTest.unmount()); await page.waitForTimeout(60);
    assert.equal(await count(page, layerSel), 0); assert.equal(await count(page, styleSel), 0);
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-ascii-worlds-bg')), false);
    await page.evaluate(() => hostTest.mount()); await page.waitForTimeout(120);
    assert.equal(await count(page, layerSel), 1); assert.equal(await count(page, styleSel), 1);
    assert.equal(await page.evaluate(() => document.querySelectorAll('[data-ascii-worlds-bg]').length), 2, 'html + one layer, no duplicates');
  }
  await page.evaluate(() => hostTest.dispose()); await page.waitForTimeout(150);
  const after = await page.evaluate(() => ({ frames: instrument.activeFrames.size, ro: instrument.ro, io: instrument.io, vis: instrument.listeners }));
  assert.equal(await count(page, layerSel), 0); assert.equal(await count(page, styleSel), 0);
  assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-ascii-worlds-bg')), false);
  assert.deepEqual({ frames: after.frames, ro: after.ro, io: after.io, vis: after.vis }, { frames: 0, ro: 0, io: 0, vis: 0 });
  assert.equal((await stored(page)).enabled, true, 'dispose does not rewrite the preference');
  ok('(d) repeated Strict Mode unmount/mount keeps one layer and one style; dispose leaves zero layers, styles, attributes, RAF, resize/intersection observers and visibility listeners');
  // a persisted-on page signature equals a fresh off page once disposed (page body has no leftovers)
  const disposed = await page.evaluate(SIG);
  const offPage = await open('', { seed: { 'background.v1': JSON.stringify({ enabled: false }) } });
  assert.equal(disposed, await offPage.evaluate(SIG), 'disposed page is byte-identical to a never-enabled page');
  await offPage.context().close(); await page.context().close();

  // (e) corrupted storage -> off
  for (const bad of ['{not json', '"yes"', '[]', JSON.stringify({ enabled: 'true', strength: 'x' }), 'null']) {
    page = await open('', { seed: { 'background.v1': bad } });
    assert.equal(await count(page, layerSel), 0, bad);
    assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-ascii-worlds-bg')), false);
    await openBg(page); assert.equal(await page.locator('[name=bgEnabled]').isChecked(), false);
    assert.equal(await page.locator('[name=bgStrength]').inputValue(), '28');
    await page.context().close();
  }
  ok('(e) corrupted background.v1 values (bad JSON, string, array, wrong types, null) all fall back to off at 28 percent');

  // (f) missing TITLEBAR_AREAS / PALETTE_AREA
  page = await open('?bare=1', { seed: { 'background.v1': JSON.stringify({ enabled: true }) } });
  assert.equal(await page.evaluate(() => hostTest.contributions.map((c) => c.area).join()), '', 'only the settings page registers (through registerSettingsPage)');
  assert.equal(await page.evaluate(() => hostTest.pages.length), 1);
  assert.equal(await count(page, layerSel), 0); assert.equal(await count(page, styleSel), 0);
  assert.equal(await page.locator('[name=bgEnabled]').isDisabled(), true);
  assert.equal(await page.locator('[name=bgEnabled]').isChecked(), false);
  assert.equal(await page.locator('[name=bgPlacement]').first().isDisabled(), true);
  assert.equal(await page.locator('.aw-bg .aw-bg-status').innerText(), 'Background needs the title bar mount point, which this Desktop version does not provide.');
  await page.locator('[name=scene]').selectOption('jellyfish'); await page.waitForTimeout(200);
  assert.ok((await page.evaluate(() => document.querySelector('.aw-canvas').width)) > 10);
  assert.equal(await page.evaluate(() => hostTest.runPalette()), false);
  ok('(f) SDK without TITLEBAR_AREAS/PALETTE_AREA: only the settings page registers, page works, no layer even if storage says enabled, Background section says it is unavailable and its controls are disabled');
  await page.context().close();

  // fail-safe
  page = await open();
  await openBg(page);
  await page.evaluate(() => { HTMLCanvasElement.prototype.getContext = function () { throw new Error('simulated canvas failure'); }; });
  await page.locator('[name=bgEnabled]').click(); await page.waitForTimeout(150);
  assert.equal(await count(page, layerSel), 0); assert.equal(await count(page, styleSel), 0);
  assert.equal(await page.evaluate(() => document.documentElement.hasAttribute('data-ascii-worlds-bg')), false);
  assert.equal((await stored(page)).enabled, false);
  assert.match(await page.locator('.aw-bg-status').innerText(), /simulated canvas failure.*turned off/);
  assert.equal(await page.locator('[name=bgEnabled]').isChecked(), false);
  assert.equal(await page.evaluate(SIG), offSig);
  ok('fail-safe: a render exception removes the layer and style, clears the attribute, stores enabled=false and shows one message on the page; host byte-identical');
  await page.context().close();

  // (g) reduced motion and document.hidden
  page = await open('', { reduced: 'reduce', seed: { 'background.v1': JSON.stringify({ enabled: true, extraTransparency: true }) } });
  await page.waitForTimeout(400);
  assert.equal(await count(page, layerSel), 1);
  assert.equal(await page.evaluate(() => instrument.activeFrames.size), 0, 'reduced motion starts static');
  assert.ok(await shotDiff(page, emptyChat) > 100, 'a static frame is still drawn');
  await page.context().close();
  page = await open('', { seed: { 'background.v1': JSON.stringify({ enabled: true, extraTransparency: true }) } });
  await page.waitForTimeout(300);
  assert.ok(await page.evaluate(() => instrument.activeFrames.size) > 0);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => instrument.activeFrames.size), 0);
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(250);
  assert.ok(await page.evaluate(() => instrument.activeFrames.size) > 0);
  // background rate: eco cap 12 fps
  const fps = await page.evaluate(() => new Promise((res) => { const c = document.querySelector('[data-ascii-worlds-bg="layer"] canvas'); const draw = CanvasRenderingContext2D.prototype.clearRect; let n = 0; CanvasRenderingContext2D.prototype.clearRect = function (...a) { if (this.canvas === c) n++; return draw.apply(this, a); }; setTimeout(() => { CanvasRenderingContext2D.prototype.clearRect = draw; res(n / 2); }, 2000); }));
  result.notes.push(`measured background draw rate (headless, with pane also animating): ${fps} fps`);
  assert.ok(fps <= 13.5 && fps >= 6, 'bg near the 12 fps eco cap: ' + fps);
  ok('(g) reduced motion starts static (zero RAF, still one frame drawn); document.hidden pauses and visible resumes; background draws near the 12 fps eco cap');
  await page.context().close();

  // light scheme screenshot
  page = await open('', { scheme: 'light', seed: { 'background.v1': JSON.stringify({ enabled: true, extraTransparency: true, strength: 0.28 }) } });
  await page.waitForTimeout(800);
  const lightDiff = await shotDiff(page, emptyChat); assert.ok(lightDiff > 200, 'light: ' + lightDiff);
  result.notes.push(`art-visible pixels in empty chat region (light, 28%): ${lightDiff}`);
  await page.screenshot({ path: project + 'evidence/v1.2-background-on-light.png' });
  ok('light scheme: background follows the palette and is visible through the chat');
  await page.context().close();

  // (h) settings page layout at several widths and heights
  const order = () => page.evaluate(() => [...document.querySelectorAll('.aw-world > section')].map((x) => x.querySelector('h3').textContent));
  for (const [w, h] of [[360, 640], [600, 800], [1000, 650], [420, 240]]) {
    page = await open('?only=1', { viewport: { width: w, height: h } });
    assert.deepEqual(await order(), ['Background', 'Scene and colours', 'Troubleshooting', 'About ASCII Worlds']);
    const d = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, ph: document.documentElement.scrollHeight, ih: innerHeight, ws: document.querySelector('.aw-world').scrollWidth, wc: document.querySelector('.aw-world').clientWidth, art: document.querySelector('.aw-art').getBoundingClientRect().height, bg: document.querySelector('.aw-world > section').hidden, firstTop: document.querySelector('.aw-world > section').getBoundingClientRect().top }));
    assert.ok(d.sw <= d.iw && d.ph <= d.ih && d.ws <= d.wc, JSON.stringify([w, h, d]));
    assert.equal(d.bg, false, 'Background section is shown, not collapsed');
    assert.ok(d.firstTop < 80, 'Background is the first section: ' + d.firstTop);
    assert.ok(d.art >= 190 && d.art <= 290, 'preview height bounded: ' + d.art);
    for (const sel of ['[name=bgEnabled]', '[name=bgStrength]', '[name=colour]', '[name=eco]', '.aw-bg-check', '[name=bgPlacement][value=front]']) {
      await page.locator(sel).scrollIntoViewIfNeeded();
      const r = await page.evaluate((s) => { const e = document.querySelector(s); const b = e.getBoundingClientRect(); const c = document.querySelector('.aw-world').getBoundingClientRect(); return { top: b.top, bottom: b.bottom, ct: c.top, cb: c.bottom, l: b.left, r: b.right }; }, sel);
      assert.ok(r.bottom <= r.cb + 1 && r.top >= r.ct - 1 && r.l >= 0 && r.r <= w + 1, `${sel} reachable at ${w}x${h} ${JSON.stringify(r)}`);
    }
    if (w === 1000 || w === 360) {
      await page.evaluate(() => document.querySelector('.aw-world').scrollTo(0, 0));
      await page.waitForTimeout(150);
      await page.screenshot({ path: project + `evidence/v1.0-settings-page-${w}.png` });
    }
    await page.context().close();
  }
  ok('(h) settings page at 360, 600, 1000 and a 420x240 window: sections in order Background, Scene and colours, Troubleshooting, About ASCII Worlds; Background first and expanded; no horizontal overflow; preview 190-290px; controls scroll into reach');

  // (i) the host sees a settings page and no pane, in each registration variant
  for (const api of ['page', 'fallback', 'none']) {
    page = await open('?api=' + api);
    const reg = await page.evaluate(() => ({ panes: hostTest.panes.length, pages: hostTest.pages.length, fb: hostTest.settingsContribs.length, areas: hostTest.contributions.map((c) => c.area).sort() }));
    assert.equal(reg.panes, 0, 'no pane in ' + api);
    assert.deepEqual([reg.pages, reg.fb], api === 'page' ? [1, 0] : api === 'fallback' ? [0, 1] : [0, 0], api);
    const first = await page.evaluate(() => { const p = hostTest.pages[0] || hostTest.settingsContribs[0]; return p && { id: p.id, title: p.title, icon: p.icon || p.data?.icon, order: p.order, area: p.area }; });
    if (api === 'page') assert.deepEqual(first, { id: 'settings', title: 'ASCII Worlds', icon: 'color-mode', order: 0, area: undefined });
    if (api === 'fallback') assert.deepEqual(first, { id: 'settings', title: 'ASCII Worlds', icon: 'color-mode', order: undefined, area: 'settings.plugins' });
    if (api !== 'none') assert.equal(await count(page, '.aw-world'), 1);
    else { assert.equal(await count(page, '.aw-world'), 0); }
    // the title-bar toggle works in every variant
    assert.equal(await page.locator('#tb-right button').innerText(), 'Background off');
    await page.locator('#tb-right button').click(); await page.waitForTimeout(500);
    assert.equal(await count(page, layerSel), 1);
    assert.equal(await page.locator('#tb-right button').innerText(), 'Background on');
    await page.locator('#tb-right button').click(); await page.waitForTimeout(150);
    assert.equal(await count(page, layerSel), 0);
    assert.equal(await page.locator('#tb-right button').getAttribute('title'), 'ASCII Worlds background');
    await page.context().close();
  }
  ok('(i) registerSettingsPage variant registers exactly one page; settings.plugins-only variant registers exactly one contribution; a host with neither still loads and the title-bar toggle works; zero pane registrations in all three');

  // (j) open-settings palette command
  page = await open();
  assert.equal(await page.evaluate(() => hostTest.runPalette('ASCII Worlds: open settings')), true);
  assert.deepEqual(await page.evaluate(() => globalThis.__navigated), ['/settings/plugins/ascii-worlds']);
  await page.context().close();
  page = await open('?nonav=1');
  assert.equal(await page.evaluate(() => hostTest.runPalette('ASCII Worlds: open settings')), false);
  assert.equal(await page.evaluate(() => hostTest.runPalette()), true, 'toggle command still present');
  await page.context().close();
  page = await open('?noarea=1&api=fallback');
  assert.equal(await page.evaluate(() => hostTest.settingsContribs[0].area), 'settings.plugins', 'literal area used when the constant is missing');
  await page.context().close();
  ok('(j) open settings command is registered only with host.navigate and pluginSettingsHref, and navigates to /settings/plugins/ascii-worlds; fallback uses the literal area when the constant is absent');

  // (k) placement radio cards: verbatim text, keyboard operation, rebuild, persistence
  page = await open('', { seed: { 'background.v1': JSON.stringify({ schemaVersion: 1, enabled: true, strength: 0.28, placement: 'behind' }) } });
  await page.waitForTimeout(400);
  const texts = await page.locator('.aw-card-text').allInnerTexts();
  assert.deepEqual(texts, [
    'The animation shows through the chat area only. Sidebars, side panels and the title bar keep their own backgrounds, so it stops at their edges and never covers text.',
    'The animation is drawn over the whole window, including the sidebars and panels, at low strength. Because it sits on top, it can drift faintly over text and controls; clicks pass straight through.',
  ]);
  assert.equal(await page.locator('fieldset.aw-placement > legend').innerText(), 'Placement');
  assert.deepEqual(await page.locator('.aw-card-title').allInnerTexts(), ['Chat area', 'Whole window']);
  assert.equal(await page.locator('.aw-switch').innerText(), 'Show the animation in Hermes');
  assert.ok(!/In front|Behind the chat|behind my chats/.test(await page.locator('.aw-bg').innerText()));
  assert.equal(await page.locator('[name=bgPlacement]:checked').getAttribute('value'), 'behind');
  assert.match(await page.locator('.aw-bg').innerText(), /Chat area relies on how Hermes Desktop lays out its window\. If it stops showing after an app update, switch to Whole window\./);
  await page.locator('[name=bgPlacement][value=behind]').focus();
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(400);
  assert.equal(await page.locator('[name=bgPlacement]:checked').getAttribute('value'), 'front');
  assert.equal(await count(page, layerSel), 1);
  assert.equal(await page.evaluate(() => document.querySelector('body > div[data-ascii-worlds-bg]').getAttribute('data-ascii-worlds-placement')), 'front');
  assert.equal((await stored(page)).placement, 'front');
  await page.keyboard.press('ArrowUp'); await page.waitForTimeout(400);
  assert.equal(await page.locator('[name=bgPlacement]:checked').getAttribute('value'), 'behind');
  assert.equal(await count(page, layerSel), 1);
  ok('(k) placement is a native radio group with two cards carrying the exact explanations; arrow keys switch it, each switch rebuilds exactly one layer, and the choice persists in background.v1');
  await page.context().close();

  // (l) stored preferences from earlier builds still load
  page = await open('', { seed: { 'background.v1': JSON.stringify({ schemaVersion: 1, enabled: true, strength: 0.4, placement: 'front' }), 'settings.v2': JSON.stringify({ scene: 'jellyfish', palette: 'dark' }) } });
  await page.waitForTimeout(300);
  assert.equal(await page.locator('[name=bgPlacement]:checked').getAttribute('value'), 'front');
  assert.equal(await page.locator('[name=bgStrength]').inputValue(), '40');
  assert.equal(await page.locator('[name=scene]').inputValue(), 'jellyfish');
  assert.equal(await count(page, layerSel), 1);
  ok('(l) stored background.v1 (placement front) and settings.v2 still load into the new page');
  await page.context().close();

  // (m) about line and reset button
  page = await open();
  const version = JSON.parse(await readFile(project + 'package.json', 'utf8')).version;
  const about = await page.locator('.aw-about').innerText();
  assert.ok(about.includes('About ASCII Worlds'));
  assert.ok(about.includes(`Version ${version}.`));
  assert.ok(about.includes('A small aquarium for your chats.'));
  assert.ok(!/It all happens|independent take|glyph-aquarium/i.test(about), 'the removed About sentences stay removed');
  assert.ok(about.includes('Free and open source under the MIT licence.'));
  // The old duplicate of the top switch is gone: the page has exactly one control that turns the background off.
  assert.equal(await page.locator('.aw-bg-off').count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Turn background off' }).count(), 0);
  assert.ok(!(await page.evaluate(() => document.body.innerText)).includes('Quick toggle'));
  assert.ok(!/experimental/i.test(await page.evaluate(() => document.body.innerText + document.querySelector('#tb-right button').title)));
  await page.locator('[name=scene]').selectOption('jellyfish');
  await page.getByRole('button', { name: 'Reset to defaults', exact: true }).click();
  assert.equal(await page.locator('[name=scene]').inputValue(), 'koi');
  ok('(m) About line carries the package version; the word experimental appears nowhere; Reset to defaults restores the scene');
  await page.context().close();

  assert.deepEqual(errors, []); assert.deepEqual(warnings, []);
  assert.ok(requests.every((u) => u.startsWith(base)));
  ok('no page errors, console warnings or non-local requests');
  result.passed = true;
} catch (e) { result.passed = false; result.failure = e.stack; process.exitCode = 1; }
result.errors = errors; result.warnings = warnings;
await writeFile(project + 'evidence/background-results.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
await browser.close(); await new Promise((r) => server.close(r));
