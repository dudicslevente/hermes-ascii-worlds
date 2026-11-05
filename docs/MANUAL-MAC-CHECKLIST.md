# Manual Mac Hermes v1.2 test and rollback checklist

**Every box below is intentionally unchecked.** The author reports a general hand
test of v1.2.0 on a Mac with Hermes Desktop, and that everything worked, but no
item-by-item results were recorded. Use this list to record your own results.
Historical v1.1 photos / Lab approval are not v1.2 native host verification.

## Before testing

- [ ] Record Desktop version, macOS version, display scale, current plugin version.
- [ ] Back up the actual app-level installed plugin using INSTALL.md. Record old
      Background enabled/placement/strength and relevant settings with screenshots.
      A native storage export is not assumed to exist; verify any app-specific
      export before relying on it. Screenshots are not a full storage backup.
- [ ] Verify candidate hash / package.json / plugin.yaml / runtime report all 1.2.0.
- [ ] Understand that Desktop plugins are APP-LEVEL across profiles/gateways.
      A disposable Hermes profile does NOT isolate replacement or plugin storage.
      Test the actual app only after backup; separate app-data isolation, if used,
      must be independently verified and is not established by these tests.

## Native surface and art

- [ ] Settings page mounts in host-scroll layout, all controls / Reset reachable.
- [ ] Exact twenty IDs; no iframe/gallery replacement, no theme picker.
- [ ] Review each default at useful size in light/dark and meaningful timed motion.
- [ ] Check Owl face / Cat markings, stationary local pace, whale visible offstage help.
- [ ] Count zero/restore and caps, Size/Speed/strength/density, every palette/custom.
- [ ] All scene extras / flow applicable only; stars omit Individual; ten slots persist/repeat.
- [ ] Scene switching restores independent values / colours / extras; Reset this scene is scoped; original Reset to defaults returns to Koi and resets all scenes.

## Host lifecycle

- [ ] Titlebar and palette toggles; settings-navigation command; guarded API fallback.
- [ ] Preview + background share settings and automatic Hermes theme.
- [ ] Whole window click-through and Strength, including text/control readability.
<!-- chat-area:begin -->
- [ ] Full distribution only: Chat area sidebars, transparent chain and recovery to Whole window after a layout failure.
<!-- chat-area:end -->
- [ ] Check background report carries actual version/placement/painted pixels.
- [ ] Pause, Battery saver, reduced motion, hidden-window and scrolled-out preview.
- [ ] Under OS reduced motion, explicit Resume moves both canvases; closing/reopening
      Settings preserves consent, a fresh OS hold/plugin reload pauses safely.
- [ ] While paused, change only the Hermes theme: both stills update within ~1.1s
      without moving. Hidden/offscreen art does not continue theme polling.
- [ ] Close Settings / reopen; disable/reload/re-enable under host Strict Mode.
- [ ] No stacked layers/style tags/observers/RAF after disposal or repeated reload.

## Persistence / rollback

- [ ] v1/v2 values migrate, old shared v1 tint belongs to jelly only; no startup writes.
- [ ] Restart restores v3; old v1/v2 remain unchanged; background key compatible.
- [ ] In a controlled test-store quota/denial, readable data loads and edits stay
      in-session with warnings, including background; do not damage real storage.
- [ ] Recover saves for one record at a time: only that record's warning clears.
- [ ] Disable background/plugin, quit app, restore previous plugin, reopen.
- [ ] Previous version uses untouched legacy records; restore background backup if desired.
- [ ] Record limits/findings/screenshots with exact artifact hash, do not mark
      native acceptance from a browser screenshot or nonempty glyph assertion.

See SETTINGS-MIGRATION.md for rollback scope and INTEGRATION-VERIFICATION.md for
actual automated checks. Native acceptance is separate from source publication,
release assets and catalog admission. Record actual native results before claiming
them; owner/reviewer approval and the relevant publication gates remain separate.
