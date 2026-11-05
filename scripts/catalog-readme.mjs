// Generate matching catalog documentation, not just a catalog README.
// Run on a separate copy with --root, or deliberately on the catalog branch.
// The original storyboard and standalone Lab ledger are retained as historical
// source documents; they are not catalog feature documentation.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const CATALOG_DOCS = [
  'README.md', 'INSTALL.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'STATUS.md',
  '.github/ISSUE_TEMPLATE/bug_report.md',
  'docs/ARCHITECTURE.md', 'docs/CATALOG.md', 'docs/COMPATIBILITY.md',
  'docs/DEVELOPMENT.md', 'docs/FEATURE-CONTROLS.md', 'docs/GALLERY.md',
  'docs/HISTORY.md', 'docs/HOW-BACKGROUND-WORKS.md',
  'docs/INTEGRATION-REVIEW.md', 'docs/FINAL-INTEGRATION-REVIEW.md',
  'docs/INTEGRATION-VERIFICATION.md', 'docs/LOCAL-TEST-CANDIDATE.md',
  'docs/MANUAL-MAC-CHECKLIST.md', 'docs/SETTINGS-MIGRATION.md',
];

export function catalogMarkdown(source) {
  const begin = (source.match(/<!-- chat-area:begin -->/g) || []).length;
  const end = (source.match(/<!-- chat-area:end -->/g) || []).length;
  if (begin !== end) throw Error('Unbalanced variant documentation markers');
  return source
    .replace(/<!-- chat-area:begin -->[\s\S]*?<!-- chat-area:end -->\n?/g, '')
    .replace(/<!-- catalog:\s*([\s\S]*?)\s*-->/g, '$1');
}

export function generateCatalogDocs(root) {
  const changes = [];
  for (const relative of CATALOG_DOCS) {
    const file = path.join(root, relative);
    if (!existsSync(file)) continue;
    const source = readFileSync(file, 'utf8');
    const result = catalogMarkdown(source);
    if (/Chat area|Chat-area|data-chat-surface|aui_thread-viewport|--ui-chat-surface-background/.test(result)) {
      throw Error(`Unmarked full-only claim in ${relative}`);
    }
    if (relative === 'README.md' || relative === 'docs/GALLERY.md') {
      if (/images\/v1\.2\/(?:settings-full|whole-window)\.png/.test(result)) throw Error(`Full-only screenshot in ${relative}`);
    }
    if (source !== result) { writeFileSync(file, result); changes.push(relative); }
  }
  return changes;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--root');
  if (i >= 0 && !process.argv[i + 1]) throw Error('--root requires a source-tree copy');
  const root = i >= 0 ? path.resolve(process.argv[i + 1]) : fileURLToPath(new URL('../', import.meta.url));
  console.log('Generated catalog documentation:', generateCatalogDocs(root).join(', ') || '(already generated)');
}
