# Plugin catalog notes

The Hermes plugin catalog is a human-reviewed list. Entries are added by a pull request to `NousResearch/hermes-agent` from the plugin's owner. The full rules are in the catalog's own README and at https://hermes-agent.nousresearch.com/docs/developer-guide/plugins/catalog-submission. This page records where this plugin stands.

## Layout

The repository follows what the catalog and the Desktop installer read:

```
plugin.yaml        manifest: name, version, description, requires_hermes
desktop/plugin.js  the plugin (a single plain ES module, built and committed)
README.md          rendered on the plugin's catalog page at the pinned commit
```

The built `desktop/plugin.js` must be committed, because the catalog installs the exact commit. CI fails if it is out of date.

## Local check

```sh
hermes plugins validate .
```

Current result: passes, with these warnings:

- `no __init__.py`: expected, this is a Desktop-only plugin with no Python half.
- `desktop surface review (rule 8)`: three "app markup selector" warnings, all for the Chat area placement (`[data-slot="aui_thread-viewport"]` in two CSS rules and one read-only lookup used by the Check background report).

(`hermes plugins doctor` checks Python plugins and does not apply here.)

## Rule 8, honestly

Rule 8 says a listed Desktop plugin must not reach into the app's own markup to restyle core UI. The Chat area placement does that: while it is on, it makes the app's background layers transparent so the animation shows through. It uses the `[data-chat-surface]` and `[data-slot="aui_thread-viewport"]` hooks that the Desktop theming docs name, and it is pure CSS that is removed when the placement is off, but a reviewer may still decide it falls under rule 8. The validator only warns here; the decision is a human's.

If a reviewer declines it, the fallback is a catalog build without Chat area (Whole window only), which touches no app markup, and keeping the full version on GitHub releases. Another route is to ask for an SDK hook that offers a background layer, per the "Asking for a hook" section of the catalog guide.

## Other rules, and where the plugin stands

| Rule | Status |
|---|---|
| 3. No self-updating code | Complies: no network access of any kind |
| 5. Owner submits | The repository owner must open the PR |
| 6. Declared capabilities match | None declared and none used |
| 8. Stay inside the SDK surface | Mostly; see above |
| 13. Disclose risky behaviour | None: no network, no files outside plugin storage, no shell, no background processes, no credentials, no telemetry. It adds one canvas layer, one style tag and one attribute to the page while Background is on |
| 14. Truthful compatibility | `requires_hermes: ">=0.21.6"`, the first release with settings pages and the title-bar area (found in the Hermes git history). Not tested on every release since |
| 17. No binaries | Plain source only |

## Draft catalog entry

Not submitted. The `sha` must be the full 40-character commit that you push, and the entry goes in `plugin-catalog/ascii-worlds.yaml` in `NousResearch/hermes-agent`.

```yaml
name: ascii-worlds
repo: https://github.com/dudicslevente/hermes-ascii-worlds
sha: <40-hex commit sha of the pushed release>
title: ASCII Worlds
description: Koi and jellyfish drawn live in text glyphs. Choose how many and their colours in Settings, and optionally let them swim through your chats or the whole window. Desktop-only (desktop/plugin.js, plugin SDK surface only); no agent tools, hooks, middleware, env vars or network access.
maintainer: dudicslevente
tier: community
category: desktop
requires_hermes: ">=0.21.6"
version: "1.0.0"
docs_url: https://github.com/dudicslevente/hermes-ascii-worlds
image: https://raw.githubusercontent.com/dudicslevente/hermes-ascii-worlds/<sha>/docs/images/banner.png
screenshots:
  - https://raw.githubusercontent.com/dudicslevente/hermes-ascii-worlds/<sha>/docs/images/settings-page.png
  - https://raw.githubusercontent.com/dudicslevente/hermes-ascii-worlds/<sha>/docs/images/behind-vs-front.png
platforms: []
capabilities:
  provides_tools: []
  provides_hooks: []
  provides_middleware: []
  requires_env: []
```

`docs/images/banner.png` is a 1200x600 (2:1) image, the shape the catalog README asks for. It is pinned to the commit by replacing `<sha>` in the raw URL.

## PR description checklist

- What it does and which surfaces it uses: a settings page, a title-bar button, two palette commands, and a canvas layer on the page while Background is on.
- The disclosure lines from rule 13 above.
- Screenshots of the settings page and of both placements.
- The `hermes plugins validate` output, including the warnings and the honest note about rule 8.
