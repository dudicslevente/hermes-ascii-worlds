# Habitats and controls

All thirty-seven habitats share the native Habitat selector, independent saved scene
preferences, preview/window settings, automatic theme, glyph density,
Pause/Resume, Battery saver, reduced-motion handling and lifecycle cleanup.
Background is optional and off by default. Background opacity is global; the
Settings preview always renders at full internal strength.

## Shared controls and exact ranges

| Control | Scope and limits |
| --- | --- |
| Habitat | Exactly the thirty-seven IDs below; switching restores that scene's saved values |
| Count | Integer 0 through the scene's cap; default/cap in the table |
| Size | Every habitat, 0.5–1.6; changes subject size, not the window |
| Speed / Pace | Koi/jellyfish 0.1–1.5; new habitats 0.1–2.0. Cat, Owl and Night sky use Pace for local motion |
| Flow | Only meaningful scenes expose Current, Drift, Breeze, Wind, Pressure, Warmth, Swell, Ripples or Run speed; 0–1.5. Koi and jellyfish: Current |
| Depth | The ocean, wings, drifting and original quiet habitats except Night sky, 0–1, default 0.6. Pipes and the thirteen new character/game habitats have no Depth control. Spreads creatures over far, mid and near, with a faint far atmosphere (marine snow, pollen, dust or pond silt; none for Fireflies). 0 draws exactly as 1.2.0 |
| Moon | Show / Hide, and Today's real phase (default) or one of seven fixed phases. Only on open-air scenes, the owl and the night sky; hidden elsewhere. Uses the computer's date only |
| Glyph density | Fine / Balanced / Bold; coarser density simplifies small features |
| Colour | Named palette, Custom tint, or Individual where applicable |
| Tint | A six-digit hex colour; changing it selects Custom tint |
| Individual colours | Ten retained slots; editing one selects Individual. Hidden slots survive count reductions; counts above ten repeat slots |
| Pause / Resume | Shared by preview and background; no global Space shortcut that intercepts typing |
| Battery saver | Nominal cap of 12 rather than 30 fps; not a battery measurement or achieved-rate guarantee |
| Background opacity | One global value, 1–60% in 0.1% steps, default 28%; affects the optional window layer only, never the preview |
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
| `koi` — Koi pond | 3 / 10 | Speed / Current | Original named koi count/colour editors and artwork |
| `jellyfish` — Jellyfish drift | 5 / 10 | Speed / Current | Original named jellyfish count/colour editors and artwork |
| `manta-rays` — Manta rays | 1 / 6 | Speed / Current | Travelling fin waves, trailing tail |
| `sea-turtles` — Sea turtles | 2 / 6 | Speed / Current | Shell and phase-offset flippers |
| `seahorses` — Seahorses | 3 / 8 | Speed / Drift | Upright drift, curled tail, dorsal fin |
| `tiny-fish-school` — Tiny fish school | 12 / 40 | Speed / Current | Cohesion 0.3–1.5; Free schooling on/off |
| `solitary-whale` — Solitary whale | 1 / 3 | Speed / Current | A fully offstage interval before return is intentional |
| `octopus` — Octopus | 2 / 4 | Speed / Current | Eight independently curling arms |
| `hammerhead` — Hammerhead and bait ball | 2 / 4 | Speed / Current | Bait ball on/off; Bait fish 12–90 (default 40); Scatter 0–1.5 |
| `anglerfish` — Anglerfish | 1 / 3 | Speed / Current | Lure glow 0.3–1.5; Curious prey on/off |
| `butterflies` — Butterflies | 2 / 12 | Speed / Breeze | Hinged patterned wings |
| `luna-moths` — Luna moths | 1 / 8 | Speed / Breeze | Eyespots and hindwing tails |
| `dragonflies` — Dragonflies | 3 / 8 | Speed / Breeze | Wing blur 0–1.5 |
| `swallows` — Swallows | 3 / 10 | Speed / Wind | Flap/glide and forked tail |
| `sleeping-cat` — Sleeping cat | 1 / 4 | Pace; no flow or roaming | Count-adaptive placed layout; breathing/ear/tail gestures |
| `axolotl` — Axolotls | 2 / 4 | Speed; no flow | Pond plants on/off; Activity 0–1.5 (0 keeps them resting) |
| `owl` — Owl | 1 / 3 | Pace; no flow or roaming | Perch toggle; count-adaptive placed layout |
| `ginkgo-leaves` — Ginkgo leaves | 14 / 60 | Speed / Wind | Tumble 0–1.5 |
| `cherry-blossom-petals` — Cherry blossom petals | 18 / 80 | Speed / Breeze | Flutter 0–1.5 |
| `fireflies` — Fireflies | 9 / 40 | Speed / Drift | Halo 0.4–1.6 |
| `bubbles` — Bubbles | 12 / 40 | Speed / Current | Ring wobble, upward buoyancy |
| `dandelion-seeds` — Dandelion seeds | 8 / 24 | Speed / Wind | Tilting stalks and projected parachutes |
| `night-sky` — Night sky | 80 / 220 | Pace; no flow | Shooting stars frequency 0–2; zero disables meteors; no Individual |
| `pipes` — Pipes | 2 / 2 (Pipes) | Speed / Pressure | Bubbles 0–1.5; Valve and gauge on/off; Pipe size; Individual colours the two pipes separately; no Depth. The pool, stream and jet take the liquid colour, so every colour mode recolours the whole scene |
| `platypus-creek` — Platypus creek | 1 / 2 | Speed / Current | Tiny hat on/off (default on); Splash 0–1.5 (default 1); Reeds on/off (default on) |
| `capybara-onsen` — Capybara onsen | 1 / 2 | Pace / Warmth | Steam 0–1.5 (default 1); Yuzu on/off (default on); Friends 0–1.5 (default 1) |
| `penguin-slide` — Penguin slide | 3 / 4 | Pace / Swell | Snow 0–1.5 (default 0.6); Chick on/off (default on); Belly slide on/off (default on) |
| `rubber-ducks` — Rubber ducks | 2 / 3 | Pace / Ripples | Foam 0–1.5 (default 1); Bubbles 0–1.5 (default 1); Toy boat on/off (default on) |
| `nyan-cat` — Nyan Cat | 1 / 3 | Pace; no flow | Trail 0.2–1 (default 1); Stars 0–1.5 (default 1); Rainbow wave on/off (default on) |
| `dino-runner` — Dino runner | 1 / 3 | Pace / Run speed | Obstacles on/off (default on); Pterodactyls on/off (default on); Score on/off (default on) |
| `dragon-hoard` — Dragon's hoard | 1 / 2 | Pace; no flow | Hoard 0.3–1.5 (default 1); Smoke 0–1.5 (default 1); Fire on/off (default on) |
| `beehive` — Beehive | 5 / 8 | Speed; no flow | Honey 0–1.5 (default 1); Waggle dance on/off (default on); Queen on/off (default on) |
| `wizard-tower` — Wizard's tower | 1 / 2 | Pace; no flow | Candles 0–1.5 (default 1); Sparks 0–1.5 (default 1); Cat familiar on/off (default on) |
| `retro-arcade` — Retro arcade | 2 / 3 | Pace; no flow | Glow 0–1.5 (default 1) |
| `snake-game` — Snake | 1 / 3 | Pace; no flow | Grid dots 0–1.5 (default 0.5); Board area 0.6–1.5 (default 1); Soft trail on/off (default on) |
| `pirate-ship` — Pirate ship | 1 / 2 | Speed / Wind | Kraken on/off (default on); Gull on/off (default on); Waves 0.3–1.5 (default 1) |
| `rooftop-ninja` — Rooftop ninja | 1 / 3 | Speed; no flow | Moon on/off (default on); Lanterns on/off (default on); Shuriken on/off (default on) |

The new character/game habitats keep their own artwork on an uncluttered stage; there is
no extra atmosphere or moon layer over them. Ninja’s Moon is its own scene toggle.
In Dino runner, **Pace** advances the scene clocks (legs and clouds included);
**Run speed** changes the scrolling ground, obstacles and score, not the leg animation.
The **Score** toggle shows or hides the top-right counter; it uses the palette’s accent.
Nyan Cat stays in place: head, body, feet and tail step through separate poses while
its rainbow and stars move past. Snake’s play areas stay separate at higher counts. After roughly eleven minutes
of travel time, it fades into a fresh round; changing settings never triggers an
hours-long replay.

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

See [settings and storage](SETTINGS.md), [window background](BACKGROUND.md) and the [gallery](GALLERY.md).
