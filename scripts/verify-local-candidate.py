"""Run the complete local-candidate gate; stdlib orchestration, no installs.

python3 scripts/verify-local-candidate.py [--browser] [--out evidence/final]
Browser prerequisites: scripts/prepare-harness.mjs, PLAYWRIGHT_MODULE,
CHROMIUM_PATH (see docs/DEVELOPMENT.md). Never claims native Desktop acceptance.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser()
parser.add_argument('--browser', action='store_true')
parser.add_argument('--out', type=Path, default=ROOT / 'evidence/final')
args = parser.parse_args()
args.out.mkdir(parents=True, exist_ok=True)
receipts = []


def run(argv, label):
    start = time.monotonic()
    p = subprocess.run(argv, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, timeout=300)
    (args.out / (label + '.log')).write_text(p.stdout)
    row = {'argv': argv, 'cwd': str(ROOT), 'exit_code': p.returncode, 'seconds': round(time.monotonic() - start, 3), 'log': label + '.log'}
    receipts.append(row)
    (args.out / 'runs.json').write_text(json.dumps(receipts, indent=2) + '\n')
    print(label, p.returncode, row['seconds'], flush=True)
    assert p.returncode == 0, (label, p.stdout[-5000:])
    return p.stdout


def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


verify = run(['npm', 'run', 'verify'], 'verify')
summary = dict(re.findall(r'^# (tests|pass|fail|cancelled|skipped|todo) (\d+)$', verify, re.M))
assert summary['tests'] == summary['pass'] and all(summary[x] == '0' for x in ['fail', 'cancelled', 'skipped', 'todo'])
names = re.findall(r'^# Subtest: (.*)$', verify, re.M)
assert len(names) == int(summary['tests'])
identity = {p: digest(ROOT / p) for p in ['desktop/plugin.js', 'demo.html']}
run(['npm', 'run', 'build'], 'repeat-build')
assert identity == {p: digest(ROOT / p) for p in identity}, 'nondeterministic build'
with tempfile.TemporaryDirectory(prefix='ascii-worlds-catalog-', dir=os.environ.get('TMPDIR')) as temp:
    target = Path(temp) / 'plugin.js'
    run(['npm', 'run', 'build:catalog', '--', '--out', str(target)], 'catalog-build')
    run(['node', '--check', str(target)], 'catalog-syntax')
    text = target.read_text()
    assert 'const CHAT_AREA = false;' in text
    assert not any(x in text for x in ['data-chat-surface', 'aui_thread-viewport', '--ui-chat-surface-background', '--ui-bg-chrome'])
    catalog = {'sha256': digest(target), 'bytes': target.stat().st_size}
syntax = sorted(p for d in ['src', 'scripts', 'tests'] for p in (ROOT / d).rglob('*') if p.suffix in ['.js', '.mjs'] and '.harness' not in p.parts)
for p in syntax + [ROOT / 'desktop/plugin.js']:
    run(['node', '--check', str(p)], 'syntax-' + str(p.relative_to(ROOT)).replace('/', '_'))
run(['git', 'diff', '--check'], 'diff-check') if (ROOT / '.git').exists() else None
if args.browser:
    for suite in ['browser', 'background-harness', 'background-realshape', 'settings-layout', 'timing', 'all-scenes-browser', 'live-controls', 'storage-browser', 'integrated-plugin', 'integrated-demo', 'corrections-browser']:
        run(['node', 'tests/' + suite + '.mjs'], suite)
assert identity == {p: digest(ROOT / p) for p in identity}, 'tested artifact changed'
report = {'passed': True, 'unit_summary': summary, 'test_names': names, 'artifacts': identity, 'catalog': catalog, 'syntax_files_including_plugin': len(syntax) + 1, 'browser_suites': 11 if args.browser else 0, 'limits': ['Linux Chromium/mock SDK only; native Mac checklist remains pending.']}
(args.out / 'summary.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
