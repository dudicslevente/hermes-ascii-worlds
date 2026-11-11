import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = new URL('../', import.meta.url).pathname;

test('catalog documentation transform removes unsupported placement claims', () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'aw-catalog-docs-'));
  try {
    mkdirSync(path.join(temp, 'scripts')); mkdirSync(path.join(temp, 'docs'));
    copyFileSync(path.join(root, 'scripts/catalog-readme.mjs'), path.join(temp, 'scripts/catalog-readme.mjs'));
    writeFileSync(path.join(temp, 'README.md'), '# Fixture\n<!-- chat-area:begin -->\nChat area is full-only.\n<!-- chat-area:end -->\n<!-- catalog: Whole window only. -->\n');
    writeFileSync(path.join(temp, 'docs/GALLERY.md'), '# Gallery\n<!-- chat-area:begin -->\nChat area behaviour.\n<!-- chat-area:end -->\nAll good.\n');
    execFileSync(process.execPath, [path.join(temp, 'scripts/catalog-readme.mjs')], { cwd: temp });
    assert.match(readFileSync(path.join(temp, 'README.md'), 'utf8'), /Whole window only/);
    assert.ok(!/Chat area|<!--/.test(readFileSync(path.join(temp, 'docs/GALLERY.md'), 'utf8')));
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

test('catalog Markdown transform is idempotent and rejects unbalanced blocks', async () => {
  const { catalogMarkdown } = await import('../scripts/catalog-readme.mjs');
  const once = catalogMarkdown(readFileSync(path.join(root, 'README.md'), 'utf8'));
  assert.equal(catalogMarkdown(once), once);
  assert.ok(!/Chat area|<!--/.test(once));
  assert.throws(() => catalogMarkdown('<!-- chat-area:begin -->\nunsupported'), /Unbalanced/);
});

function markdownFiles(dir, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'evidence', 'release', '.harness'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) markdownFiles(full, found);
    else if (entry.name.endsWith('.md')) found.push(full);
  }
  return found;
}

test('every local link and image in the Markdown docs exists and images have alt text', () => {
  const problems = [];
  for (const file of markdownFiles(root)) {
    const text = readFileSync(file, 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/```[\s\S]*?```/g, '');
    for (const m of text.matchAll(/(!?)\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g)) {
      const [, image, label, target] = m;
      if (image && label.trim().length < 8) problems.push(`${file}: short alt text for ${target}`);
      if (/^[a-z]+:/i.test(target) || target.startsWith('#')) continue;
      const resolved = path.resolve(path.dirname(file), decodeURIComponent(target.split('#')[0]));
      if (!existsSync(resolved)) problems.push(`${path.relative(root, file)}: missing ${target}`);
    }
  }
  assert.deepEqual(problems, []);
});

test('the gallery shows every habitat in both themes', () => {
  const ids = ['koi', 'jellyfish', 'manta-rays', 'sea-turtles', 'seahorses', 'tiny-fish-school', 'solitary-whale', 'octopus', 'hammerhead', 'anglerfish', 'butterflies', 'luna-moths', 'dragonflies', 'swallows', 'sleeping-cat', 'axolotl', 'owl', 'ginkgo-leaves', 'cherry-blossom-petals', 'fireflies', 'bubbles', 'dandelion-seeds', 'night-sky'];
  for (const id of ids) for (const tone of ['dark', 'light'])
    assert.ok(existsSync(path.join(root, `docs/images/habitats/${id}-${tone}.png`)), `${id}-${tone}.png`);
});
