# Changelog

All notable changes to ASCII Worlds. This project follows semantic versioning.

## 1.1.0

- Koi and jellyfish now swim instead of rotating, with a calmer tail beat. Koi have a travelling body wave, a tail fin that follows the spine and gently rowing pectoral fins. Jellyfish pulse their bell (squash and stretch) with tentacles that trail and straighten between pulses.
- The animation in Hermes now follows the settings page. Glyph density, appearance, speed and battery saver used to apply only to the preview; the background had its own fixed values.
- Removed the Appearance setting. The preview and the animation always follow your Hermes theme (light or dark) on their own. An appearance saved by an earlier version is ignored.
- Renamed "Eco / 12 fps" to "Battery saver", with a sentence explaining what it does.
- The default koi are drawn differently now, so the koi golden test fixture was regenerated on purpose.

## 1.0.1

- README rewritten in a friendlier voice, with real Hermes Desktop screenshots, install steps that use the release zip (which already contains the `ascii-worlds` folder), and a section inviting contributions and new designs.
- New catalog build (`npm run build:catalog`, `scripts/make-catalog-branch.sh`): the same plugin with only the Whole window placement, so it never touches the app's own markup. The full plugin on `main` is unchanged.
- No change to how the plugin behaves.

## 1.0.0

First public release.

- Koi and jellyfish habitats, procedurally drawn in glyphs with shaded, articulated creatures that travel across the canvas and turn along smooth routes.
- Choose 0 to 10 koi or 0 to 10 jellyfish, and an individual colour for each one. Each koi gets a multi-tone pattern built from the colour you pick.
- More colour options: original koi patterns, four multicolour koi palettes (Jewel, Sunset, Pastel, Forest), natural, cyan, ember and monochrome tints, and a custom tint.
- Show the animation in Hermes with two placements: **Chat area** (shows through the chat and stops at the sidebars) and **Whole window** (drawn over everything, including the sidebars).
- All controls live in Settings -> Plugins -> ASCII Worlds, with a quick toggle in the title bar and command palette entries. There is no docked pane to get stuck open.
- Light, dark and follow-system appearance, speed, glyph density, pause and eco mode.
- Reduced-motion support, hidden-window pausing, bounded memory, and full cleanup when turned off or disabled.
- A Check background report for troubleshooting.
- Offline: no network access, no telemetry.
