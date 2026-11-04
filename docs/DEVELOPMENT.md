# Development and testing

## Build

Node 20 or newer. No dependencies, no install step.

```sh
npm run build    # bundle src/ into desktop/plugin.js and demo.html
npm run verify   # unit tests, then build (run `node --check desktop/plugin.js` after)
npm run demo     # serve demo.html on http://127.0.0.1:4178 (loopback only; PORT changes it)
```

The build concatenates the project's modules in a fixed order, removes only their local import and export declarations, and keeps the three supported external imports (`react`, `react/jsx-runtime`, `@hermes/plugin-sdk`). It is deterministic: no timestamps, no minifier. Never edit the generated files by hand.

## Unit tests

`npm test` runs `tests/*.test.mjs` with Node's built-in runner: settings validation and migration, pose and route maths (the creatures must really travel and turn), population and colour handling for both habitats, a golden check that pins default koi output to the 1.0.1 build, Background storage and stylesheet rules, and a check that the version constant matches `package.json`.

## Browser tests

These need a Playwright installation and a Chromium build, which are not part of this repository.

```sh
mkdir -p /tmp/aw-tools && cd /tmp/aw-tools && npm init -y && npm i react react-dom esbuild playwright
cd -   # back to this project
ASCII_WORLDS_TOOLS=/tmp/aw-tools node scripts/prepare-harness.mjs   # builds tests/.harness (React modules for the mock host)

export PLAYWRIGHT_MODULE=/tmp/aw-tools/node_modules/playwright/index.mjs
export CHROMIUM_PATH=/path/to/a/chromium/executable
node tests/browser.mjs              # offline demo: determinism, persistence, keyboard, reduced motion, visibility, disposal
node tests/background-harness.mjs   # plugin on a mock Hermes page: settings page, placements, lifecycle, fallbacks
node tests/background-realshape.mjs # regression page that copies a measured Hermes Desktop layout
node tests/timing.mjs               # real-time frame counts (headless; not a device benchmark)
```

`tests/fixtures/` holds the mock host page and mocked SDKs (`?api=page|fallback|none`, `?nonav`, `?noarea`, `?bare` select variants). They imitate only what the SDK documentation describes. A pass proves the plugin's own logic against that description, not behaviour inside the real app, so also check a real Hermes Desktop before releasing.

`tests/background-realshape.mjs` deserves a note. Its fixture copies the layout of a real window (opaque body, opaque wrappers painted by utility classes, one wrapper painted inline, and a theme variable for the chat colour). When you change the Behind rules, run it before and after removing the new rule from the built file: the test should fail without the rule. That negative control is how the body and inline cases were found.

## Motion evidence

`tests/render-motion.mjs` captures 201 frames per scene at 10 fps (0 to 20 simulation seconds). `python scripts/encode-motion.py` then encodes clips and contact sheets with ffmpeg and Pillow. Both are optional tools. `scenePose(scene, index, seconds, width, height)` in `src/art.js` is a pure function, which is why travel can be measured in unit tests.

## The offline demo API

`demo.html` exposes a small deterministic API for tests and screenshots:

```js
asciiWorlds.setSettings({ scene: 'jellyfish', palette: 'dark', density: 'fine', paused: true });
asciiWorlds.setSettings({ jellyCount: 2, jellyColour: 'individual', jellyColors: ['#ff9977', '#99ddff'] });
asciiWorlds.renderAt(12);   // simulation seconds; also stops the automatic clock
asciiWorlds.stats;          // frames, glyphs, creatures, grid size, backing size, DPR, time
asciiWorlds.settings;       // a copy
asciiWorlds.resume();       // leave fixed-time mode
asciiWorlds.reset();
asciiWorlds.destroy();      // idempotent
```

For a screenshot URL use `?scene=koi&palette=light&density=fine&paused=true&time=12` and wait for `asciiWorlds.stats.glyphs > 0`. Add `chat=1` to see Background mode over a fake chat. Fixed-time output is deterministic for the same viewport, DPR, fonts and settings; font rasterisation differs between operating systems.

## Saved preferences

Two keys in the plugin's storage: `settings.v2` (scene settings, `schemaVersion: 2`, with an older `settings.v1` still read) and `background.v1` (enabled, strength, placement: `behind` is shown as Chat area, `front` as Whole window). Both are validated field by field on every read, and a corrupt value falls back to a safe default instead of breaking the page. The demo uses `ascii-worlds.settings.v2` in the browser's local storage. See [ARCHITECTURE.md](ARCHITECTURE.md) for the migration rules.

## Catalog build

The plugin catalog does not allow a plugin to restyle the app's own markup (rule 8), and the Chat area placement does exactly that. Every piece of code that does it sits between `@chat-area:begin` and `@chat-area:end` markers (and `<!-- chat-area:begin -->` markers in the settings markup and the README).

```sh
npm run build:catalog             # writes the Whole-window-only desktop/plugin.js
scripts/make-catalog-branch.sh    # builds it on a `catalog` branch (add --push to publish the branch)
```

`main` always holds the full plugin. The `catalog` branch is `main` plus one generated commit. Never edit it by hand; rerun the script after changing `main`. The browser suites that exercise Chat area (`background-harness`, `background-realshape`, and the placement cards in `settings-layout`) run against `main` only; `tests/catalog-variant.test.mjs` checks the catalog bundle.
