"""Audit the explicit public surface; emit a reviewed publish manifest on request.

Python stdlib + existing Node only. No installs, staging, commits or network.
Private machine logs/evidence must stay outside this allowlist.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import struct
import subprocess
import tempfile
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent.parent
ROOT_FILES = {'README.md', 'INSTALL.md', 'STATUS.md', 'CHANGELOG.md', 'CONTRIBUTING.md',
              'LICENSE', 'THIRD_PARTY_NOTICES.md', 'package.json', 'plugin.yaml',
              'demo.html', 'desktop/plugin.js', '.gitignore', '.github/workflows/ci.yml',
              '.github/ISSUE_TEMPLATE/bug_report.md', '.github/PULL_REQUEST_TEMPLATE.md'}
TEXT = {'.md', '.js', '.mjs', '.py', '.sh', '.html', '.json', '.yaml', '.yml'}
SKIP = {'.git', 'node_modules', '.harness', '__pycache__', 'evidence', 'release'}


def public_files():
    result = set(ROOT_FILES)
    for directory in ('src', 'scripts', 'tests'):
        for p in (ROOT / directory).rglob('*'):
            if p.is_file() and not set(p.relative_to(ROOT).parts) & SKIP and p.suffix in TEXT:
                result.add(p.relative_to(ROOT).as_posix())
    for p in (ROOT / 'docs').rglob('*'):
        if not p.is_file():
            continue
        relative = p.relative_to(ROOT).as_posix()
        if p.suffix == '.md' or (relative.startswith('docs/images/') and p.suffix in {'.png', '.jpg', '.json'}):
            result.add(relative)
    return sorted(p for p in result if (ROOT / p).is_file())


def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def visible(text):
    return re.sub(r'<!--[\s\S]*?-->', '', text)


def slug(heading):
    return re.sub(r'\s', '-', re.sub(r'[^\w\-\s]', '', heading.strip().lower()))


def links(files, contents=None):
    count = images = 0
    for relative in files:
        if not relative.endswith('.md'):
            continue
        source = contents.get(relative, (ROOT / relative).read_text()) if contents else (ROOT / relative).read_text()
        text = visible(source)
        # Ignore fenced code: syntax examples are not rendered Markdown links.
        text = re.sub(r'```[\s\S]*?```', '', text)
        for m in re.finditer(r'(!?)\[([^\]]*)\]\(([^)]+)\)', text):
            image, label, target = m.groups()
            target = target.strip().split(' "', 1)[0]
            if image:
                images += 1
                assert len(label.strip()) >= 8, ('missing/descriptively empty image ALT', relative, target)
            url = urlsplit(target)
            if url.scheme or url.netloc:
                assert url.scheme in {'https', 'http', 'mailto'}, ('unsupported URL', relative, target)
                continue
            count += 1
            p = (ROOT / relative).parent / unquote(url.path) if url.path else ROOT / relative
            p = p.resolve()
            assert p.is_relative_to(ROOT), ('link escapes tree', relative, target)
            assert p.is_file(), ('missing local link/image', relative, target)
            if url.fragment and p.suffix == '.md':
                rel = p.relative_to(ROOT).as_posix()
                destination = contents.get(rel, p.read_text()) if contents else p.read_text()
                headings = {slug(h) for h in re.findall(r'^#{1,6}\s+(.+)$', visible(destination), re.M)}
                assert unquote(url.fragment) in headings, ('missing heading anchor', relative, target)
    return {'local_links': count, 'rendered_images_with_alt': images}


def audit():
    files = public_files()
    private_patterns = [
        rb'/' + rb'home/[\w.-]+/', rb'/' + rb'Users/[\w.-]+/',
        rb'/' + rb'root/', rb'\b' + rb't_[0-9a-f]{8}\b',
        rb'\b' + rb'local-[0-9a-f]{32,}\b',
        rb'-----BEGIN (?:OPENSSH |RSA |EC )?' + rb'PRIVATE KEY-----',
        rb'\b(?:ghp_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9]{32,})\b',
    ]
    for relative in files:
        p = ROOT / relative
        assert not p.is_symlink(), ('symlink in public tree', relative)
        data = p.read_bytes()
        assert not data.startswith((b'\x7fELF', b'MZ', b'\x00asm', b'\xcf\xfa\xed\xfe', b'\xfe\xed\xfa\xcf', b'PK\x03\x04')), ('executable/archive payload', relative)
        if p.suffix in TEXT or relative in {'.gitignore', 'LICENSE'}:
            data.decode('utf8')
            for pattern in private_patterns:
                assert not re.search(pattern, data), ('private identifier/path/key-like pattern', relative)
    # Untracked or tracked non-ignored files must be accounted for, not silently
    # omitted from a broad git-add. Deleted paths are explicitly listed separately.
    tracked = []
    if (ROOT / '.git').exists():
        tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0')
        candidates = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=ROOT).decode().split('\0')
        for relative in candidates:
            if relative and (ROOT / relative).is_file():
                assert relative in files, ('non-ignored file is not public-allowlisted', relative)
    normal_links = links(files)
    script = "import {WORLD_IDS} from './src/settings-v3.js';console.log(JSON.stringify(WORLD_IDS));"
    ids = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', script], cwd=ROOT))
    assert len(ids) == len(set(ids)) == 20
    gallery = ROOT / 'docs/images/v1.2'
    captures = json.loads((gallery / 'captures.json').read_text())
    manifest = json.loads((gallery / 'gallery.json').read_text())
    assert captures['version'] == manifest['version'] == json.loads((ROOT / 'package.json').read_text())['version'] == '1.2.0'
    assert captures['pluginSha256'] == manifest['pluginSha256']
    assert captures['catalogSha256'] == manifest['catalogSha256']
    assert digest(ROOT / 'desktop/plugin.js') in {captures['pluginSha256'], captures['catalogSha256']}, 'plugin matches neither captured variant'
    assert not captures['errors'] and not captures['warnings'] and not captures['unexpectedRequests']
    previews = [c for c in captures['captures'] if c['kind'] == 'preview']
    assert len(previews) == 40
    assert {(c['scene'], c['tone']) for c in previews} == {(scene, tone) for scene in ids for tone in ('dark', 'light')}
    assert all(c['defaults'] for c in previews)
    assert len(captures['captures']) == 44
    names = set()
    for record in manifest['images']:
        name = record['file']; p = gallery / name
        assert name not in names; names.add(name)
        data = p.read_bytes()
        assert data[:8] == b'\x89PNG\r\n\x1a\n'
        assert list(struct.unpack('>II', data[16:24])) == record['dimensions']
        assert len(data) == record['bytes'] and digest(p) == record['sha256']
        assert 0 < len(data) < 1_000_000, ('oversized/empty screenshot', name)
        assert record['caption'] and 'native Mac acceptance not claimed' in record['evidence']
    assert names == {p.name for p in gallery.glob('*.png')}
    assert len(names) == 46 and manifest['overviewThemes'] == {'dark': 10, 'light': 10}
    for capture in captures['captures']:
        p = gallery / capture['file']
        assert p.stat().st_size == capture['bytes'] and digest(p) == capture['sha256']
    assert struct.unpack('>II', (gallery / 'banner.png').read_bytes()[16:24]) == (1200, 600)
    assert all((gallery / p).is_file() for p in ('overview.png', 'sea-turtles-light.png', 'luna-moths-dark.png', 'sleeping-cat-dark.png', 'settings-catalog.png', 'whole-window-catalog.png'))
    # Generate the actual catalog docs on a copy. Original docs/art stay untouched.
    with tempfile.TemporaryDirectory(prefix='aw-public-docs-', dir=os.environ.get('TMPDIR')) as tmp:
        out = Path(tmp)
        for relative in files:
            if relative.endswith('.md'):
                p = out / relative; p.parent.mkdir(parents=True, exist_ok=True); shutil.copy2(ROOT / relative, p)
        subprocess.run(['node', 'scripts/catalog-readme.mjs', '--root', str(out)], cwd=ROOT, check=True, capture_output=True)
        transformed = {p: (out / p).read_text() for p in files if p.endswith('.md')}
        for relative in ('README.md', 'docs/GALLERY.md'):
            assert not re.search(r'Chat[ -]area|settings-full\.png|(?<!catalog-)whole-window\.png', transformed[relative], re.I), ('unsupported catalog surface', relative)
        catalog_links = links(files, transformed)
    return {'passed': True, 'files': [{'path': p, 'bytes': (ROOT / p).stat().st_size, 'sha256': digest(ROOT / p)} for p in files],
            'deletions': sorted(p for p in tracked if p and not (ROOT / p).exists()),
            'normal_markdown': normal_links, 'catalog_markdown': catalog_links,
            'scene_ids': ids, 'current_pngs': len(names), 'actual_browser_captures': len(captures['captures']),
            'current_png_bytes': sum(r['bytes'] for r in manifest['images']),
            'limits': ['Pattern scan is not a security certification.', 'Semantic image/privacy inspection is a separate visual review.', 'Native Mac acceptance not claimed.']}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--manifest', type=Path, help='Write the exact reviewed allowlist outside public staging')
    args = parser.parse_args()
    report = audit()
    if args.manifest:
        assert not args.manifest.resolve().is_relative_to(ROOT), 'Keep publication receipt outside the public source tree'
        args.manifest.parent.mkdir(parents=True, exist_ok=True)
        args.manifest.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({k: len(v) if k == 'files' else v for k, v in report.items()}, indent=2))


if __name__ == '__main__':
    main()
