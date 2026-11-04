// Checks this plugin's assumptions against a Hermes checkout.
//
//   node scripts/check-desktop-compat.mjs /path/to/hermes-agent
//
// Run it after a Hermes update (or in CI against a fresh checkout) to learn
// whether the plugin is still safe BEFORE users hit a problem. It reads source
// text only; it does not run Desktop.
//
// Two groups:
//   SDK    public, documented surface the whole plugin depends on. A failure
//          here means the plugin needs a fix.
//   LAYOUT app internals that only the "Chat area" placement relies on. A
//          failure here means Chat area may stop showing; "Whole window" is
//          unaffected and the plugin degrades to it without breaking anything.
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = process.argv[2];
if (!root || !existsSync(path.join(root, "apps/desktop/src"))) {
  console.error("Usage: node scripts/check-desktop-compat.mjs /path/to/hermes-agent");
  process.exit(2);
}
const src = path.join(root, "apps/desktop/src");
const read = (rel) => {
  try {
    return readFileSync(path.join(src, rel), "utf8");
  } catch {
    return "";
  }
};
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules") continue;
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|css)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}
const all = walk(src);
const anywhere = (needle) => all.some((f) => readFileSync(f, "utf8").includes(needle));

const checks = [
  ["SDK", "ctx.registerSettingsPage exists", () => read("contrib/plugin.ts").includes("registerSettingsPage")],
  ["SDK", "settings area id is 'settings.plugins' (fallback path)", () => read("contrib/settings-pages.ts").includes("SETTINGS_PLUGINS_AREA = 'settings.plugins'")],
  ["SDK", "pluginSettingsHref is exported to plugins", () => read("sdk/index.ts").includes("pluginSettingsHref")],
  ["SDK", "TITLEBAR_AREAS.right is 'titleBar.right'", () => /right:\s*'titleBar\.right'/.test(read("sdk/areas.ts"))],
  ["SDK", "PALETTE_AREA is exported", () => read("sdk/index.ts").includes("PALETTE_AREA")],
  ["SDK", "palette contributions take { id, label, keywords, run }", () => /interface PaletteContribution[\s\S]*?run:\s*\(\)\s*=>\s*void/.test(read("app/command-palette/contrib.ts") + read("app/command-palette/contrib.tsx"))],
  ["SDK", "the UI kit exports Button", () => /\bButton\b/.test(read("sdk/index.ts"))],
  ["SDK", "host.navigate exists", () => /navigate:\s*\(path: string\)/.test(read("sdk/index.ts"))],
  ["SDK", "plugin storage get/set exists", () => /PluginStorage/.test(read("contrib/plugin.ts"))],
  ["LAYOUT", "chat surface carries data-chat-surface", () => anywhere("data-chat-surface")],
  ["LAYOUT", "message list carries data-slot=\"aui_thread-viewport\"", () => anywhere('data-slot="aui_thread-viewport"') || anywhere("[data-slot='aui_thread-viewport']")],
  ["LAYOUT", "theme variable --ui-chat-surface-background is used", () => anywhere("--ui-chat-surface-background")],
  ["LAYOUT", "theme variable --ui-bg-chrome is used", () => anywhere("--ui-bg-chrome")],
];

let sdkFail = 0,
  layoutFail = 0;
for (const [group, label, test] of checks) {
  let ok = false;
  try {
    ok = test();
  } catch {
    ok = false;
  }
  if (!ok) group === "SDK" ? sdkFail++ : layoutFail++;
  console.log(`${ok ? "ok  " : "FAIL"} [${group}] ${label}`);
}
console.log(
  `\nSDK failures: ${sdkFail} (plugin needs a fix)\nLayout failures: ${layoutFail} (Chat area may stop showing; Whole window still works)`,
);
process.exit(sdkFail ? 1 : layoutFail ? 3 : 0);
