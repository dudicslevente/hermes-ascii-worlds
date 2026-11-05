# Contributing

Node 20+; no runtime/build package installation is required. Run `npm run verify`
and `node --check desktop/plugin.js`. Browser tooling is separate; see
[development/testing](docs/DEVELOPMENT.md).

- Add tests first and retain RED evidence for new behavior. Never weaken the
  original meaningful tests or regenerate the koi golden without authorization.
- Preserve original koi/jelly geometry and sampler. Add new art as pure modules
  using the Lab contract / registry, not by expanding src/art.js or an iframe UI.
- Use supplied clocks, stable seeds and bounded populations. No timers, DOM,
  storage, network or Math.random in scene definitions.
- Expose each applicable control through the native Settings form; add validation,
  scene isolation, count-zero/colour/persistence and actual canvas tests.
- Keep only react, react/jsx-runtime, @hermes/plugin-sdk external. The build is
  deterministic/scoped; never edit generated plugin.js/demo.html by hand.
- Keep catalog @chat-area blocks intact; new art never needs host restyling.
- Use host theme variables in UI; no theme picker. No emojis in code/docs/UI.
- Every listener/observer/RAF/DOM side effect must be cleaned on all disposal
  paths. Disposed mutators must be inert.
- Keep reports honest: mock/browser output is not Mac Hermes evidence. Inspect
  meaningful motion and light anatomy, disclose overlap/offstage limits, and
  complete the native checklist before claiming native acceptance.

See [architecture](docs/ARCHITECTURE.md), [control matrix](docs/FEATURE-CONTROLS.md)
and [migration/rollback](docs/SETTINGS-MIGRATION.md). Gallery refresh, publication
privacy checks and variant-doc generation are documented in development/testing.
Use an explicit reviewed publish allowlist; never stage private logs or tool trees.
Preserve the original storyboard as historical production direction.
Reports should include exact
build, host/OS, placement, scene/settings and Check background diagnostics.
