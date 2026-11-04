# Plugin catalog notes

The Hermes plugin catalog is a human-reviewed list. Entries are added by a pull request to `NousResearch/hermes-agent` from the plugin's owner. The full rules are in the catalog's own README and at https://hermes-agent.nousresearch.com/docs/developer-guide/plugins/catalog-submission. This page records where this plugin stands.

## Layout

The repository follows what the catalog and the Desktop installer read:

```
plugin.yaml        manifest: name, version, description, requires_hermes
desktop/plugin.js  the plugin (a single plain ES module, built and committed)
README.md          rendered on the plugin's catalog page at the pinned commit
```

The built `desktop/plugin.js` must be committed, because the catalog installs the exact commit. CI fails if it is out of date (on the `catalog` branch it checks the catalog build).

## Local check

```sh
hermes plugins validate .
```

- **`main` (full plugin):** passes, with one expected warning: `desktop surface review (rule 8)` lists the app-markup selectors used by the Chat area placement.
- **`catalog` branch:** passes with no rule 8 warning. The only warning left is `no __init__.py`, which is expected for a Desktop-only plugin with no Python half.

(`hermes plugins doctor` checks Python plugins and does not apply here.)

## Rule 8 and the two branches

Rule 8 says a listed Desktop plugin must not reach into the app's own markup to restyle core UI. The Chat area placement does that: while it is on, it makes the app's background layers transparent so the animation shows through. A reviewer would likely decline it, so the repository ships two things from one source tree:

| | `main` and GitHub releases | `catalog` branch |
|---|---|---|
| Placements | Chat area and Whole window | Whole window only |
| Touches the app's own markup | Chat area does, through CSS | No |
| Validator rule 8 warning | Yes (three selectors) | None |
| Intended for | People installing from the GitHub release | The catalog entry |

The `catalog` branch is generated, never edited by hand: `scripts/make-catalog-branch.sh` builds `desktop/plugin.js` with `npm run build:catalog` (which removes the code between `@chat-area` markers) and strips the Chat area text from the README. `tests/catalog-variant.test.mjs` checks that the catalog bundle contains none of the app selectors or colour variables.

The catalog entry's `sha` is a commit on the `catalog` branch, not on `main`.

## Other rules, and where the plugin stands

| Rule | Status |
|---|---|
| 3. No self-updating code | Complies: no network access of any kind |
| 5. Owner submits | The repository owner must open the PR |
| 6. Declared capabilities match | None declared and none used |
| 8. Stay inside the SDK surface | The catalog branch does: no app selectors, no `eval`, no `import()`, no script injection, no observers. `main` does not (Chat area) |
| 13. Disclose risky behaviour | None: no network, no files outside plugin storage, no shell, no background processes, no credentials, no telemetry. It adds one canvas layer, one style tag and one attribute to the page while Background is on |
| 14. Truthful compatibility | `requires_hermes: ">=0.21.6"`, the first release with settings pages and the title-bar area (found in the Hermes git history). Not tested on every release since |
| 17. No binaries | Plain source only |

## Draft catalog entry

Not submitted. The `sha` must be the full 40-character commit on the `catalog` branch (`git rev-parse catalog`), and the entry goes in `plugin-catalog/ascii-worlds.yaml` in `NousResearch/hermes-agent`.

```yaml
name: ascii-worlds
repo: https://github.com/dudicslevente/hermes-ascii-worlds
sha: <40-hex commit sha of the pushed release>
title: ASCII Worlds
description: Koi and jellyfish drawn live in text glyphs. Choose how many and their colours in Settings, and optionally let them swim across the whole Hermes window. Desktop-only (desktop/plugin.js, plugin SDK surface only); no agent tools, hooks, middleware, env vars or network access.
maintainer: dudicslevente
tier: community
category: desktop
requires_hermes: ">=0.21.6"
version: "1.1.0"
docs_url: https://github.com/dudicslevente/hermes-ascii-worlds
image: https://raw.githubusercontent.com/dudicslevente/hermes-ascii-worlds/<sha>/docs/images/banner.png
screenshots:
  - https://raw.githubusercontent.com/dudicslevente/hermes-ascii-worlds/<sha>/docs/images/settings-background.png
  - https://raw.githubusercontent.com/dudicslevente/hermes-ascii-worlds/<sha>/docs/images/settings-scene.png
  - https://raw.githubusercontent.com/dudicslevente/hermes-ascii-worlds/<sha>/docs/images/koi-whole-window-1.jpg
  - https://raw.githubusercontent.com/dudicslevente/hermes-ascii-worlds/<sha>/docs/images/jellyfish-whole-window-1.jpg
platforms: []
capabilities:
  provides_tools: []
  provides_hooks: []
  provides_middleware: []
  requires_env: []
```

`docs/images/banner.png` is a 1200x600 (2:1) image, the shape the catalog README asks for. It is pinned to the commit by replacing `<sha>` in the raw URL.

## PR description checklist

- What it does and which surfaces it uses: a settings page, a title-bar button, two palette commands, and a canvas layer on the page while Background is on. Say that the pinned commit is on the `catalog` branch, which omits the Chat area placement on purpose.
- The disclosure lines from rule 13 above.
- Screenshots of the settings page and of the animation in the Whole window placement.
- The `hermes plugins validate` output for the pinned commit.
