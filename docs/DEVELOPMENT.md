# Development

## Build and unit tests

You need Node.js 20 or newer. Nothing has to be installed.

```sh
npm test            # unit tests
npm run build       # regenerate desktop/plugin.js and demo.html
npm run verify      # tests, then build
npm run build:catalog -- --out /tmp/catalog-plugin.js   # catalog build, written elsewhere
npm run demo        # serve demo.html at http://127.0.0.1:4178
```

`desktop/plugin.js` and `demo.html` are generated; commit them with the source change and never
edit them by hand. Two builds of the same source produce identical bytes, and CI fails if the
committed files are stale.

## Browser tests

Eleven browser suites load the generated plugin into a mock Hermes host in Chromium, using real
React in Strict Mode. They cover the Settings page, every habitat, both canvases, persistence,
the background layer, theme changes, reduced motion and cleanup. They need tools that are not
part of this repository: Playwright, React, react-dom and esbuild in one folder, plus a Chromium binary.

```sh
export ASCII_WORLDS_TOOLS=/path/to/tools            # contains node_modules with the packages above
export PLAYWRIGHT_MODULE="$ASCII_WORLDS_TOOLS/node_modules/playwright/index.mjs"
export CHROMIUM_PATH=/path/to/chromium
node scripts/prepare-harness.mjs                     # builds the React modules into tests/.harness
npm run test:browser                                 # runs the suites one after another
```

The suites run one at a time because their timing checks depend on machine load. They are
test fixtures with a mock host, not the real Desktop app.

## Add a habitat

1. Create `src/lab/scenes/<id>.js` with a pure scene definition. Use the supplied time, stable seeds
   and bounded populations. Do not use timers, the DOM, storage, the network or `Math.random`.
2. Register it in `src/lab/scenes/registry.js` and in `WORLD_IDS` in `src/settings-v3.js`.
3. Declare its count range, controls and extras in the definition; the Settings form is built from it.
4. Add tests: count zero, count cap, deterministic geometry, colour modes, controls and persistence.
   `tests/runtime-integration.test.mjs` and `tests/lab-poses.test.mjs` show the patterns.
5. Run `npm run verify` and the browser tests, then look at the habitat in light and dark,
   with motion, at the default and at a large size.
6. Add the pictures to `docs/images/habitats/`, update the tables in the README, `docs/CONTROLS.md`
   and `docs/GALLERY.md`, and add a changelog entry.

## Demo page

`demo.html` is a standalone offline copy of the Settings page. Add `?chat=1` to see the background over a
made-up chat. It exposes a small inspection API that the Desktop plugin does not:

```js
asciiWorlds.setSettings({ scene: 'owl', size: 0.8, extras: { perch: false } });
asciiWorlds.renderAt(2, 5);   // freeze travel time and articulation time
asciiWorlds.settings;         // current settings
asciiWorlds.resetScene();     // active habitat only
asciiWorlds.reset();          // everything; returns to koi
asciiWorlds.destroy();
```

## Gallery captures

With the browser tools above installed, `node scripts/capture-gallery.mjs` captures all
habitats at 1200 × 700 through the production renderer. Optional
`ASCII_WORLDS_REFERENCE=/path/to/approved-preview` compares matching `core/` and
`scenes/` modules pixel for pixel and saves the report under `evidence/1.4.0/`.
The screenshot composition lives in `scripts/compose-gallery.py`.

## Further reading

[Architecture](ARCHITECTURE.md) · [Controls](CONTROLS.md) · [Settings](SETTINGS.md) ·
[Window background](BACKGROUND.md) · [Releasing](RELEASING.md)
