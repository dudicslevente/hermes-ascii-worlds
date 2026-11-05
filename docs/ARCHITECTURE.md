# Architecture

Version 1.2.0 extends the existing native Settings page, preview
and optional background; it is not a gallery/iframe replacement.

| Boundary | Responsibility |
| --- | --- |
| `src/art.js` | Original koi+jelly geometry, byte-identical to baseline |
| `src/settings.js` | Explicit legacy v2 compatibility API; shared background validation/stores/version |
| `src/settings-v3.js` | Exact twenty IDs, additive per-scene envelope, migration, aliases, patches, scoped reset, clocks |
| `src/lab/scenes/` | Eighteen approved corrected pure scene modules, unchanged |
| `src/lab/core/` | Approved utilities, five-material palettes, scene validation and corrected glyph sampler |
| `src/engine.js` | Original renderer plus one integrated scheduler / active sampler per canvas |
| `src/world.js` | Native controls / preview, explicit `makeThemeReader` import |
| `src/background.js` | Shared settings and persistence-warning hub; optional window layer, diagnostics and cleanup |
| `src/plugin.js` | React/SDK registration/fallbacks, titlebar/palette, host disposal |
| `scripts/bundle.mjs` | Dependency-free scoped ESM subset, relative IDs, explicit exports |

## Rendering and time

The original `createRenderer` function and original art path remain unchanged.
Lab uses the approved corrected sampler: light monotonic material exposure,
contrast-preserving subpixel choice and glyph weights remain. Only copied Lab
sampler changes are `options.transparent` support and clear instead of backdrop
fill for background mode. All eighteen scene modules remain byte-identical to
the approved export. No Lab UI/reference directory is copied.

The integrated engine instantiates one active sampler per canvas. Switching
families releases the old field. Only it schedules RAF; the retained standalone
Lab engine export is never instantiated. Preview plus optional background have
one scheduler each, not one per scene.

Legacy time remains speed-scaled travel time. Lab travel rate is Speed and local
articulation rate is Speed^0.6, integrated independently without retroactive
jumps on edits. A scene change involving Lab resets both clocks; koi/jelly
switches keep the old time behavior. `renderAt(t,b)` freezes time; omitted `b`
is derived from Speed. Cat/Owl pace breathing, blinks and gestures, not travel.
Night sky retains stationary stars with optional meteors.

Preview and background share the same normalized model. Theme follows the
host's original `options.isDark` reader, falling back to OS; no theme picker.
Canvas allocation limits remain 1800x1400 logical, DPR<=2 / ~4 million backing
pixels and 220x150 glyph cells. These are bounds, not performance guarantees.
Lab count zero bypasses every ornament; legacy faint decorative dots remain.

## Ownership and lifecycle

The original capped scheduler owns RAF, resize/intersection observers, hidden
and colour-scheme listeners. Hidden time is not caught up. Moving edits coalesce
into capped frames; paused/manual views repaint once. Hosted backgrounds skip
intersection observation. Destroy is idempotent and removes observers/listeners,
canvas state and DOM. Mutators after disposal are inert, including reset.

The Settings page owns its DOM only. React is only the SDK adapter boundary.
The existing titlebar, palette, Settings registration/fallbacks and host-disposal
paths remain. Rendering failures show a fallback or restore/disable background.
Persistence health is tracked separately for settings.v3 and background.v1; a
successful save clears only that record's warning. Reduced-motion Resume grants
both paths a session-only opt-in that survives Settings close/reopen; a new OS
hold or plugin reload revokes it. No preference is silently written at startup.
Visible paused/manual canvases check their own theme probe every 1.1 seconds
and repaint only on a theme change. These bounded checks stop when hidden,
offscreen or disposed; they never resume the animation clock.
No plugin state is attached to window; only the offline demo has an inspection API.

## Persistence and build

See [SETTINGS-MIGRATION.md](SETTINGS-MIGRATION.md). V3 is the integrated writer;
old v2 helper exports remain explicit compatibility APIs. The UI derives Lab
controls from definitions, retaining original named koi/jelly controls.

Bundling wraps each source module in lexical scope with explicit exports,
relative `src/...` IDs, no absolute paths/timestamps/eval/runtime loader. The
checked-in ESM subset rejects cycles, unsupported syntax, path escapes and
external imports other than react, react/jsx-runtime, @hermes/plugin-sdk.
The catalog transform strips `@chat-area` blocks before wrapping. `--out` emits
only the requested JS bundle, not the ordinary plugin/demo.

## Add a scene

Add a pure Lab-contract module, register its ID in the integrated order and add
count-zero, deterministic/non-rigid geometry, colour, controls, clocks and
persistence tests. Do not alter legacy art for a new habitat. Rebuild generated
files, inspect actual light/dark articulated/travelling output, update the
control matrix, and complete the native Mac checklist before claiming native acceptance. Nonempty
pixels are not proof of natural anatomy or beauty.
