# Architecture

ASCII Worlds is a single-file Hermes Desktop plugin. Habitats are pure scene functions; a shared
sampler turns them into coloured glyphs on a canvas, used by both the Settings preview and the
optional window background.

## Source layout

| Path | Responsibility |
| --- | --- |
| `src/art.js` | Koi and jellyfish geometry |
| `src/lab/scenes/` | The twenty-one other habitats, one pure module each, plus the registry |
| `src/lab/core/` | Palettes, scene validation, utilities and the glyph sampler for those habitats |
| `src/settings-v3.js` | The twenty-three habitat IDs, the per-habitat settings record, migration, patches and reset |
| `src/settings.js` | Background preferences and stores, the plugin version, and the 1.1 settings helpers |
| `src/engine.js` | Canvas lifecycle: one scheduler and sampler per canvas, observers and cleanup |
| `src/world.js` | The Settings page: controls, preview and instance ownership |
| `src/background.js` | The optional window layer, shared settings hub, save warnings and the diagnostic report |
| `src/plugin.js` | The React and SDK boundary: Settings registration, title-bar toggle, palette commands, disposal |
| `src/styles.js` | Scoped styling that uses the host's theme variables |
| `scripts/build.mjs`, `scripts/bundle.mjs` | The dependency-free bundler that writes `desktop/plugin.js` and `demo.html` |

React appears only in `src/plugin.js`. The rest is plain ES modules with no dependencies.

## Rendering

A habitat is a pure function of the canvas size and time. It paints transparent shapes into a hidden
canvas at two samples per glyph cell. The sampler picks a glyph and colour for each cell from the
painted pixels, with a stable per-cell hash so glyphs do not flicker. The visible layer is only
glyphs; nothing is a pre-rendered image.

Two clocks drive each habitat: travel time (scaled by Speed) and articulation time for wings, fins
and limbs. Cat, Owl and Night sky use Pace for local motion only. Hidden time is never caught up.

Limits: canvas backing size 1800 x 1400 logical pixels, device pixel ratio up to 2, about four million
backing pixels and a 220 x 150 glyph grid. Each habitat has a population cap.

## Lifecycle

`createEngine` owns the animation frame, the resize and intersection observers, and the visibility
and colour-scheme listeners. It stops drawing when the document or the canvas is hidden. The preview
runs only while visible; the window layer is independent of the Settings page. A paused canvas checks
the host theme about once a second and repaints only when it changed.

The Settings page owns only its own DOM. Destroying a world or the background removes every observer,
listener, frame, canvas, layer, style and attribute it added, and further calls do nothing. The plugin
also registers cleanup with `ctx.onDispose`, so disabling the plugin does not depend on React timing.

## Settings

See [Settings and storage](SETTINGS.md). The preview and the background share one settings hub, so a
change shows up in both immediately.

## Build

The bundler wraps each module in its own scope and emits a deterministic ES module. It supports only the
syntax this project uses, rejects import cycles and external imports other than `react`,
`react/jsx-runtime` and `@hermes/plugin-sdk`, and embeds no absolute paths or timestamps. The catalog
build (`npm run build:catalog`) removes the blocks between `@chat-area` markers first.

## Adding a habitat

See [Development](DEVELOPMENT.md#add-a-habitat).

## Depth, moon and the 1.3.0 habitats

`src/lab/core/depth.js` sorts creatures into far, mid and near layers and makes the
atmosphere specks. `src/lab/core/flock.js` is the free-schooling simulation, stepped at a
fixed 30 Hz so it looks the same at any frame rate. `src/lab/core/sky.js` works out the moon
phase and season from the date. Hammerhead, anglerfish and axolotl are ordinary scene modules:
pure functions of time. Koi and jellyfish get Size, Current and Depth in `src/art.js`; with the
defaults and Depth 0 they draw exactly as before, which `tests/koi.test.mjs` and
`tests/depth.test.mjs` check.
