# Settings and storage

## What is saved

The plugin saves its settings through the Desktop plugin storage, which is private to the plugin.

| Key | Contents |
| --- | --- |
| `settings.v3` | The selected habitat, Pause, Battery saver and one record per habitat (count, speed, size, flow, density, colour, tint, ten individual colours and scene extras) |
| `background.v1` | Whether the window background is on, its placement, global Background opacity and one-time opacity migration marker |
| `settings.v2`, `settings.v1` | Records written by versions 1.1 and 1.0. They are only read, never changed or removed |

Values are validated on every read: numbers are clamped to their range, colours must be
six-digit hex, and unknown or malformed data is ignored. The theme is never saved, because the
art always follows Hermes.

## Upgrading from 1.0 or 1.1

The first time you open version 1.2 it reads your old koi and jellyfish settings (counts, colours,
speed, density, Pause and Battery saver) and shows them unchanged. Nothing is written until you
change a setting, and then only to `settings.v3`. The new habitats start with their own defaults.
Each habitat changes independently afterwards.

## Upgrading to 1.4: one opacity control

There is no per-habitat strength slider. Every habitat renders at full internal
strength; **Background opacity** controls only the optional window layer.

On the first load, the previously selected habitat’s saved strength is multiplied
into the old background opacity. This prevents a sudden increase in brightness;
some strong glyphs may become a little fainter because their old alpha was clamped
inside the renderer. Other habitats now use that same global opacity rather than
retaining different dimming values. The preview is deliberately full strength.
The lower limit is now 1%, allowing the old lowest combined value to survive.

The background record stores `opacityVersion: 1` when the migration is saved.
The scene envelope retains a validated `legacyOpacityScale` scalar so a failed
background write cannot lose that attenuation when scene edits or resets succeed.
Reloading never applies the saved migration twice. The deprecated `strength`
field remains fixed at 1 in scene records for compatibility; it is not a control.

## When saving fails

If the storage cannot be written, the plugin keeps working with your changes in memory and shows a
short notice that they will not survive a restart. Settings you had saved before are not touched.
The notice goes away as soon as saving works again. The settings and the background are tracked
separately.

## Reset

- **Reset this scene** resets only the habitat you are looking at.
- **Reset to defaults** resets every habitat, returns to the koi pond and restores Pause and Battery saver.
  Background settings and the old records are left alone.

Individual colours survive lowering the count, and counts above ten repeat the ten colours.

## Going back to an older version

Versions 1.0 and 1.1 read their untouched older records. Versions 1.2 and 1.3
share the v3 scene records, and all versions share `background.v1`. Version 1.4
removes the old scene dimming and can save a lower background opacity than older
versions allowed. Check opacity after a rollback. See [INSTALL.md](../INSTALL.md).

## For developers

`src/settings-v3.js` is the active settings module. `src/settings.js` keeps the 1.1 helpers
(`normalizeSettings`, `readSettings`, `writeSettings`) for compatibility; the plugin itself never uses
their writer. `mountWorld.settings` still exposes `koiCount`, `koiColour`, `koiTint`, `koiColors`, `jellyCount`,
`jellyColour`, `jellyTint`, `jellyColors` and the active `colour`/`tint`.
