// Regression test for the structure measured on a live Desktop window:
// a wrapper between [data-chat-surface] and the message list paints the chat
// colour through one utility class, and the page colour underneath is bluer.
// This runs against a FAKE host page (tests/fixtures/host-bg.html?real). It
// proves the rule logic, not the behaviour of the real Hermes Desktop.
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const project = fileURLToPath(new URL('..', import.meta.url));
const harness = process.env.ASCII_WORLDS_HARNESS || fileURLToPath(new URL('./.harness', import.meta.url));
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
const server = createServer(async (req, res) => {
  try {
    const p = req.url.split('?')[0];
    const target = p === '/plugin.js' ? project + 'desktop/plugin.js'
      : p.startsWith('/browser-deps/') ? harness + '/' + p.slice(1)
      : p === '/' ? project + 'tests/fixtures/host-bg.html' : project + 'tests/' + p.slice(1);
    const data = await readFile(target);
    res.setHeader('Content-Type', target.endsWith('.html') ? 'text/html' : 'text/javascript');
    res.end(data);
  } catch { res.statusCode = 404; res.end('nf'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
const checks = [], errors = [];
async function open(enabled, extra = {}, query = '') {
  const context = await browser.newContext({ viewport: { width: 1000, height: 650 }, deviceScaleFactor: 1, colorScheme: 'dark' });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript((v) => localStorage.setItem('mock-ascii:background.v1', v),
    JSON.stringify({ schemaVersion: 1, enabled, strength: 0.6, ...extra }));
  await page.goto(base + '?real=1' + query);
  await page.waitForFunction(() => document.querySelector('.aw-canvas')?.width > 10);
  if (enabled) await page.waitForSelector('body > div[data-ascii-worlds-bg="layer"]');
  await page.waitForTimeout(600);
  return page;
}
const bg = (page, sel) => page.evaluate((s) => getComputedStyle(document.querySelector(s)).backgroundColor, sel);
try {
  let page = await open(true);
  // The chat wrapper must be cleared by the plugin's own rule, with the default (no extra transparency).
  assert.equal(await bg(page, '#real-panel'), 'rgba(0, 0, 0, 0)');
  // Wrappers above the chat paint solid colours on the live window (found 8 to 16 levels up); all must be clear.
  for (const sel of ['body', '#chatwrap', '#main', '#app', '#shell'])
    assert.equal(await bg(page, sel), 'rgba(0, 0, 0, 0)', sel + ' must be cleared while on');
  checks.push('The body, the four solid wrappers above the chat and the wrapper inside it are all cleared while on');
  // The layer carries the chat colour token, not the bluer page colour.
  assert.equal(await bg(page, 'body > div[data-ascii-worlds-bg="layer"]'), 'rgb(21, 21, 21)');
  checks.push('The layer base colour follows the app chat surface token');
  // Pixel check: an empty spot in the chat shows the chat grey, never the bluer page colour, and art is visible.
  const shot = await page.screenshot({ clip: { x: 20, y: 380, width: 540, height: 250 } });
  await writeFile(project + 'evidence/v1.3-real-shape-on.png', await page.screenshot());
  const stats = await page.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let bluish = 0, lit = 0, base = 0, n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) {
      const [r, g, b] = [d[i], d[i + 1], d[i + 2]];
      if (r === 21 && g === 21 && b === 21) base++;
      if (r === 13 && g === 16 && b === 21) bluish++;
      if (Math.max(r, g, b) > 60) lit++;
    }
    return { bluish, lit, base, n };
  }, shot.toString('base64'));
  assert.equal(stats.bluish, 0, 'page colour must not show through the chat area');
  assert.ok(stats.base > stats.n * 0.3, 'chat grey is the dominant base colour');
  assert.ok(stats.lit > 40, 'animation glyphs are visible through the cleared panel');
  checks.push(`Pixels: ${stats.base} of ${stats.n} chat-area pixels are the original grey, 0 show the bluer page colour, ${stats.lit} lit glyph pixels`);
  // Off: nothing injected and the panel is back to its own colour.
  await page.close();
  page = await open(false);
  assert.equal(await bg(page, '#real-panel'), 'rgb(21, 21, 21)');
  assert.equal(await bg(page, '#main'), 'rgb(13, 16, 21)');
  assert.equal(await bg(page, '#shell'), 'rgb(13, 16, 21)');
  assert.equal(await bg(page, 'body'), 'rgb(21, 21, 21)', 'body keeps its own colour when off');
  assert.equal(await page.evaluate(() => document.querySelectorAll('[data-ascii-worlds-bg-style],body > div[data-ascii-worlds-bg]').length), 0);
  checks.push('Off: every wrapper keeps its own colour and nothing is injected');
  // Toggle off and on again through the settings page's own switch. The user reported
  // that a manually re-applied rule stopped working on the second try, so the
  // plugin-managed rule must re-apply every time.
  await page.close();
  page = await open(true);
  const box = page.getByLabel('Show the animation in Hermes');
  for (let round = 1; round <= 3; round++) {
    await box.setChecked(false);
    await page.waitForTimeout(250);
    assert.equal(await bg(page, '#real-panel'), 'rgb(21, 21, 21)', `round ${round}: restored when off`);
    assert.equal(await bg(page, '#main'), 'rgb(13, 16, 21)', `round ${round}: wrapper above restored when off`);
    assert.equal(await page.evaluate(() => document.querySelectorAll('[data-ascii-worlds-bg-style],body > div[data-ascii-worlds-bg]').length + (document.documentElement.hasAttribute('data-ascii-worlds-bg') ? 1 : 0)), 0);
    await box.setChecked(true);
    await page.waitForTimeout(500);
    assert.equal(await bg(page, '#real-panel'), 'rgba(0, 0, 0, 0)', `round ${round}: cleared again when on`);
    assert.equal(await bg(page, '#main'), 'rgba(0, 0, 0, 0)', `round ${round}: wrapper above cleared again when on`);
    assert.equal(await page.evaluate(() => document.querySelectorAll('body > div[data-ascii-worlds-bg="layer"]').length), 1);
  }
  checks.push('Three off/on rounds via the settings-page switch: panel colour restored then cleared each time, exactly one layer');
  // A wrapper painted with an INLINE style (the host can do this) is still cleared, because the rule uses !important.
  await page.close();
  page = await open(true, {}, '&inline=1');
  assert.equal(await page.evaluate(() => document.getElementById('main').style.background !== ''), true, 'fixture really has an inline colour');
  assert.equal(await bg(page, '#main'), 'rgba(0, 0, 0, 0)');
  checks.push('A wrapper painted with an inline style is cleared too (needs !important)');
  // The build stamp and the in-page check.
  const stamp = await page.evaluate(() => ({
    layer: document.querySelector('body > div[data-ascii-worlds-bg="layer"]').getAttribute('data-ascii-worlds-version'),
    style: document.querySelector('style[data-ascii-worlds-bg-style]').getAttribute('data-ascii-worlds-version'),
  }));
  const version = JSON.parse(await readFile(project + 'package.json', 'utf8')).version;
  assert.deepEqual(stamp, { layer: version, style: version });
  await page.getByRole('button', { name: 'Check background' }).click();
  const report = await page.locator('.aw-bg-diag').inputValue();
  assert.ok(report.includes('running build stamped on layer: ' + version), report);
  assert.ok(/painted pixels [1-9]\d* of/.test(report), report);
  assert.ok(report.includes('nothing in the chat chain is painting a colour'), report);
  await writeFile(project + 'evidence/v1.4-check-report-behind.txt', report + '\n');
  checks.push('Version is stamped on the layer and style; the Check background button reports the same version, painted pixels, and a clear chain');
  // In front: needs no clearing, shows even when every wrapper stays opaque, and still ignores the pointer.
  await page.close();
  page = await open(true, { placement: 'front' });
  const front = await page.evaluate(() => {
    const l = document.querySelector('body > div[data-ascii-worlds-bg="layer"]');
    const cs = getComputedStyle(l);
    const b = document.getElementById('chat-btn').getBoundingClientRect();
    return { z: cs.zIndex, pe: cs.pointerEvents, base: cs.backgroundColor, style: document.querySelectorAll('style[data-ascii-worlds-bg-style]')[0]?.textContent, placement: l.getAttribute('data-ascii-worlds-placement'), hit: document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2).id };
  });
  assert.equal(front.z, '2147483646'); assert.equal(front.pe, 'none'); assert.equal(front.placement, 'front');
  assert.equal(front.base, 'rgba(0, 0, 0, 0)'); assert.equal(front.style, '');
  assert.equal(front.hit, 'chat-btn');
  assert.equal(await bg(page, '#main'), 'rgb(13, 16, 21)', 'nothing is cleared in front mode');
  const fshot = await page.screenshot({ clip: { x: 20, y: 380, width: 540, height: 250 } });
  const lit = await page.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data; let n = 0;
    for (let i = 0; i < d.length; i += 4) if (Math.max(d[i], d[i + 1], d[i + 2]) > 60) n++;
    return n;
  }, fshot.toString('base64'));
  assert.ok(lit > 40, 'glyphs visible in front mode: ' + lit);
  await writeFile(project + 'evidence/v1.4-front-mode.png', await page.screenshot());
  checks.push(`In front: z-index above the app, pointer-events none, no base colour, no stylesheet, nothing cleared, ${lit} lit glyph pixels over the opaque chat, clicks reach the chat`);
  // Switching placement from the settings page rebuilds the layer cleanly in both directions.
  await page.locator('[name=bgPlacement][value=behind]').check();
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => document.querySelectorAll('body > div[data-ascii-worlds-bg="layer"]').length), 1);
  assert.equal(await bg(page, '#main'), 'rgba(0, 0, 0, 0)');
  await page.locator('[name=bgPlacement][value=front]').check();
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => document.querySelectorAll('body > div[data-ascii-worlds-bg="layer"]').length), 1);
  assert.equal(await bg(page, '#main'), 'rgb(13, 16, 21)');
  assert.deepEqual(JSON.parse(await page.evaluate(() => localStorage.getItem('mock-ascii:background.v1'))).placement, 'front');
  checks.push('Switching placement from the settings page rebuilds one layer each time, restores the page colours in front mode, and persists the choice');
  assert.deepEqual(errors, []);
  await writeFile(project + 'evidence/v1.3-realshape-results.json', JSON.stringify({ passed: true, mockedHost: true, checks, errors }, null, 2) + '\n');
  console.log(JSON.stringify({ passed: true, checks, errors }, null, 2));
} catch (e) {
  console.error('FAIL', e.message); process.exitCode = 1;
} finally { await browser.close(); server.close(); }
