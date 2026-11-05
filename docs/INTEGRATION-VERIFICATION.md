# Integration verification — portable summary

Version **1.2.0** adds eighteen habitats to original Koi/Jellyfish, preserving the
native Settings page rather than substituting a gallery/iframe. This public
summary omits machine paths and internal coordination identifiers. Detailed
original receipts/reviews, including the late documentation-safety amendment,
are preserved privately outside public staging.

## Frozen runtime identity

| Artifact | SHA-256 |
| --- | --- |
| Full-distribution plugin (`desktop/plugin.js` on the full source tree) | `022004d7444cf947577679ed394e6315bd0c6f60f17a3bf4df1b153c54acca2d` |
| `demo.html` | `111f2d691a7010f19cf7ec293fec4842e2bec43d619e30391bba1f11171191a2` |
| Catalog plugin | `965b4aceaa3921e26360d163ac37f404bc78e6a1474c8c8fbe19c617411d8b82` |
| Complete `src/` tree | `4c9e76b8a5e2e83d3d0c9ecd0657ccfb3e94130d294badcf077891f304acd1cf` |

Tree identity is SHA-256 of compact UTF-8 JSON mapping sorted relative `src/`
paths to file SHA-256. Docs preparation does not alter those runtime bytes.
Image manifests bind current captures to exact plugin/catalog hashes.

## Automated scope and reproduction

The corrected integration's prior complete gate passed **102 units and eleven
browser suites**, repeat/catalog builds and extracted-source package verification.
Original tests/golden artwork were retained. Distinct correction review reported
PASS for that runtime, not for later docs or native installation. The subsequent
documentation-safety review passed **36 synthetic Linux file-operation cases**;
app-level ownership, no assumed storage export and symlink guards are retained.
See [review summary](FINAL-INTEGRATION-REVIEW.md).

Coverage includes twenty IDs, native controls and both canvas paths, palettes,
per-scene/hidden-slot persistence, live Speed/flow/extras, migration/reset,
readable/write-denied startup, click-through, theme, reduced motion and disposal.
These are browser/fixture checks, not a native-host certification.

Reproduce the exact current checkout with [development prerequisites](DEVELOPMENT.md):

```sh
npm run verify
python3 scripts/audit-public.py
node scripts/prepare-harness.mjs
python3 scripts/verify-local-candidate.py --browser --out /your/scratch/results
```

## Current documentation/gallery gate

The complete serial gate was run against the final public source: **108/108 units,
zero failed/cancelled/skipped/todo; all eleven browser suites; 70 JS/MJS syntax
checks; normal/repeat/catalog builds; `git diff --check`**. All exited zero and
plugin/demo hashes stayed exact. Six units were added to the original 102. Three
cover catalog feature-doc stripping, idempotence/marker errors and the public audit
(each failed before its fix). Three cover the catalog-branch script and fail against
its previous version: it now extends catalog history, pushes fast-forward only and
never rewrites it.

The public audit checks the exact file allowlist, all twenty scene/theme pairs,
current PNG hashes/dimensions/sizes, descriptive image ALT, local Markdown links
and anchors, privacy patterns and generated catalog docs. Original runtime/test
files and the storyboard are preserved. These checks do not constitute a security
certification or native acceptance. Raw logs remain private.

## Current screenshots

Forty default previews show every habitat in both themes. Full and catalog forms
come from their respective generated plugins. Window images show the **actual
browser-composited layer at 28%**, not raw alpha exports. Capture exercised both
forms, click-through and cleanup with zero page/console/unexpected-request errors.

Every current image is labelled **v1.2.0 browser mock-host capture; native Mac
acceptance not claimed**. The overview/2:1 banner use real frames only.
[Gallery captions/dimensions/hashes](images/v1.2/gallery.json) and
[capture metadata](images/v1.2/captures.json) identify the exact images.

## Limits and remaining gates

High counts/size may overlap; small/Bold and light facial details simplify.
Halos/stars are quiet in light themes. Whale fully exits and waits intentionally.
Stills do not prove smooth motion. Headless timings are load-dependent, not Mac
FPS, heat or battery measurements. Catalog docs/images must match Whole window only.

**The author reports a general hand test of v1.2.0 on a Mac with Hermes Desktop
that went well; it left no recorded checklist results, screenshots or Desktop
version. Windows and Linux Desktop, Safari, physical phones, other Hermes versions,
accessibility, heat and battery use remain untested.** Historical images are not new
native evidence. Public source, release
assets, validator/CI and catalog admission each need their own evidence;
maintainers' acceptance is not implied.

[Install/rollback](../INSTALL.md) · [Migration/reset](SETTINGS-MIGRATION.md) ·
[Unchecked Mac checklist](MANUAL-MAC-CHECKLIST.md)
