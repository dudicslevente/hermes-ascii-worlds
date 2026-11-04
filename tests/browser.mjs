import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
// Optional verifier. Supply Playwright from your own project-local tooling.
const modulePath = process.env.PLAYWRIGHT_MODULE;
if (!modulePath)
  throw Error(
    "Set PLAYWRIGHT_MODULE to an installed playwright index.mjs. No package is installed by this script.",
  );
const { chromium } = await import(pathToFileURL(modulePath));
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--no-sandbox"],
});
const evidence = new URL("../evidence/", import.meta.url);
await mkdir(evidence, { recursive: true });
const errors = [],
  requests = [];
const context = await browser.newContext({
  viewport: { width: 1000, height: 650 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
page.on("request", (r) => requests.push(r.url()));
await page.goto(
  new URL("../demo.html", import.meta.url).href +
    "?paused=true&time=12&palette=light",
);
await page.waitForFunction(() => window.asciiWorlds?.stats?.glyphs > 0);
for (const [width, height] of [
  [1000, 650],
  [320, 500],
]) {
  await page.setViewportSize({ width, height });
  await page.waitForTimeout(120);
  for (const scene of ["koi", "jellyfish"])
    for (const palette of ["light", "dark"]) {
      await page.evaluate(
        ({ scene, palette }) => {
          asciiWorlds.setSettings({
            scene,
            palette,
            density: "fine",
            paused: true,
          });
          asciiWorlds.renderAt(12);
        },
        { scene, palette },
      );
      const stats = await page.evaluate(() => asciiWorlds.stats);
      assert.ok(stats.glyphs > 50);
      assert.ok(stats.dpr <= 2);
      const before = await page
        .locator("canvas")
        .evaluate((c) => c.toDataURL());
      await page.evaluate(() => asciiWorlds.renderAt(12));
      assert.equal(
        await page.locator("canvas").evaluate((c) => c.toDataURL()),
        before,
      );
      await page.screenshot({
        path: new URL(`${scene}-${palette}-${width}.png`, evidence).pathname,
      });
    }
}
await page.evaluate(() =>
  asciiWorlds.setSettings({
    scene: "jellyfish",
    eco: true,
    speed: 1.2,
    palette: "dark",
  }),
);
await page.reload();
await page.waitForFunction(() => window.asciiWorlds?.stats?.glyphs > 0);
assert.equal(await page.evaluate(() => asciiWorlds.settings.eco), true);
await page.emulateMedia({ reducedMotion: "reduce" });
await page.reload();
await page.waitForFunction(() => window.asciiWorlds?.stats?.glyphs > 0);
assert.equal(await page.evaluate(() => asciiWorlds.settings.paused), true);
await page.emulateMedia({ reducedMotion: "no-preference" });
// Exercise actual keyboard interaction, not just programmatic settings.
await page.locator('[name="scene"]').focus();
await page.keyboard.press("Home");
await page.keyboard.press("ArrowDown");
assert.equal(
  await page.evaluate(() => asciiWorlds.settings.scene),
  "jellyfish",
);
await page.locator(".aw-pause").focus();
await page.keyboard.press("Space");
assert.equal(await page.evaluate(() => asciiWorlds.settings.paused), false);
await page.evaluate(() => {
  asciiWorlds.setSettings({ paused: false });
  asciiWorlds.resume();
});
await page.waitForTimeout(400);
const moving = await page.evaluate(() => asciiWorlds.stats.frames);
assert.ok(moving > 2);
await page.evaluate(
  () => (document.getElementById("world").style.display = "none"),
);
await page.waitForTimeout(150);
const hidden = await page.evaluate(() => asciiWorlds.stats.frames);
await page.waitForTimeout(300);
assert.equal(await page.evaluate(() => asciiWorlds.stats.frames), hidden);
await page.evaluate(
  () => (document.getElementById("world").style.display = ""),
);
// The preview now lives in a scrolling settings page, and focusing the Pause
// button above scrolled the canvas out of view. An off-screen preview rightly
// stops animating, so bring it back into view before expecting frames.
await page.evaluate(() => document.querySelector(".aw-canvas").scrollIntoView());
await page.waitForTimeout(200);
assert.ok((await page.evaluate(() => asciiWorlds.stats.frames)) > hidden);
await page.evaluate(() => {
  Object.defineProperty(document, "hidden", {
    value: true,
    configurable: true,
  });
  document.dispatchEvent(new Event("visibilitychange"));
});
const background = await page.evaluate(() => asciiWorlds.stats.frames);
await page.evaluate(() => {
  asciiWorlds.setSettings({ density: "bold" });
  asciiWorlds.renderAt(20);
});
await page.waitForTimeout(200);
assert.equal(await page.evaluate(() => asciiWorlds.stats.frames), background);
await page.evaluate(() => {
  delete document.hidden;
  document.dispatchEvent(new Event("visibilitychange"));
  asciiWorlds.resume();
});
await page.waitForTimeout(120);
const ecoStart = await page.evaluate(() => asciiWorlds.stats.frames);
await page.waitForTimeout(1000);
const ecoFrames =
  (await page.evaluate(() => asciiWorlds.stats.frames)) - ecoStart;
assert.ok(
  ecoFrames >= 3 && ecoFrames <= 13,
  `Eco rendered ${ecoFrames} frames in one second`,
);
// Rapid control changes must not bypass the eco cap while motion is running.
const interaction = await page.evaluate(async () => {
  asciiWorlds.setSettings({ paused: false, eco: true });
  asciiWorlds.resume();
  const start = performance.now(),
    frames = asciiWorlds.stats.frames;
  for (let i = 0; i < 60; i++) {
    await new Promise(requestAnimationFrame);
    asciiWorlds.setSettings({ speed: 0.5 + (i % 10) * 0.05 });
  }
  return {
    frames: asciiWorlds.stats.frames - frames,
    elapsed: performance.now() - start,
  };
});
assert.ok(
  interaction.frames <= Math.ceil((interaction.elapsed * 12) / 1000) + 2,
  `Settings changes bypassed eco cap: ${JSON.stringify(interaction)}`,
);
await page.evaluate(() => asciiWorlds.setSettings({ paused: true }));
const pausedFrames = await page.evaluate(() => asciiWorlds.stats.frames);
await page.waitForTimeout(180);
assert.equal(await page.evaluate(() => asciiWorlds.stats.frames), pausedFrames);
await page.emulateMedia({ colorScheme: "dark" });
await page.evaluate(() => asciiWorlds.setSettings({ palette: "auto" }));
assert.equal(await page.evaluate(() => asciiWorlds.stats.palette), "dark");
await page.emulateMedia({ colorScheme: "light" });
await page.waitForFunction(() => asciiWorlds.stats.palette === "light");
const colourFrames = new Set();
for (const colour of ["natural", "cyan", "ember", "mono", "custom"]) {
  await page.evaluate((colour) => {
    asciiWorlds.setSettings({ colour, tint: "#ff8844", paused: true });
    asciiWorlds.renderAt(7);
  }, colour);
  colourFrames.add(await page.locator("canvas").evaluate((c) => c.toDataURL()));
}
assert.equal(colourFrames.size, 5, "every colour mode changes rendered pixels");
// v1.1: real native controls, population bounds, hue isolation and persistence.
await page.setViewportSize({ width: 1000, height: 1000 });
await page.evaluate(() => {
  asciiWorlds.reset();
  asciiWorlds.setSettings({
    scene: "jellyfish",
    paused: true,
    palette: "dark",
  });
});
await page.locator(".aw-jelly-individual summary").click();
await page.locator('[name="jellyCount"]').selectOption("10");
await page.locator('[name="jellyColor9"]').fill("#eeaaff");
await page.locator('[name="jellyCount"]').selectOption("2");
await page.locator('[name="jellyColor0"]').fill("#ff2020");
await page.locator('[name="jellyColor1"]').fill("#20ff20");
assert.equal(await page.locator('[name="colour"]').inputValue(), "individual");
await page.evaluate(() => (document.querySelector(".aw-world").scrollTop = 0));
await page.waitForTimeout(100);
const readHues = () =>
  page.evaluate(() => {
    asciiWorlds.renderAt(12);
    const c = document.querySelector("canvas"),
      data = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let red = 0,
      green = 0,
      blue = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i],
        g = data[i + 1],
        b = data[i + 2];
      if (r > 45 && r > g * 1.8 && r > b * 1.8) red++;
      if (g > 45 && g > r * 1.8 && g > b * 1.8) green++;
      if (b > 45 && b > r * 1.8 && b > g * 1.8) blue++;
    }
    return { red, green, blue };
  });
const redGreen = await readHues();
assert.ok(redGreen.red > 50 && redGreen.green > 50, JSON.stringify(redGreen));
await page.locator('[name="jellyColor0"]').fill("#2020ff");
const blueGreen = await readHues();
assert.ok(
  blueGreen.blue > 50 && blueGreen.green > 50 && blueGreen.red === 0,
  JSON.stringify(blueGreen),
);
assert.equal(
  await page.locator('[name="jellyColor1"]').inputValue(),
  "#20ff20",
);
await page.screenshot({
  path: new URL("v1.1-individual-jellyfish.png", evidence).pathname,
});
for (const count of ["0", "1", "10", "2"]) {
  await page.locator('[name="jellyCount"]').selectOption(count);
  await page.evaluate(() => asciiWorlds.renderAt(12));
  const stats = await page.evaluate(() => asciiWorlds.stats);
  assert.equal(stats.creatures, Number(count));
  assert.equal(
    await page.locator(".aw-colour-slots input:visible").count(),
    Number(count),
  );
  if (count === "0") assert.equal(stats.glyphs, 0);
  else assert.ok(stats.glyphs > 0);
}
assert.equal(
  await page.locator('[name="jellyColor0"]').inputValue(),
  "#2020ff",
);
await page.locator('[name="scene"]').selectOption("koi");
assert.equal(await page.locator('[name="colour"]').inputValue(), "natural");
const koiFrames = new Set();
for (const mode of ["natural", "jewel", "sunset", "pastel", "forest"]) {
  await page.locator('[name="colour"]').selectOption(mode);
  await page.evaluate(() => asciiWorlds.renderAt(12));
  koiFrames.add(await page.locator("canvas").evaluate((c) => c.toDataURL()));
}
assert.equal(koiFrames.size, 5);
await page.screenshot({
  path: new URL("v1.1-forest-koi.png", evidence).pathname,
});
await page.reload();
await page.waitForFunction(() => window.asciiWorlds?.stats?.glyphs > 0);
assert.equal(await page.locator('[name="colour"]').inputValue(), "forest");
await page.locator('[name="scene"]').selectOption("jellyfish");
assert.equal(await page.locator('[name="colour"]').inputValue(), "individual");
assert.equal(
  await page.evaluate(() => asciiWorlds.settings.jellyColors[0]),
  "#2020ff",
);
assert.equal(
  await page.evaluate(() => asciiWorlds.settings.jellyColors[1]),
  "#20ff20",
);
assert.equal(await page.locator('[name="jellyCount"]').inputValue(), "2");
await page.locator(".aw-jelly-individual summary").click();
await page.locator('[name="jellyCount"]').selectOption("10");
assert.equal(
  await page.locator('[name="jellyColor9"]').inputValue(),
  "#eeaaff",
);
await page.locator('[name="jellyCount"]').selectOption("5");
await page.locator(".aw-jelly-individual summary").click();

// ---- koi population and per-fish colours ----
await page.evaluate(() => asciiWorlds.setSettings({ scene: "koi", palette: "dark", paused: true }));
assert.equal(await page.locator('[name="koiCount"]').inputValue(), "3");
assert.ok(await page.locator('[name="koiCount"]').isVisible());
assert.ok(!(await page.locator('[name="jellyCount"]').isVisible()), "jellyfish count hidden for koi");
assert.ok(!(await page.locator(".aw-jelly-individual").isVisible()));
assert.ok(await page.locator(".aw-koi-individual").isVisible());
assert.match(await page.locator(".aw-koi-individual").textContent(), /Editing a colour enables Individual mode\. Hidden slots keep their colours\. Maximum 10 to limit CPU use; fewer is smoother\./);
assert.equal(await page.locator('[name="colour"] option[value="individual"]').textContent(), "Individual colours");
assert.equal(await page.locator('[name="koiCount"] option').count(), 11);
for (const count of ["0", "1", "3", "10", "3"]) {
  await page.locator('[name="koiCount"]').selectOption(count);
  await page.evaluate(() => asciiWorlds.renderAt(12));
  const stats = await page.evaluate(() => asciiWorlds.stats);
  assert.equal(stats.creatures, Number(count));
  if (count === "0") assert.equal(stats.glyphs, 0, "empty pond draws no glyphs");
  else assert.ok(stats.glyphs > 0);
}
// Editing a picker switches to Individual and keeps the stored colours across presets.
await page.locator('[name="colour"]').selectOption("forest");
await page.locator(".aw-koi-individual summary").click();
await page.locator('[name="koiCount"]').selectOption("3");
await page.locator('[name="koiColor0"]').fill("#ff2020");
assert.equal(await page.locator('[name="colour"]').inputValue(), "individual");
await page.locator('[name="koiColor1"]').fill("#20ff20");
await page.locator('[name="koiColor2"]').fill("#2020ff");
await page.locator('[name="colour"]').selectOption("jewel");
assert.equal(await page.evaluate(() => asciiWorlds.settings.koiColors[0]), "#ff2020");
await page.locator('[name="colour"]').selectOption("individual");
const koiHues = () =>
  page.evaluate(() => {
    asciiWorlds.renderAt(12);
    const c = document.querySelector("canvas"),
      data = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    let red = 0, green = 0, blue = 0;
    const tones = new Set();
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (r > 45 && r > g * 1.8 && r > b * 1.8) red++;
      if (g > 45 && g > r * 1.8 && g > b * 1.8) green++;
      if (b > 45 && b > r * 1.8 && b > g * 1.8) blue++;
      tones.add(((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5));
    }
    return { red, green, blue, tones: tones.size };
  });
const rgb = await koiHues();
assert.ok(rgb.red > 50 && rgb.green > 50 && rgb.blue > 50, JSON.stringify(rgb));
await page.locator('[name="koiColor0"]').fill("#2020ff");
const gb = await koiHues();
assert.ok(gb.blue > rgb.blue && gb.green > 50 && gb.red < rgb.red / 4, JSON.stringify({ rgb, gb }));
// One individual koi is multi-tone, not a flat tint.
await page.locator('[name="koiCount"]').selectOption("1");
await page.locator('[name="koiColor0"]').fill("#e8553a");
const single = await koiHues();
await page.locator('[name="colour"]').selectOption("custom");
await page.locator('[name="tint"]').fill("#e8553a");
const flat = await koiHues();
assert.ok(single.tones >= flat.tones + 6, "individual koi has more tones than a flat tint " + JSON.stringify({ single, flat }));
await page.locator('[name="colour"]').selectOption("individual");
// Six individually coloured koi, dark.
await page.locator('[name="koiCount"]').selectOption("6");
const six = ["#e8553a", "#3f86d6", "#f0a93c", "#2fb59a", "#b05bd6", "#e8739a"];
for (let i = 0; i < 6; i++) await page.locator(`[name="koiColor${i}"]`).fill(six[i]);
await page.evaluate(() => { document.querySelector("#world").scrollTop = 0; asciiWorlds.renderAt(12); });
await page.waitForTimeout(100);
assert.equal(await page.locator(".aw-koi-individual .aw-colour-slots input:visible").count(), 6);
await page.screenshot({ path: new URL("v1.1-koi-individual.png", evidence).pathname });
await page.locator(".aw-koi-individual").scrollIntoViewIfNeeded();
await page.locator(".aw-controls").screenshot({ path: new URL("v1.1-settings-koi-controls.png", evidence).pathname });
await page.locator('[name="koiCount"]').selectOption("10");
const tenColors = ["#e8553a", "#3f86d6", "#f0a93c", "#2fb59a", "#b05bd6", "#e8739a", "#7ab648", "#58c0e6", "#d6c04c", "#8f78e0"];
assert.deepEqual(await page.evaluate(() => asciiWorlds.settings.koiColors), tenColors);
await page.evaluate(() => { document.querySelector("#world").scrollTop = 0; asciiWorlds.renderAt(12); });
await page.waitForTimeout(100);
await page.screenshot({ path: new URL("v1.1-koi-10.png", evidence).pathname });
// Habitat isolation and reload persistence.
await page.locator('[name="koiCount"]').selectOption("7");
await page.reload();
await page.waitForFunction(() => window.asciiWorlds?.stats?.glyphs > 0);
const afterReload = await page.evaluate(() => ({ s: asciiWorlds.settings, c: asciiWorlds.stats.creatures }));
assert.equal(afterReload.s.scene, "koi");
assert.equal(afterReload.s.koiCount, 7);
assert.equal(afterReload.s.koiColour, "individual");
assert.equal(afterReload.s.koiColors[0], "#e8553a");
assert.equal(afterReload.c, 7);
assert.equal(await page.locator('[name="koiCount"]').inputValue(), "7");
await page.locator('[name="scene"]').selectOption("jellyfish");
assert.equal(await page.locator('[name="jellyCount"]').inputValue(), "5");
assert.ok(!(await page.locator('[name="koiCount"]').isVisible()));
assert.ok(!(await page.locator(".aw-koi-individual").isVisible()));
assert.equal(await page.evaluate(() => asciiWorlds.settings.jellyColors[0]), "#2020ff");
assert.equal(await page.evaluate(() => asciiWorlds.stats.creatures), 5);
await page.locator('[name="scene"]').selectOption("koi");
assert.equal(await page.locator('[name="colour"]').inputValue(), "individual");
assert.equal(await page.evaluate(() => asciiWorlds.stats.creatures), 7);
await page.locator('[name="koiCount"]').selectOption("3");
await page.locator('[name="scene"]').selectOption("jellyfish");

for (const height of [240, 360]) {
  await page.setViewportSize({ width: 420, height });
  await page.waitForTimeout(100);
  // In the plugin the host's Settings page scrolls; in this demo the page
  // container (#world) does. Either way the content must be reachable.
  const dimensions = await page.locator("#world").evaluate((el) => {
    const art = el.querySelector(".aw-art").getBoundingClientRect();
    const controls = el.querySelector(".aw-controls").getBoundingClientRect();
    return {
      height: el.clientHeight,
      scroll: el.scrollHeight,
      artBottom: art.bottom,
      controlsTop: controls.top,
    };
  });
  assert.ok(dimensions.scroll > dimensions.height, "short panes scroll");
  assert.ok(
    dimensions.controlsTop >= dimensions.artBottom,
    "controls do not overlap art",
  );
  await page.locator('[name="colour"]').scrollIntoViewIfNeeded();
  await page.locator('[name="colour"]').selectOption("custom");
  await page.locator('[name="tint"]').fill("#ff8844");
  assert.equal(
    await page.evaluate(() => asciiWorlds.settings.colour),
    "custom",
  );
  assert.equal(await page.evaluate(() => asciiWorlds.settings.tint), "#ff8844");
  await page.locator(".aw-jelly-individual summary").click();
  await page.locator('[name="jellyCount"]').selectOption("10");
  await page.locator('[name="jellyColor9"]').scrollIntoViewIfNeeded();
  await page.locator('[name="jellyColor9"]').fill("#fdc477");
  assert.equal(
    await page.evaluate(() => asciiWorlds.settings.jellyColors[9]),
    "#fdc477",
  );
  assert.equal(
    await page.evaluate(() => asciiWorlds.settings.colour),
    "individual",
  );
  await page.locator(".aw-jelly-individual summary").click();
  await page.locator(".aw-pause").scrollIntoViewIfNeeded();
  assert.ok(await page.locator(".aw-pause").isVisible());
}
await page.evaluate(() => {
  asciiWorlds.destroy();
  asciiWorlds.destroy();
});
const disposed = await page.evaluate(() => asciiWorlds.stats);
assert.equal(disposed.disposed, true);
await page.waitForTimeout(150);
assert.equal(
  await page.evaluate(() => asciiWorlds.stats.frames),
  disposed.frames,
);
const failure = await context.newPage();
failure.on("pageerror", (e) => errors.push(e.message));
await failure.addInitScript(() => {
  HTMLCanvasElement.prototype.getContext = () => null;
});
await failure.goto(new URL("../demo.html", import.meta.url).href);
await failure.locator(".aw-fallback").waitFor({ state: "visible" });
assert.match(
  await failure.locator(".aw-fallback").textContent(),
  /2D canvas context is unavailable/,
);
await failure.close();
assert.equal(errors.length, 0);
assert.equal(requests.filter((url) => /^https?:/.test(url)).length, 0);
const result = {
  passed: true,
  ecoFrames,
  interaction,
  checks: [
    "8 baseline screenshots and 2 v1.1 screenshots",
    "native counts 0, 1, 10 and 2; zero glyphs at count zero",
    "independent jellyfish red-green then blue-green rendered pixels",
    "five distinct genuinely multicolour koi palettes",
    "koi counts 0, 1, 3, 10 report the real creature count; zero draws nothing",
    "individual koi colours render distinct hues, are multi-tone, switch the mode on edit, persist, and do not leak between habitats",
    "habitat-specific colour reload and hidden colour slot retention",
    "420x240 and 420x360 non-overlapping scrollable controls",
    "native colour and tint controls",
    "five distinct colour renderings",
    "fixed-time pixel determinism",
    "settings reload",
    "reduced-motion start paused",
    "native keyboard controls",
    "animation advances",
    "intersection hidden frame freeze",
    "visible resumes",
    "document-hidden branch with pending updates",
    "eco frame cap",
    "eco frame cap during rapid settings changes",
    "paused frame freeze",
    "automatic palette media change",
    "idempotent cleanup",
    "canvas error fallback",
    "no page errors",
    "no runtime network",
  ],
  requests,
  errors,
};
await writeFile(
  new URL("browser-results.json", evidence),
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result, null, 2));
await browser.close();
