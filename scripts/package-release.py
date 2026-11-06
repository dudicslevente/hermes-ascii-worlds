"""Build the release archives (plugin ZIP and source ZIP); Python stdlib only.

  python3 scripts/package-release.py [output-dir]

This never installs, commits, pushes or publishes. Each build is deterministic;
archive paths preserve the original release layout (outer versioned folder,
inner ascii-worlds/plugin.js).
"""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parent.parent
DOCS = [
    'ARCHITECTURE.md', 'BACKGROUND.md', 'COMPATIBILITY.md', 'CONTROLS.md',
    'DEVELOPMENT.md', 'GALLERY.md', 'RELEASING.md', 'SETTINGS.md',
]
COMMON = ['README.md', 'INSTALL.md', 'LICENSE', 'CHANGELOG.md', 'CONTRIBUTING.md', 'SECURITY.md', 'THIRD_PARTY_NOTICES.md', 'package.json', 'plugin.yaml']
SKIP = {'node_modules', '.git', '__pycache__', 'evidence', '.harness', 'release'}


def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def mappings(root=ROOT):
    shared = {n: root / n for n in COMMON}
    shared.update({'docs/' + n: root / 'docs' / n for n in DOCS})
    for p in sorted((root / 'docs/images').rglob('*')):
        if p.is_file() and p.suffix in {'.png', '.jpg'}:
            shared[str(p.relative_to(root))] = p
    install = {**shared, 'ascii-worlds/plugin.js': root / 'desktop/plugin.js', 'demo.html': root / 'demo.html'}
    source = {**shared, 'desktop/plugin.js': root / 'desktop/plugin.js', 'demo.html': root / 'demo.html'}
    for directory in ['src', 'scripts', 'tests']:
        for p in sorted((root / directory).rglob('*')):
            rel = p.relative_to(root)
            if p.is_file() and not set(rel.parts) & SKIP and p.suffix in {'.js', '.mjs', '.py', '.json', '.html', '.sh'}:
                source[str(rel)] = p
    # CI metadata is ordinary source, never a dependency tree or private state.
    for rel in ['.gitignore', '.github/workflows/ci.yml']:
        if (root / rel).is_file():
            source[rel] = root / rel
    return install, source


def validate(mapping):
    # Assemble signatures so this scanner's own source is distributable.
    private = [b'/home/' + b'levi/', b'/' + b'Users/', b'-----BEGIN ' + b'PRIVATE KEY-----', b'-----BEGIN ' + b'OPENSSH PRIVATE KEY-----']
    for name, p in mapping.items():
        assert not p.is_symlink(), ('symlink forbidden', name)
        assert p.is_file(), ('missing input', name)
        assert not set(Path(name).parts) & SKIP and '..' not in Path(name).parts
        if p.suffix in {'.js', '.mjs', '.py', '.md', '.html', '.json', '.yaml', '.yml', '.sh'}:
            data = p.read_bytes()
            assert not any(s in data for s in private), ('private path/key in distribution', name)
            assert not re.search(rb'\b(?:ghp_[A-Za-z0-9]{30,}|sk-[A-Za-z0-9]{32,})\b', data), ('key-like value', name)


def write_archive(path, mapping, prefix):
    validate(mapping)
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for name, p in sorted(mapping.items()):
            info = zipfile.ZipInfo(prefix + '/' + name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            z.writestr(info, p.read_bytes())
    with zipfile.ZipFile(path) as z:
        assert z.testzip() is None
        assert len(z.namelist()) == len(set(z.namelist())) == len(mapping)
        for name, p in mapping.items():
            assert z.read(prefix + '/' + name) == p.read_bytes(), name
    return {'file': path.name, 'bytes': path.stat().st_size, 'entries': len(mapping), 'sha256': digest(path)}


def main():
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'release'
    out.mkdir(parents=True, exist_ok=True)
    version = json.loads((ROOT / 'package.json').read_text())['version']
    plugin, demo = ROOT / 'desktop/plugin.js', ROOT / 'demo.html'
    first = None
    for _ in range(2):
        subprocess.run(['node', 'scripts/build.mjs'], cwd=ROOT, check=True, capture_output=True)
        current = digest(plugin), digest(demo)
        if _ == 0:
            first = current
        else:
            assert first == current, 'build is not deterministic'
    text = plugin.read_text()
    assert f'v{version} |' in text.splitlines()[0]
    assert re.search(r'^version:\s*"' + re.escape(version) + r'"$', (ROOT / 'plugin.yaml').read_text(), re.M)
    assert f'PLUGIN_VERSION = "{version}"' in text
    imports = set(re.findall(r'^import[\s\S]*?from\s+[\'"]([^\'"]+)[\'"];', text, re.M))
    assert imports == {'react', 'react/jsx-runtime', '@hermes/plugin-sdk'}, imports
    assert not re.search(r'\b(?:fetch|eval|WebSocket)\s*\(|new\s+(?:Function|Worker)\s*\(', text)
    install, source = mappings()
    report = [
        write_archive(out / f'ascii-worlds-{version}-plugin.zip', install, f'ascii-worlds-{version}-plugin'),
        write_archive(out / f'ascii-worlds-{version}.zip', source, f'ascii-worlds-{version}'),
    ]
    (out / 'SHA256SUMS.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
