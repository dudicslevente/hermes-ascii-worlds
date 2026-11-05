import {
  gridSize,
  stableHash,
  resolvePalette,
  frameCap,
  normalizeSettings,
} from "./settings.js";
import { drawField } from "./art.js";
import { normalizeWorldSettings, advanceClocks } from './settings-v3.js';
import { sceneById } from './lab/scenes/registry.js';
import { createRenderer as createLabRenderer } from './lab/core/engine.js';
import { beatFromTravel } from './lab/core/settings.js';

// A single active sampler per canvas. The original renderer below is kept
// unchanged; switching renderer families releases the previous field canvas.
export function createSceneRenderer(canvas, initial, options = {}) {
  let current=null, family=null, width=1, height=1, dpr=1, disposed=false;
  const stats={frames:0,glyphs:0};
  return {
    stats,
    resize(w,h,p=1) { if(disposed)return; width=w;height=h;dpr=p;current?.resize(w,h,p); },
    render(t,raw,dark=true,b) {
      if(disposed)return;
      const s=normalizeWorldSettings(raw), def=sceneById(s.scene), next=def?'lab':'legacy';
      if(family!==next) { current?.destroy();current=def?createLabRenderer(canvas,options):createRenderer(canvas,options);family=next;current.resize(width,height,dpr); }
      if(def) current.render(def,s.scenes[s.scene],t,b??beatFromTravel(t,s.speed),dark);
      else current.render(t,s,dark);
      Object.assign(stats,current.stats,{frames:stats.frames+1,scene:s.scene,creatures:def?s.count:(s.scene==='koi'?s.koiCount:s.jellyCount),palette:dark?'dark':'light'});
    },
    destroy() { if(disposed)return;disposed=true;current?.destroy();stats.disposed=true; }
  };
}

export function createRenderer(canvas, options = {}) {
  // Background mode draws glyphs on a transparent canvas so only the art, not
  // a pond-coloured slab, is blended over the host page.
  const transparent = Boolean(options.transparent);
  const ctx = canvas.getContext("2d", { alpha: transparent });
  const field = document.createElement("canvas");
  const sample = field.getContext("2d", { willReadFrequently: true });
  if (!ctx || !sample) throw new Error("A 2D canvas context is unavailable.");
  let width = 1,
    height = 1,
    dpr = 1;
  const pigmentStyles = new Map();
  const stats = {
    frames: 0,
    glyphs: 0,
    cols: 0,
    rows: 0,
    width: 1,
    height: 1,
    dpr: 1,
    time: 0,
  };
  function resize(w, h, pixelRatio = 1) {
    // Bound backing-store memory even on very large monitors and high-DPR displays.
    width = Math.max(1, Math.min(1800, Math.round(w)));
    height = Math.max(1, Math.min(1400, Math.round(h)));
    dpr = Math.max(
      1,
      Math.min(2, pixelRatio || 1, Math.sqrt(4000000 / (width * height))),
    );
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    Object.assign(stats, { width, height, dpr });
  }
  function render(time, rawSettings, dark = true) {
    const settings = normalizeSettings(rawSettings),
      palette = resolvePalette(settings.palette, dark);
    const { cols, rows } = gridSize(width, height, settings.density);
    const cellW = width / cols,
      cellH = height / rows,
      scale = 2;
    if (field.width !== cols * scale || field.height !== rows * scale) {
      field.width = cols * scale;
      field.height = rows * scale;
    }
    sample.setTransform(1, 0, 0, 1, 0, 0);
    sample.clearRect(0, 0, field.width, field.height);
    sample.setTransform(field.width / width, 0, 0, field.height / height, 0, 0);
    drawField(sample, width, height, settings.scene, time, settings);
    const pixels = sample.getImageData(0, 0, field.width, field.height).data;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg =
      palette === "light"
        ? settings.scene === "koi"
          ? "#f3f0e6"
          : "#e9eef0"
        : settings.scene === "koi"
          ? "#111b1d"
          : "#080e18";
    ctx.globalAlpha = 1;
    if (transparent) ctx.clearRect(0, 0, width, height);
    else {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.font = `600 ${cellH * 0.94}px ui-monospace, SFMono-Regular, Consolas, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const glyphs = ".:;-=+*ox%#@";
    const koiScene = settings.scene === "koi";
    const pigment = palette === "light" ? (koiScene ? 0.76 : 0.53) : 1;
    const customTint =
      settings.colour === "custom"
        ? [1, 3, 5].map((n) => parseInt(settings.tint.slice(n, n + 2), 16))
        : settings.colour === "mono"
          ? [220, 227, 230]
          : settings.colour === "ember"
            ? [255, 155, 77]
            : null;
    const recolour = ["cyan", "ember", "mono", "custom"].includes(
      settings.colour,
    );
    let count = 0;
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++) {
        const hash = stableHash(col, row),
          x = col * cellW,
          y = row * cellH;
        // Sample the entire supersampled footprint, not only its center: a thin
        // strand now survives glyph conversion while preserving its hue.
        let best = 0,
          bestScore = 0,
          sum = 0,
          p = 0;
        for (let sy = 0; sy < scale; sy++)
          for (let sx = 0; sx < scale; sx++) {
            const at =
              ((row * scale + sy) * field.width + col * scale + sx) * 4;
            const a = pixels[at + 3];
            sum += a;
            // Byte-domain scoring retains the same sample ordering without
            // divisions in the sample hot loop.
            const score = koiScene
              ? a
              : a * (255 + pixels[at] + pixels[at + 1] + pixels[at + 2]);
            if (a > best) best = a;
            if (score > bestScore) {
              bestScore = score;
              p = at;
            }
          }
        const alpha = (best * 0.6 + sum * (0.4 / (scale * scale))) / 255;
        if (alpha > 0.07) {
          let r = pixels[p],
            g = pixels[p + 1],
            b = pixels[p + 2];
          const luminance = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
          if (recolour) {
            const tint =
              customTint || (b > g ? [191, 160, 255] : [95, 235, 248]);
            const shade = 0.35 + luminance * 0.8;
            r = tint[0] * shade;
            g = tint[1] * shade;
            b = tint[2] * shade;
          }
          r = Math.min(255, Math.round(r * pigment));
          g = Math.min(255, Math.round(g * pigment));
          b = Math.min(255, Math.round(b * pigment));
          const lift =
            palette === "dark" &&
            settings.scene === "koi" &&
            Math.max(r, g, b) < 85
              ? 35
              : 0;
          r += lift;
          g += lift;
          b += lift;
          const key = (r << 16) | (g << 8) | b;
          let ink = pigmentStyles.get(key);
          if (!ink) {
            if (pigmentStyles.size >= 4096) pigmentStyles.clear();
            ink = `rgb(${r},${g},${b})`;
            pigmentStyles.set(key, ink);
          }
          ctx.fillStyle = ink;
          ctx.globalAlpha = alpha * 0.18;
          ctx.fillRect(x + 0.3, y + 0.3, cellW - 0.6, cellH - 0.6);
          // Density follows illumination and coverage. A tiny stable variation
          // avoids posterized bands without frame-randomized sparkle.
          const level = Math.min(
            glyphs.length - 1,
            Math.floor(
              (settings.scene === "koi"
                ? alpha * 0.8 + (1 - luminance) * 0.2
                : alpha * 0.3 + luminance * 0.7) *
                10 +
                (hash % 2),
            ),
          );
          ctx.globalAlpha = Math.min(1, alpha * 1.5 + 0.18);
          ctx.fillText(glyphs[level], x + cellW / 2, y + cellH / 2);
          count++;
        } else if (hash % 29 === 0) {
          ctx.globalAlpha = 1;
          ctx.fillStyle =
            palette === "light" ? "rgba(66,86,82,.1)" : "rgba(128,170,180,.1)";
          ctx.fillText(".", x + cellW / 2, y + cellH / 2);
        }
      }
    ctx.globalAlpha = 1;
    Object.assign(stats, {
      frames: stats.frames + 1,
      glyphs: count,
      creatures: koiScene ? settings.koiCount : settings.jellyCount,
      cols,
      rows,
      time,
      palette,
    });
  }
  return {
    resize,
    render,
    stats,
    destroy() {
      pigmentStyles.clear();
      field.width = field.height = 1;
      canvas.width = canvas.height = 1;
    },
  };
}

// options.hosted: the caller guarantees the canvas is on screen (a fixed
// full-window layer), so no IntersectionObserver is created and the engine is
// marked visible from the start. options.transparent: see createRenderer.
export function createEngine(
  canvas,
  initialSettings,
  onError = () => {},
  options = {},
) {
  const renderer = createSceneRenderer(canvas, initialSettings, options),
    media = matchMedia("(prefers-color-scheme: dark)");
  // options.isDark lets a host say whether the surface behind the canvas is
  // dark (the background layer follows the Hermes theme). Without it the
  // operating system's colour scheme decides, as before.
  const isDark = () => (options.isDark ? options.isDark() : media.matches);
  let settings = normalizeWorldSettings(initialSettings),
    disposed = false,
    visible = Boolean(options.hosted);
  let frame = 0,
    themeTimer = 0,
    lastDark = null,
    last = null,
    lastDraw = -Infinity,
    time = 0,
    beat = 0,
    dirty = true;
  let size = { width: 1, height: 1 },
    manual = false;
  const stats = renderer.stats;
  const allowed = () =>
    !disposed &&
    visible &&
    !document.hidden &&
    size.width > 0 &&
    size.height > 0;
  function cancel() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    if (themeTimer) clearTimeout(themeTimer);
    themeTimer = 0;
    last = null;
  }
  // No SDK theme event is required: inspect only our own theme probe, at most
  // once per 1.1s for a visible still. Moving frames already read that probe.
  // Hidden/offscreen/disposed canvases own no timer; no host DOM observation.
  function watchTheme() {
    if (themeTimer || !options.isDark || !allowed() || (!settings.paused && !manual)) return;
    themeTimer = setTimeout(() => {
      themeTimer = 0;
      if (!allowed()) return;
      try {
        if (isDark() !== lastDark) {
          dirty = true;
          sync();
        } else watchTheme();
      } catch (error) {
        manual = true;
        onError(error);
      }
    }, 1100);
  }
  function paint() {
    if (!allowed()) return;
    renderer.resize(size.width, size.height, devicePixelRatio);
    lastDark = isDark();
    renderer.render(time, settings, lastDark, beat);
    dirty = false;
    lastDraw = performance.now();
  }
  function tick(now) {
    frame = 0;
    if (!allowed() || settings.paused || manual) return;
    if (last !== null) {
      const clocks = advanceClocks(time, beat, (now-last)/1000, settings.speed);
      time=clocks.time;beat=clocks.beat;
    }
    last = now;
    try {
      if (now - lastDraw >= 1000 / frameCap(settings.eco)) {
        if (
          dirty ||
          (stats.dpr !== Math.min(2, devicePixelRatio) &&
            size.width * size.height < 1000000)
        )
          renderer.resize(size.width, size.height, devicePixelRatio);
        lastDark = isDark();
        renderer.render(time, settings, lastDark, beat);
        dirty = false;
        // Retain the frame phase. Resetting it to every RAF timestamp drops
        // a nominal 30 fps cap toward 20 fps when timestamps have small jitter.
        const interval = 1000 / frameCap(settings.eco);
        lastDraw = now - ((now - lastDraw) % interval);
      }
      frame = requestAnimationFrame(tick);
    } catch (error) {
      cancel();
      manual = true;
      onError(error);
    }
  }
  function sync() {
    cancel();
    if (!allowed()) return;
    try {
      if (dirty) paint();
    } catch (error) {
      manual = true;
      onError(error);
      return;
    }
    if (!settings.paused && !manual) frame = requestAnimationFrame(tick);
    else watchTheme();
  }
  const resizeObserver = new ResizeObserver((entries) => {
    const rect = entries[0]?.contentRect;
    if (!rect) return;
    size = { width: rect.width, height: rect.height };
    dirty = true;
    sync();
  });
  const intersectionObserver = options.hosted
    ? null
    : new IntersectionObserver((entries) => {
        visible = Boolean(entries[0]?.isIntersecting);
        dirty = true;
        sync();
      });
  const visibility = () => {
    dirty = true;
    sync();
  };
  const scheme = () => {
    dirty = true;
    sync();
  };
  resizeObserver.observe(canvas);
  intersectionObserver?.observe(canvas);
  document.addEventListener("visibilitychange", visibility);
  media.addEventListener("change", scheme);
  return {
    stats,
    update(value) {
      if (disposed) return;
      const next=normalizeWorldSettings(value);
      if(next.scene!==settings.scene && (sceneById(next.scene)||sceneById(settings.scene))) {time=0;beat=0;last=null;}
      settings = next;
      if (!settings.paused && !manual && themeTimer) {
        clearTimeout(themeTimer);
        themeTimer = 0;
      }
      dirty = true;
      // Coalesce moving controls into the capped clock instead of painting for
      // every input event. Paused or fixed-time views still repaint once.
      if (!allowed() || settings.paused || manual) {
        sync();
        return;
      }
      if (!frame) {
        last = null;
        frame = requestAnimationFrame(tick);
      }
    },
    // Explicit fixed-time rendering disables the animation clock until resume().
    renderAt(value, beatValue) {
      if (disposed) return;
      time = Math.max(0, Number(value) || 0);
      beat = beatValue===undefined ? beatFromTravel(time,settings.speed) : Math.max(0,Number(beatValue)||0);
      manual = true;
      dirty = true;
      sync();
      return { ...stats };
    },
    resume() {
      if (disposed) return;
      manual = false;
      sync();
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      cancel();
      resizeObserver.disconnect();
      intersectionObserver?.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      media.removeEventListener("change", scheme);
      renderer.destroy();
      stats.disposed = true;
    },
  };
}
