# Compatibility and host-update checks

**The author hand-tested v1.2.0 in Hermes Desktop on a Mac and reports that
everything worked** (a general test; the Desktop version and per-item results were
not recorded). Linux Chromium + real React Strict Mode/mock SDK tests are not a
live Desktop app. Historical images are attributed to v1.1/Desktop 0.22.6/macOS,
not newly verified current compatibility. Windows/Linux Desktop, Safari, physical
phones, accessibility, heat, battery and the full supported host-version matrix
remain unverified.

Declared minimum Hermes version: **>=0.21.6**, matching `plugin.yaml`. The twenty
habitats add no new runtime dependency or SDK floor; a declared floor is not a
claim that every later host version was tested.

| Surface | Contract and fallback |
| --- | --- |
| Settings | Guarded `registerSettingsPage`; fallback `settings.plugins` contribution; no docked preferences pane |
| Missing Settings API | Title-bar/palette operation can remain available; no invented private navigation fallback |
| Title bar | Guarded `TITLEBAR_AREAS.right`; absent surface disables window-background controls with an explanation |
| Palette | Guarded `PALETTE_AREA`; navigation also requires `host.navigate` and `pluginSettingsHref` |
| Storage | Synchronous plugin-namespaced get/set, validated values, no startup writes; failures retain readable records and in-session edits with warnings |
| Theme | Host text-colour token with OS fallback; no appearance picker; bounded refresh of paused stills |
| Whole window | Transparent click-through overlay, no host-background clearing |

Only `react`, `react/jsx-runtime` and `@hermes/plugin-sdk` remain external.
The plugin has no runtime network, shell execution or downloaded code.
Desktop plugins execute with renderer authority: error boundaries do not create
a security sandbox. Disable the background/plugin if a host problem appears.

## After a Desktop update

With an already available reviewed Hermes source checkout:

```sh
node scripts/check-desktop-compat.mjs /path/to/hermes-source
```

The script separates **SDK** and **LAYOUT** assumptions, with different failure
statuses. It does not install the host or prove native behaviour. Then follow the
[manual Mac checklist](MANUAL-MAC-CHECKLIST.md), including reset, theme, motion,
storage, title-bar, click-through and clean disable/reload.


See [automated verification scope](INTEGRATION-VERIFICATION.md) and
[development reproduction](DEVELOPMENT.md). Do not turn mock screenshots into a
native compatibility promise.
