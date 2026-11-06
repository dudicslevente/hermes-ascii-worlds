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

test("the full README keeps its chat-area and catalog markers", (t) => {
  // scripts/catalog-readme.mjs rewrites README.md in place, so running it on
  // main by accident would silently delete the Chat area documentation.
  const full = readFileSync(path.join(root, "desktop/plugin.js"), "utf8");
  if (full.split("\n")[0].includes("Whole window only"))
    return t.skip("this checkout holds the catalog build");
  const readme = readFileSync(path.join(root, "README.md"), "utf8");
  const begins = (readme.match(/<!-- chat-area:begin -->/g) || []).length;
  const ends = (readme.match(/<!-- chat-area:end -->/g) || []).length;
  assert.ok(begins >= 1 && begins === ends, `chat-area markers: ${begins} begin, ${ends} end`);
  assert.ok(/<!-- catalog:/.test(readme), "catalog-only text is present");
});

test("the catalog README has no chat-area text and shows the catalog install line", () => {
  const source = readFileSync(path.join(root, "README.md"), "utf8");
  // Apply the same two rewrites as scripts/catalog-readme.mjs, on a copy.
  let text = source.replace(/<!-- chat-area:begin -->.*?<!-- chat-area:end -->\n/gs, "");
  text = text.replace(/<!-- catalog:\s*(.*?)\s*-->/gs, "$1");
  if (!source.includes("<!-- catalog:")) return; // already the catalog README
  assert.ok(!/Chat area/.test(text), "no Chat area text remains");
  assert.ok(text.includes("hermes plugins install ascii-worlds"));
  assert.ok(!text.includes("<!--"));
});
