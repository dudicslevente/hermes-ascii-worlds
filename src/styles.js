export const WORLD_CSS = `
.aw-world {
  --aw-ink: var(--ui-text-primary, CanvasText);
  --aw-sub: var(--ui-text-secondary, CanvasText);
  --aw-muted: var(--ui-text-tertiary, GrayText);
  --aw-line: var(--ui-stroke-secondary, ButtonBorder);
  --aw-accent: var(--ui-accent, Highlight);
  display: flex;
  flex-direction: column;
  gap: 28px;
  /* Normal flow on purpose: the Settings page gives plugin pages no fixed
     height, so any height:100% or flex-basis:0 here collapses to nothing. */
  min-width: 0;
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px 24px 32px;
  color: var(--aw-ink);
  font:
    13px/1.5 system-ui,
    sans-serif;
  color-scheme: inherit;
}
.aw-world * {
  box-sizing: border-box;
}
.aw-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  flex-shrink: 0;
}
.aw-section + .aw-section {
  border-top: 1px solid var(--aw-line);
  padding-top: 22px;
}
.aw-section[hidden] + .aw-section {
  border-top: 0;
  padding-top: 0;
}
.aw-h {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0;
}
.aw-h-small {
  font-size: 12px;
  color: var(--aw-sub);
}
.aw-about-lead { color: var(--aw-ink); font-size: 13px; }
.aw-about-small { font-size: 11px; opacity: 0.85; }
.aw-help {
  margin: 0;
  color: var(--aw-sub);
  font-size: 12px;
}
.aw-switch {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 13px;
  align-self: flex-start;
}
.aw-switch {
  position: relative;
}
.aw-switch input {
  position: absolute;
  left: 0;
  top: 50%;
  margin: -10px 0 0;
  width: 34px;
  height: 20px;
  opacity: 0;
  z-index: 1;
  cursor: pointer;
}
.aw-switch-track {
  position: relative;
  flex: none;
  width: 34px;
  height: 20px;
  border-radius: 10px;
  border: 1px solid var(--aw-line);
  background: var(--ui-bg-secondary, ButtonFace);
  transition: background 0.15s;
}
.aw-switch-track::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--aw-muted);
  transition: transform 0.15s, background 0.15s;
}
.aw-switch input:checked + .aw-switch-track {
  border-color: var(--aw-accent);
}
.aw-switch input:checked + .aw-switch-track::after {
  transform: translateX(14px);
  background: var(--aw-accent);
}
.aw-switch input:focus-visible + .aw-switch-track {
  outline: 2px solid var(--aw-accent);
  outline-offset: 3px;
}
.aw-switch input:disabled ~ * {
  opacity: 0.55;
}
.aw-placement {
  border: 0;
  margin: 0;
  padding: 0;
  min-width: 0;
}
.aw-placement legend {
  padding: 0;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--aw-sub);
}
.aw-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}
.aw-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px 12px 38px;
  border: 1px solid var(--aw-line);
  border-radius: 8px;
  cursor: pointer;
  min-width: 0;
}
.aw-card:hover {
  background: var(--ui-control-hover-background, transparent);
}
.aw-card:has(input:checked) {
  border-color: var(--aw-accent);
  box-shadow: inset 0 0 0 1px var(--aw-accent);
}
.aw-card:has(input:focus-visible) {
  outline: 2px solid var(--aw-accent);
  outline-offset: 2px;
}
.aw-card input {
  position: absolute;
  left: 13px;
  top: 14px;
  margin: 0;
  accent-color: var(--aw-accent);
}
.aw-card-title {
  font-weight: 600;
}
.aw-card-text {
  color: var(--aw-sub);
  font-size: 12px;
}
.aw-strength small {
  color: var(--aw-muted);
  font-size: 11px;
}
.aw-art {
  position: relative;
  height: clamp(200px, 32vw, 280px);
  overflow: hidden;
  border: 1px solid var(--aw-line);
  border-radius: 6px;
}
.aw-canvas {
  display: block;
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
}
.aw-caption {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  color: var(--aw-muted);
  font:
    9px/1.3 ui-monospace,
    monospace;
  letter-spacing: 0.04em;
}
.aw-controls {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px 16px;
}
.aw-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.aw-field > span:first-child {
  font-size: 12px;
  color: var(--aw-sub);
}
.aw-world input[type="color"] {
  width: 100%;
  height: 30px;
  border: 1px solid var(--aw-line);
  background: transparent;
  border-radius: 4px;
  padding: 2px;
}
.aw-world select,
.aw-world button {
  font: inherit;
  color: inherit;
  background: var(--ui-bg-secondary, Field);
  border: 1px solid var(--aw-line);
  border-radius: 4px;
  min-height: 30px;
  padding: 4px 10px;
  max-width: 100%;
}
.aw-world select {
  width: 100%;
}
.aw-world button {
  cursor: pointer;
}
.aw-world button:hover:not(:disabled) {
  background: var(--ui-control-hover-background, ButtonFace);
}
.aw-world button:disabled {
  opacity: 0.55;
  cursor: default;
}
.aw-world :is(button, select, input, textarea, summary):focus-visible {
  outline: 2px solid var(--aw-accent);
  outline-offset: 3px;
}
.aw-speed {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 30px;
}
.aw-speed input {
  width: 100%;
  min-width: 30px;
  accent-color: var(--aw-accent);
}
.aw-speed output {
  font:
    11px ui-monospace,
    monospace;
  min-width: 36px;
}
.aw-strength {
  max-width: 420px;
}
.aw-actions {
  grid-column: 1/-1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
}
.aw-eco {
  display: flex;
  gap: 6px;
  align-items: center;
}
.aw-note {
  grid-column: 1/-1;
  color: var(--aw-muted);
  font-size: 11px;
}
.aw-note:empty {
  display: none;
}
.aw-fallback {
  padding: 24px;
  line-height: 1.7;
}
.aw-individual { grid-column: 1/-1; min-width: 0; }
.aw-individual summary { cursor: pointer; padding: 4px 0; }
.aw-individual p { color: var(--aw-sub); font-size: 12px; margin: 6px 0 10px; }
.aw-colour-slots { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px 16px; }
.aw-bg-status { color: var(--aw-sub); font-size: 12px; }
.aw-bg-status:empty { display: none; }
.aw-bg-diag { width: 100%; font: 11px/1.4 ui-monospace, SFMono-Regular, Consolas, monospace; color: var(--aw-ink); background: transparent; border: 1px solid var(--aw-line); border-radius: 6px; padding: 8px; resize: vertical; }
.aw-world [hidden] {
  display: none !important;
}
@media (max-width: 480px) {
  .aw-world {
    padding: 14px 14px 24px;
    gap: 22px;
  }
}
`;
