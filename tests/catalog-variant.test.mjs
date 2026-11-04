import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const root = new URL("..", import.meta.url).pathname;

test("catalog build leaves out everything that touches the app's own markup", () => {
  const out = path.join(mkdtempSync(path.join(tmpdir(), "aw-catalog-")), "plugin.js");
  execFileSync("node", ["scripts/build.mjs", "--catalog", "--out", out], { cwd: root });
  const code = readFileSync(out, "utf8");
  for (const forbidden of [
    "data-chat-surface",
    "aui_thread-viewport",
    "--ui-chat-surface-background",
    "--ui-bg-chrome",
    "@chat-area:",
    "chat-area:begin",
  ])
    assert.ok(!code.includes(forbidden), `catalog build still contains ${forbidden}`);
  assert.match(code, /const CHAT_AREA = false;/);
  assert.match(code, /Whole window only/);
});

test("the full build keeps both placements", (t) => {
  const full = readFileSync(path.join(root, "desktop/plugin.js"), "utf8");
  // On the generated `catalog` branch the committed bundle is the catalog build.
  if (full.split("\n")[0].includes("Whole window only")) return t.skip("this checkout holds the catalog build");
  assert.match(full, /const CHAT_AREA = true;/);
  assert.ok(full.includes("name=\"bgPlacement\"") && full.includes("data-chat-surface"));
});
