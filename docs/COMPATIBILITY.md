# Will a Hermes update break this?

Short answer: the plugin cannot take Hermes down, the settings and the title-bar button rest on documented SDK surface, and the one part that depends on how the app is laid out (the Chat area placement) fails safe. This page says exactly what each part relies on, how that was checked, and what to do after an update.

## What it relies on

| Part | Relies on | Documented? | If it changes |
|---|---|---|---|
| Settings page | `ctx.registerSettingsPage`, with `ctx.register({ area: 'settings.plugins' })` as the documented fallback | Yes (Desktop plugin SDK) | The plugin still loads; the title-bar button and palette entries keep working |
| Title-bar button | `TITLEBAR_AREAS.right` | Yes | Background reports itself unavailable; the settings page still works |
| Palette commands | `PALETTE_AREA` with `{ id, label, keywords, run }`; the settings command also needs `host.navigate` and `pluginSettingsHref` | Yes | The commands are simply not registered |
| Storage | `ctx.storage.get/set` | Yes | Preferences fall back to defaults; nothing throws |
| Whole window placement | A fixed canvas on `document.body`; nothing else | Does not touch app markup | Nothing to break |
| Chat area placement | The `[data-chat-surface]` hook, the `[data-slot="aui_thread-viewport"]` hook and the app theme variables `--ui-chat-surface-background` / `--ui-bg-chrome` | Only partly: the Desktop docs name the first two hooks for theming, and say internal class names are not a contract. The two colour variables are internal | The animation may stop showing behind chats; Whole window is unaffected |

The plugin imports only `react`, `react/jsx-runtime` and `@hermes/plugin-sdk`, which is all a disk plugin may import, and every newer SDK export is read through a guard so an older or changed Desktop cannot make it fail to load.

## How it fails

- **It cannot crash the app.** Hermes isolates a plugin's errors. Every contribution here is wrapped, rendering errors in the settings page are caught by an error boundary, and a canvas error turns the background off and restores the page.
- **Chat area fails by showing nothing**, not by breaking layout: the plugin only makes backgrounds transparent while it is on, and removes those rules when it is off.
- **The Check background button names the cause.** It lists any element still painting a colour over the animation.

## What was verified, and what was not

Checked against the Hermes source (v0.22.6, 2026-11):

- Settings pages (`registerSettingsPage`, `pluginSettingsHref`, `SETTINGS_PLUGINS_AREA`) and the title-bar area exist in the Desktop source. They first appear in release v0.21.6, which is why `plugin.yaml` sets `requires_hermes: ">=0.21.6"`.
- The palette contribution shape, `host.navigate`, the `Button` UI kit export and plugin storage exist as the plugin uses them.
- The chat surface, the message list hook and both theme variables exist in the app's markup and styles.
- `hermes plugins validate` passes. Its three warnings are the Chat area selectors (see CATALOG.md).

Not verified:

- Behaviour on Windows and Linux Desktop builds.
- Any Hermes version other than 0.22.6.
- Nobody can promise a future release keeps the internal layout. That is why Whole window exists.

## After a Hermes update

Run the compatibility check against the new source:

```sh
git clone --depth 1 https://github.com/NousResearch/hermes-agent.git /tmp/hermes-agent
node scripts/check-desktop-compat.mjs /tmp/hermes-agent
```

It prints one line per assumption, marked SDK (the plugin needs a fix if one fails) or LAYOUT (only Chat area is affected). Exit code 0 means all good, 1 an SDK failure, 3 a layout failure. The repository's CI runs it against Hermes main on every push as an informational job.

## If something does break

1. Open Settings -> Plugins -> ASCII Worlds and press **Check background**.
2. Switch Placement to **Whole window**. It does not depend on the app's layout.
3. Open an issue with the Check background text and your Hermes version.
