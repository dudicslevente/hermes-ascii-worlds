// Regenerates docs/images/behind-vs-front.png from the current build: the
// mock Hermes page in Chat area placement (top) and Whole window (bottom),
// with a caption. Needs the same Playwright setup as the browser tests (see
// docs/DEVELOPMENT.md). The page is a mock, not the real app, and the image says so.
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
const project = fileURLToPath(new URL("..", import.meta.url));
const harness = process.env.ASCII_WORLDS_HARNESS || project + "tests/.harness";
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
const server = createServer(async (req, res) => {
  try {
    const p = req.url.split("?")[0];
    const target = p === "/plugin.js" ? project + "desktop/plugin.js"
      : p.startsWith("/browser-deps/") ? harness + "/" + p.slice(1)
      : p === "/" ? project + "tests/fixtures/host-bg.html" : project + "tests/" + p.slice(1);
    res.setHeader("Content-Type", target.endsWith(".html") ? "text/html" : "text/javascript");
    res.end(await readFile(target));
  } catch { res.statusCode = 404; res.end("nf"); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--no-sandbox"] });
const shots = [];
for (const placement of ["behind", "front"]) {
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 560 }, colorScheme: "dark" })).newPage();
  await page.addInitScript((v) => localStorage.setItem("mock-ascii:background.v1", v), JSON.stringify({ schemaVersion: 1, enabled: true, strength: 0.5, placement }));
  await page.goto(base + "?real=1");
  await page.waitForSelector('body > div[data-ascii-worlds-bg="layer"]');
  await page.waitForTimeout(1500);
  shots.push((await page.screenshot()).toString("base64"));
  await page.close();
}
const page = await (await browser.newContext({ viewport: { width: 1000, height: 1180 }, colorScheme: "dark" })).newPage();
const cap = (t) => `<div style="font:600 15px system-ui;padding:8px 14px;background:#0b1013;color:#d7e3e7">${t}</div>`;
await page.setContent(`<body style="margin:0;background:#0b1013">${cap("Chat area: the animation shows through the chat and stops at the sidebar. Mock Hermes page, not the real app.")}<img style="display:block;width:1000px" src="data:image/png;base64,${shots[0]}">${cap("Whole window: the animation is drawn across the sidebar too, and can drift over text.")}<img style="display:block;width:1000px" src="data:image/png;base64,${shots[1]}"></body>`);
await page.waitForTimeout(300);
await writeFile(project + "docs/images/behind-vs-front.png", await page.screenshot({ fullPage: true }));
await browser.close(); server.close();
console.log("wrote docs/images/behind-vs-front.png");
