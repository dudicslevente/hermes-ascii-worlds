// Mock SDK WITHOUT TITLEBAR_AREAS / PALETTE_AREA, to exercise graceful degradation. NOT the real SDK.
import React from 'react';
export function Button({children,variant,size,asChild,className='',...props}){return React.createElement('button',{...props,className:'sdk-button '+className},children)}
export function cn(...values){return values.filter(Boolean).join(' ')}
export const host={notify(){},onEvent(){return()=>{}},state:{}};
