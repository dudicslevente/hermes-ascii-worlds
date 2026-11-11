// Glyph renderer and animation loop. The vector field a scene paints is never
// shown: it is sampled into monospace glyph cells, following the mechanism of
// the reference ASCII Worlds engine (MIT, see reference/). Differences from the
// reference: scenes are plugged in through a registry contract, ink is
// contrast-adjusted for both a light and a dark review surface, two clocks
// separate travel from articulation, and a count of zero draws nothing at all.
import { gridSize, frameCap, beatFromTravel, beatRate } from "./settings.js";
import { resolveKit } from "./palettes.js";
import { hash32, hexToRgb } from "./util.js";
import { depthOf, atmosphereFor, atmosphereFlecks, atmosphereInk, atmosphereGlyphs } from "./depth.js";
import { moonCells, seasonalKind } from "./sky.js";

export const GLYPHS = ".:;-=+*ox%#@";
// Moon disc, dim (earthshine) to bright: lighter, rounder glyphs than the art.
const MOON_GLYPHS = ".:-=+*o%#@";
export const BACKDROPS = Object.freeze({ dark: "#0f1214", light: "#f1ede4" });
const MAX_W = 1800,
  MAX_H = 1400;

const lumaOf = (r, g, b) => (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;

// The state object a scene draws from. See docs/SCENE-API.md.
const depthAmount = (settings) => {
  const d = settings && settings.depth;
  return typeof d === "number" && Number.isFinite(d) ? Math.max(0, Math.min(1, d)) : 0;
};

export function buildState(def, settings, t, b, width, height, dark, layers = null, memo = null) {
  return {
    t,
    b,
    w: width,
    h: height,
    min: Math.min(width, height),
    dark,
    count: settings.count,
    size: settings.size,
    flow: settings.flow,
    speed: settings.speed,
    extra: settings.extras || {},
    // Depth amount in [0, 1]; 0 is the single-plane 1.2.0 look.
    depth: depthAmount(settings),
    depthOf: (i) => depthOf(i, depthAmount(settings)),
    // A scene draws a far/near creature into S.layer(name); see depth.js.
    // Without a layered renderer every layer is the scene's own context.
    layer: layers ? (name) => layers(name) : () => null,
    // Per-renderer scratch for stateful helpers such as flockAt(). Cleared
    // whenever the scene changes; never shared between canvases.
    memo,
    kit: (i) => resolveKit(def, settings, i),
    r: (i, k = 0) => hash32(i, k, 77) / 4294967296,
  };
}

export function createRenderer(canvas, options = {}) {
  const ctx = canvas.getContext("2d", { alpha: Boolean(options.transparent) });
  const field = document.createElement("canvas");
  const sample = field.getContext("2d", { willReadFrequently: true });
  if (!ctx || !sample) throw new Error("A 2D canvas context is unavailable.");
  let width = 1,
    height = 1,
    dpr = 1,
    rows_text = null;
  const inkCache = new Map();
  const stats = {
    frames: 0,
    glyphs: 0,
    cols: 0,
    rows: 0,
    width: 1,
    height: 1,
    dpr: 1,
    time: 0,
    beat: 0,
    scene: null,
    pattern: 0,
    cx: 0,
    cy: 0,
    tone: "dark",
  };
  function resize(w, h, pixelRatio = 1) {
    width = Math.max(1, Math.min(MAX_W, Math.round(w)));
    height = Math.max(1, Math.min(MAX_H, Math.round(h)));
    dpr = Math.max(1, Math.min(2, pixelRatio || 1, Math.sqrt(4000000 / (width * height))));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    Object.assign(stats, { width, height, dpr });
  }
  // Extra layers are allocated on first use and kept; a scene that never asks
  // for one never pays for it. "mid" is always the scene's own field.
  const extra = new Map();
  let memo = {},
    memoScene = null;
  function layerContext(name) {
    let L = extra.get(name);
    if (!L) {
      const c = document.createElement("canvas");
      const x = c.getContext("2d", { willReadFrequently: true });
      if (!x) return null;
      L = { canvas: c, ctx: x, used: false };
      extra.set(name, L);
    }
    return L;
  }
  // Glyph treatment per layer. Far art is faded towards the backdrop, drawn
  // with the light half of the ramp and a fainter cell wash, so it reads as
  // distance rather than as a second, competing scene.
  const FAR = { fade: 0.36, glyphAlpha: 0.82, wash: 0.5, ramp: 0.82, maxLevel: 8 };
  // render(def, settings, travelTime, beatTime, dark, sky)
  // sky (optional) comes from sky.js skyState(): the date's season and the
  // moon (null when hidden). It never changes the scene's own colours.
  function render(def, settings, t, b, dark = true, sky = null) {
    const { cols, rows } = gridSize(width, height, settings.density);
    const cellW = width / cols,
      cellH = height / rows,
      scale = 2;
    const backdrop = (def.backdrop && def.backdrop[dark ? "dark" : "light"]) || BACKDROPS[dark ? "dark" : "light"];
    const bg = hexToRgb(backdrop),
      bgL = lumaOf(bg[0], bg[1], bg[2]);
    // Lift dark ink on dark surfaces. On light surfaces use a monotonic
    // exposure reduction, not a ceiling: clamping different materials to the
    // same luminance erased faces, feather rims and shell/wing markings.
    const minL = dark ? Math.min(0.58, bgL + 0.4) : 0,
      lightScale = Math.max(0.35, Math.min(0.62, bgL - 0.3));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    if (options.transparent) ctx.clearRect(0, 0, width, height);
    else { ctx.fillStyle = backdrop; ctx.fillRect(0, 0, width, height); }
    if (field.width !== cols * scale || field.height !== rows * scale) {
      field.width = cols * scale;
      field.height = rows * scale;
    }
    sample.setTransform(1, 0, 0, 1, 0, 0);
    sample.clearRect(0, 0, field.width, field.height);
    const fieldT = [field.width / width, 0, 0, field.height / height, 0, 0];
    const depth = typeof settings.depth === "number" && Number.isFinite(settings.depth) ? Math.max(0, Math.min(1, settings.depth)) : 0;
    const layered = depth > 0;
    for (const L of extra.values()) L.used = false;
    // Hand out a cleared layer, sized and transformed like the main field.
    const acquire = (name) => {
      if (name !== "far" && name !== "near") return sample;
      const L = layerContext(name);
      if (!L) return sample;
      if (!L.used) {
        if (L.canvas.width !== field.width || L.canvas.height !== field.height) {
          L.canvas.width = field.width;
          L.canvas.height = field.height;
        }
        L.ctx.setTransform(1, 0, 0, 1, 0, 0);
        L.ctx.globalAlpha = 1;
        L.ctx.clearRect(0, 0, field.width, field.height);
        L.ctx.setTransform(...fieldT);
        L.used = true;
      }
      return L.ctx;
    };
    // Atmosphere: a sparse map from cell index to the brightest fleck in it.
    let flecks = null;
    // Count zero draws no scene art at all, whatever a scene would add.
    if (settings.count > 0) {
      if (layered) {
        const kind = seasonalKind(atmosphereFor(def), sky);
        for (const f of atmosphereFlecks(width, height, t, kind, depth)) {
          const c = Math.min(cols - 1, Math.floor(f.x / cellW)),
            r = Math.min(rows - 1, Math.floor(f.y / cellH));
          const at = r * cols + c;
          flecks ||= new Map();
          const prev = flecks.get(at);
          if (!prev || prev.a < f.a) flecks.set(at, f);
        }
        if (flecks) {
          flecks.ink = hexToRgb(atmosphereInk(kind, dark));
          flecks.glyphs = atmosphereGlyphs(kind);
          // Seasonal air is meant to be noticed; the base atmospheres are not.
          flecks.boost = kind === "snowfall" || kind === "leaves" || kind === "blossom" ? 1.4 : 1;
        }
      }
      sample.save();
      sample.setTransform(...fieldT);
      if (memoScene !== def.id) {
        memo = {};
        memoScene = def.id;
      }
      def.draw(sample, width, height, buildState(def, settings, t, b, width, height, dark, layered ? acquire : null, memo));
      sample.restore();
    }
    // Moon: shaded glyph cells behind the art (and in front of the stars of
    // the night sky, which are farther away than the moon).
    let moon = null;
    if (settings.count > 0 && sky) {
      const cells = moonCells(sky, def, cols, rows, cellW, cellH, width, height);
      if (cells.length) {
        moon = new Map();
        for (const m of cells) moon.set(m.row * cols + m.col, m);
        moon.ink = hexToRgb(dark ? "#eef2fb" : "#4b566e");
        moon.front = def.id === "night-sky";
      }
    }
    // Near art uses the same glyph treatment as mid, so it is composited onto
    // the main field (drawn over, which hides what is behind it) instead of
    // being read back separately. Only far art needs its own pass.
    const near = extra.get("near"),
      far = extra.get("far");
    if (near && near.used) {
      sample.save();
      sample.setTransform(1, 0, 0, 1, 0, 0);
      sample.globalAlpha = 1;
      sample.globalCompositeOperation = "source-over";
      sample.drawImage(near.canvas, 0, 0);
      sample.restore();
    }
    const pixels = sample.getImageData(0, 0, field.width, field.height).data;
    const farPx = far && far.used ? far.ctx.getImageData(0, 0, field.width, field.height).data : null;
    ctx.font = `600 ${cellH * 0.94}px ui-monospace, SFMono-Regular, Menlo, Consolas, "DejaVu Sans Mono", monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const coverageShading = def.shading === "coverage";
    const strength = settings.strength;
    const capture = options.captureText;
    if (capture) rows_text = [];
    const fw = field.width;
    // Sample one cell's 2x2 footprint of a layer. Returns its alpha and leaves
    // the chosen (contrast-preserving) sub-pixel offset in `pick`.
    let pick = 0;
    function cellAlpha(px, col, row) {
      let best = 0,
        bestScore = 0,
        sum = 0,
        p = 0;
      for (let yy = 0; yy < scale; yy++)
        for (let xx = 0; xx < scale; xx++) {
          const at = ((row * scale + yy) * fw + col * scale + xx) * 4;
          const a = px[at + 3];
          sum += a;
          const rgbSum = px[at] + px[at + 1] + px[at + 2];
          // Preserve the contrasting stroke, not just the palest subpixel.
          const score = a * (dark ? 255 + rgbSum : 1020 - rgbSum);
          if (a > best) best = a;
          if (score > bestScore) {
            bestScore = score;
            p = at;
          }
        }
      pick = p;
      return (best * 0.6 + sum * (0.4 / (scale * scale))) / 255;
    }
    let atmosphere = 0,
      moonCount = 0;
    let count = 0,
      farCount = 0,
      pattern = 0,
      sx = 0,
      sy = 0,
      sw = 0;
    for (let row = 0; row < rows; row++) {
      let line = capture ? "" : null;
      for (let col = 0; col < cols; col++) {
        const hash = hash32(col, row);
        const x = col * cellW,
          y = row * cellH;
        let px = pixels,
          tier = 1,
          alpha = cellAlpha(pixels, col, row);
        const lunar = moon && moon.get(row * cols + col);
        if (lunar && moon.front && !lunar.halo) alpha = 0;
        if (alpha <= 0.07 && farPx) {
          const fa = cellAlpha(farPx, col, row);
          if (fa > 0.07) { px = farPx; tier = 0; alpha = fa; }
        }
        const p = pick;
        if (alpha > 0.07) {
          let r = px[p],
            g = px[p + 1],
            bl = px[p + 2];
          const lum = lumaOf(r, g, bl);
          if (dark && lum < minL) {
            const k = (minL - lum) / (1 - lum + 1e-6);
            r += (255 - r) * k;
            g += (255 - g) * k;
            bl += (255 - bl) * k;
          } else if (!dark) {
            r *= lightScale;
            g *= lightScale;
            bl *= lightScale;
          }
          if (tier === 0) {
            // Aerial perspective: distant ink sinks towards the backdrop.
            r += (bg[0] - r) * FAR.fade;
            g += (bg[1] - g) * FAR.fade;
            bl += (bg[2] - bl) * FAR.fade;
          }
          r = Math.round(r);
          g = Math.round(g);
          bl = Math.round(bl);
          const key = (r << 16) | (g << 8) | bl;
          let ink = inkCache.get(key);
          if (!ink) {
            if (inkCache.size >= 4096) inkCache.clear();
            ink = `rgb(${r},${g},${bl})`;
            inkCache.set(key, ink);
          }
          ctx.fillStyle = ink;
          ctx.globalAlpha = Math.min(1, alpha * 0.3 * strength * (tier === 0 ? FAR.wash : 1));
          ctx.fillRect(x + 0.3, y + 0.3, cellW - 0.6, cellH - 0.6);
          // Dark art uses luminous coverage. Light art needs the opposite
          // material hierarchy: pale facial discs use open glyphs, dark eyes
          // and feather/stripe marks use dense glyphs. Coverage-only shading
          // otherwise makes every opaque material the same heavy character.
          const weight = dark
            ? (coverageShading ? alpha * 0.85 + lum * 0.15 : alpha * 0.4 + lum * 0.6)
            : alpha * 0.25 + (1 - lum) * 0.75;
          let level = Math.min(GLYPHS.length - 1, Math.floor(weight * 10 + (hash % 2)));
          if (tier === 0) level = Math.min(FAR.maxLevel, Math.floor(weight * FAR.ramp * 10 + (hash % 2)));
          ctx.globalAlpha = Math.min(1, (alpha * 1.5 + 0.18) * strength * (tier === 0 ? FAR.glyphAlpha : 1));
          ctx.fillText(GLYPHS[level], x + cellW / 2, y + cellH / 2);
          count++;
          if (tier === 0) farCount++;
          pattern = (pattern + Math.imul(row * cols + col + 1, level + 3)) | 0;
          sx += col * alpha;
          sy += row * alpha;
          sw += alpha;
          if (capture) line += GLYPHS[level];
        } else if (lunar) {
          const [r, g, bl] = moon.ink;
          const L = lunar.light;
          const glyph = lunar.halo ? "." : MOON_GLYPHS[Math.min(MOON_GLYPHS.length - 1, Math.floor(L * MOON_GLYPHS.length))];
          ctx.fillStyle = `rgb(${r},${g},${bl})`;
          if (!lunar.halo) {
            ctx.globalAlpha = Math.min(1, L * 0.3 * strength);
            ctx.fillRect(x + 0.3, y + 0.3, cellW - 0.6, cellH - 0.6);
          }
          ctx.globalAlpha = Math.min(1, (lunar.halo ? L : 0.25 + L * 0.85) * strength);
          ctx.fillText(glyph, x + cellW / 2, y + cellH / 2);
          moonCount++;
          if (capture) line += glyph;
        } else if (flecks && flecks.has(row * cols + col)) {
          const f = flecks.get(row * cols + col),
            [r, g, bl] = flecks.ink;
          // Same material as the art (a soft cell wash plus a glyph), but
          // lighter glyphs and lower alpha: the deep flecks are the faintest.
          const glyph = f.deep ? flecks.glyphs[0] : flecks.glyphs[1];
          ctx.fillStyle = `rgb(${r},${g},${bl})`;
          ctx.globalAlpha = Math.min(1, f.a * (f.deep ? 0.1 : 0.16) * flecks.boost * strength);
          ctx.fillRect(x + 0.3, y + 0.3, cellW - 0.6, cellH - 0.6);
          ctx.globalAlpha = Math.min(1, f.a * (f.deep ? 0.5 : 0.78) * flecks.boost * strength);
          ctx.fillText(glyph, x + cellW / 2, y + cellH / 2);
          atmosphere++;
          if (capture) line += glyph;
        } else if (capture) line += " ";
      }
      if (capture) rows_text.push(line);
    }
    ctx.globalAlpha = 1;
    Object.assign(stats, {
      frames: stats.frames + 1,
      glyphs: count,
      farGlyphs: farCount,
      nearLayer: Boolean(near && near.used),
      atmosphere,
      moon: moonCount,
      sky: sky && sky.moon ? sky.moon.name : "no moon",
      depth,
      cols,
      rows,
      time: t,
      beat: b,
      scene: def.id,
      pattern,
      cx: sw ? sx / sw / cols : 0,
      cy: sw ? sy / sw / rows : 0,
      tone: dark ? "dark" : "light",
    });
  }
  return {
    resize,
    render,
    stats,
    get text() {
      return rows_text;
    },
    destroy() {
      inkCache.clear();
      for (const L of extra.values()) L.canvas.width = L.canvas.height = 1;
      extra.clear();
      field.width = field.height = 1;
      canvas.width = canvas.height = 1;
    },
  };
}

// The one active renderer. state = { def, settings, eco, paused, tone }.
// options.hosted: the canvas is always on screen (skip IntersectionObserver).
export function createEngine(canvas, initial, onError = () => {}, options = {}) {
  const renderer = createRenderer(canvas, options),
    media = matchMedia("(prefers-color-scheme: dark)");
  let state = { tone: "dark", eco: false, paused: false, ...initial },
    disposed = false,
    visible = Boolean(options.hosted);
  let frame = 0,
    last = null,
    lastDraw = -Infinity,
    time = 0,
    beat = 0,
    dirty = true,
    manual = false,
    size = { width: 1, height: 1 };
  const stats = renderer.stats;
  const isDark = () => (state.tone === "auto" ? media.matches : state.tone !== "light");
  const allowed = () => !disposed && visible && !document.hidden && size.width > 0 && size.height > 0;
  function cancel() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    last = null;
  }
  function paint() {
    if (!allowed()) return;
    renderer.resize(size.width, size.height, devicePixelRatio);
    renderer.render(state.def, state.settings, time, beat, isDark());
    dirty = false;
    lastDraw = performance.now();
  }
  function tick(now) {
    frame = 0;
    if (!allowed() || state.paused || manual) return;
    if (last !== null) {
      const dt = Math.min(0.1, (now - last) / 1000);
      time += dt * state.settings.speed;
      beat += dt * beatRate(state.settings.speed);
    }
    last = now;
    try {
      const interval = 1000 / frameCap(state.eco);
      if (now - lastDraw >= interval) {
        if (dirty || (stats.dpr !== Math.min(2, devicePixelRatio) && size.width * size.height < 1000000))
          renderer.resize(size.width, size.height, devicePixelRatio);
        renderer.render(state.def, state.settings, time, beat, isDark());
        dirty = false;
        // Keep the frame phase so a nominal cap is not eroded by RAF jitter.
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
    if (!state.paused && !manual) frame = requestAnimationFrame(tick);
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
        visible = Boolean(entries[entries.length - 1]?.isIntersecting);
        dirty = true;
        sync();
      });
  const refresh = () => {
    dirty = true;
    sync();
  };
  resizeObserver.observe(canvas);
  intersectionObserver?.observe(canvas);
  document.addEventListener("visibilitychange", refresh);
  media.addEventListener("change", refresh);
  return {
    stats,
    get text() {
      return renderer.text;
    },
    get clocks() {
      return { time, beat };
    },
    // Patch any of { def, settings, eco, paused, tone }.
    set(patch) {
      if (disposed) return;
      const sceneChanged = patch.def && patch.def !== state.def;
      state = { ...state, ...patch };
      if (sceneChanged) {
        time = 0;
        beat = 0;
      }
      dirty = true;
      // Coalesce moving controls into the capped clock; paused views repaint once.
      if (!allowed() || state.paused || manual) {
        sync();
        return;
      }
      if (!frame) {
        last = null;
        frame = requestAnimationFrame(tick);
      }
    },
    // Fixed-time rendering for tests and contact sheets. Independent clocks let
    // a test freeze travel while articulation runs, and the reverse.
    renderAt(t, b) {
      if (disposed) return null;
      time = Math.max(0, Number(t) || 0);
      beat = b === undefined ? beatFromTravel(time, state.settings.speed) : Math.max(0, Number(b) || 0);
      manual = true;
      dirty = true;
      cancel();
      if (allowed()) {
        try {
          paint();
        } catch (error) {
          onError(error);
        }
      }
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
      document.removeEventListener("visibilitychange", refresh);
      media.removeEventListener("change", refresh);
      renderer.destroy();
      stats.disposed = true;
    },
  };
}
