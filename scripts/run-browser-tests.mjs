// Runs the browser test suites one after another (they are timing sensitive,
// so they are not run in parallel). See docs/DEVELOPMENT.md for the setup.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const suites = [
  'browser', 'background-harness', 'background-realshape', 'settings-layout', 'timing',
  'all-scenes-browser', 'live-controls', 'storage-browser', 'plugin-smoke', 'demo-smoke', 'recovery-browser',
];
for (const name of ['PLAYWRIGHT_MODULE', 'CHROMIUM_PATH']) {
  if (!process.env[name]) { console.error(`Set ${name} first (see docs/DEVELOPMENT.md).`); process.exit(2); }
}
if (!existsSync(path.join(root, 'tests/.harness/browser-deps'))) {
  console.error('Run `node scripts/prepare-harness.mjs` first (see docs/DEVELOPMENT.md).');
  process.exit(2);
}
let failed = 0;
for (const suite of suites) {
  const started = Date.now();
  const run = spawnSync(process.execPath, [`tests/${suite}.mjs`], { cwd: root, encoding: 'utf8', timeout: 300000 });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (run.status === 0) console.log(`PASS  ${suite} (${seconds}s)`);
  else { failed++; console.log(`FAIL  ${suite} (${seconds}s)\n${(run.stdout + run.stderr).slice(-3000)}`); }
}
console.log(failed ? `${failed} of ${suites.length} suites failed` : `All ${suites.length} browser suites passed`);
process.exit(failed ? 1 : 0);
