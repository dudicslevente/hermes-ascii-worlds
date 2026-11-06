# Compatibility

ASCII Worlds needs **Hermes Desktop 0.21.6 or newer**, the first release with plugin settings
pages and the title-bar slot. This minimum is declared in `plugin.yaml`.

## Host surfaces it uses

| Surface | How it is used |
| --- | --- |
| Settings page | `registerSettingsPage`, with a fallback to the `settings.plugins` area. There is no docked pane |
| Title bar | One toggle button in `TITLEBAR_AREAS.right`. Without it, the background toggle is unavailable and the preview still works |
| Command palette | **ASCII Worlds: toggle background** and **open settings**. Opening settings also needs `host.navigate` and `pluginSettingsHref` |
| Storage | `ctx.storage` (synchronous, private to the plugin). Failures never block the plugin |
| Theme | The host's text-colour variable, with the operating system as a fallback. There is no theme picker |
| Whole window | A transparent, click-through canvas above the app. It does not change the app's own layout |

The plugin imports only `react`, `react/jsx-runtime` and `@hermes/plugin-sdk`. It makes no network requests.
Desktop plugins run with the app's authority; error boundaries are not a security sandbox.

## After a Hermes Desktop update

With a checkout of the Hermes source, run:

```sh
node scripts/check-desktop-compat.mjs /path/to/hermes-agent
```

It reports SDK assumptions (a failure means the plugin needs a fix) separately from layout assumptions
used only by an optional placement of the full build. It reads source text and does not run Desktop.
