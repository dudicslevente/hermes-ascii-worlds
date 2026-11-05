# Habitats and controls — 1.2.0

All twenty habitats share the native Habitat selector, independent saved scene
preferences, preview/window settings, automatic theme, glyph density,
Pause/Resume, Battery saver, reduced-motion handling and lifecycle cleanup.
Background is optional and off by default; its Strength is separate from scene opacity.

## Shared controls and exact ranges

| Control | Scope and limits |
| --- | --- |
| Habitat | Exactly the twenty IDs below; switching restores that scene's saved values |
| Count | Integer 0 through the scene's cap; default/cap in the table |
| Size | New habitats only, 0.5–1.6; changes subject size, not the window |
| Speed / Pace | Koi/jellyfish 0.1–1.5; new habitats 0.1–2.0. Cat, Owl and Night sky use Pace for local motion |
| Scene strength | New habitats only, 0.2–1.0; rendered glyph opacity, independent of Background Strength |
| Flow | Only meaningful scenes expose Current, Drift, Breeze or Wind; 0–1.5 |
| Glyph density | Fine / Balanced / Bold; coarser density simplifies small features |
| Colour | Named palette, Custom tint, or Individual where applicable |
| Tint | A six-digit hex colour; changing it selects Custom tint |
| Individual colours | Ten retained slots; editing one selects Individual. Hidden slots survive count reductions; counts above ten repeat slots |
| Pause / Resume | Shared by preview and background; no global Space shortcut that intercepts typing |
| Battery saver | Nominal cap of 12 rather than 30 fps; not a battery measurement or achieved-rate guarantee |
| Background Strength | 8–60%, default 28%; affects the optional window layer only |
| Reset this scene | Active scene only; retains selection, other scenes, Pause, saver and background |
| Reset to defaults | All scene preferences and global Pause/saver defaults; returns to Koi, respects reduced motion; background and v1/v2 records stay intact |

New habitats have **Natural, Jewel, Sunset, Pastel, Forest, Cyan, Ember, Mono,
Custom, Individual**. Koi retains all ten modes, with its original multi-tone
patches. Jellyfish retains **Natural, Cyan, Ember, Mono, Custom, Individual**.
Night sky has the nine non-Individual modes: hundreds of fixed stars do not have
meaningful creature identities. Tint and per-item colours retain material shading.

## Scene matrix

| Exact ID / name | Default / cap | Motion / flow | Scene-specific control or exception |
| --- | ---: | --- | --- |
| `koi` — Koi pond | 3 / 10 | Speed | Original named koi count/colour editors and artwork |
| `jellyfish` — Jellyfish drift | 5 / 10 | Speed | Original named jellyfish count/colour editors and artwork |
| `manta-rays` — Manta rays | 1 / 6 | Speed / Current | Travelling fin waves, trailing tail |
| `sea-turtles` — Sea turtles | 2 / 6 | Speed / Current | Shell and phase-offset flippers |
| `seahorses` — Seahorses | 3 / 8 | Speed / Drift | Upright drift, curled tail, dorsal fin |
| `tiny-fish-school` — Tiny fish school | 12 / 40 | Speed / Current | Cohesion 0.3–1.5 |
| `solitary-whale` — Solitary whale | 1 / 3 | Speed / Current | A fully offstage interval before return is intentional |
| `octopus` — Octopus | 2 / 4 | Speed / Current | Eight independently curling arms |
| `butterflies` — Butterflies | 2 / 12 | Speed / Breeze | Hinged patterned wings |
| `luna-moths` — Luna moths | 1 / 8 | Speed / Breeze | Eyespots and hindwing tails |
| `dragonflies` — Dragonflies | 3 / 8 | Speed / Breeze | Wing blur 0–1.5 |
| `swallows` — Swallows | 3 / 10 | Speed / Wind | Flap/glide and forked tail |
| `sleeping-cat` — Sleeping cat | 1 / 4 | Pace; no flow or roaming | Count-adaptive placed layout; breathing/ear/tail gestures |
| `owl` — Owl | 1 / 3 | Pace; no flow or roaming | Perch toggle; count-adaptive placed layout |
| `ginkgo-leaves` — Ginkgo leaves | 14 / 60 | Speed / Wind | Tumble 0–1.5 |
| `cherry-blossom-petals` — Cherry blossom petals | 18 / 80 | Speed / Breeze | Flutter 0–1.5 |
| `fireflies` — Fireflies | 9 / 40 | Speed / Drift | Halo 0.4–1.6 |
| `bubbles` — Bubbles | 12 / 40 | Speed / Current | Ring wobble, upward buoyancy |
| `dandelion-seeds` — Dandelion seeds | 8 / 24 | Speed / Wind | Tilting stalks and projected parachutes |
| `night-sky` — Night sky | 80 / 220 | Pace; no flow | Shooting stars frequency 0–2; zero disables meteors; no Individual |

Count zero clears **all** new-habitat art, including Owl's perch and meteors.
Original koi/jellyfish keep their faint ambient pond dots. Caps bound allocation,
not guaranteed visual separation or frame times. High counts/size can overlap;
adding Cat/Owl can move and shrink existing subjects to make space, without
changing their colour identities. Small/Bold and light facial detail are coarser.

## Host behaviour

Preview and background use the same normalized scene model and automatic theme.
The preview runs only while on screen; the window layer is independent of the
Settings page. New visible stills check host theme about every 1.1 seconds, without
advancing motion. Hidden/offscreen/disposed stills cancel those checks.

Reduced motion starts both canvases still. Explicit Resume grants temporary
plugin-session consent, retained across closing/reopening Settings; a new OS
reduced-motion hold or plugin reload revokes it. Settings and background save
warnings recover independently; failed edits stay in memory for that session.

<!-- chat-area:begin -->
Full distribution: Chat area and Whole window placements. Chat area depends on
host wrapper backgrounds/theme internals. The catalog removes that placement.
<!-- chat-area:end -->
<!-- catalog: Catalog distribution: Whole window only, without a placement selector or host-background restyling. -->

See [storage/migration/reset](SETTINGS-MIGRATION.md), [background internals](HOW-BACKGROUND-WORKS.md)
and the [dark/light gallery](GALLERY.md). The original standalone Lab ledger in
[LAB-FEATURE-PARITY.md](LAB-FEATURE-PARITY.md) is historical, not a claim about plugin UI.
