# Install, update and roll back — ASCII Worlds 1.2.0

This version has twenty habitats. This page covers the manual install and how to
roll back. A GitHub release or the Hermes catalog are other ways to get the plugin.

## Scope and verified official contract

[Official Desktop SDK documentation](https://hermes-agent.nousresearch.com/docs/developer-guide/desktop-plugin-sdk)
("Quick start" and "Settings, enable state, and storage", checked during this
local verification) says Desktop plugins are **app-level**: one root across all
profiles, gateways and remote connections. A different Hermes profile does
**not** isolate replacement or prove storage isolation. Installation belongs on
the computer running Desktop, not a remote gateway. The automated tests did not
install the plugin on a Mac.

The SDK documents plugin-namespaced `ctx.storage.get/set/remove`, not a universal
storage-export UI. Do not assume such an export exists. If your actual app has
a documented export, verify it before relying on it; otherwise record old
settings with screenshots. Screenshots are not a complete storage backup.
Record **Background enabled, placement and strength before turning it off**.
Old settings.v1/v2 remain read-only in this candidate, but background.v1 is shared.
Do not copy whole app profiles or inspect/edit undocumented databases or secrets.

## Manual installation — on the Mac running Desktop

1. From a reviewed source checkout, use **`desktop/plugin.js`**, which is already
   built. From a versioned plugin ZIP, use the inner **`ascii-worlds/plugin.js`**,
   not its outer versioned folder. A source push does not create that ZIP.
   `demo.html` is an offline preview, never the installed plugin.
2. In the app's plugin-management page (Capabilities -> Plugins in current docs;
   some builds label this Settings -> Plugins), reveal the actual plugin folder.
   It is commonly `~/.hermes/desktop-plugins/`, but use the revealed path.
3. Record old settings as above. Turn Background off, disable ASCII Worlds and
   quit Desktop before copying. Do not switch profiles as a substitute for backup.
4. For an existing installation, use **Mac Terminal** below. Replace the two
   example paths with the actual revealed root and reviewed folder containing
   `plugin.js` (the checkout's `desktop` folder or the ZIP's inner `ascii-worlds`).
   The block refuses missing files and backs up the entire old plugin folder
   outside the watched root before replacing only plugin.js. It never deletes data.

```sh
(
  set -eu
  PLUGIN_ROOT="/paste/the/revealed/desktop-plugins"
  CANDIDATE="/paste/the/reviewed/desktop"
  test ! -L "$PLUGIN_ROOT/ascii-worlds"
  test ! -L "$PLUGIN_ROOT/ascii-worlds/plugin.js"
  test ! -L "$CANDIDATE"
  test ! -L "$CANDIDATE/plugin.js"
  test -f "$PLUGIN_ROOT/ascii-worlds/plugin.js"
  test -f "$CANDIDATE/plugin.js"
  BACKUP=$(mktemp -d "$HOME/ascii-worlds-backup.XXXXXX")
  cp -R "$PLUGIN_ROOT/ascii-worlds" "$BACKUP/ascii-worlds"
  cmp "$PLUGIN_ROOT/ascii-worlds/plugin.js" "$BACKUP/ascii-worlds/plugin.js"
  printf 'KEEP THIS BACKUP PATH: %s\n' "$BACKUP"
  cp "$CANDIDATE/plugin.js" "$PLUGIN_ROOT/ascii-worlds/plugin.js"
  cmp "$CANDIDATE/plugin.js" "$PLUGIN_ROOT/ascii-worlds/plugin.js"
)
```

**Stop if any command fails.** Keep the printed backup path; the subshell does
not preserve its variables. For a first installation with no old plugin, use
Finder to copy the inner `ascii-worlds` folder into the revealed root; no prior
plugin-file rollback exists in that case. Never create a duplicate ID in another
plugin root or modify a gateway's configuration.

5. Reopen Desktop, run **Reload desktop plugins** from the command palette,
   then enable ASCII Worlds. Files can also hot-reload automatically.
6. Open Settings -> Plugins -> ASCII Worlds, confirm About **1.2.0**, then, if you
   want to record your own results, follow `docs/MANUAL-MAC-CHECKLIST.md`
   (its boxes are intentionally left unchecked).

## Manual rollback — Mac Terminal

First turn the candidate background off, disable the plugin and quit Desktop.
Use the exact backup path printed above and the actual revealed plugin root:

```sh
(
  set -eu
  PLUGIN_ROOT="/paste/the/revealed/desktop-plugins"
  BACKUP="/paste/the/printed/ascii-worlds-backup.path"
  test ! -L "$BACKUP/ascii-worlds"
  test ! -L "$BACKUP/ascii-worlds/plugin.js"
  test ! -L "$PLUGIN_ROOT/ascii-worlds"
  test ! -L "$PLUGIN_ROOT/ascii-worlds/plugin.js"
  test -f "$BACKUP/ascii-worlds/plugin.js"
  test -f "$PLUGIN_ROOT/ascii-worlds/plugin.js"
  cp "$BACKUP/ascii-worlds/plugin.js" "$PLUGIN_ROOT/ascii-worlds/plugin.js"
  cmp "$BACKUP/ascii-worlds/plugin.js" "$PLUGIN_ROOT/ascii-worlds/plugin.js"
)
```

Stop on failure. Reopen/reload and enable the prior plugin. It reads its untouched
v1/v2 preferences, not v3. Manually restore the old Background placement/strength
and enabled state from your recorded values, or from an actually verified
app-specific export. Merely restoring plugin.js does **not** restore background.v1.
Do not delete all plugin data. See `docs/SETTINGS-MIGRATION.md` for scope.

These file-copy commands are simple reversible operations, synthetic-fixture
checked on Linux; they are **not** claimed executed on your Mac. Strong isolation
would require a separately verified app-data environment, not just a Hermes profile.

`demo.html` opens directly offline without installing. `?chat=1` is a labelled
mock chat. Nothing in packaging automatically installs, commits, pushes, tags,
publishes or submits anything, and testing does not authorise those actions.
