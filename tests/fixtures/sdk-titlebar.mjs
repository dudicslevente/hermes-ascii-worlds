// Mock SDK for tests (NOT the real Hermes Desktop SDK). Exposes the newer exports.
// ?nonav drops host.navigate and pluginSettingsHref; ?noarea drops SETTINGS_PLUGINS_AREA.
import React from 'react';
const flags = new URLSearchParams(globalThis.location?.search || '');
export function Button({children,variant,size,asChild,className='',...props}){return React.createElement('button',{...props,className:'sdk-button '+className},children)}
export function cn(...values){return values.filter(Boolean).join(' ')}
export const host = flags.has('nonav')
  ? {notify(){},onEvent(){return()=>{}},state:{}}
  : {notify(){},onEvent(){return()=>{}},state:{},navigate(href){(globalThis.__navigated ||= []).push(href)}};
export const TITLEBAR_AREAS={left:'titlebar.left',center:'titlebar.center',right:'titlebar.right'};
export const PALETTE_AREA='palette';
export const SETTINGS_PLUGINS_AREA = flags.has('noarea') ? undefined : 'settings.plugins';
export const pluginSettingsHref = flags.has('nonav') ? undefined : (id) => `/settings/plugins/${id}`;
