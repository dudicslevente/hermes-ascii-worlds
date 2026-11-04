import {
  DEFAULTS,
  KOI_MODES,
  JELLY_MODES,
  readSettings,
  writeSettings,
  normalizeSettings,
  browserStorage,
  PLUGIN_VERSION,
} from "./settings.js";
import { createEngine } from "./engine.js";
import { diagnose } from "./background.js";
import { WORLD_CSS } from "./styles.js";

export function mountWorld(root, storage = browserStorage(), hub = null) {
  let settings = readSettings(storage),
    disposed = false,
    engine;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  if (reduced.matches) settings.paused = true;
  const listeners = [];
  const listen = (node, name, handler) => {
    node.addEventListener(name, handler);
    listeners.push(() => node.removeEventListener(name, handler));
  };
  const style = document.createElement("style");
  style.textContent = WORLD_CSS;
  const world = document.createElement("section");
  world.className = "aw-world";
  world.setAttribute("aria-label", "ASCII Worlds settings");
  // All markup is static. Settings only enter safe DOM properties below.
  world.innerHTML = `<section class="aw-section aw-bg" aria-labelledby="aw-h-bg" hidden>
      <h3 class="aw-h" id="aw-h-bg">Background</h3>
      <label class="aw-switch"><input type="checkbox" role="switch" name="bgEnabled"><span class="aw-switch-track" aria-hidden="true"></span><span>Show the animation in Hermes</span></label>
      <!-- @chat-area:begin -->
      <fieldset class="aw-placement"><legend>Placement</legend>
        <div class="aw-cards">
          <label class="aw-card"><input type="radio" name="bgPlacement" value="behind"><span class="aw-card-title">Chat area</span><span class="aw-card-text">The animation shows through the chat area only. Sidebars, side panels and the title bar keep their own backgrounds, so it stops at their edges and never covers text.</span></label>
          <label class="aw-card"><input type="radio" name="bgPlacement" value="front"><span class="aw-card-title">Whole window</span><span class="aw-card-text">The animation is drawn over the whole window, including the sidebars and panels, at low strength. Because it sits on top, it can drift faintly over text and controls; clicks pass straight through.</span></label>
        </div>
      </fieldset>
      <p class="aw-help">Chat area relies on how Hermes Desktop lays out its window. If it stops showing after an app update, switch to Whole window.</p>
      <!-- @chat-area:end -->
      <label class="aw-field aw-strength"><span>Strength</span><span class="aw-speed"><input type="range" name="bgStrength" min="8" max="60" step="1" aria-label="Strength"><output class="aw-bg-out"></output></span><small>Lower is calmer; 28% is a good start</small></label>
      <div class="aw-bg-status" role="status" aria-live="polite"></div>
    </section>
    <section class="aw-section aw-scene" aria-labelledby="aw-h-scene">
      <h3 class="aw-h" id="aw-h-scene">Scene and colours</h3>
      <div class="aw-art"><canvas class="aw-canvas" role="img" aria-label="Procedural koi swimming in a glyph pond"></canvas><div class="aw-fallback" role="alert" hidden></div></div>
      <div class="aw-caption"><span class="aw-specimen">NISHIKIGOI / ORNAMENTAL CARP</span><span>SHAPES INTO SYMBOLS</span></div>
      <div class="aw-controls">
        <label class="aw-field"><span>Habitat</span><select name="scene"><option value="koi">Koi pond</option><option value="jellyfish">Jellyfish drift</option></select></label>
        <label class="aw-field"><span>Appearance</span><select name="palette"><option value="auto">Follow system</option><option value="light">Paper / light</option><option value="dark">Midnight / dark</option></select></label>
        <label class="aw-field"><span>Colour</span><select name="colour"><option value="natural">Natural</option><option value="cyan">Cyan / lilac</option><option value="ember">Warm / ember</option><option value="mono">Monochrome</option><option value="custom">Custom tint</option></select></label>
        <label class="aw-field"><span>Tint</span><input type="color" name="tint" aria-label="Custom artwork tint"></label>
        <label class="aw-field aw-koi-population"><span>Koi count</span><select name="koiCount" aria-label="Koi count"><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option><option value="9">9</option><option value="10">10</option></select></label>
        <details class="aw-individual aw-koi-individual"><summary>Individual koi colours</summary><p>Editing a colour enables Individual mode. Hidden slots keep their colours. Maximum 10 to limit CPU use; fewer is smoother.</p><div class="aw-colour-slots"><label class="aw-field"><span>Koi 1</span><input type="color" name="koiColor0" aria-label="Koi 1 colour"></label><label class="aw-field"><span>Koi 2</span><input type="color" name="koiColor1" aria-label="Koi 2 colour"></label><label class="aw-field"><span>Koi 3</span><input type="color" name="koiColor2" aria-label="Koi 3 colour"></label><label class="aw-field"><span>Koi 4</span><input type="color" name="koiColor3" aria-label="Koi 4 colour"></label><label class="aw-field"><span>Koi 5</span><input type="color" name="koiColor4" aria-label="Koi 5 colour"></label><label class="aw-field"><span>Koi 6</span><input type="color" name="koiColor5" aria-label="Koi 6 colour"></label><label class="aw-field"><span>Koi 7</span><input type="color" name="koiColor6" aria-label="Koi 7 colour"></label><label class="aw-field"><span>Koi 8</span><input type="color" name="koiColor7" aria-label="Koi 8 colour"></label><label class="aw-field"><span>Koi 9</span><input type="color" name="koiColor8" aria-label="Koi 9 colour"></label><label class="aw-field"><span>Koi 10</span><input type="color" name="koiColor9" aria-label="Koi 10 colour"></label></div></details>
        <label class="aw-field aw-population"><span>Jellyfish count</span><select name="jellyCount" aria-label="Jellyfish count"><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option><option value="9">9</option><option value="10">10</option></select></label>
        <details class="aw-individual aw-jelly-individual"><summary>Individual jellyfish colours</summary><p>Editing a colour enables Individual mode. Hidden slots keep their colours. Maximum 10 to limit CPU use; fewer is smoother.</p><div class="aw-colour-slots"><label class="aw-field"><span>Jellyfish 1</span><input type="color" name="jellyColor0" aria-label="Jellyfish 1 colour"></label><label class="aw-field"><span>Jellyfish 2</span><input type="color" name="jellyColor1" aria-label="Jellyfish 2 colour"></label><label class="aw-field"><span>Jellyfish 3</span><input type="color" name="jellyColor2" aria-label="Jellyfish 3 colour"></label><label class="aw-field"><span>Jellyfish 4</span><input type="color" name="jellyColor3" aria-label="Jellyfish 4 colour"></label><label class="aw-field"><span>Jellyfish 5</span><input type="color" name="jellyColor4" aria-label="Jellyfish 5 colour"></label><label class="aw-field"><span>Jellyfish 6</span><input type="color" name="jellyColor5" aria-label="Jellyfish 6 colour"></label><label class="aw-field"><span>Jellyfish 7</span><input type="color" name="jellyColor6" aria-label="Jellyfish 7 colour"></label><label class="aw-field"><span>Jellyfish 8</span><input type="color" name="jellyColor7" aria-label="Jellyfish 8 colour"></label><label class="aw-field"><span>Jellyfish 9</span><input type="color" name="jellyColor8" aria-label="Jellyfish 9 colour"></label><label class="aw-field"><span>Jellyfish 10</span><input type="color" name="jellyColor9" aria-label="Jellyfish 10 colour"></label></div></details>
        <label class="aw-field"><span>Glyph density</span><select name="density"><option value="fine">Fine</option><option value="balanced">Balanced</option><option value="bold">Bold</option></select></label>
        <label class="aw-field"><span>Current</span><span class="aw-speed"><input type="range" name="speed" min="0.1" max="1.5" step="0.05" aria-label="Animation speed"><output class="aw-speed-out"></output></span></label>
        <div class="aw-actions"><button type="button" class="aw-pause">Pause motion</button><label class="aw-eco"><input type="checkbox" name="eco"> Eco / 12 fps</label></div>
        <div class="aw-note" role="status" aria-live="polite"></div>
      </div>
    </section>
    <section class="aw-section aw-trouble" aria-labelledby="aw-h-trouble" hidden>
      <h3 class="aw-h" id="aw-h-trouble">Troubleshooting</h3>
      <p class="aw-help">If something looks wrong, press Check background and include the text in a bug report.</p>
      <div class="aw-actions"><button type="button" class="aw-bg-check">Check background</button></div>
      <textarea class="aw-bg-diag" readonly rows="9" hidden aria-label="Background check result" spellcheck="false"></textarea>
    </section>
    <section class="aw-section aw-about" aria-labelledby="aw-h-about">
      <h3 class="aw-h aw-h-small" id="aw-h-about">About ASCII Worlds</h3>
      <p class="aw-help aw-about-lead">A small aquarium for your chats. Every koi and jellyfish is drawn live out of text characters, and each one swims its own route across the screen.</p>
      <p class="aw-help aw-about-small">Version ${PLUGIN_VERSION}. Free and open source under the MIT licence.</p>
    </section>`;
  root.replaceChildren(style, world);
  const find = (s) => world.querySelector(s),
    canvas = find("canvas"),
    note = find(".aw-note");
  let reflectedScene;
  function reflect() {
    if (reflectedScene !== settings.scene) {
      const names = {
        natural:
          settings.scene === "koi"
            ? "Original koi colours"
            : "Natural cyan / lilac",
        jewel: "Jewel / teal and violet",
        sunset: "Sunset / coral and plum",
        pastel: "Pastel / rose and sky",
        forest: "Forest / jade and gold",
        cyan: "Cyan / lilac",
        ember: "Warm / ember",
        mono: "Monochrome",
        custom: "Custom tint",
        individual: "Individual colours",
      };
      find('[name="colour"]').replaceChildren(
        ...(settings.scene === "koi" ? KOI_MODES : JELLY_MODES).map((value) => {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = names[value];
          return option;
        }),
      );
      reflectedScene = settings.scene;
    }
    find(".aw-population").hidden = settings.scene !== "jellyfish";
    find(".aw-jelly-individual").hidden = settings.scene !== "jellyfish";
    find(".aw-koi-population").hidden = settings.scene !== "koi";
    find(".aw-koi-individual").hidden = settings.scene !== "koi";
    find('[name="koiCount"]').value = settings.koiCount;
    for (let i = 0; i < 10; i++) {
      const input = find(`[name="koiColor${i}"]`);
      input.value = settings.koiColors[i];
      input.closest("label").hidden = i >= settings.koiCount;
    }
    find('[name="jellyCount"]').value = settings.jellyCount;
    for (let i = 0; i < 10; i++) {
      const input = find(`[name="jellyColor${i}"]`);
      input.value = settings.jellyColors[i];
      input.closest("label").hidden = i >= settings.jellyCount;
    }
    for (const name of [
      "scene",
      "palette",
      "density",
      "speed",
      "colour",
      "tint",
    ])
      find(`[name="${name}"]`).value = settings[name];
    find('[name="eco"]').checked = settings.eco;
    find(".aw-speed-out").value = `${settings.speed.toFixed(2)}×`;
    find(".aw-pause").textContent = settings.paused
      ? "Resume motion"
      : "Pause motion";
    find(".aw-pause").setAttribute("aria-pressed", String(settings.paused));
    const koi = settings.scene === "koi";
    find(".aw-specimen").textContent = koi
      ? "NISHIKIGOI / ORNAMENTAL CARP"
      : "SCYPHOZOA / OPEN WATER";
    canvas.setAttribute(
      "aria-label",
      koi
        ? `${settings.koiCount} procedural koi with ${settings.colour === "natural" ? "red, cream, ink and gold" : "shaded"} patches, rendered entirely as colored glyphs`
        : `${settings.jellyCount} jellyfish with long flowing tentacles, rendered entirely as colored glyphs`,
    );
  }
  function update(patch, persist = true) {
    if (disposed) return;
    // Legacy demo API aliases target the newly selected habitat, never both.
    const habitat = (patch.scene || settings.scene) === "koi" ? "koi" : "jelly";
    const next = { ...settings, ...patch };
    if (Object.hasOwn(patch, "colour")) next[`${habitat}Colour`] = patch.colour;
    if (Object.hasOwn(patch, "tint")) next[`${habitat}Tint`] = patch.tint;
    settings = normalizeSettings(next);
    reflect();
    engine?.update(settings);
    hub?.settings.set(settings);
    if (persist)
      note.textContent = writeSettings(storage, settings)
        ? ""
        : "Preferences could not be saved in this environment.";
  }
  function fail(error) {
    canvas.hidden = true;
    const fallback = find(".aw-fallback");
    fallback.hidden = false;
    fallback.textContent = `This habitat could not be drawn. ${error?.message || "Canvas rendering is unavailable."} Close and reopen this page to retry.`;
    find(".aw-controls").hidden = true;
  }
  function reflectBg() {
    if (!hub) return;
    const bg = hub.bg.get(),
      status = hub.status.get();
    find(".aw-bg").hidden = false;
    find(".aw-trouble").hidden = false;
    find('[name="bgEnabled"]').checked = bg.enabled && status.available;
    find('[name="bgEnabled"]').disabled = !status.available;
    find('[name="bgStrength"]').disabled = !status.available;
    for (const radio of world.querySelectorAll('[name="bgPlacement"]')) {
      radio.checked = radio.value === bg.placement;
      radio.disabled = !status.available;
    }
    find('[name="bgStrength"]').value = Math.round(bg.strength * 100);
    find(".aw-bg-out").value = `${Math.round(bg.strength * 100)}%`;
    find(".aw-bg-status").textContent = status.available
      ? status.message
      : status.message ||
        "Background needs the title bar mount point, which this Desktop version does not provide.";
  }
  reflect();
  if (hub) {
    reflectBg();
    hub.settings.set(settings);
    listeners.push(hub.bg.subscribe(reflectBg), hub.status.subscribe(reflectBg));
  }
  try {
    engine = createEngine(canvas, settings, fail);
  } catch (error) {
    fail(error);
  }
  for (const name of ["scene", "palette", "density", "colour", "tint"])
    listen(find(`[name="${name}"]`), "change", (e) =>
      update(
        name === "tint"
          ? { tint: e.target.value, colour: "custom" }
          : { [name]: e.target.value },
      ),
    );
  listen(find('[name="jellyCount"]'), "change", (e) =>
    update({ jellyCount: Number(e.target.value) }),
  );
  listen(find('[name="koiCount"]'), "change", (e) =>
    update({ koiCount: Number(e.target.value) }),
  );
  for (let i = 0; i < 10; i++)
    listen(find(`[name="koiColor${i}"]`), "change", (e) => {
      const koiColors = [...settings.koiColors];
      koiColors[i] = e.target.value;
      update({ koiColors, koiColour: "individual" });
    });
  for (let i = 0; i < 10; i++)
    listen(find(`[name="jellyColor${i}"]`), "change", (e) => {
      const jellyColors = [...settings.jellyColors];
      jellyColors[i] = e.target.value;
      update({ jellyColors, jellyColour: "individual" });
    });
  listen(find('[name="speed"]'), "input", (e) =>
    update({ speed: Number(e.target.value) }),
  );
  listen(find('[name="eco"]'), "change", (e) =>
    update({ eco: e.target.checked }),
  );
  listen(find(".aw-pause"), "click", () => {
    update({ paused: !settings.paused });
    engine?.resume();
  });
  if (hub) {
    listen(find('[name="bgEnabled"]'), "change", (e) => {
      const enabled = e.target.checked;
      hub.status.set({ ...hub.status.get(), message: "" });
      hub.bg.set({ enabled });
    });
    listen(find('[name="bgStrength"]'), "input", (e) =>
      hub.bg.set({ strength: Number(e.target.value) / 100 }),
    );
    for (const radio of world.querySelectorAll('[name="bgPlacement"]'))
      listen(radio, "change", (e) => {
        if (e.target.checked) hub.bg.set({ placement: e.target.value });
      });
    listen(find(".aw-bg-check"), "click", () => {
      const box = find(".aw-bg-diag");
      box.value = diagnose(root.ownerDocument);
      box.hidden = false;
      box.focus();
      box.select();
    });
  }
  listen(reduced, "change", (e) => {
    if (e.matches) {
      update({ paused: true }, false);
      note.textContent =
        "Motion paused to follow your reduced-motion preference.";
    }
  });
  if (reduced.matches)
    note.textContent =
      "Reduced motion is on. Resume only when you want motion.";
  return {
    get settings() {
      return {
        ...settings,
        jellyColors: [...settings.jellyColors],
        koiColors: [...settings.koiColors],
      };
    },
    get stats() {
      return engine ? { ...engine.stats } : null;
    },
    setSettings(patch) {
      update(patch);
    },
    renderAt(time) {
      return engine?.renderAt(time);
    },
    resume() {
      engine?.resume();
    },
    reset() {
      update({ ...DEFAULTS, paused: reduced.matches });
      engine?.resume();
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      listeners.forEach((off) => off());
      engine?.destroy();
      root.replaceChildren();
    },
  };
}
