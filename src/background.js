import {
  readSettings,
  createStore,
  createBackgroundStore,
  PLUGIN_VERSION,
} from "./settings.js";
import { createEngine } from "./engine.js";

// Relies on Desktop layout. See docs/BACKGROUND.md for every selector and the known unknowns.
export const BG_ATTR = "data-ascii-worlds-bg";
export const BG_STYLE_ATTR = "data-ascii-worlds-bg-style";
export const BG_VERSION_ATTR = "data-ascii-worlds-version";

// The Chat area rules are scoped under this plugin's own html attribute. They
// sit between @chat-area markers because the catalog build
// (npm run build:catalog) removes them, so the catalog version never touches
// the app's own markup.
export function backgroundCss(placement = "behind") {
  // Whole window: the layer sits above the app and does not need anything cleared.
  if (placement !== "behind") return "";
  // @chat-area:begin
  const on = `html[${BG_ATTR}="on"]`;
  // Chat area. A live Desktop window needed every colour-painting wrapper
  // between the page and the message list cleared: the body itself, wrappers
  // 8 to 16 levels above the chat, and the ones inside the chat surface. This
  // is pure CSS on the [data-chat-surface] hook; nothing walks or observes the
  // DOM, it applies only while the layer is on, and it vanishes with it.
  // !important is used on this single property, only inside our own attribute
  // scope, because the host paints colours with its own utility classes and
  // inline styles that a plain rule cannot always beat.
  return [
    // The body itself paints an opaque colour on a live Desktop window and sits
    // above a z-index -1 layer, so it is cleared on its own line.
    `${on} body,`,
    `${on} body :has([data-chat-surface]),`,
    `${on} [data-chat-surface],`,
    `${on} [data-chat-surface] [data-slot="aui_thread-viewport"],`,
    `${on} [data-chat-surface] :has([data-slot="aui_thread-viewport"]) {`,
    "  background: transparent !important;",
    "}",
    "",
  ].join("\n");
  // @chat-area:end
  return "";
}

// A read-only report for the settings page's "Check background" button. It reads styles
// and the layer's own canvas once, when the user asks, and changes nothing.
// This is a diagnostic aid, not a feature that depends on the host's markup.
export function diagnose(doc = document) {
  const out = [];
  const html = doc.documentElement;
  const layer = doc.querySelector(`body > div[${BG_ATTR}="layer"]`);
  const style = doc.querySelector(`style[${BG_STYLE_ATTR}]`);
  out.push(`plugin build: ${PLUGIN_VERSION}`);
  out.push(`running build stamped on layer: ${layer?.getAttribute(BG_VERSION_ATTR) ?? "no layer"} | on style: ${style?.getAttribute(BG_VERSION_ATTR) ?? "no style"}`);
  out.push(`html attribute: ${html.getAttribute(BG_ATTR)}`);
  const view = doc.defaultView;
  if (!layer) {
    out.push("LAYER: missing. Turn Enable background on, then check again.");
    return out.join("\n");
  }
  const cs = view.getComputedStyle(layer),
    r = layer.getBoundingClientRect(),
    canvas = layer.querySelector("canvas");
  out.push(`placement on layer: ${layer.getAttribute("data-ascii-worlds-placement")} | z-index ${cs.zIndex} | ${Math.round(r.width)}x${Math.round(r.height)} | base ${cs.backgroundColor}`);
  if (canvas) {
    let painted = "unreadable";
    try {
      const d = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
      painted = `${n} of ${d.length / 4}`;
    } catch {
      /* A tainted or lost canvas cannot be read; report that, not a guess. */
    }
    out.push(`canvas ${canvas.width}x${canvas.height} | opacity ${view.getComputedStyle(canvas).opacity} | painted pixels ${painted}`);
  } else out.push("canvas: missing");
  // @chat-area:begin
  const surface = doc.querySelector("[data-chat-surface]");
  if (!surface) {
    out.push("chat surface: not found on this page");
    return out.join("\n");
  }
  const rows = [];
  for (let e = surface; e && e !== html; e = e.parentElement) {
    const c = view.getComputedStyle(e);
    if (c.backgroundColor !== "rgba(0, 0, 0, 0)" || c.backgroundImage !== "none")
      rows.push(`  ${e === doc.body ? "BODY" : "ABOVE-chat element"} still painting ${c.backgroundColor}${c.backgroundImage !== "none" ? " + image" : ""}: ${String(e.className).slice(0, 110)}`);
  }
  const viewport = surface.querySelector('[data-slot="aui_thread-viewport"]');
  for (let e = viewport; e && e !== surface; e = e.parentElement) {
    const c = view.getComputedStyle(e);
    if (c.backgroundColor !== "rgba(0, 0, 0, 0)" || c.backgroundImage !== "none")
      rows.push(`  INSIDE-chat element still painting ${c.backgroundColor}${c.backgroundImage !== "none" ? " + image" : ""}: ${String(e.className).slice(0, 110)}`);
  }
  out.push(rows.length ? `still painting over the layer (${rows.length}):\n${rows.join("\n")}` : "nothing in the chat chain is painting a colour");
  // @chat-area:end
  return out.join("\n");
}

// One shared bundle per plugin registration: settings-page edits and the background
// host talk through it. Nothing is attached to window.
export function createHub(storage) {
  return {
    settings: createStore(readSettings(storage)),
    bg: createBackgroundStore(storage),
    status: createStore({ available: true, message: "" }),
  };
}

export function createBackgroundHost({ hub, doc = document }) {
  let attached = false,
    active = null,
    reducedMedia = null;
  const cleanups = [];
  const root = () => doc.documentElement;
  const reduced = () => Boolean(reducedMedia?.matches);
  const engineSettings = () => {
    const s = hub.settings.get();
    // Coarse glyphs and the eco cap keep a full-window layer cheap. Paused
    // follows the settings page's pause switch or the reduced-motion preference.
    return { ...s, density: "bold", eco: true, paused: s.paused || reduced() };
  };
  function sweepStrays() {
    // A previous load of the plugin that never ran cleanup must not stack.
    doc.querySelectorAll(`[${BG_STYLE_ATTR}]`).forEach((n) => n.remove());
    doc
      .querySelectorAll(`body > div[${BG_ATTR}]`)
      .forEach((n) => n.remove());
  }
  function deactivate() {
    if (!active) return;
    const a = active;
    active = null;
    try {
      a.engine?.destroy();
    } catch {
      /* Removing the layer below is what matters. */
    }
    a.layer.remove();
    a.style.remove();
    root().removeAttribute(BG_ATTR);
  }
  function failSafe(error) {
    deactivate();
    hub.bg.set({ enabled: false });
    hub.status.set({
      ...hub.status.get(),
      message: `Background mode hit an error (${error?.message || "unknown"}) and was turned off. The page was restored.`,
    });
  }
  function activate() {
    sweepStrays();
    const bg = hub.bg.get();
    const layer = doc.createElement("div");
    layer.setAttribute(BG_ATTR, "layer");
    layer.setAttribute(BG_VERSION_ATTR, PLUGIN_VERSION);
    layer.setAttribute("data-ascii-worlds-placement", bg.placement);
    layer.setAttribute("aria-hidden", "true");
    const common =
      "position:fixed;inset:0;pointer-events:none;user-select:none;overflow:hidden;contain:strict;";
    // Behind: z-index -1 puts the layer behind every in-flow and positioned box
    // of the root stacking context, so it only shows through transparent
    // regions. Its base colour is the app's own chat surface token, so clearing
    // the chat panels keeps the shade the user is used to (and follows light and
    // dark themes) instead of exposing the page colour underneath. If the token
    // is not visible from the body, the chain falls back to the chrome token and
    // then to nothing.
    // In front: the highest z-index, no base colour, so only the glyphs are
    // drawn over the app, at the chosen strength. Pointer events pass through.
    layer.style.cssText = common + "z-index:2147483646";
    // @chat-area:begin
    if (bg.placement !== "front")
      layer.style.cssText =
        common +
        "z-index:-1;background:var(--ui-chat-surface-background, var(--ui-bg-chrome, transparent))";
    // @chat-area:end
    const canvas = doc.createElement("canvas");
    canvas.style.cssText = `display:block;width:100%;height:100%;pointer-events:none;opacity:${bg.strength}`;
    layer.appendChild(canvas);
    const style = doc.createElement("style");
    style.setAttribute(BG_STYLE_ATTR, "");
    style.setAttribute(BG_VERSION_ATTR, PLUGIN_VERSION);
    style.textContent = backgroundCss(bg.placement);
    active = { layer, canvas, style, engine: null, placement: bg.placement };
    try {
      (doc.head || root()).appendChild(style);
      doc.body.appendChild(layer);
      root().setAttribute(BG_ATTR, "on");
      active.engine = createEngine(canvas, engineSettings(), failSafe, {
        hosted: true,
        transparent: true,
      });
    } catch (error) {
      failSafe(error);
    }
  }
  function apply() {
    if (!attached) return;
    const bg = hub.bg.get();
    if (!bg.enabled) return deactivate();
    if (!active) return activate();
    if (active.placement !== bg.placement) {
      // Moving between behind and in front rebuilds the layer so no stale rule or z-index survives.
      deactivate();
      return activate();
    }
    active.canvas.style.opacity = String(bg.strength);
  }
  function refresh() {
    if (attached && active?.engine) active.engine.update(engineSettings());
  }
  return {
    attach() {
      if (attached) return;
      attached = true;
      reducedMedia = matchMedia("(prefers-reduced-motion: reduce)");
      cleanups.push(hub.bg.subscribe(apply), hub.settings.subscribe(refresh));
      reducedMedia.addEventListener("change", refresh);
      cleanups.push(() => reducedMedia.removeEventListener("change", refresh));
      apply();
    },
    detach() {
      if (!attached) return;
      attached = false;
      cleanups.splice(0).forEach((off) => off());
      deactivate();
    },
    // Always works, attached or not: persist off and restore the page.
    panic() {
      hub.bg.set({ enabled: false });
      deactivate();
    },
    toggle() {
      hub.bg.set({ enabled: !hub.bg.get().enabled });
    },
    get active() {
      return Boolean(active);
    },
    get attached() {
      return attached;
    },
  };
}
