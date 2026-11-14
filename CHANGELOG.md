# Changelog

All notable changes to this project are listed here. The project follows
[semantic versioning](https://semver.org/).

## 1.4.0 (2026-11-14)

### Added

- **Pipes**, a new habitat: two bolted metal pipes carry liquid and rings
  of air to an outlet. One pipe falls into a pool, the other throws a jet into it, with spray,
  ripples and drips. The liquid, the stream, the jet and the pool all follow the colour mode, so
  choosing another palette or tint recolours the whole scene. Controls: Pipes (0–2), Pipe size,
  Pressure, Bubbles and Valve and gauge. Works on the light and the dark page and as the window
  background.

- Thirteen more habitats, bringing the total to thirty-seven: **Platypus creek**, **Capybara
  onsen**, **Penguin slide**, **Rubber ducks**, **Nyan Cat**, **Dino runner**, **Dragon’s hoard**,
  **Beehive**, **Wizard’s tower**, **Retro arcade**, **Snake**, **Pirate ship** and **Rooftop ninja**.
- Each remembers its own count, colours, size, speed, glyph density and extras.
  New scenes keep their clean preview artwork, without an extra depth or atmosphere layer.
- Nyan Cat’s head moves separately from its body. The runner has pixel sprites, jumping and
  ducking poses, and an optional accent-coloured score. The arcade has no player figure.
- Dark and light gallery frames for every new habitat, a new overview and a refreshed controls reference.

### Fixed

- Snake starts a fresh round with a short fade instead of replaying hours of moves
  after a resize or settings change. Identical timestamps always draw the same state.

### Changed

- Scene-specific labels and help now appear in the native Settings page.
- One **Background opacity** slider replaces Background Strength and Scene strength.
  It applies across habitats without fading the Settings preview. The old active
  scene’s strength is combined with the background opacity once on upgrade; the
  range is now 1–60% so very faint saved combinations can be kept.

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
- Added the Whole-window-only build.

## 1.0.0

First public release: koi and jellyfish with procedural glyph shading and routes, 0 to 10
creatures, per-creature colours, named and custom palettes, a native Settings page,
title-bar and palette controls, pause, battery saver and reduced motion.

It draws a transparent Whole window overlay.
