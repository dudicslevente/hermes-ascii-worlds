# Catalog variant and publication disclosures

The Hermes plugin catalog is **human reviewed**, not a self-service marketplace.
A public source push, a GitHub release and catalog admission are distinct. Do not
claim acceptance until maintainers merge the entry. A new version of an entry that
is already listed is a new reviewed SHA-bump pull request (admission rule 4 of the submission guide linked below), not an
edit of an earlier merged one; the older pin stays installable until that pull
request lands.

Authoritative rules: [submission guide](https://hermes-agent.nousresearch.com/docs/developer-guide/plugins/catalog-submission)
and [entry schema](https://github.com/NousResearch/hermes-agent/blob/main/plugin-catalog/README.md).

## Exact variant

The `catalog` branch is **Whole window only**. It uses native Settings, title-bar
and palette SDK contributions, plugin-local storage and a transparent click-through
canvas layer. It has no placement selector or host-background restyling.


Build a non-destructive alternate artifact:

```sh
node scripts/build.mjs --catalog --out /your/scratch/catalog-plugin.js
node --check /your/scratch/catalog-plugin.js
node --test tests/catalog-variant.test.mjs tests/public-docs.test.mjs
```

`--out` leaves `desktop/plugin.js` and `demo.html` untouched. The generated
catalog variant must be tested and validated from its **exact prospective tree**,
not inferred from an older pin or normal-build results.

Maintainers of this repository can use `scripts/make-catalog-branch.sh` only after a clean,
reviewed main tree exists. It adds one generated commit on top of the previous
`catalog` tip, so a commit that an accepted entry already pins stays reachable;
`--push` is a plain fast-forward push, and the script never rewrites or force-pushes
history. Run `git fetch origin` first so your local `catalog` branch is current.
**Do not run it just to preview docs.** For a separate source-tree copy,
`node scripts/catalog-readme.mjs --root /path/to/copy` generates matching README,
install, changelog and selected documentation, without modifying the main tree.

## Entry and images

- Public cloneable repository with `plugin.yaml`, committed `desktop/plugin.js`
  and README at the pinned commit; no dependency trees, binaries or release archives.
- `version: "1.2.0"`, `requires_hermes: ">=0.21.6"`, matching the source manifest.
  Desktop-only; no tools, hooks, middleware or required environment secrets.
- **Full 40-character commit SHA**, never a branch, tag or short hash.
- Banner: `docs/images/v1.2/banner.png`, **1200x600 (2:1)**.
- At most **six** screenshots: recommended paths/captions are in the
  [gallery](GALLERY.md#capture-provenance-and-reuse).
- Use raw GitHub-hosted image URLs pinned to that **same commit**, not `main`.
  Catalog README is rendered from the pin; raw HTML is filtered, so use ordinary
  Markdown images and links. Every linked file/image must exist in that tree.

Selected catalog settings/background screenshots come from the **actual separately
built catalog plugin**, not the full variant. All current images disclose
**v1.2.0 browser mock-host capture; native Mac acceptance not claimed**.

## Runtime disclosure (admission rule 13)

- **Network/telemetry:** none at runtime. No third-party calls, accounts or usage reporting.
- **Credentials/environment:** none requested or stored. No `.env`, OAuth store,
  keychain, browser-profile or other credential-store access.
- **Files/processes:** no runtime file reads or shell/child processes. Build,
  packaging, gallery and browser-test tools are contributor commands, not plugin services.
- **Data:** plugin-namespaced validated scene/background preferences only. No
  conversation text is read or sent. Explicit Check background reads canvas,
  computed styles and geometry locally; inspect reports before sharing.
- **Work while enabled:** one window canvas and optional visible preview, bounded
  allocations and frame caps, resize/visibility/theme handling. No background daemon.
- **Trust:** Desktop plugins execute with renderer authority; error isolation is
  not capability isolation. No self-updater, remote loader or private host store access.

## Validator and acceptance

Against the final catalog tree, use the current documented validator:

```sh
hermes plugins validate /path/to/catalog-checkout --install-deps
```

Run only in an appropriate reviewed test environment; this is a contributor
instruction, **not a claim that the current publication passed validation or CI**.
Read every warning. This Desktop-only plugin declares no Python dependencies.
The publisher records validator output, the public commit and the exact image pins
in the pull request description. Maintainers still decide acceptance.

[Compatibility](COMPATIBILITY.md) · [Verification](INTEGRATION-VERIFICATION.md) ·
[Privacy-aware development](DEVELOPMENT.md)
