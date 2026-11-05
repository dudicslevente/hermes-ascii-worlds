# Third-party notices

The runtime bundles no external artwork, fonts, or audio. Documentation includes
original project screenshots and labelled contact sheets, not runtime assets.

Version 1.2.0 includes the project's approved MIT Animation Lab core and
eighteen scene modules under src/lab/. Scene sources and saved storyboard are
retained byte-identically; the sampler alone adds transparent-background support.
Approved standalone artifact provenance SHA-256:
`d2edc1ffa534eb585b0a5bb66136336ee972be2b19e33e65c3d748fc34367bc7`.
This does not imply the standalone gallery's review approves this integration.

The Desktop adapter references React, React JSX runtime, and the public Hermes plugin SDK, supplied by the Desktop host rather than redistributed here. Their licenses remain with their respective projects.

The MIT-licensed [ascii-diorama](https://github.com/JDhruv14/ascii-diorama) reference informed general composition principles: strong subjects, material-specific glyphs, and smooth rather than random motion. No source code or template from that repository is included.

The observed motion references include [Kurage Dashboard](https://horizonx.so/explore/kurage-dashboard) and [Shoal](https://metalforge.xyz/shoal). Those products are not established as MIT licensed. This is an independent free recreation based on public visual references, not their original source, an exact reproduction, or an affiliated product. No proprietary template code or gated download was used. The public MIT ASCII Magic examples were considered as inspiration; their implementation is not copied or bundled.

Playwright and Chromium are optional verification tools provided separately by the local test environment. They are not needed to build, run the offline demo, or load the Desktop plugin, and are not part of the distribution.
