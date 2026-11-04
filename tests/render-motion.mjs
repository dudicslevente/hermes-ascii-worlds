import { pathToFileURL } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { scenePose } from "../src/art.js";
// Deterministic frame capture: encode with ffmpeg after this script completes.
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({
  viewport: { width: 1000, height: 650 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
});
const base = new URL("../evidence/motion/", import.meta.url);
await mkdir(base, { recursive: true });
const metrics = [];
for (const scene of ["jellyfish", "koi"]) {
  const dir = new URL(scene + "/", base);
  await mkdir(dir, { recursive: true });
  await page.goto(
    new URL("../demo.html", import.meta.url).href +
      `?paused=true&scene=${scene}&palette=${scene === "koi" ? "light" : "dark"}&time=0`,
  );
  await page.waitForFunction(() => asciiWorlds.stats.glyphs > 0);
  for (let frame = 0; frame <= 200; frame++) {
    await page.evaluate((t) => asciiWorlds.renderAt(t), frame / 10);
    await page.locator("canvas").screenshot({
      path: new URL(String(frame).padStart(4, "0") + ".png", dir).pathname,
    });
  }
  for (const [width, height] of [
    [420, 700],
    [1000, 650],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(100);
    await page.evaluate(() => asciiWorlds.renderAt(5));
    await page.screenshot({
      path: new URL(`${scene}-${width}-revised.png`, base).pathname,
    });
  }
  for (let i = 0; i < (scene === "koi" ? 3 : 5); i++) {
    const poses = Array.from({ length: 301 }, (_, n) =>
      scenePose(scene, i, n / 10),
    );
    metrics.push({
      scene,
      index: i,
      xSpan:
        Math.max(...poses.map((p) => p.x)) - Math.min(...poses.map((p) => p.x)),
      ySpan:
        Math.max(...poses.map((p) => p.y)) - Math.min(...poses.map((p) => p.y)),
    });
  }
}
await writeFile(
  new URL("travel-metrics.json", base),
  JSON.stringify(metrics, null, 2),
);
await browser.close();
console.log("Captured 201 frames per scene, 0 through 20 simulation seconds.");
