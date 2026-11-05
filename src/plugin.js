import { useEffect, useRef, useState, Component } from "react";
import { jsx } from "react/jsx-runtime";
import { Button } from "@hermes/plugin-sdk";
import * as sdk from "@hermes/plugin-sdk";
import { mountWorld } from "./world.js";
import { createHub, createBackgroundHost } from "./background.js";

class WorldBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    return this.state.error
      ? jsx("div", {
          role: "alert",
          style: { padding: 20, color: "var(--ui-text-primary)" },
          children:
            "ASCII Worlds could not start. Disable and re-enable the plugin to retry.",
        })
      : this.props.children;
  }
}
function SettingsPage({ ctx, instances, hub }) {
  const root = useRef(null),
    world = useRef(null);
  useEffect(() => {
    const instance = mountWorld(root.current, ctx.storage, hub);
    world.current = instance;
    instances.add(instance);
    return () => {
      instances.delete(instance);
      instance.destroy();
      world.current = null;
    };
  }, [ctx, instances, hub]);
  // Plain block layout. The host's Settings page scrolls itself and gives a
  // plugin page no fixed height, so nothing here may depend on one.
  return jsx("div", {
    children: [
      jsx("div", { ref: root }, "world"),
      jsx(
        "div",
        {
          style: {
            padding: "0 24px 28px",
            display: "flex",
            justifyContent: "center",
          },
          children: [jsx(Button, {
            size: "sm",
            variant: "ghost",
            onClick: () => world.current?.resetScene(),
            'aria-label': 'Reset active scene to defaults',
            title: 'Reset active scene only; keep other scenes',
            children: "Reset this scene",
          }, 'scene-reset'), jsx(Button, {
            size: "sm",
            variant: "ghost",
            onClick: () => world.current?.resetAll(),
            title: 'Reset all scene preferences and return to the koi pond; background placement is kept',
            children: "Reset to defaults",
          }, 'all-reset')],
        },
        "reset",
      ),
    ],
  });
}
// Lives in a permanent title-bar mount point. Its effect owns the background
// layer: attach on mount, full cleanup on unmount (also under Strict Mode).
function BackgroundMount({ host, hub }) {
  const [bg, setBg] = useState(hub.bg.get());
  useEffect(() => {
    host.attach();
    const off = hub.bg.subscribe(setBg);
    setBg(hub.bg.get());
    return () => {
      off();
      host.detach();
    };
  }, [host, hub]);
  return jsx("button", {
    type: "button",
    "aria-pressed": bg.enabled,
    "aria-label": `ASCII Worlds background: ${bg.enabled ? "on" : "off"}. Activate to turn ${bg.enabled ? "off" : "on"}.`,
    title: "ASCII Worlds background",
    onClick: () => hub.bg.set({ enabled: !bg.enabled }),
    style: {
      WebkitAppRegion: "no-drag",
      font: "inherit",
      fontSize: 11,
      padding: "2px 8px",
      borderRadius: 4,
      cursor: "pointer",
      background: "transparent",
      color: bg.enabled ? "var(--ui-accent)" : "var(--ui-text-secondary)",
      border: "1px solid var(--ui-stroke-secondary)",
    },
    children: bg.enabled ? "Background on" : "Background off",
  });
}
const PLUGIN_ID = "ascii-worlds";
const PLUGIN_NAME = "ASCII Worlds";
export default {
  id: PLUGIN_ID,
  name: PLUGIN_NAME,
  register(ctx) {
    const instances = new Set();
    const hub = createHub(ctx.storage);
    const host = createBackgroundHost({ hub });
    ctx.onDispose(() => {
      host.detach();
      instances.forEach((instance) => instance.destroy());
      instances.clear();
    });
    // Newer exports are guarded: without the title-bar mount point the
    // settings page keeps working and Background reports itself unavailable.
    const titlebar =
      sdk.TITLEBAR_AREAS && typeof sdk.TITLEBAR_AREAS.right === "string"
        ? sdk.TITLEBAR_AREAS.right
        : null;
    const palette = typeof sdk.PALETTE_AREA === "string" ? sdk.PALETTE_AREA : null;
    if (titlebar) {
      ctx.register({
        id: "background-toggle",
        area: titlebar,
        render: () => jsx(BackgroundMount, { host, hub }),
      });
      if (palette)
        ctx.register({
          id: "background-palette",
          area: palette,
          data: {
            id: "ascii-worlds.toggle-background",
            label: "ASCII Worlds: toggle background",
            keywords: ["ascii", "worlds", "background", "koi", "jellyfish"],
            run: () => host.toggle(),
          },
        });
    } else {
      hub.status.set({ available: false, message: "" });
    }
    const navigate = sdk.host && typeof sdk.host.navigate === "function" ? sdk.host : null;
    if (palette && navigate && typeof sdk.pluginSettingsHref === "function")
      ctx.register({
        id: "settings-palette",
        area: palette,
        data: {
          id: "ascii-worlds.open-settings",
          label: "ASCII Worlds: open settings",
          keywords: ["ascii", "worlds", "settings", "plugin"],
          run: () => navigate.navigate(sdk.pluginSettingsHref(PLUGIN_ID)),
        },
      });
    // One settings page, no pane: closing a plugin's only pane would disable
    // the plugin. Prefer the settings-page API, fall back to the contribution
    // area used by older hosts, and carry on without a page if neither works.
    const render = () =>
      jsx(WorldBoundary, { children: jsx(SettingsPage, { ctx, instances, hub }) });
    let registered = false;
    if (typeof ctx.registerSettingsPage === "function") {
      try {
        const off = ctx.registerSettingsPage({
          id: "settings",
          title: PLUGIN_NAME,
          icon: "color-mode",
          order: 0,
          render,
        });
        if (typeof off === "function") ctx.onDispose(off);
        registered = true;
      } catch {}
    }
    if (!registered) {
      try {
        ctx.register({
          area:
            typeof sdk.SETTINGS_PLUGINS_AREA === "string"
              ? sdk.SETTINGS_PLUGINS_AREA
              : "settings.plugins",
          id: "settings",
          title: PLUGIN_NAME,
          render,
          data: { icon: "color-mode" },
        });
      } catch {}
    }
  },
};
