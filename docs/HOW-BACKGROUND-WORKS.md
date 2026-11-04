# How Background mode works

> The catalog version of the plugin (the `catalog` branch) has only the Whole window placement, so everything below about Chat area applies to the full plugin on `main` and its GitHub releases.

Background mode draws the current scene on one full-window canvas. This page lists exactly what it adds to the page, how the two placements differ, and what to check if it stops working. It is written for people who want to verify the plugin or fix it after a Hermes Desktop update.

## What it adds to the page (only while Background is on)

1. An attribute on the root element: `html[data-ascii-worlds-bg="on"]`.
2. One `<div data-ascii-worlds-bg="layer" data-ascii-worlds-version="..." data-ascii-worlds-placement="behind|front" aria-hidden="true">` appended to `document.body`, holding one `<canvas>` whose CSS opacity is the strength setting. It has `position: fixed; inset: 0; pointer-events: none; user-select: none; overflow: hidden; contain: strict`.
3. One `<style data-ascii-worlds-bg-style data-ascii-worlds-version="...">` in `<head>`. It holds the rules below in Chat area placement and is empty in Whole window placement.

All of it is removed when Background is turned off, when the title-bar component unmounts, and when the plugin is disabled. A sweep before activation removes strays from an earlier load. Nothing is attached to `window`.

## Chat area (saved as `behind`)

The layer sits at `z-index: -1` and is only visible through transparent regions. Hermes Desktop paints opaque colours on several elements between the page and the message list, so while the layer is on, this stylesheet makes them transparent:

```
html[data-ascii-worlds-bg="on"] body,
html[data-ascii-worlds-bg="on"] body :has([data-chat-surface]),
html[data-ascii-worlds-bg="on"] [data-chat-surface],
html[data-ascii-worlds-bg="on"] [data-chat-surface] [data-slot="aui_thread-viewport"],
html[data-ascii-worlds-bg="on"] [data-chat-surface] :has([data-slot="aui_thread-viewport"]) { background: transparent !important; }
```

- The first line clears the body itself, which is opaque and would otherwise cover the layer.
- The second clears every element that contains a chat surface (the wrappers around the chat, many levels up).
- The last three clear the chat surface, the message list, and the wrappers between them.
- Everything is scoped under the plugin's own attribute, so the rules vanish with the layer. They use pure CSS and only the documented `[data-chat-surface]` and `[data-slot="aui_thread-viewport"]` hooks; no script walks or observes the page.
- `!important` appears on that single declaration only. Without it, a wrapper painted with an inline style stays opaque (there is a regression test for exactly this).
- Sidebars and other panels are not on that list. They keep their own backgrounds, which is why the animation stops at their edges.

The layer paints its own base colour of `var(--ui-chat-surface-background, var(--ui-bg-chrome, transparent))`, so clearing the chat's wrappers does not shift the chat's colour, and it follows light and dark themes. This depends on those variables being visible from `<body>`. They are app-internal names, not a documented contract, and may change.

## Whole window (saved as `front`)

The layer sits at the highest `z-index`, has no base colour and its stylesheet is empty. Only the glyphs are drawn, over the whole window, at the chosen strength. Pointer events pass through. Because it clears nothing, the host's layout cannot hide it. It is drawn over the sidebars and, being on top, also faintly over text and controls.

## Resource use

The animation uses the same settings as the preview (habitat, colours, appearance, glyph density, speed and battery saver) and is limited to one engine for the whole window. Follow system tracks the Hermes theme, read from the documented text colour variable, and falls back to the operating system setting. Fine glyphs at full speed are the most expensive combination, jellyfish especially; battery saver and a bolder density turn the cost down. It pauses when the document is hidden and starts paused if your system asks for reduced motion. Pausing motion in the settings page also pauses the background. The preview in the settings page is a second engine and animates only while it is on screen.

## Troubleshooting report

**Check background** in the settings page prints a read-only report: the plugin build, the build stamped on the running layer and style (so a stale copy is obvious), the placement, the layer size and base colour, how many canvas pixels are painted, and every element between the page and the chat that is still painting a colour (including the body). It reads styles and the layer's own canvas once, when pressed, and changes nothing.

Reading it:

- A different version on the layer than the plugin build means an old copy is still running. Quit and reopen Hermes Desktop.
- `LAYER: missing` means Background is not on.
- Lines starting `BODY`, `ABOVE-chat` or `INSIDE-chat` name elements the Chat area rules could not clear. Switch to Whole window, and include the report in a bug report.

## Known limits

- Chat area relies on the app's current layout and theme variables; verify after Desktop updates.
- Only a host rule that is itself `!important` and at least as specific could keep a wrapper opaque in Chat area placement.
- Areas whose colour came from a wrapper that is now cleared (for example parts of the window chrome) may show the layer's base colour instead. Report anything that looks wrong.
