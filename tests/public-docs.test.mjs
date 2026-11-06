import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = new URL('../', import.meta.url).pathname;

test('catalog documentation transform removes unsupported placement claims and full-only screenshots beyond README', () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'aw-catalog-docs-'));
  try {
    mkdirSync(path.join(temp, 'scripts')); mkdirSync(path.join(temp, 'docs'));
    copyFileSync(path.join(root, 'scripts/catalog-readme.mjs'), path.join(temp, 'scripts/catalog-readme.mjs'));
    writeFileSync(path.join(temp, 'README.md'), '# Catalog fixture\n<!-- chat-area:begin -->\nChat area is full-only.\n<!-- chat-area:end -->\n<!-- catalog: Whole window only. -->\n');
    writeFileSync(path.join(temp, 'docs/GALLERY.md'), '# Gallery\n<!-- chat-area:begin -->\nChat area behaviour.\n![Full](images/full-only.png)\n<!-- chat-area:end -->\n![Catalog](images/settings-catalog.png)\n');
    execFileSync(process.execPath, [path.join(temp, 'scripts/catalog-readme.mjs')], { cwd: temp });
    const readme = readFileSync(path.join(temp, 'README.md'), 'utf8');
    const gallery = readFileSync(path.join(temp, 'docs/GALLERY.md'), 'utf8');
    assert.match(readme, /Whole window only/);
    assert.ok(!/Chat area|full-only\.png|<!--/.test(gallery), 'catalog gallery still advertises stripped mode');
    assert.match(gallery, /settings-catalog\.png/);
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

test('the real public surface passes privacy, local links, ALT, twenty-scene coverage and image identity audit', () => {
  const output = execFileSync('python3', ['scripts/audit-public.py'], { cwd: root, encoding: 'utf8' });
  const report = JSON.parse(output);
  assert.equal(report.passed, true);
  assert.equal(report.scene_ids.length, 20);
  assert.equal(report.actual_browser_captures, 42);
  assert.equal(report.current_pngs, 44);
  assert.ok(report.normal_markdown.local_links > 0 && report.catalog_markdown.local_links > 0);
});

test('catalog Markdown transform is idempotent, selects catalog images and rejects unbalanced blocks', async () => {
  const { catalogMarkdown } = await import('../scripts/catalog-readme.mjs');
  const source = readFileSync(path.join(root, 'README.md'), 'utf8');
  const once = catalogMarkdown(source);
  assert.equal(catalogMarkdown(once), once);
  assert.ok(!/Chat area|settings-full\.png|<!--/.test(once));
  assert.match(once, /settings-catalog\.png/);
  assert.throws(() => catalogMarkdown('<!-- chat-area:begin -->\nunsupported placement'), /Unbalanced/);
});
