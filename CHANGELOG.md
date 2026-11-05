# Changelog

Notable source changes. This project follows semantic versioning; a versioned
source update does not by itself create a GitHub release or catalog approval.

## 1.2.0

- Added eighteen habitats to the native Settings selector, preview and optional
  window background: mantas, turtles, seahorses, schooling fish, whale, octopus,
  butterflies, moths, dragonflies, swallows, cat, owl, leaves, petals, fireflies,
  bubbles, seeds and stars. Original Koi/Jellyfish geometry remains unchanged.
- Independent per-scene count/colour/settings; Size, Scene strength, useful
  flow/extras; local Pace for stationary subjects. Night sky omits Individual.
- Additive `settings.v3` migration from read-only v2/v1, retained aliases/hidden
  colour slots, no startup writes and memory-only failure warnings.
- Added Reset this scene while preserving global Reset to defaults/return to Koi.
- Corrected per-record warning recovery, shared explicit reduced-motion Resume
  and bounded host-theme refresh of visible paused stills; added regressions.
- Scoped, deterministic dependency-free bundling with portable module IDs.
  Alternate catalog output leaves the normal plugin/demo untouched.
- Current public docs include all twenty controls, app-level installation,
  symlink-guarded backup/rollback, privacy/resource limits, contributor tests
  and actual dark/light mock-host screenshots. Historical images are separate.
- Catalog documentation generation now transforms linked feature docs as well
  as README, and selects the separately captured Whole-window-only form.
- No new runtime dependency, network call or self-updater. The author hand-tested
  the full 1.2.0 plugin on a Mac with Hermes Desktop (a general test, no recorded
  checklist results; the catalog build was not hand-tested); screenshots are
  explicitly browser/mock evidence.
- Retained limits: intentional fully offstage whale wait; high-count/size overlap;
  coarser small/Bold and light fine detail. No battery-life or universal FPS claim.

## 1.1.0

- Koi gained a travelling body wave, spine-following tail and rowing pectoral
  fins. Jellyfish gained pulsing bells and lagged trailing tentacles, with calmer motion.
- Window animation now follows the preview's density, speed, palettes and saver.
- Removed Appearance: preview and background automatically follow the host theme;
  old saved appearance is ignored. Renamed Eco to Battery saver with plain-language help.
- Koi golden fixture was deliberately regenerated for that artwork change.

## 1.0.1

- Friendlier documentation, installation instructions, historical Desktop
  screenshots and contributor guidance.
<!-- chat-area:begin -->
- Added Whole-window-only catalog build, omitting the full distribution's Chat
  area restyling. The full plugin's behaviour did not change in that patch.
<!-- chat-area:end -->
<!-- catalog: - Added the Whole-window-only catalog build. No runtime behaviour change in that patch. -->

## 1.0.0

First public release: Koi and Jellyfish, procedural glyph shading and routes,
0–10 populations, per-creature colours, named/custom palettes, native Settings,
title-bar/palette controls, pause/saver/reduced motion, bounds and cleanup.

<!-- chat-area:begin -->
The full release offered Chat area (through chat wrapper backgrounds) and Whole
window (transparent overlay above all content) placements.
<!-- chat-area:end -->
<!-- catalog: The catalog distribution uses a transparent Whole-window overlay. -->

The original appearance picker was superseded by automatic theme-following in
1.1.0. Runtime operation is offline, without telemetry.
