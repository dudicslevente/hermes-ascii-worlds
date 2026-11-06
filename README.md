# ASCII Worlds

Twenty living habitats for Hermes Desktop, drawn entirely out of text characters.
Koi and jellyfish, sea turtles and moths, a sleeping cat, drifting petals, a quiet
night sky. Pick one in Settings, or let it drift across your whole window.

![A solitary whale drawn in glyphs](docs/images/v1.2/banner.png)

- **20 habitats**, from a lone whale to a sky full of stars.
- **Make it yours:** colours, speed, size and density. Every habitat remembers its own settings.
- **Light and dark:** it follows your Hermes theme automatically.
- **Gentle on your computer:** Pause, Battery saver and reduced-motion support are built in.
- **Private and offline:** no network, no accounts, no tracking. It is one readable file.

## All twenty habitats

![All twenty habitats in ASCII Worlds](docs/images/v1.2/overview.png)

| | |
| --- | --- |
| ![Koi pond, a glyph habitat in Hermes Desktop](docs/images/v1.2/koi-dark.png)<br>**Koi pond**<br>Patterned koi with tails that ripple as they turn | ![Jellyfish drift, a glyph habitat in Hermes Desktop](docs/images/v1.2/jellyfish-dark.png)<br>**Jellyfish drift**<br>Pulsing bells with long trailing strands |
| ![Manta rays, a glyph habitat in Hermes Desktop](docs/images/v1.2/manta-rays-dark.png)<br>**Manta rays**<br>Slow gliding turns and rippling fins | ![Sea turtles, a glyph habitat in Hermes Desktop](docs/images/v1.2/sea-turtles-light.png)<br>**Sea turtles**<br>Patterned shells and alternating flippers |
| ![Seahorses, a glyph habitat in Hermes Desktop](docs/images/v1.2/seahorses-light.png)<br>**Seahorses**<br>Upright drifters with curled tails | ![Tiny fish school, a glyph habitat in Hermes Desktop](docs/images/v1.2/tiny-fish-school-light.png)<br>**Tiny fish school**<br>A little school that moves as one |
| ![Solitary whale, a glyph habitat in Hermes Desktop](docs/images/v1.2/solitary-whale-dark.png)<br>**Solitary whale**<br>One big, calm crossing at a time | ![Octopus, a glyph habitat in Hermes Desktop](docs/images/v1.2/octopus-dark.png)<br>**Octopus**<br>Eight arms that curl on their own |
| ![Butterflies, a glyph habitat in Hermes Desktop](docs/images/v1.2/butterflies-light.png)<br>**Butterflies**<br>Patterned wings that open and close | ![Luna moths, a glyph habitat in Hermes Desktop](docs/images/v1.2/luna-moths-dark.png)<br>**Luna moths**<br>Pale wings with eyespots and long tails |
| ![Dragonflies, a glyph habitat in Hermes Desktop](docs/images/v1.2/dragonflies-light.png)<br>**Dragonflies**<br>Hovering, gliding and a blur of wings | ![Swallows, a glyph habitat in Hermes Desktop](docs/images/v1.2/swallows-light.png)<br>**Swallows**<br>Swooping flaps and glides |
| ![Sleeping cat, a glyph habitat in Hermes Desktop](docs/images/v1.2/sleeping-cat-dark.png)<br>**Sleeping cat**<br>A curled-up cat that breathes quietly | ![Owl, a glyph habitat in Hermes Desktop](docs/images/v1.2/owl-dark.png)<br>**Owl**<br>A watchful owl on its perch |
| ![Ginkgo leaves, a glyph habitat in Hermes Desktop](docs/images/v1.2/ginkgo-leaves-light.png)<br>**Ginkgo leaves**<br>Fan-shaped leaves tumbling down | ![Cherry blossom petals, a glyph habitat in Hermes Desktop](docs/images/v1.2/cherry-blossom-petals-light.png)<br>**Cherry blossom petals**<br>Petals fluttering in shared gusts |
| ![Fireflies, a glyph habitat in Hermes Desktop](docs/images/v1.2/fireflies-dark.png)<br>**Fireflies**<br>Soft lights that glow on their own rhythm | ![Bubbles, a glyph habitat in Hermes Desktop](docs/images/v1.2/bubbles-light.png)<br>**Bubbles**<br>Wobbling rings rising upward |
| ![Dandelion seeds, a glyph habitat in Hermes Desktop](docs/images/v1.2/dandelion-seeds-light.png)<br>**Dandelion seeds**<br>Tiny parachutes drifting on the breeze | ![Night sky, a glyph habitat in Hermes Desktop](docs/images/v1.2/night-sky-dark.png)<br>**Night sky**<br>Twinkling stars and the odd shooting star |

More frames in the [full gallery](docs/GALLERY.md).

## Settings

Everything lives in one place: **Settings -> Plugins -> ASCII Worlds**.

![The ASCII Worlds settings page with a live preview and controls](docs/images/v1.2/settings-catalog.png)

- Choose a **habitat** and watch it in the live preview.
- Set **how many** creatures there are, from none to the maximum.
- Pick a **colour palette**, one **tint**, or a different colour for each creature.
- Adjust **speed**, **size** and glyph **density**.
- **Show the animation in Hermes** to let it float across your window. The title-bar button and the command palette (**ASCII Worlds: toggle background**) switch it on and off too.
- **Reset this scene** or **Reset to defaults** whenever you like.

Prefer a calmer look? Lower **Strength**, use fewer creatures or switch on **Battery saver**.

## Install

**From the Hermes catalog:** run `hermes plugins install ascii-worlds`, then run **Reload desktop plugins** in Hermes Desktop. Or install it by hand:
1. Download `ascii-worlds-1.2.0-plugin.zip` from the [latest release](https://github.com/dudicslevente/hermes-ascii-worlds/releases/latest) and unzip it.
2. In Hermes Desktop open **Settings -> Plugins** and reveal the plugin folder. On a Mac it is usually `~/.hermes/desktop-plugins/`.
3. Copy the inner **`ascii-worlds`** folder into that plugin folder.
4. Run **Reload desktop plugins** from the command palette and switch ASCII Worlds on.
5. Open **Settings -> Plugins -> ASCII Worlds** and pick a habitat.

Updating? Quit and reopen Hermes Desktop once after replacing the folder. To remove it, switch it off in the Plugins page and delete the folder. Backup and rollback steps are in [INSTALL.md](INSTALL.md).

Want a peek first? Open [`demo.html`](demo.html) in any browser. It works offline and needs no install.

## Privacy

ASCII Worlds makes no network calls and sends nothing anywhere. It never reads your conversations. Your preferences stay in the plugin's own local storage on your computer.

## More

[Install and rollback](INSTALL.md) · [Gallery](docs/GALLERY.md) · [All controls](docs/FEATURE-CONTROLS.md) ·
[How the background works](docs/HOW-BACKGROUND-WORKS.md) · [Architecture](docs/ARCHITECTURE.md) ·
[Development and testing](docs/DEVELOPMENT.md) · [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md)

Ideas for new habitats, bug fixes and docs are very welcome: open an [issue](https://github.com/dudicslevente/hermes-ascii-worlds/issues) or send a pull request.

MIT licence. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
