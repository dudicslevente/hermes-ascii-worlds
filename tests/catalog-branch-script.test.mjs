import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, copyFileSync, chmodSync, rmSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const scriptSource = path.join(root, 'scripts/make-catalog-branch.sh');
const identity = {
  GIT_AUTHOR_NAME: 'Tester', GIT_AUTHOR_EMAIL: 'tester', GIT_COMMITTER_NAME: 'Tester', GIT_COMMITTER_EMAIL: 'tester',
  GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1',
};

function run(cwd, command, args) {
  return execFileSync(command, args, { cwd, encoding: 'utf8', env: { ...process.env, ...identity }, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
const git = (cwd, ...args) => run(cwd, 'git', args);

// A throwaway repository whose build steps are stubs: only the branch history
// logic of the real script is under test, with a local bare repository as origin.
function fixture(temp) {
  const remote = path.join(temp, 'remote.git');
  const work = path.join(temp, 'work');
  const scratch = path.join(temp, 'scratch');
  mkdirSync(scratch);
  mkdirSync(remote); git(remote, 'init', '-q', '--bare');
  mkdirSync(path.join(work, 'scripts'), { recursive: true });
  git(work, 'init', '-q'); git(work, 'checkout', '-q', '-b', 'main');
  writeFileSync(path.join(work, 'package.json'), '{"private":true,"scripts":{"build:catalog":"node scripts/stub-build.mjs"}}\n');
  writeFileSync(path.join(work, 'scripts/stub-build.mjs'),
    "import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';\n" +
    "mkdirSync('desktop', { recursive: true });\n" +
    "writeFileSync('desktop/plugin.js', 'catalog build of ' + readFileSync('source.txt', 'utf8'));\n");
  writeFileSync(path.join(work, 'scripts/catalog-readme.mjs'),
    "import { readFileSync, writeFileSync } from 'node:fs';\n" +
    "writeFileSync('README.md', readFileSync('README.md', 'utf8').replace('FULL', 'CATALOG'));\n");
  copyFileSync(scriptSource, path.join(work, 'scripts/make-catalog-branch.sh'));
  chmodSync(path.join(work, 'scripts/make-catalog-branch.sh'), 0o755);
  mkdirSync(path.join(work, 'desktop'));
  writeFileSync(path.join(work, 'desktop/plugin.js'), 'full build of v1\n');
  writeFileSync(path.join(work, 'source.txt'), 'v1\n');
  writeFileSync(path.join(work, 'README.md'), 'FULL readme\n');
  git(work, 'add', '-A'); git(work, 'commit', '-q', '-m', 'main one');
  git(work, 'remote', 'add', 'origin', remote);
  const script = (...args) => spawnSync('bash', ['scripts/make-catalog-branch.sh', ...args], {
    cwd: work, encoding: 'utf8', env: { ...process.env, ...identity, TMPDIR: scratch },
  });
  return { remote, work, scratch, script };
}

test('the catalog script extends catalog history instead of rewriting it, and pushes fast-forward only', () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'aw-catalog-branch-'));
  try {
    const { remote, work, scratch, script } = fixture(temp);
    const main1 = git(work, 'rev-parse', 'main');

    const first = script('--push');
    assert.equal(first.status, 0, first.stderr);
    const pinned = git(work, 'rev-parse', 'catalog');
    assert.equal(first.stdout.trim(), pinned);
    assert.equal(git(work, 'rev-parse', `${pinned}^`), main1, 'first catalog commit sits on main');
    assert.equal(git(work, 'show', `${pinned}:README.md`), 'CATALOG readme');
    assert.equal(git(work, 'show', `${pinned}:desktop/plugin.js`), 'catalog build of v1');
    assert.equal(git(remote, 'rev-parse', 'catalog'), pinned);
    assert.equal(git(work, 'rev-parse', '--abbrev-ref', 'HEAD'), 'main', 'checked-out branch is left alone');
    assert.equal(git(work, 'status', '--porcelain'), '');

    const again = script();
    assert.equal(again.status, 0, again.stderr);
    assert.equal(again.stdout.trim(), pinned, 'unchanged inputs reuse the existing commit');
    assert.match(again.stderr, /already up to date/);

    writeFileSync(path.join(work, 'source.txt'), 'v2\n');
    writeFileSync(path.join(work, 'README.md'), 'FULL readme two\n');
    writeFileSync(path.join(work, 'desktop/plugin.js'), 'full build of v2\n');
    git(work, 'commit', '-q', '-am', 'main two');
    const main2 = git(work, 'rev-parse', 'main');

    const second = script('--push');
    assert.equal(second.status, 0, second.stderr);
    const next = git(work, 'rev-parse', 'catalog');
    assert.notEqual(next, pinned);
    assert.deepEqual(git(work, 'rev-list', '--parents', '-n', '1', next).split(' ').slice(1), [pinned, main2],
      'previous pin is the first parent, new main the second');
    git(work, 'merge-base', '--is-ancestor', pinned, next);
    assert.equal(git(work, 'show', `${next}:README.md`), 'CATALOG readme two');
    assert.equal(git(work, 'show', `${next}:desktop/plugin.js`), 'catalog build of v2');
    assert.equal(git(remote, 'rev-parse', 'catalog'), next, 'remote advanced by a plain fast-forward');
    git(remote, 'merge-base', '--is-ancestor', pinned, next);
    assert.deepEqual(readdirSync(scratch).filter((name) => name.startsWith('ascii-worlds-catalog.')), [], 'temporary worktree directories are removed');
    assert.equal(git(work, 'worktree', 'list').split('\n').length, 1, 'no linked worktree is left registered');
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

test('the catalog script refuses to push a non-descendant branch, a dirty tree and unknown flags', () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'aw-catalog-branch-'));
  try {
    const { remote, work, script } = fixture(temp);
    assert.equal(script('--push').status, 0);
    const published = git(remote, 'rev-parse', 'catalog');

    // Local catalog pointing at an unrelated history must not overwrite the published one.
    git(work, 'checkout', '-q', '--orphan', 'unrelated');
    git(work, 'rm', '-rfq', '.');
    writeFileSync(path.join(work, 'x.txt'), 'x\n');
    git(work, 'add', 'x.txt'); git(work, 'commit', '-q', '-m', 'unrelated');
    git(work, 'branch', '-f', 'catalog', 'unrelated');
    git(work, 'checkout', '-q', 'main');
    const rejected = script('--push');
    assert.notEqual(rejected.status, 0, 'a non-fast-forward push must fail');
    assert.match(rejected.stderr, /rejected|non-fast-forward|failed to push/);
    assert.equal(git(remote, 'rev-parse', 'catalog'), published, 'published catalog history is untouched');

    writeFileSync(path.join(work, 'dirty.txt'), 'dirty\n');
    const dirty = script();
    assert.equal(dirty.status, 1);
    assert.match(dirty.stderr, /not clean/);
    rmSync(path.join(work, 'dirty.txt'));

    const unknown = script('--force');
    assert.equal(unknown.status, 2);
    assert.match(unknown.stderr, /usage/);
    const extra = script('--push', '--force');
    assert.equal(extra.status, 2, 'extra arguments are refused rather than ignored');
    assert.equal(git(remote, 'rev-parse', 'catalog'), published);

    git(work, 'checkout', '-q', 'catalog');
    const onCatalog = script();
    assert.equal(onCatalog.status, 1);
    assert.match(onCatalog.stderr, /Switch to another branch/);
    git(work, 'checkout', '-q', 'main');
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

test('the real catalog script contains no forced push, branch reset or history rewrite', () => {
  const lines = readFileSync(scriptSource, 'utf8').split('\n').filter((line) => !line.trim().startsWith('#'));
  const pushes = lines.filter((line) => /\bgit push\b/.test(line));
  assert.ok(pushes.length >= 1);
  assert.ok(pushes.every((line) => !/force|\s-f\b|\+refs|--delete/.test(line)), pushes.join('\n'));
  assert.ok(!lines.some((line) => /checkout\b.*\s-B\b|reset --hard|branch -D|filter-branch|rebase/.test(line)));
});
