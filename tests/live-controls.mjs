// Supplemental final-file tests: every live Speed control; native flow/extras
// change both preview and background at held nonzero clocks.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {writeFile} from 'node:fs/promises';
import {WORLD_IDS} from '../src/settings-v3.js';
import {sceneById} from '../src/lab/scenes/registry.js';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1100,height:900},colorScheme:'dark'});
const report={speed:[],flowExtras:[],errors:[],network:[]};
page.on('pageerror',e=>report.errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))report.network.push(r.url());});
const native=async(name,value)=>{await page.evaluate(({name,value})=>{const e=document.querySelector(`[name="${name}"]`);if(!e)throw Error('missing '+name);if(e.type==='checkbox')e.checked=value;else e.value=String(value);e.dispatchEvent(new Event(['range','number'].includes(e.type)?'input':'change',{bubbles:true}));},{name,value});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
const hashes=()=>page.evaluate(()=>[document.querySelector('.aw-canvas'),document.querySelector('body > [data-ascii-worlds-bg="layer"] canvas')].map(c=>c.toDataURL()));
try{
 await page.goto(new URL('../demo.html',import.meta.url).href+'?chat=1&paused=true');await page.waitForFunction(()=>asciiWorlds?.stats?.glyphs>0);await native('bgEnabled',true);
 for(const id of WORLD_IDS){
  await page.evaluate(id=>{asciiWorlds.setSettings({scene:id,paused:true});asciiWorlds.resetScene();},id);await page.locator('.aw-canvas').scrollIntoViewIfNeeded();
  const deltas=[];
  for(const speed of [0.2,1.5]){await native('speed',speed);await page.locator('.aw-pause').evaluate(e=>e.click());const a=await page.evaluate(()=>asciiWorlds.stats.time);await page.waitForTimeout(400);await page.locator('.aw-pause').evaluate(e=>e.click());const b=await page.evaluate(()=>asciiWorlds.stats.time);deltas.push(b-a);}
  assert.ok(deltas[0]>0&&deltas[1]>deltas[0]*2,id+' actual Speed increases live clock');report.speed.push({id,slow:deltas[0],fast:deltas[1]});
  const def=sceneById(id);if(!def)continue;
  await page.evaluate(()=>asciiWorlds.renderAt(10,2));
  for(const [key,lo,hi] of [...(def.flow?[['flow',def.flow.min??0,def.flow.max??1.5]]:[]),...(def.extras||[]).filter(e=>e.key!=='shooting').map(e=>['extra-'+e.key,e.type==='toggle'?false:e.min,e.type==='toggle'?true:e.max])]){
   await native(key,lo);const a=await hashes();await native(key,hi);const b=await hashes();assert.ok(a.every((v,i)=>v!==b[i]),id+' '+key+' actual BOTH path effect');report.flowExtras.push({id,key,both:true});
  }
 }
 // Keep background running until first deterministic high-frequency meteor.
 await page.evaluate(()=>{asciiWorlds.setSettings({scene:'owl',paused:true});asciiWorlds.setSettings({scene:'night-sky',paused:true});asciiWorlds.resetScene();});await native('speed',2);await native('extra-shooting',2);await page.locator('.aw-canvas').scrollIntoViewIfNeeded();
 await page.locator('.aw-pause').evaluate(e=>e.click());await page.waitForFunction(()=>asciiWorlds.stats.time>=9.4);await page.locator('.aw-pause').evaluate(e=>e.click());await page.evaluate(()=>asciiWorlds.renderAt(9.441774639463983,9));
 const a=await hashes();await native('extra-shooting',0);const b=await hashes();assert.ok(a.every((v,i)=>v!==b[i]),'actual meteor visible then disabled on BOTH paths');report.flowExtras.push({id:'night-sky',key:'shooting',both:true});
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.network,[]);report.passed=true;
}catch(e){report.passed=false;report.failure=e.stack;process.exitCode=1;}finally{await writeFile(new URL('../evidence/integration/live-controls-results.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
