import { pathToFileURL } from "node:url";
import { writeFile } from "node:fs/promises";

if (!process.env.PLAYWRIGHT_MODULE) {
  throw new Error("Set PLAYWRIGHT_MODULE to an existing Playwright index.mjs.");
}
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--no-sandbox"],
});
const measurements = [];
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const width of [420, 1000]) {
    for (const [scene, koiCount] of [
      ["jellyfish", 0],
      ["koi", 3],
      ["koi", 10],
    ]) {
      await page.setViewportSize({ width, height: 700 });
      await page.goto(
        new URL("../demo.html", import.meta.url).href +
          `?scene=${scene}&palette=dark&paused=false`,
      );
      await page.waitForFunction(() => asciiWorlds.stats?.glyphs > 0);
      await page.evaluate((koiCount) => {
        asciiWorlds.setSettings({
          eco: false,
          paused: false,
          density: "fine",
          ...(koiCount ? { koiCount } : {}),
        });
        asciiWorlds.resume();
      }, koiCount);
      await page.waitForTimeout(300);
      const start = await page.evaluate(() => ({
        frames: asciiWorlds.stats.frames,
        now: performance.now(),
      }));
      await page.waitForTimeout(2000);
      const end = await page.evaluate(() => ({
        frames: asciiWorlds.stats.frames,
        now: performance.now(),
        stats: asciiWorlds.stats,
      }));
      // Uncapped cost of one frame: render the same scene repeatedly.
      const renderMs = await page.evaluate(() => {
        asciiWorlds.setSettings({ paused: true });
        asciiWorlds.renderAt(5);
        const t0 = performance.now();
        for (let i = 0; i < 30; i++) asciiWorlds.renderAt(5 + i * 0.1);
        return (performance.now() - t0) / 30;
      });
      measurements.push({
        width,
        scene,
        koiCount: scene === "koi" ? koiCount : undefined,
        renderMsPerFrame: Math.round(renderMs * 100) / 100,
        frames: end.frames - start.frames,
        elapsedMs: end.now - start.now,
        observedFps:
          ((end.frames - start.frames) * 1000) / (end.now - start.now),
        artWidth: end.stats.width,
        artHeight: end.stats.height,
      });
    }
  }
} finally {
  await browser.close();
}
const result = {
  environment:
    "Headless Linux Chromium, DPR 1, two-second samples. Not Mac battery or live Desktop benchmarks.",
  measurements,
};
await writeFile(
  new URL("../evidence/parent-timing.json", import.meta.url),
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result, null, 2));
