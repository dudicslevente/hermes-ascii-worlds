// Generate the catalog edition of the documentation: sections between
// chat-area markers are dropped and <!-- catalog: ... --> text is shown instead.
// Run on a separate copy with --root, or deliberately on the catalog branch.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const CATALOG_DOCS = [
  'README.md', 'INSTALL.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'SECURITY.md',
  '.github/ISSUE_TEMPLATE/bug_report.md',
  'docs/ARCHITECTURE.md', 'docs/BACKGROUND.md', 'docs/COMPATIBILITY.md',
  'docs/CONTROLS.md', 'docs/DEVELOPMENT.md', 'docs/GALLERY.md',
  'docs/RELEASING.md', 'docs/SETTINGS.md',
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
