# Architecture

## Files and boundaries

| File | Responsibility |
| --- | --- |
| `src/settings.js` | Defaults, validated persistence, grid bounds, stable spatial hash |
| `src/art.js` | Pure scene geometry as a function of size and simulation time |
| `src/engine.js` | Color-field sampling, glyph output, clock, canvas sizing, lifecycle |
| `src/styles.js` | Scoped settings-page styling with host theme variables |
| `src/world.js` | The settings page: accessible controls, the live preview, and instance ownership; shared by the Desktop plugin and the offline demo |
| `src/background.js` | Background mode: the stores shared with the settings page, the layer host, the page-clearing stylesheet and the Check background report |
| `src/plugin.js` | React boundary, native SDK Button, settings-page registration with fallbacks, title-bar toggle, palette commands, host disposal |
| `scripts/build.mjs` | Dependency-free deterministic bundle and offline HTML generation |

The project deliberately avoids a framework in the engine and controls. React appears only at the Desktop adapter boundary, where it belongs. A mount owns its DOM subtree and never queries the host's DOM.

## Rendering

`drawField(context, width, height, scene, time, settings = {})` paints into a hidden canvas at two samples per glyph cell in each dimension. It has no clock, global seed, network, or DOM dependencies. A koi's centerline bends with time; its outline tapers along that spine. Patches are clipped inside the body. Paired pectoral fins, curved forked tails and fin rays remain separate translucent surfaces. By default five independently sized jellyfish combine a shaded projected hemispherical mesh, meridian and latitude ribs, a double elliptical rim, scalloped organs, five folded oral arms, 26 marginal strands and seven longer curling streamers. All geometry is still sampled into ASCII, not displayed as vectors.

`scenePose` supplies normalized full-domain continuous routes, scaled tangent headings, and signed turn curvature. Koi spines bend through turns and their tails beat behind the heading. Both scenes integrate a swimming pulse into their trajectory clock; there are no static center anchors or visible wrap jumps. The unit suite asserts substantial normalized travel over 30 simulation seconds, per-step continuity, real turning and numerical tangent agreement.

The renderer samples all four subpixels in every cell footprint, retaining strong thin-strand samples rather than losing them between cell centers. For jellyfish, sample selection is brightness-aware to preserve luminous rim highlights over darker opaque surfaces. The glyph ramp contains only ASCII characters.

The renderer samples that field on a bounded grid. Pigment and alpha determine glyph weight; a spatial hash gives each cell a stable identity. Glyphs do not receive a new random value every frame. The visible layer is entirely glyphs and faint cell rectangles. Very dark ink is lifted in midnight mode; light-mode pigments are restrained enough to remain visible on paper.

The scene changes continuously but the cell grid does not move. Some glyph changes at silhouette boundaries are inherent to sampled ASCII, especially at bold density. Fine density gives the cleanest anatomy. System monospace fonts keep the distribution asset-free.

Canvas backing dimensions are limited to 1800 × 1400 logical pixels, DPR is capped at 2, and backing allocation is capped around four million pixels. The sampling grid is independently capped at 220 × 150 cells. Oversized hosts scale the bounded output to fit. ResizeObserver follows the actual canvas content box, not a guessed window size.

## Lifecycle

`createEngine` owns the animation request, ResizeObserver, IntersectionObserver, document visibility listener, and color-scheme listener. It cancels animation as soon as the document or intersection is hidden. Settings and resize notifications may update pending state while hidden, but do not sample or draw until visible. Delta time is capped at 100 ms, preventing jumps after stalls.

While motion is running, settings changes mark the next frame dirty and share the capped scheduler. Input events do not render independently of that clock. Paused and fixed-time views repaint once when a setting changes. The settings page owns its scroll area, leaving the native Reset to defaults control in a strip that stays visible.

`mountWorld` owns the engine, input listeners, reduced-motion listener, and DOM. It treats storage failure as nonfatal. A failed canvas context or draw replaces the art with an accessible error message; it does not retry in a tight loop. Destroy disconnects observers, removes listeners, cancels the scheduled frame, clears backing canvases, and removes its subtree. Both destroy paths are idempotent.

The Desktop effect cleans up on React unmount. An instance registry also cleans up on `ctx.onDispose`, so host disable does not depend solely on React effect timing. The adapter's React error boundary covers render errors; the world handles imperative canvas errors separately.

## Persistence

The public Desktop plugin SDK documentation describes `ctx.storage` as a synchronous, plugin-namespaced store with `get(key, fallback)`, `set(key, value)` and `remove(key)`. This project uses `get` with an explicit fallback.

Only `settings.v2` is written through the provided namespaced storage object. The record has `schemaVersion: 2`, independent `koiColour`/`koiTint` and `jellyColour`/`jellyTint`, `koiCount` and `jellyCount` (integers 0–10, defaults 3 and 5), and `koiColors` and `jellyColors` (ten validated six-digit hex strings each, including hidden slots). Existing background/density/speed/pause/eco fields remain shared. `colour` and `tint` are compatibility aliases derived from the active habitat; `setSettings` accepts aliases and targets only the selected habitat. All arrays returned or normalized are fresh copies; defaults are frozen. A strict allowlist and numeric bounds normalize every read. The browser adapter uses the equivalent JSON record under `ascii-worlds.settings.v2`.

Read v2 first, then legacy `settings.v1` if v2 is absent or unreadable. Since old shared colour ownership is ambiguous, preserve its choice for jellyfish only and restore koi natural. Other old preferences survive. Migration leaves v1 intact, writing v2 on the next control change. Malformed JSON is caught independently for each key.

Koi multicolour palettes replace body patch pigments before field sampling; they bypass screen-space tinting. Individual jellyfish colours enter each creature's existing shaded mesh and strands before sampling, also bypassing global tinting. In `individual` koi mode `koiPigmentsFromColor(hex)` derives a five-pigment patch set (cream base, the chosen colour as the main patch, a hue-shifted secondary, a dark ink accent and a gold accent) with pure arithmetic, so each fish is multi-tone and deterministic. Stable integer slot indices determine colour, route, phase and bounded size. The first five sizes and all route equations remain unchanged. Slots six through ten have explicit bounded sizes; count zero emits no geometry. The native colour editor is a disclosure inside the settings page, not a floating overlay. Fixed-time rendering, frame stats, and simulation time are not persisted. Reduced-motion startup pausing does not overwrite a stored motion choice until the user changes a control.

## Add a habitat

1. Add a pure drawing function to `src/art.js`. Use the supplied time rather than `Date.now`, random calls, or independent timers. Paint transparent shapes into the field; do not draw text there.
2. Add the scene to the validation allowlist and the static habitat select in `world.js`. Add its heading, specimen name, and accessible description in `reflect`.
3. Keep composition responsive in `drawField`. Test wide and tall art regions, not just outer window sizes: controls consume real space.
4. If adding a module, put it before its consumers in the build script's explicit module order. The tiny bundler supports semicolon-terminated local import declarations across one or several lines and the current top-level exports, not arbitrary package resolution. Keep the supported external React and SDK imports in the adapter.
5. Add a deterministic geometry test and capture both palettes at preview and large sizes. Rebuild and commit the two generated files; never hand-edit the generated `desktop/plugin.js` and `demo.html`.

For a new setting, update defaults and normalization together, then add a labeled control and coverage for malformed persistence. Do not add a global event handler or background task when an instance-owned listener suffices.

## The settings page and its fallbacks

There is no docked pane. The Desktop SDK closes a plugin when its only pane is closed, so a pane cannot be hidden, and the documentation points plugin preferences at Settings -> Plugins. `src/plugin.js` registers one page, `ctx.registerSettingsPage({ id: 'settings', title: 'ASCII Worlds', icon: 'color-mode', render })`. If that function does not exist it falls back to `ctx.register({ area: 'settings.plugins', ... })`, the form the documentation gives for older hosts. If neither works the plugin still loads: the title-bar toggle and Background mode keep working. The page mounts `mountWorld` in an effect and destroys it on unmount; the preview stops animating whenever it is scrolled out of view.

Newer SDK exports (`registerSettingsPage`, `TITLEBAR_AREAS`, `PALETTE_AREA`, `pluginSettingsHref`, `host.navigate`) are read through a namespace import and guarded. Without the title bar, Background mode reports itself unavailable; without `host.navigate` and `pluginSettingsHref` the "open settings" palette command is not registered.

## Background mode

`createHub` returns three small subscribe/get/set stores: the scene settings, the saved Background preferences (`background.v1`), and a status message. The settings page writes the scene settings into the hub on every edit and the layer host listens, so changes show immediately in the background. A title-bar component (a permanent mount point) calls `host.attach()` on mount and `host.detach()` on unmount; detach removes the layer, the style tag and the `html` attribute. `createEngine(canvas, settings, onError, { hosted, transparent })` skips the IntersectionObserver for a full-window layer and clears instead of painting an opaque pond. Nothing is attached to `window`. How the two placements work, the exact selectors and the troubleshooting report are in [HOW-BACKGROUND-WORKS.md](HOW-BACKGROUND-WORKS.md).

## Host behaviour worth re-checking after Desktop updates

Everything above follows the documented SDK. These parts rely on how the app is laid out or on documented-but-unexercised contribution shapes, so check them first if something stops working: the Behind placement (chat hook, wrapper colours, theme variables), the shape of title-bar and palette contributions, and the settings-page API. Automated tests use mock hosts for all of these; see [DEVELOPMENT.md](DEVELOPMENT.md).
