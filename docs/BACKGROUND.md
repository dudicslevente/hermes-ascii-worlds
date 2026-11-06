# Window background

Background is optional and off by default. It renders the selected scene using
the same settings as the preview, on a separate transparent full-window canvas.
Its own Strength defaults to 28% and ranges from 8–60%.

## Owned elements and cleanup

While enabled, the plugin adds one root `data-ascii-worlds-bg` attribute, one
`data-ascii-worlds-bg="layer"` div with a canvas, and one version-stamped style
element. The layer is fixed to the window, clipped, `aria-hidden`, unselectable
and `pointer-events: none`. It does not intercept clicks or keyboard input.

Turning it off, unmounting its title-bar contribution, disabling the plugin or
calling host disposal removes the layer, style and attribute. Startup removes
stray layers from an earlier load. One active scene engine belongs to each
canvas; preview and background never create twenty parallel scene loops.

## Whole window

Whole window is a transparent glyph overlay at the top of the window stacking
order. Its stylesheet is empty: it does not clear host backgrounds or rewrite
core UI. It can pass faintly over text, panels and controls, so lower strength
helps readability. Click-through does not make an overlay visually invisible.
This is the **only placement in the catalog build**, which has no placement selector.


## Theme, motion and resource bounds

The preview and layer read the host's text-colour theme token, with OS fallback;
there is no theme picker. Moving renderers cache the theme reading. Visible stills
check their own theme probe about every 1.1 seconds and repaint only on a change,
without advancing clocks. Offscreen previews, hidden documents and disposed
canvases stop work; resumed clocks do not catch up hidden time.

Pause applies to both paths. Reduced-motion startup is static; explicit Resume
opts both into motion for that plugin session. Closing Settings retains consent;
a new OS hold or reload revokes it. Battery saver caps at 12 instead of 30 fps.
Bounds include 1800x1400 logical canvas dimensions, DPR <=2, approximately four
million backing pixels and a 220x150 glyph grid. These are allocation limits,
not performance, heat or battery guarantees.

## Check background

The button produces a **local, read-only diagnostic on explicit request**:
plugin/layer/style build, placement, layer dimensions/base colour and painted
canvas pixels. It does not read message text or transmit the result. It reads
its own canvas and style geometry once; the result may still reveal host layout,
so inspect it before attaching it to a public issue.


- `LAYER: missing`: the background is not enabled or its title-bar mount is unavailable.
- Different plugin/layer/style versions: an old copy may remain; disable and reload
  first, then quit/reopen Desktop if ordinary reload does not recover.
- Empty scene: check Count, Pause, strength and the whale's deliberate offstage wait.
- Missing background control: the host may lack the guarded title-bar SDK surface;
  the standalone preview can remain usable.

See [Compatibility](COMPATIBILITY.md) for the host surfaces the background relies on.
