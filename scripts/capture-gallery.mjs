// Capture the actual generated plugin through real React + the mock SDK.
// No live Desktop, user browser, remote network, or product artwork rewriting.
// Prerequisites/usage: docs/DEVELOPMENT.md. Outputs are PNGs + a portable manifest.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { WORLD_SCENES, normalizeWorldSettings } from '../src/settings-v3.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.resolve(process.env.ASCII_WORLDS_GALLERY || path.join(root, 'docs/images/v1.2'));
assert.ok(process.env.PLAYWRIGHT_MODULE, 'Set PLAYWRIGHT_MODULE to an existing Playwright index.mjs');
assert.ok(process.env.CHROMIUM_PATH, 'Set CHROMIUM_PATH to an existing Chromium executable');
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
await mkdir(out, { recursive: true });
const base = 'http://ascii-worlds.test';
const errors = [], warnings = [], unexpectedRequests = [], captures = [];
const plugin = await readFile(path.join(root, 'desktop/plugin.js'));
const temp = await mkdtemp(path.join(tmpdir(), 'aw-gallery-'));
const catalog = path.join(temp, 'catalog-plugin.js');
execFileSync(process.execPath, ['scripts/build.mjs', '--catalog', '--out', catalog], { cwd: root });
let servingCatalog = false;
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1100, height: 1000 }, deviceScaleFactor: 1, colorScheme: 'dark' });
await context.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.origin !== base) { unexpectedRequests.push(url.origin); return route.abort(); }
  let rel = url.pathname === '/' ? 'tests/fixtures/host-bg.html'
    : url.pathname === '/plugin.js' ? 'desktop/plugin.js'
    : url.pathname.startsWith('/browser-deps/') ? 'tests/.harness' + url.pathname
    : 'tests' + url.pathname;
  try {
    const body = await readFile(rel === 'desktop/plugin.js' && servingCatalog ? catalog : path.join(root, rel));
    await route.fulfill({ status: 200, contentType: rel.endsWith('.html') ? 'text/html' : 'text/javascript', body });
  } catch { await route.fulfill({ status: 404, body: 'not found' }); }
});
const page = await context.newPage();
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (['warning', 'error'].includes(m.type())) warnings.push(m.text()); });
const settle = () => page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
async function field(name, value) {
  await page.evaluate(({ name, value }) => {
    const el = document.querySelector(`[name="${name}"]`);
    if (!el) throw Error('Missing control: ' + name);
    if (el.type === 'checkbox') el.checked = value; else el.value = String(value);
    el.dispatchEvent(new Event(['range', 'number'].includes(el.type) ? 'input' : 'change', { bubbles: true }));
  }, { name, value });
  await settle();
}
async function save(locator, name, meta) {
  const buffer = await locator.screenshot({ animations: 'disabled' });
  await writeFile(path.join(out, name), buffer);
  captures.push({ file: name, ...meta, sha256: createHash('sha256').update(buffer).digest('hex'), bytes: buffer.length });
}
async function saveForm(name, meta) {
  // Locator screenshots do not unclip children of a shorter host scroller.
  // Expand only the MOCK viewport to the form's natural height before capture;
  // the plugin remains in the real auto-height host-scroll layout.
  const height = await page.locator('#root').evaluate(el => Math.ceil(el.scrollHeight) + 80);
  await page.setViewportSize({ width: 1100, height });
  await page.evaluate(() => { document.querySelector('#side').scrollTop = 0; });
  await settle();
  assert.ok(await page.locator('#root').evaluate(el => el.scrollHeight <= document.querySelector('#side').clientHeight), 'form clipped by mock host');
  assert.ok(await page.locator('.aw-about').evaluate(el => el.getBoundingClientRect().bottom <= innerHeight), 'About clipped');
  await save(page.locator('#root'), name, meta);
}
try {
  await page.addInitScript(settings => localStorage.setItem('mock-ascii:settings.v3', JSON.stringify(settings)), normalizeWorldSettings({ paused: true }));
  await page.goto(base + '/?only=1');
  await page.waitForSelector('.aw-canvas');
  for (const tone of ['dark', 'light']) {
    await page.emulateMedia({ colorScheme: tone });
    await page.waitForTimeout(1200);
    for (const scene of WORLD_SCENES) {
      await field('scene', scene.id);
      await page.getByRole('button', { name: 'Reset active scene to defaults', exact: true }).click();
      await page.locator('.aw-canvas').scrollIntoViewIfNeeded();
      await settle();
      await save(page.locator('.aw-art'), `${scene.id}-${tone}.png`, { kind: 'preview', scene: scene.id, title: scene.name, tone, defaults: true });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'horizontal overflow');
    }
  }
  await page.emulateMedia({ colorScheme: 'light' });
  // Load a separate, freshly generated catalog plugin. Its actual form has no
  // placement choice; never pass off the full variant's controls as catalog UI.
  servingCatalog = true;
  await page.setViewportSize({ width: 1100, height: 1000 });
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto(base + '/?only=1'); await page.waitForSelector('.aw-canvas');
  assert.equal(await page.locator('[name=bgPlacement]').count(), 0);
  await field('scene', 'butterflies');
  await page.waitForTimeout(1200);
  await saveForm('settings-catalog.png', { kind: 'settings', scene: 'butterflies', tone: 'light', variant: 'catalog' });
  await page.goto(base + '/'); await page.waitForSelector('.aw-canvas');
  await page.setViewportSize({ width: 1400, height: 880 }); await page.emulateMedia({ colorScheme: 'dark' });
  await page.evaluate(() => {
    document.querySelector('#titlebar > span').textContent = 'Workspace';
    // This fixed literal is test fixture text, never user or page-supplied HTML.
    document.querySelector('[data-slot="aui_thread-viewport"]').innerHTML = '<h1 style="font-size:26px">A quieter workspace.</h1><p>Whole window glyphs at 28% strength.</p><button id="chat-btn" type="button">Test click-through</button>';
    document.querySelector('#chat-btn').onclick = () => { window.galleryClicked = true; };
  });
  await field('scene', 'manta-rays'); await field('bgEnabled', true); await page.waitForTimeout(1200);
  assert.equal(await page.locator('[name=bgPlacement]').count(), 0);
  assert.equal(await page.locator('body > [data-ascii-worlds-bg="layer"]').getAttribute('data-ascii-worlds-placement'), 'front');
  assert.equal(await page.locator('style[data-ascii-worlds-bg-style]').textContent(), '');
  await page.locator('#chat-btn').click(); assert.equal(await page.evaluate(() => window.galleryClicked), true);
  await save(page.locator('body'), 'whole-window-catalog.png', { kind: 'composited-background', scene: 'manta-rays', tone: 'dark', placement: 'front', strength: 0.28, variant: 'catalog' });
  await field('bgEnabled', false); await page.evaluate(() => hostTest.dispose());
  assert.equal(await page.locator('[data-ascii-worlds-bg="layer"]').count(), 0);
  assert.deepEqual(errors, []); assert.deepEqual(warnings, []); assert.deepEqual(unexpectedRequests, []);
  const report = { version: '1.2.0', evidence: 'Actual generated plugin captured in a browser test page.', pluginSha256: createHash('sha256').update(plugin).digest('hex'), catalogSha256: createHash('sha256').update(await readFile(catalog)).digest('hex'), captures, errors, warnings, unexpectedRequests };
  await writeFile(path.join(out, 'captures.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ previews: captures.filter(c => c.kind === 'preview').length, captures: captures.length, pluginSha256: report.pluginSha256, errors, warnings, unexpectedRequests }, null, 2));
} finally { await browser.close(); await rm(temp, { recursive: true, force: true }); }
