# Settings v3, migration and rollback

## Records

- `settings.v3`: additive envelope `{schemaVersion:3, scene, paused, eco, scenes}`.
  `scenes` contains exactly the twenty known IDs. Each scene has independently
  normalized values; Lab records contain count, speed, size, flow, strength,
  density, colour, tint, ten colours and only defined extras.
- `settings.v2` / `settings.v1`: read-only migration sources in the real v1.2 UI
  and host. They are not overwritten or removed, so v1.1 rollback is possible.
- `background.v1`: original enabled, strength, placement and compatibility field;
  its schema/key are unchanged. Background remains optional and off by default.

The browser adapter prefixes keys with `ascii-worlds.`; Desktop SDK storage is
already plugin-namespaced. A single envelope is bounded by known scene IDs,
ten copied colour slots per scene and defined extras. Numbers must be finite
and clamp to bounds; strings are not coerced. Hex values must be six-digit hex.
Unknown keys, malformed types and arrays-as-records are discarded.

## Read order and startup

Read valid v3 first, then the original safe v2 -> v1 migration. The v1 ambiguous
shared tint belongs to jellyfish only; koi restores natural patches as before.
Legacy shared Speed/density seed both original scenes; new Lab scenes start
with their own defaults. After migration each scene changes independently.
Saved theme overrides are ignored on load: Hermes theme is automatic.

Startup performs **no writes or write/remove probes**. A readable store whose
writes are denied still loads its saved scene, pause and all settings. The next
actual edit attempts v3 persistence. A failure leaves readable records intact,
keeps in-memory changes, and warns that edits are memory-only. The shared hub
preserves memory-only changes when the Settings page remounts in that plugin
registration. Restarting the app cannot preserve unsaved changes.
The two records track failed saves independently. Successful scene-envelope
saves clear only the scene warning; a still-unsaved background edit keeps its
own warning, and vice versa. Closing/reopening Settings retains that state.
Explicit Resume under OS reduced motion is session-only consent for preview
and background, not a persisted bypass. A new OS hold or plugin reload revokes
it; merely closing Settings does not.

## Public API compatibility

`mountWorld.settings` retains `koiCount`, `koiColour`, `koiTint`, `koiColors`,
`jellyCount`, `jellyColour`, `jellyTint`, `jellyColors`, and active `colour`/`tint`.
`setSettings` named aliases still target their original species; generic fields
target only the selected scene (including a scene selected by the same patch).
Returned arrays/extras/scene maps are copied. `renderAt(t,b)` adds optional
independent articulation time; the old one-argument form remains.

For library/test compatibility, `normalizeSettings`, `readSettings`,
`writeSettings`, `DEFAULTS` and `STORAGE_KEY` in `src/settings.js` remain the
explicit **legacy v2 API**. Only direct users of that old helper can write v2;
the integrated world/background never call its writer. New code must use
`settings-v3.js`. This distinction preserves the original 39 tests unchanged,
not a weakened schema assertion. The actual UI exposes schemaVersion 3.

**Reset this scene** resets only the active scene. It preserves other scenes,
selection, global pause/Battery saver, background settings and rollback records.
**Reset to defaults** retains the original global reset: return to Koi, reset all
scene preferences and pause/Battery saver defaults (pausing if reduced motion is
on). Background preferences and legacy rollback records remain untouched.
Hidden colour slots survive count reduction and slots repeat beyond ten.
Disposed world mutators, including reset, perform no edits or writes.

## Rollback checklist

1. Desktop plugins are app-level across profiles/gateways; changing Hermes
   profile does not isolate a replacement or prove storage isolation. Back up
   the installed file/folder using INSTALL.md, and record Background enabled,
   placement and strength before editing. No built-in storage-export UI is
   assumed; verify one in the actual app before relying on it. Otherwise retain
   screenshots/manual values, which are not a complete storage backup. Do not
   guess/edit undocumented Desktop databases or copy unrelated app secrets.
2. Disable the candidate background, disable the plugin and close Desktop.
3. Restore the prior reviewed v1.1 `plugin.js`; keep the folder name `ascii-worlds`.
4. Reopen Desktop / reload plugins. v1.1 reads its untouched v2/v1 values, not v3.
5. A background setting changed in v1.2 is shared through background.v1; restore
   the backup if you also need the old background enable/strength/placement.
6. Keep v3 for a later retry, or remove it only with an explicit user choice via
   a supported storage tool. Do not delete all plugin data to reset one scene.

The automated tests performed no rollback or real Desktop storage mutation, and
the author's Mac hand test recorded no rollback result. See the
[manual Mac checklist](MANUAL-MAC-CHECKLIST.md).
