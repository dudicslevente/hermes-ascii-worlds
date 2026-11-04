import { createHash } from "node:crypto";
import { drawField } from "../src/art.js";
// Records every canvas call so a hash pins geometry, gradients and colours.
export function recordField(width, height, scene, time, settings) {
  const calls = [];
  const gradient = {
    addColorStop(...a) {
      calls.push(["stop", ...a]);
    },
  };
  const ctx = new Proxy(
    {},
    {
      set(o, k, v) {
        calls.push([k, typeof v === "object" ? "gradient" : v]);
        o[k] = v;
        return true;
      },
      get(o, k) {
        if (k in o) return o[k];
        return (...a) => {
          calls.push([k, ...a]);
          return k.startsWith("create") ? gradient : undefined;
        };
      },
    },
  );
  drawField(ctx, width, height, scene, time, settings);
  return calls;
}
export const hashCalls = (calls) =>
  createHash("sha256").update(JSON.stringify(calls)).digest("hex").slice(0, 16);
export const GOLDEN_CASES = [];
for (const [w, h] of [[320, 500], [1000, 600]])
  for (const t of [0, 12, 40.5])
    for (const colour of [undefined, "natural", "jewel", "sunset", "pastel", "forest", "cyan"])
      GOLDEN_CASES.push({ w, h, t, colour });
