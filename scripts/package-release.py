"""Builds the two release archives from a clean build (stdlib only).

  python3 scripts/package-release.py [output-dir]

Writes ascii-worlds-<version>-plugin.zip (install only) and
ascii-worlds-<version>.zip (full source). Fails if the build is not
deterministic, if the plugin imports anything but the three allowed modules,
or if an archive does not match the files it was made from.
"""
import hashlib, json, re, subprocess, sys, zipfile
from pathlib import Path

root = Path(__file__).resolve().parent.parent
out = Path(sys.argv[1]) if len(sys.argv) > 1 else root / "release"
out.mkdir(parents=True, exist_ok=True)
version = json.loads((root / "package.json").read_text())["version"]
plugin, demo = root / "desktop/plugin.js", root / "demo.html"

def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
subprocess.run(["node", "scripts/build.mjs"], cwd=root, check=True, capture_output=True)
first = (digest(plugin), digest(demo))
subprocess.run(["node", "scripts/build.mjs"], cwd=root, check=True, capture_output=True)
assert first == (digest(plugin), digest(demo)), "build is not deterministic"
text = plugin.read_text()
assert f"v{version}" in text.splitlines()[0], "build header does not match package.json"
imports = set(re.findall(r"^import[\s\S]*?from\s+['\"]([^'\"]+)['\"];", text, re.M))
assert imports == {"react", "react/jsx-runtime", "@hermes/plugin-sdk"}, imports

docs = [p for p in sorted((root / "docs").rglob("*")) if p.is_file()]
common = ["README.md", "LICENSE", "CHANGELOG.md", "THIRD_PARTY_NOTICES.md"]
install = {f"ascii-worlds/plugin.js": plugin, "demo.html": demo}
install.update({n: root / n for n in common})
install.update({str(p.relative_to(root)): p for p in docs if p.suffix in {".png", ".jpg"} or "HOW-BACKGROUND" in p.name})

source = {}
skip_dirs = {"node_modules", ".git", "__pycache__", "evidence", ".harness", "release"}
for p in sorted(root.rglob("*")):
    rel = p.relative_to(root)
    if p.is_file() and not (set(rel.parts) & skip_dirs):
        source[str(rel)] = p

def write(path, mapping, prefix):
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for name, p in sorted(mapping.items()):
            z.write(p, f"{prefix}/{name}")
    with zipfile.ZipFile(path) as z:
        assert z.testzip() is None
        for name, p in mapping.items():
            assert z.read(f"{prefix}/{name}") == p.read_bytes(), name
    return {"file": path.name, "bytes": path.stat().st_size, "entries": len(mapping),
            "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}

report = [write(out / f"ascii-worlds-{version}-plugin.zip", install, f"ascii-worlds-{version}-plugin"),
          write(out / f"ascii-worlds-{version}.zip", source, f"ascii-worlds-{version}")]
(out / "SHA256SUMS.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps(report, indent=2))
