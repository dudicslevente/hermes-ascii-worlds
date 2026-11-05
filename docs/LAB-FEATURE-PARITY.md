# Feature parity and deliberate differences

Compared directly with exported `reference/src/settings.js`, `world.js` and `engine.js`. This lab is a standalone offline gallery, not a live Hermes plugin. Source of requirements: `SPEC.md`. Verification results live in `evidence/verification/` and `docs/VERIFICATION.md`; implementation does not imply final aesthetic approval.

## Shared controls and lifecycle

| Reference feature | Lab equivalent and scope |
| --- | --- |
| Habitat selector | Exact 18-scene grouped rail, mobile picker, previous/next and hash links. One active canvas/engine, never 18 loops. |
| Natural, Jewel, Sunset, Pastel, Forest, Cyan, Ember, Mono, custom and individual colours | Every scene has its own natural colour kits plus Jewel, Sunset, Pastel, Forest, Cyan / lilac, Warm / ember, Monochrome, Custom tint and (except stars) Individual. All original named choices are retained. Five material roles retain shading. Light/dark ink contrast is adjusted by the glyph sampler. |
| Ten persistent per-creature colours | Ten slots per meaningful scene; count reduction hides slots without deleting them. Populations above ten repeat slots, explicitly labelled in UI. Stars deliberately omit individual slots: hundreds of fixed points, no meaningful creature identity. |
| Count 0–10 | Scene-specific bounded caps below. Zero bypasses all scene drawing, including perch/shooting stars; no residual decorative points. |
| Speed 0.1–1.5 | Speed 0.1–2; travel clock scales linearly, articulation rate scales as speed^0.6. Stationary cat/owl pace controls breathing, blinks and small movements, not roaming. |
| Fine/Balanced/Bold density | Same three choices and grid steps, bounded to 220 by 150 cells. |
| Background strength | Strength 20–100% affects actual stage glyph opacity; for a faint mock-chat preview reduce this. Not a live host-background setting. |
| Pause/resume | Button and Space when not editing/focusing an interactive element. Fixed-time evidence API separately freezes rendering until resume. |
| Battery saver 12 versus 30 fps | Same caps, global persisted preference, full plain-language help. Not a measured battery-saving claim. |
| Reset | Reset this scene only. Does not erase another scene, tone, saver or pause preferences. |
| Storage and migration | Separate validated, namespaced record for each scene plus shared preferences. Corrupt JSON/types fall back; finite numbers clamp; legacy lab draft numeric strings migrate. Readable records and saved Pause still load when writes fail. Denied/full storage shows an explicit session-only warning; edits/reset remain usable in-session. Valid startup deep links become the saved current scene. Not an import of unrelated plugin preferences. Each record bounded to 4096 characters; ten colour slots; no variable population allocations from corrupt storage. |
| Reduced motion | Starts held at one still frame; dynamic preference pauses. Explicit Resume opts into motion and clears only the motion note, retaining unrelated storage/count-zero warnings. |
| Hidden/offscreen suspension | Visibility event and IntersectionObserver cancel RAF and stop clocks. Resume does not catch up hidden time. Full dispose removes observers, media/document listeners, control handlers, interval and RAF; all exposed disposed mutators are inert for settings/storage too. |
| Theme-following | Dark/Light/System review surfaces, independent of shell. No claim of real Hermes theme integration. |
| Background enable/placement/transparency/check diagnostics | Omitted: these require a live Hermes host. Clearly labelled mock chat, stage mode and browser fullscreen offer local review instead. No DOM clearing or host integration. |
| Size / current / wind / extras | Added where useful; all actual stage settings, not disconnected preview knobs. |

## Scene coverage

All rows inherit count including zero, speed, size, density, strength, the nine shared colour modes, pause, saver, scoped reset, per-scene persistence, reduced-motion and suspension/disposal. `I` = ten independent colour slots, repeated beyond ten.

| Scene ID | Default / cap | I | Movement control | Articulation and scene-specific control |
| --- | --- | --- | --- | --- |
| `manta-rays` | 1 / 6 | Yes | Current | Travelling fin waves, bending trailing tail and gliding turns. |
| `sea-turtles` | 2 / 6 | Yes | Current | Phase-offset front/rear flipper strokes, shell scutes and curved routes. |
| `seahorses` | 3 / 8 | Yes | Drift | Upright segmented body, horse snout, curled tail, fin flicker and bobbing. |
| `tiny-fish-school` | 12 / 40 | Yes | Current | Cohesion 0.3–1.5, lagged leader turns, individually phased spine/tail strokes. |
| `solitary-whale` | 1 / 3 | Yes | Current | Broad crossings, flexible vertical tail/body stroke and flippers. Full offstage wait/return is intentional and disclosed in visible scene help. |
| `octopus` | 2 / 4 | Yes | Current | Eight independently curling tapered arms, breathing mantle and buoyant jet cycle. |
| `butterflies` | 2 / 12 | Yes | Breeze | Four patterned wing lobes, continuous hinge projection, independent flight. |
| `luna-moths` | 1 / 8 | Yes | Breeze | Pale broad forewings, eyespots, long twisting hindwing tails, glide phases. |
| `dragonflies` | 3 / 8 | Yes | Breeze | Segmented abdomen, four wings, hover/glide cycles; Wing blur 0–1.5. |
| `swallows` | 3 / 10 | Yes | Wind | Swept wings, forked tail, flap/glide phases and banked arcs. |
| `sleeping-cat` | 1 / 4 | Yes | None, intentionally stationary | Breathing, ear/tail gestures, curled anatomy. Pace controls local motion only. Count-adaptive separated layout is intentional: adding cats can move/shrink existing cats to avoid pile-ups; colour identities remain stable. |
| `owl` | 1 / 3 | Yes | None, intentionally stationary | Blinks, subtle head turns and breathing. Optional Perch. Count-adaptive layout intentionally moves/shrinks surviving owls to avoid overlap; colour identities remain stable. |
| `ginkgo-leaves` | 14 / 60 | Yes | Wind | Fan veins and projected tumbling silhouette; Tumble 0–1.5. |
| `cherry-blossom-petals` | 18 / 80 | Yes | Breeze | Notched petal shapes, falling/shared gusts and projection; Flutter 0–1.5. |
| `fireflies` | 9 / 40 | Yes | Drift | Smooth independent glow cycles, no rigid-body anatomy; Halo 0.4–1.6. |
| `bubbles` | 12 / 40 | Yes | Current | Outlined rings, upward buoyancy, growth and shape wobble. |
| `dandelion-seeds` | 8 / 24 | Yes | Wind | Stalk/achene and fine parachute spokes, pendulum tilt and spoke flex. |
| `night-sky` | 80 / 220 | No | None, fixed stars | Slow twinkle; Shooting stars frequency 0–2 (zero disables meteors). Speed changes twinkle/meteor timing; Size changes star size. |

## Art and verification interpretation

- Fin/wing/arm/body deformation is tested with travel frozen and articulation running. Falling leaves/petals/seeds use projected shape change; fireflies and stars appropriately use illumination, not animal anatomy.
- Travel is measured separately at fixed articulation. Cat/owl remain placed; night-sky star positions remain fixed with meteors disabled.
- Count-adaptive stationary placement is an explicit exception to stable poses by index, not a claim of identical geometry after population changes. All ten colour slots remain stable.
- High counts and large sizes intentionally make busier compositions; default sparse settings are the visual review baseline. Thin anatomy loses detail at Bold density and small phone sizes. No renderer test establishes universal subjective beauty.
- Light review preserves relative material tones and uses light-appropriate glyph weights/subcell contrast; Owl pupils/irises/beak and Cat head/eye/stripe pigment were separately corrected. All 18 desktop/phone light scenes were re-inspected after the shared sampler change; independent approval is bound to the exact final HTML hash in `CORRECTION-REVIEW.md`.
