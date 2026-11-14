# Install, update and roll back

ASCII Worlds is a Hermes Desktop plugin. It needs **Hermes Desktop 0.21.6 or newer**.

Desktop plugins belong to the Desktop app, not to a profile or a remote gateway. Install
the plugin on the computer that runs Hermes Desktop; it is then shared by every profile
and connection that app uses.

## Install

**From the Hermes catalog:** run `hermes plugins install ascii-worlds`, then run **Reload desktop plugins** in Hermes Desktop. Or install it by hand:
1. Download `ascii-worlds-<version>-plugin.zip` from the
   [latest release](https://github.com/dudicslevente/hermes-ascii-worlds/releases/latest) and unzip it.
2. In Hermes Desktop open **Settings -> Plugins** and reveal the plugin folder.
   It is usually `~/.hermes/desktop-plugins/`.
3. Copy the inner **`ascii-worlds`** folder into that plugin folder. The result must be
   `desktop-plugins/ascii-worlds/plugin.js`, and the folder name has to stay `ascii-worlds`.
4. Open the command palette, run **Reload desktop plugins** and make sure ASCII Worlds is switched on.
5. Open **Settings -> Plugins -> ASCII Worlds** and pick a habitat. The About section shows the installed version.

To install from a clone of this repository instead, run `npm run build` and copy
`desktop/plugin.js` to `desktop-plugins/ascii-worlds/plugin.js`.

## Update

1. In the plugin settings, switch **Show the animation in Hermes** off.
2. Replace `desktop-plugins/ascii-worlds/plugin.js` with the new file.
3. Quit and reopen Hermes Desktop once, so an old copy cannot keep running.

Your settings are kept. Version 1.2 reads the settings saved by 1.0 and 1.1 and does not change them.

## Uninstall

Switch ASCII Worlds off in **Settings -> Plugins** and delete the `ascii-worlds` folder from the plugin folder.

## Go back to an older version

Keep a copy of the old `plugin.js` before updating, for example:

```sh
cp ~/.hermes/desktop-plugins/ascii-worlds/plugin.js ~/ascii-worlds-plugin.js.backup
```

To go back, switch the animation off, quit Hermes Desktop, copy the backup over
`desktop-plugins/ascii-worlds/plugin.js` and reopen the app. Versions 1.0 and 1.1 read their untouched old records; 1.2 and 1.3 share the
current scene records. Window background preferences are shared too. Version 1.4
combines the old two opacity controls, so check opacity after rolling back, especially
if an older version clamps a very faint background to its higher minimum.

## Troubleshooting

- **The plugin is not listed.** Check the folder path and name, then run **Reload desktop plugins**.
  Also check that ASCII Worlds is switched on in **Settings -> Plugins**.
- **Nothing shows in the window.** Switch on **Show the animation in Hermes**, raise **Background opacity**,
  and make sure Count is not zero. Pressing **Check background** in the settings shows a short
  local report you can include in a bug report.
- **It uses too much power.** Switch on **Battery saver**, use a bolder glyph density or fewer creatures.
- **No preview without installing:** open [`demo.html`](demo.html) in any browser. It runs offline.

If something else goes wrong, please [open an issue](https://github.com/dudicslevente/hermes-ascii-worlds/issues).
