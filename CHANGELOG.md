# Changelog

All notable changes to this project are listed here. The project follows
[semantic versioning](https://semver.org/).

## 1.3.0

### Added

- Three new habitats, twenty-three in total: **Hammerhead and bait ball** (sharks circle a
  swirling ball of fish and cut through it now and then), **Anglerfish** (a glowing lure, curious
  prey and a snap) and **Axolotls** (a pond floor with grass; they rest, walk, turn and float).
  Each has its own extras: Bait ball, Bait fish and Scatter; Lure glow and Curious prey;
  Pond plants and Activity.
- **Depth** for every habitat except Night sky: creatures spread out near and far, with a faint
  atmosphere behind them (marine snow, pollen, dust or pond silt). At 0 everything draws exactly
  as in 1.2.0.
- **Moon** for the open-air scenes, the owl and the night sky: show or hide it, and use today's
  real phase or pick one. The settings only appear on those scenes. Seasons follow the date too.
- **Free schooling** for the tiny fish school.
- Koi and jellyfish now have Size, Scene strength, Current and Depth like the other habitats.

### Changed

- New README banner and an all-dark overview picture.

## 1.2.0

### Added

- Eighteen new habitats, bringing the total to twenty: manta rays, sea turtles, seahorses,
  a school of tiny fish, a solitary whale, an octopus, butterflies, luna moths, dragonflies,
  swallows, a sleeping cat, an owl, ginkgo leaves, cherry blossom petals, fireflies, bubbles,
  dandelion seeds and a night sky. They work in the Settings preview and the window background.
- Every habitat keeps its own settings: count, colours, speed, size, density and scene strength,
  plus current, breeze or wind and scene-specific extras where they make sense.
  Cat, Owl and Night sky use a local Pace instead of travel speed.
- A **Reset this scene** button next to **Reset to defaults**.
- Documentation: install guide, controls reference, gallery with every habitat in dark and light,
  architecture, development and release guides.

### Changed

- Settings are saved in a new `settings.v3` record. Records saved by 1.0 and 1.1 are read and
  never rewritten, so going back to an older version keeps working.
- Reduced motion starts still. **Resume motion** switches both the preview and the window
  background to moving art for the session.
- Paused art follows a light or dark theme change within about a second, without resuming motion.
- The build is now a small deterministic bundler with relative module IDs.
- The catalog branch script extends the existing history instead of rewriting it.

### Fixed

- A "preferences could not be saved" warning now clears once saving works again, and
  tracks the settings and the background record separately.

## 1.1.0

- Koi gained a travelling body wave, a spine-following tail and rowing fins. Jellyfish gained
  pulsing bells and trailing tentacles, with calmer motion.
- The window animation follows the preview's density, speed, palettes and Battery saver.
- Removed the Appearance picker: the art always follows the Hermes theme.
  Renamed Eco to **Battery saver**.

## 1.0.1

- Friendlier documentation, installation instructions and contributor guidance.
<!-- chat-area:begin -->
- Added a Whole-window-only build for the Hermes plugin catalog.
<!-- chat-area:end -->
<!-- catalog: - Added the Whole-window-only build. -->

## 1.0.0

First public release: koi and jellyfish with procedural glyph shading and routes, 0 to 10
creatures, per-creature colours, named and custom palettes, a native Settings page,
title-bar and palette controls, pause, battery saver and reduced motion.

<!-- chat-area:begin -->
It offered a Chat area placement (through the chat's background layers) and a Whole window placement.
<!-- chat-area:end -->
<!-- catalog: It draws a transparent Whole window overlay. -->
