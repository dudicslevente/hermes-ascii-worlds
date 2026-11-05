# ASCII Worlds 1.2.0 — project status

## This version

Twenty habitats are integrated into the native Settings selector, preview and
optional window layer, with independent scene controls and v3 migration. Original
Koi/Jellyfish art and the approved eighteen-scene modules remain unchanged.

Public documentation covers installation/rollback, settings and exceptions,
privacy/resources, architecture, tests and a real [dark/light gallery](docs/GALLERY.md).
Current images are **v1.2.0 browser mock-host captures, not Mac screenshots**.
Historical imagery is labelled separately.

## Verification and limits

The complete serial gate passed **108/108 units, all eleven browser suites and
70 JS/MJS syntax checks**, plus repeat/catalog builds and diff checks. Image, link,
privacy and catalog-doc audits pass, and the plugin, demo and source runtime are
unchanged by the documentation work. See [verification](docs/INTEGRATION-VERIFICATION.md)
for identities and scope. The backup and rollback instructions keep app-level
ownership, assume no storage export and refuse symlinked paths.

The author hand-tested the full v1.2.0 plugin in Hermes Desktop on a Mac and reports
that everything worked. It was a general hand test: no Desktop version, screenshots or
per-item results were recorded, so the [Mac checklist](docs/MANUAL-MAC-CHECKLIST.md)
stays unchecked. The Whole-window-only catalog build is the same plugin without its
second window-placement option; automated tests, browser captures and the Hermes
validator cover it, but the hand test did not. Windows and Linux Desktop, Safari,
physical phones, other Hermes versions, accessibility, heat and battery use remain
untested.

## Publication boundary

Source in this repository is not proof of a release, a passed upstream CI run or an
accepted catalog listing. Those are separate gates; maintainers decide admission.
A pin update to an entry that is already listed is a new reviewed pull request
(admission rule 4 in the catalog submission guide), not an edit of an earlier merged
one. No automatic tag or GitHub release is required.
