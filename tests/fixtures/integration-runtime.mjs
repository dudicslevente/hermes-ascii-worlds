// Test-only minimal JSX/effect boundary, not React conformance or Mac evidence.
// It runs the actual generated plugin registration and Settings contribution.
export class Component { constructor(props){this.props=props;this.state={};} }
const effects=[];const cleanups=[];
export const useRef=()=>({current:null});
export const useState=v=>[v,()=>{}];
export const useEffect=fn=>effects.push(fn);
export const jsx=(type,props)=>({type,props:props||{}});
export function mount(node,parent) {
 if(node===null||node===undefined||node===false)return;
 if(Array.isArray(node)){for(const n of node)mount(n,parent);return;}
 if(typeof node!=='object'){parent.append(document.createTextNode(String(node)));return;}
 const {type,props}=node;
 if(typeof type==='function') {mount(type.prototype?.render?new type(props).render():type(props),parent);return;}
 const el=document.createElement(type);
 for(const [k,v] of Object.entries(props)) {
  if(k==='children')continue;
  if(k==='ref'){v.current=el;continue;}
  if(k==='style'){Object.assign(el.style,v);continue;}
  if(k.startsWith('on'))el.addEventListener(k.slice(2).toLowerCase(),v);
  else if(k==='className')el.className=v;
  else if(v!==false&&v!==undefined)el.setAttribute(k,String(v));
 }
 mount(props.children,el);parent.append(el);
}
export function flush(){while(effects.length){const off=effects.shift()();if(typeof off==='function')cleanups.push(off);}}
export function unmount(){while(cleanups.length)cleanups.pop()();}
export const Button=props=>jsx('button',props);
export const TITLEBAR_AREAS={right:'titlebar.right'};
export const PALETTE_AREA='palette';
export const SETTINGS_PLUGINS_AREA='settings.plugins';
export const host={navigate(){}};
export const pluginSettingsHref=id=>'/settings/plugins/'+id;
