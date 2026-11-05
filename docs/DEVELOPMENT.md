# Development and testing

## Small, deterministic build

Node **20+** builds and tests the project without installing packages. Python 3
is used by the optional all-gates and packaging scripts. The plugin needs only
the React/SDK modules supplied by Desktop at runtime.

```sh
npm test
npm run build
npm run verify
node --check desktop/plugin.js
node scripts/build.mjs --catalog --out /your/scratch/catalog-plugin.js
```

Commit generated `desktop/plugin.js` and `demo.html` with their source changes;
never hand-edit them. Two normal builds must produce the same bytes. The scoped
ESM-subset bundler rejects unsupported syntax/cycles and keeps deterministic
relative module IDs. An alternate `--out` build never rewrites the regular plugin
or demo. Public CI reruns unit/build checks and detects stale committed output.

## Browser prerequisites, separate from the plugin

Use a separately provisioned tooling directory containing **Playwright, React,
react-dom and esbuild**, plus an existing Chromium executable. Nothing below
automatically installs packages, modifies a live Desktop app or needs credentials.

```sh
export ASCII_WORLDS_TOOLS=/path/to/tools
export PLAYWRIGHT_MODULE="$ASCII_WORLDS_TOOLS/node_modules/playwright/index.mjs"
export CHROMIUM_PATH=/path/to/chrome
node scripts/prepare-harness.mjs
```

Preparation creates ignored `tests/.harness/browser-deps/`. Real-React suites use
React Strict Mode with a mock SDK, actual generated plugin registration/native
form, and actual Chromium canvas output. The supplemental CDP/minimal-JSX tests
are not substitutes for React conformance or native Mac testing. Some historical
suites use short-lived loopback fixture servers; gallery capture routes local
fixture requests in-process and rejects unexpected origins. No public service is started.

## Complete gate

```sh
python3 scripts/verify-local-candidate.py --browser --out /your/scratch/results
```

This runs units, normal/repeat/catalog builds, JS syntax and `git diff --check`,
then all **eleven** browser suites, serially:

| Suite | Principal coverage |
| --- | --- |
| `browser` | Original preview controls, persistence, resize and cleanup |
| `background-harness` | Layer lifecycle, controls, click-through and frame cap |
| `background-realshape` | Full-distribution host-layout fixture and restoration |
| `settings-layout` | Real host-scroll layout; no fixed-height settings collapse |
| `timing` | Capped scheduling and suspension |
| `all-scenes-browser` | All twenty IDs, both canvas paths, applicable palettes/slots, stills/articulation |
| `live-controls` | Live Speed and flow/extras in both paths, including meteors |
| `storage-browser` | Readable/write-denied startup, saved Pause and rollback records |
| `integrated-plugin` | Supplemental dependency-free Chromium/CDP registered-plugin probe |
| `integrated-demo` | Offline demo via Chromium/CDP |
| `corrections-browser` | Independent record recovery, shared reduced-motion Resume, paused host-theme refresh/cleanup |

Keep timing-heavy runs serial: headless scheduling varies with machine load.
Caps are not guaranteed achieved rates. Reports contain machine paths and are
**private evidence**, not public files to stage. Preserve original test inventory
and golden fixtures. The public [verification summary](INTEGRATION-VERIFICATION.md)
distinguishes automated checks from the author's general Mac hand test.

## Refresh the gallery

Only documentation tooling needs **Pillow** (Python); it is not a build/runtime
dependency. Reuse the browser tools above. An optional `ASCII_WORLDS_FONT` points
to a TrueType font for contact-sheet labels; otherwise DejaVu Sans/default is used.

```sh
node scripts/capture-gallery.mjs
python3 scripts/compose-gallery.py
python3 scripts/audit-public.py
```

The capture script runs from the **full source checkout** (not the transformed
catalog branch). It loads the unchanged generated full plugin and a separately
built catalog plugin through real React + mock SDK. It records forty default
scene/theme previews, full/catalog forms and actual 28% composited window layers,
checks click-through and cleanup, and rejects page/console/unexpected-request errors.
The composition script only scales/letterboxes real frames: no invented artwork.
`ASCII_WORLDS_GALLERY` can point both scripts at a separate output directory.

Inspect **actual pixels**, not just hashes: all twenty, dark/light, animal faces,
wing/fin poses, scene clipping and caption legibility. Inspect form and background
images too. A generic mock workspace must say it is a mock and contain no real
conversation, session/sidebar titles, accounts or machine information. Never
pass it off as a native app screen. Platform/font changes may change rasterization.

## Packaging and publication hygiene

```sh
python3 scripts/package-release.py /your/scratch/packages
```

This rebuilds twice, verifies version/imports, writes deterministic install/source
ZIPs with Python stdlib `zipfile`, checks CRC and compares every mapped byte.
Packages include portable docs and current gallery assets, not internal receipts,
Git state, dependency trees or raw videos. Extract the source package somewhere
fresh, prepare its harness and rerun the complete gate before claiming package
acceptance. Runtime identity must match the install package.

Run `python3 scripts/audit-public.py` for Markdown links/alt text, image dimensions
and manifests, public-text privacy patterns, exact twenty-scene screenshot coverage
and catalog-doc transformation. It does not certify security or inspect every
image semantically; human/visual review remains necessary. Never stage with
`git add -A` from a tree containing private evidence. Publish only the explicit,
reviewed file allowlist, then verify the exact remote tree and CI.

For catalog docs on a source-tree copy:

```sh
node scripts/catalog-readme.mjs --root /path/to/copy
```

It strips full-only marked sections in the README **and linked feature docs**,
selects actual catalog settings images and refuses unmarked unsupported claims.
It does not build/push a branch or open a PR. See [catalog disclosures](CATALOG.md).

## Offline demo API

Open `demo.html` directly. `?chat=1` adds explicitly mock content, not a host install.
The demo-only inspection API is intentionally absent from the Desktop plugin:

```js
asciiWorlds.setSettings({ scene: 'owl', size: 0.8, extras: { perch: false } });
asciiWorlds.renderAt(2, 5); // frozen travel / independent articulation
asciiWorlds.settings;     // copied v3 state and legacy koi/jelly aliases
asciiWorlds.stats;
asciiWorlds.resume();
asciiWorlds.resetScene(); // active habitat only
asciiWorlds.reset();      // global reset; returns to Koi
asciiWorlds.destroy();
```

The old one-argument `renderAt` form remains. Themes follow host/OS automatically.
See [architecture](ARCHITECTURE.md), [migration](SETTINGS-MIGRATION.md) and the
[manual Mac checklist](MANUAL-MAC-CHECKLIST.md). Native acceptance must be measured,
not inferred from a passing browser fixture.
