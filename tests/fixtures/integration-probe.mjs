import plugin from '../../desktop/plugin.js';
import {mount,flush,unmount} from './integration-runtime.mjs';
import {WORLD_IDS} from '../../src/settings-v3.js';
import {sceneById} from '../../src/lab/scenes/registry.js';
const report={ok:false,checks:[],scenes:[],errors:[],mock:'Minimal JSX/effect SDK boundary, actual generated plugin Settings registration; not real React or Mac Hermes.'};
window.addEventListener('error',e=>report.errors.push(e.message));
const assert=(v,msg)=>{if(!v)throw Error(msg);};
const wait=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
const data={'settings.v2':{scene:'koi',koiCount:3}},before=JSON.stringify(data);
const storage={get:(k,f)=>data[k]??f,set:(k,v)=>{data[k]=structuredClone(v);}};
const pages=[],contributions=[],disposers=[];
const ctx={storage,registerSettingsPage:p=>{pages.push(p);return()=>{};},register:c=>{contributions.push(c);return()=>{};},onDispose:fn=>disposers.push(fn)};
const q=s=>document.querySelector(s);
const change=(name,value,event='change')=>{const input=q(`[name="${name}"]`);assert(input,'missing control '+name);if(input.type==='checkbox')input.checked=value;else input.value=String(value);input.dispatchEvent(new Event(event,{bubbles:true}));};
const canvas=()=>q('.aw-canvas');
const pixelHash=c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let h=2166136261;for(let i=0;i<d.length;i++)h=Math.imul(h^d[i],16777619);return h>>>0;};
try {
 plugin.register(ctx);assert(pages.length===1,'one actual settings page');
 mount(pages[0].render(),q('#root'));
 const title=contributions.find(c=>c.area==='titlebar.right');assert(title,'titlebar registration');mount(title.render(),q('#titlebar'));flush();await wait();
 assert(JSON.stringify(data)===before,'startup must not write');
 assert(q('[name=scene]').options.length===23,'native selector has exactly 23 entries');
 assert(!q('.aw-fallback')?.textContent,'no renderer error');
 change('bgEnabled',true);await wait();assert(document.querySelectorAll('canvas').length===2,'preview plus optional background only');
 const front=q('[name=bgPlacement][value=front]');front.checked=true;front.dispatchEvent(new Event('change',{bubbles:true}));await wait();
 q('.aw-pause').click();await wait();
 for(const id of WORLD_IDS){
  change('scene',id);await wait();
  const def=sceneById(id),prefix=id==='koi'?'koi':'jelly';
  const countName=def?'count':prefix+'Count';
  const saved=data['settings.v3'];assert(saved?.scene===id,'saved selection '+id);
  assert(!q('.aw-fallback')?.textContent,'render failure '+id);
  const base=pixelHash(canvas());
  change(countName,0,def?'input':'change');await wait();
  assert(data['settings.v3'].scenes[id].count===0,'count zero persisted '+id);
  const c=canvas(),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  if(def){for(let i=4;i<d.length;i+=4)assert(d[i]===d[0]&&d[i+1]===d[1]&&d[i+2]===d[2]&&d[i+3]===d[3],'count zero uniform '+id);}
  const bg=q('body > [data-ascii-worlds-bg="layer"] canvas');assert(bg,'background stays mounted');
  if(def){const d=bg.getContext('2d').getImageData(0,0,bg.width,bg.height).data;assert(d.every(v=>v===0),'transparent count zero '+id);}
  change(countName,def?def.count.default:(id==='koi'?3:5),def?'input':'change');await wait();assert(pixelHash(canvas())!==pixelHashZero(d),'count restore visible '+id);
  if(def){
   for(const name of ['size','strength','speed','density'])assert(q(`[name=${name}]`),'universal control '+id+' '+name);
   assert(!!q('[name=flow]')===!!def.flow,'flow applicability '+id);
   for(const e of def.extras||[])assert(q(`[name="extra-${e.key}"]`),'extra '+id+' '+e.key);
   assert(q('[name=colour]').options.length===(id==='night-sky'?9:10),'palette modes '+id);
   change('size',0.7,'input');change('speed',0.35,'input');change('density','bold');await wait();
   const a=data['settings.v3'].scenes[id];assert(a.size===0.7&&a.speed===0.35&&a.density==='bold','native controls persist '+id);
   if(id!=='night-sky'){change('color-0','#ff3344');assert(data['settings.v3'].scenes[id].colors[0]==='#ff3344','slot edit '+id);change('count',0,'input');change('count',1,'input');assert(data['settings.v3'].scenes[id].colors[0]==='#ff3344','slot retained '+id);}
  }
  report.scenes.push(id);report.checks.push(id+': native selection, count zero/restore, background, controls, persistence');
 }
 assert(JSON.stringify(data['settings.v2'])===JSON.stringify({scene:'koi',koiCount:3}),'legacy rollback unchanged');
 change('scene','owl');await wait();q('[aria-label="Reset active scene to defaults"]').click();await wait();assert(data['settings.v3'].scenes.owl.size===1,'active reset');assert(data['settings.v3'].scenes['manta-rays'].size===0.7,'other scene retained');
 const durable=JSON.stringify(data);storage.set=()=>{throw Error('quota');};change('size',0.9,'input');assert(q('.aw-note').textContent.includes('memory-only'),'failed scene save warning');change('scene','manta-rays');change('scene','owl');assert(q('[name=size]').value==='0.9','failed edit retained');change('bgStrength',40,'input');assert(q('.aw-bg-status').textContent.includes('memory-only'),'background failure warning');assert(JSON.stringify(data)===durable,'write failure preserves readable data');
 unmount();for(const dispose of disposers)dispose();assert(!q('body > [data-ascii-worlds-bg="layer"]'),'background disposed');assert(!q('.aw-world'),'settings disposed');
 report.checks.push('active reset isolation; scene/background quota failure; memory-only switching; host disposal');report.ok=true;
} catch(e){report.errors.push(e.stack||String(e));}
function pixelHashZero(d){let h=2166136261;for(let i=0;i<d.length;i++)h=Math.imul(h^d[i],16777619);return h>>>0;}
q('#result').textContent=JSON.stringify(report);document.documentElement.dataset.complete='true';
