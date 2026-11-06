# Releasing

Maintainer notes. Contributors do not need this page.

## Builds

<!-- chat-area:begin -->
- **Full build** (`main`): `desktop/plugin.js` with both placements, **Whole window** and **Chat area**.
- **Catalog build** (`catalog` branch): **Whole window only**. The Hermes plugin catalog does not allow
  plugins that restyle the app's own markup, so this build removes everything between `@chat-area`
  markers, in the code and in the documentation.
<!-- chat-area:end -->
<!-- catalog: This branch is the catalog build: **Whole window only**. It is generated from the main branch, which also has a second placement that the plugin catalog does not allow. -->

Check the catalog build locally:

```sh
npm run build:catalog -- --out /tmp/catalog-plugin.js && node --check /tmp/catalog-plugin.js
node --test tests/catalog-variant.test.mjs tests/docs.test.mjs
```

## Cut a release

1. Update `version` in `package.json` and `plugin.yaml`, and add a changelog entry.
2. `npm run verify`, plus `npm run test:browser` if you have the tools.
3. Commit the regenerated `desktop/plugin.js` and `demo.html`, and push `main`.
4. Build the archives:

   ```sh
   python3 scripts/package-release.py /tmp/release
   ```

   This writes `ascii-worlds-<version>-plugin.zip` (install it by unzipping), `ascii-worlds-<version>.zip`
   (source) and `SHA256SUMS.json`, and checks every archive.
5. Tag `v<version>` on `main` and publish a GitHub release with the two ZIPs, `demo.html` and `SHA256SUMS.json`.

## Update the catalog build

```sh
git fetch origin
scripts/make-catalog-branch.sh --push
```

The script adds one generated commit on top of the existing `catalog` branch and pushes it as a plain
fast-forward. It never rewrites history, because a catalog entry pins an exact commit that has to stay
reachable.

## Hermes plugin catalog entry

The catalog is reviewed by the Hermes maintainers: an entry pins an exact 40-character commit, and every
new version is a new pull request that changes `version` and `sha` in `plugin-catalog/ascii-worlds.yaml`.
The rules are in the
[submission guide](https://hermes-agent.nousresearch.com/docs/developer-guide/plugins/catalog-submission).

Before opening the pull request, check the exact commit you pin:

```sh
hermes plugins validate /path/to/catalog-checkout --install-deps
```

Use the banner (`docs/images/banner.png`, 2:1) and up to six screenshots, with raw GitHub URLs pinned to
that same commit.

### What the pull request should disclose

- **Network and telemetry:** none.
- **Credentials and files:** none are read or stored. Settings live in the plugin's own storage.
- **Processes:** no shell commands and no background processes.
- **Page changes while the window animation is on:** one fixed canvas layer, one hidden element used to
  read the theme colour, one style element and one attribute on `<html>`, all removed when it is turned off.
- **Resources:** fine glyphs at full speed, many creatures and the window layer use noticeable CPU.
  Battery saver and a bolder density reduce it.
- **Authority:** like every Desktop plugin, it runs with the app's authority.
