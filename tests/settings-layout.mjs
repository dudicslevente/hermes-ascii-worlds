// Regression for the "settings page shows only a heading" bug found on a real
// Hermes Desktop window: the Settings content area gives a plugin page no fixed
// height, and a layout built on height:100% / flex-basis:0 collapses to nothing.
// The mock host (?only=1) mounts the page in an auto-height container that the
// host scrolls, like the real one. Mock page, not the live app.
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
const checks = [];
try {
  for (const [w, h] of [[1000, 650], [600, 700], [360, 640]]) {
    const page = await (await browser.newContext({ viewport: { width: w, height: h }, colorScheme: 'dark' })).newPage();
    await page.goto(base + '?only=1');
    await page.waitForFunction(() => document.querySelector('.aw-canvas')?.width > 10);
    const m = await page.evaluate(() => {
      const sections = [...document.querySelectorAll('.aw-world .aw-section')].map((s) => Math.round(s.getBoundingClientRect().height));
      const bgBox = document.querySelector('[name=bgEnabled]').getBoundingClientRect();
      const world = document.querySelector('.aw-world').getBoundingClientRect();
      const reset = [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Reset to defaults');
      return { sections, worldH: Math.round(world.height), bgVisible: bgBox.height > 8 && bgBox.width > 8, resetOk: !!reset, radios: document.querySelectorAll('[name=bgPlacement]').length };
    });
    assert.ok(m.sections.length >= 3 && m.sections.every((x) => x > 40), `every section has real height at ${w}px: ` + JSON.stringify(m));
    assert.ok(m.worldH > 400, `page content has real height at ${w}px: ${m.worldH}`);
    assert.ok(m.bgVisible && m.radios === 2 && m.resetOk, 'Background switch, both placement cards and Reset are present and sized: ' + JSON.stringify(m));
    await page.waitForTimeout(300);
    if (w === 1000) await page.screenshot({ path: project + 'evidence/v1.0-settings-page-1000.png' });
    if (w === 360) await page.screenshot({ path: project + 'evidence/v1.0-settings-page-360.png' });
    // The host scrolls: the last control can be reached.
    const reached = await page.evaluate(async () => {
      const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Reset to defaults');
      b.scrollIntoView(); await new Promise((r) => setTimeout(r, 50));
      const r = b.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1;
    });
    assert.ok(reached, 'Reset to defaults can be scrolled into view at ' + w);
    checks.push(`${w}x${h}: ${m.sections.length} sections all taller than 40px (${m.sections.join(', ')}), page ${m.worldH}px tall, Reset reachable by host scrolling`);
    await page.close();
  }
  await writeFile(project + 'evidence/settings-layout-results.json', JSON.stringify({ passed: true, mockedHost: true, checks }, null, 2) + '\n');
  console.log(JSON.stringify({ passed: true, checks }, null, 2));
} catch (e) { console.error('FAIL', e.message); process.exitCode = 1; }
finally { await browser.close(); server.close(); }
