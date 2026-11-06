# Contributing

Thanks for helping. Bug reports, new habitats, documentation and test improvements are all welcome.

## Getting started

You need Node.js 20 or newer. There is nothing to install.

```sh
git clone https://github.com/dudicslevente/hermes-ascii-worlds.git
cd hermes-ascii-worlds
npm run verify     # unit tests, then build
npm run demo       # serve demo.html locally
```

`desktop/plugin.js` and `demo.html` are generated from `src/` by `npm run build`.
Commit them with your source changes and never edit them by hand.
The [development guide](docs/DEVELOPMENT.md) covers the browser tests and how to add a habitat.

## Pull requests

- Open an issue first for large changes, or to say you are working on a new habitat.
- Add or update tests, and keep `npm run verify` green.
- Keep the runtime free of dependencies: the plugin may only import `react`,
  `react/jsx-runtime` and `@hermes/plugin-sdk`.
- No network access, telemetry or new stored data without discussion.
- Anything the plugin adds to the page must be removed again when it is turned off,
  and every listener, observer and animation frame must be cleaned up on disposal.
- Use the host's theme variables for plugin UI; there is no theme picker.
- Habitat scenes are pure functions of size and time: no timers, DOM, storage, network or `Math.random`.
  Expose every applicable control in the native Settings form and keep populations bounded.
- Keep the `chat-area` blocks in the documentation and source intact. The catalog build removes them.
- Only state in docs and pull requests what you actually tested.

## Reporting bugs

Please include the Hermes Desktop version, your operating system, the habitat and settings,
and the text from **Check background** in the plugin settings (it contains no conversation text).

See also: [architecture](docs/ARCHITECTURE.md), [controls](docs/CONTROLS.md) and [settings storage](docs/SETTINGS.md).
