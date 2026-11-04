import test from "node:test";
import assert from "node:assert/strict";
import { recordField } from "./koi-golden.helper.mjs";

// The creatures must change shape as they swim, not just move and turn.

const calls = (scene, time, extra = {}) =>
  recordField(1000, 700, scene, time, { koiCount: 1, jellyCount: 1, ...extra });

// The koi outline is the first closed polygon drawn in the fish's own frame.
function koiOutline(time) {
  const out = [];
  let started = false;
  for (const [name, ...a] of calls("koi", time)) {
    if (name === "clip") break;
    if (name === "moveTo" || name === "lineTo") {
      if (name === "moveTo") out.length = 0;
      out.push(a);
    }
    if (name === "closePath") started = true;
  }
  assert.ok(started && out.length > 60, "found the body outline");
  return out;
}

test("koi body bends and the tail swings as time passes", () => {
  // Compare the outline's sideways offsets at points along the body, at
  // times well inside one swim cycle. A rigid fish would have identical
  // outlines at every time because pose only translates and rotates it.
  const a = koiOutline(20), b = koiOutline(20.25), c = koiOutline(20.5);
  const sideways = (o) => o.map((p) => p[1]);
  const spread = (x, y) => Math.max(...x.map((v, i) => Math.abs(v - y[i])));
  const length = Math.max(...a.map((p) => Math.abs(p[0]))) * 2;
  assert.ok(spread(sideways(a), sideways(b)) > length * 0.02, "body shape changes between frames");
  assert.ok(spread(sideways(b), sideways(c)) > length * 0.02, "and keeps changing");
  // The head stays calm while the tail moves more.
  const head = (o) => o[Math.floor(o.length * 0.02)][1];
  const tail = (o) => o[Math.floor(o.length * 0.24)][1];
  const headMove = Math.abs(head(a) - head(b)), tailMove = Math.abs(tail(a) - tail(b));
  assert.ok(tailMove > headMove, "tail swings more than the head");
});

test("koi tail fin turns with the tail instead of staying fixed", () => {
  // The fin is drawn under a rotation about the tail root.
  const rotations = (time) => calls("koi", time).filter(([n]) => n === "rotate").map(([, r]) => r);
  const finAngles = new Set();
  for (const t of [20, 20.2, 20.4, 20.6, 20.8, 21]) {
    const r = rotations(t);
    // the first rotate is the fish's heading; the later ones belong to parts
    r.slice(1).forEach((v) => finAngles.add(Math.round(v * 1000)));
  }
  assert.ok(finAngles.size > 4, "tail fin angle varies over time: " + finAngles.size);
});

test("jellyfish bell pulses and tentacles trail", () => {
  const scales = (time) => calls("jellyfish", time).filter(([n]) => n === "scale").map(([, x, y]) => [x, y]);
  const seen = [];
  for (let t = 0; t < 4; t += 0.2) {
    const s = scales(t);
    assert.ok(s.length >= 1, "bell scale is applied");
    seen.push(s[0][0]);
  }
  const spread = Math.max(...seen) - Math.min(...seen);
  assert.ok(spread > 0.15, "bell width changes by more than 15 percent over a pulse: " + spread);
  assert.ok(Math.max(...seen) < 1.12 && Math.min(...seen) > 0.8, "pulse stays within a believable range");
  // Tentacle strands change shape too.
  const strand = (time) =>
    calls("jellyfish", time).filter(([n]) => n === "lineTo").slice(0, 90).map(([, x, y]) => y);
  const a = strand(3), b = strand(3.4);
  assert.ok(Math.max(...a.map((v, i) => Math.abs(v - b[i]))) > 1, "tentacles move relative to the bell");
});
