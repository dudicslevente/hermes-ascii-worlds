// Real React/Strict Mode generated-plugin controls + all-scene timed evidence.
// Local mock only: not live Mac Hermes certification.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {WORLD_IDS,colourModes} from '../src/settings-v3.js';
import {sceneById} from '../src/lab/scenes/registry.js';
import {showsMoon} from '../src/lab/core/sky.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const out=root+'evidence/integration/all20/';await mkdir(out,{recursive:true});
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
const server=createServer(async(req,res)=>{try{const p=req.url.split('?')[0];const f=p==='/'?'tests/fixtures/host-bg.html':p==='/plugin.js'?'desktop/plugin.js':p.startsWith('/browser-deps/')?'tests/.harness'+p:'tests'+p;const data=await readFile(root+f);res.setHeader('Content-Type',f.endsWith('.html')?'text/html':'text/javascript');res.end(data);}catch{res.statusCode=404;res.end('not found');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}/`;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
const errors=[],warnings=[],remote=[],report={ids:WORLD_IDS,controls:[],stills:[],motion:[],limits:['Mock host/Chromium only; no live Mac proof.','Legacy ambient pond dots remain at zero creatures; glyph-art count is zero.','High populations/large sizes may overlap. Whale deliberately leaves the stage.']};
const context=await browser.newContext({viewport:{width:1000,height:850},colorScheme:'dark'});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['error','warning'].includes(m.type()))warnings.push(m.text());});page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(base))remote.push(r.url());});
const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
const native=async(name,value)=>{await page.evaluate(({name,value})=>{const e=document.querySelector(`[name="${name}"]`);if(!e)throw Error('missing '+name);if(e.type==='checkbox')e.checked=value;else e.value=String(value);e.dispatchEvent(new Event((e.type==='range'||e.type==='number')?'input':'change',{bubbles:true}));},{name,value});await settle();};
const pixels=()=>page.evaluate(()=>[document.querySelector('.aw-canvas'),document.querySelector('body > [data-ascii-worlds-bg="layer"] canvas')].map(c=>{if(!c)return null;const s=document.createElement('canvas');s.width=c.width;s.height=c.height;const x=s.getContext('2d',{willReadFrequently:true});x.drawImage(c,0,0);const d=x.getImageData(0,0,s.width,s.height).data;let h=2166136261,n=0;for(let i=0;i<d.length;i++){h=Math.imul(h^d[i],16777619);if(i%4===3&&d[i])n++;}return {hash:h>>>0,alpha:n,w:c.width,h:c.height};}));
try{
 await page.goto(base+'?only=1');await page.waitForSelector('.aw-canvas');await native('bgEnabled',true);
 await page.locator('[name=bgPlacement][value=front]').check();
 if(await page.locator('.aw-pause').innerText()==='Pause motion')await page.locator('.aw-pause').click();
 for(const id of WORLD_IDS){
  await native('scene',id);await page.locator('.aw-canvas').scrollIntoViewIfNeeded();await settle();
  const def=sceneById(id),count=def?'count':id==='koi'?'koiCount':'jellyCount';
  const start=await pixels();assert.ok(start.every(x=>x&&x.alpha>0),id+' both paths render');
  await native(count,0);const zero=await pixels();if(def)assert.equal(zero[1].alpha,0,id+' zero transparent');
  await native(count,def?def.count.default:id==='koi'?3:5);const restore=await pixels();assert.ok(restore[0].hash!==zero[0].hash,id+' restore preview');assert.ok(restore[1].hash!==zero[1].hash,id+' restore background');
  const tested=[];
  for(const [name,value] of [['density','bold'],['colour','ember'],['colour','cyan'],['tint','#cf2040'],...(def?[['size',0.6],['strength',0.3]]:[])]){
   const before=await pixels();await native(name,value);const after=await pixels();assert.ok(before.every((p,i)=>p.hash!==after[i].hash),id+' '+name+' reaches BOTH canvases');tested.push(name+'='+value);
  }
  // Every named palette reaches both actual canvas paths, not only a kit
  // normalizer. Custom is exercised above; Individual is exercised below.
  for(const mode of colourModes(id).filter(mode=>!['custom','individual'].includes(mode))){
   const before=await pixels();await native('colour',mode);const after=await pixels();
   assert.ok(before.every((p,i)=>p.hash!==after[i].hash),id+' palette '+mode+' reaches BOTH canvases');tested.push('palette='+mode);
  }
  if(id!=='night-sky'){
   const slot=def?'color-0':id==='koi'?'koiColor0':'jellyColor0';
   const before=await pixels();await native(slot,'#22dd66');const after=await pixels();
   assert.ok(before.every((p,i)=>p.hash!==after[i].hash),id+' Individual reaches BOTH canvases');
   assert.equal(await page.locator('[name=colour]').inputValue(),'individual');
   await native(count,0);await native(count,1);
   assert.equal(await page.locator(`[name="${slot}"]`).inputValue(),'#22dd66',id+' retained first slot');
   const slots=Math.min(10,def?.count.max??10),lastSlot=def?'color-'+(slots-1):(id==='koi'?'koiColor':'jellyColor')+(slots-1);
   await native(count,slots);await native(lastSlot,'#3355ee');await native(count,0);await native(count,slots);
   assert.equal(await page.locator(`[name="${lastSlot}"]`).inputValue(),'#3355ee',id+' retained last available slot');
   tested.push('individual both paths/first+last hidden slots/zero/restore');
  }
  await native('speed',0.35);await native('eco',true);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('mock-ascii:settings.v3')));
  assert.equal(saved.scenes[id].speed,0.35);assert.equal(saved.eco,true);
  // Koi and jellyfish have a Current since 1.3.0; other scenes only when meaningful.
  assert.equal(!!(await page.locator('[name=flow]').count()),!!def?.flow||!def,id+' no meaningless flow');
  // The Moon settings are shown exactly on the scenes that can show a moon.
  assert.equal(await page.locator('[name=moon]').isVisible(),showsMoon(def),id+' moon settings visibility');
  for(const e of def?.extras||[]){const value=e.type==='toggle'?!e.default:e.max;await native('extra-'+e.key,value);assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('mock-ascii:settings.v3')))).scenes[id].extras[e.key],value);tested.push('extra '+e.key);}
  report.controls.push({id,tested});
 }
 // Real default Settings preview and background dimensions, narrow and wide,
 // both automatic themes. Reset only active scene; global pause kept.
 for(const tone of ['dark','light'])for(const width of [1000,375]){
  await page.setViewportSize({width,height:850});await page.emulateMedia({colorScheme:tone});await page.waitForTimeout(1100);
  for(const id of WORLD_IDS){
   await native('scene',id);await page.getByRole('button',{name:'Reset active scene to defaults',exact:true}).click();await page.locator('.aw-canvas').scrollIntoViewIfNeeded();await settle();
   const tiles=await page.evaluate(()=>[document.querySelector('.aw-canvas'),document.querySelector('body > [data-ascii-worlds-bg="layer"] canvas')].map(c=>({url:c.toDataURL(),width:c.width,height:c.height})));
   for(let i=0;i<tiles.length;i++){const t=tiles[i],name=`${id}-${width}-${tone}-${i?'background':'preview'}.png`;await writeFile(out+name,Buffer.from(t.url.split(',')[1],'base64'));report.stills.push({id,width,tone,path:name,canvasWidth:t.width,canvasHeight:t.height});}
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),id+' page overflow');
  }
 }
 // Cleanup/repeated mount through actual React host.
 await native('bgEnabled',false);assert.equal(await page.locator('body > [data-ascii-worlds-bg="layer"]').count(),0);
 for(let n=0;n<3;n++){await page.evaluate(()=>{hostTest.unmount();hostTest.mount();});await page.waitForSelector('.aw-canvas');}
 await page.evaluate(()=>hostTest.dispose());assert.equal(await page.locator('.aw-world').count(),0);assert.equal(await page.locator('[data-ascii-worlds-bg="layer"]').count(),0);
 await page.goto(new URL('../demo.html',import.meta.url).href+'?paused=true');await page.waitForFunction(()=>asciiWorlds?.stats?.glyphs>0);await page.setViewportSize({width:1000,height:850});await page.emulateMedia({colorScheme:'dark'});
 for(const id of WORLD_IDS){
  await page.evaluate(id=>{asciiWorlds.setSettings({scene:id,paused:true});asciiWorlds.resetScene();},id);await page.locator('.aw-canvas').scrollIntoViewIfNeeded();await settle();
  const frames=[];
  for(const b of [0,0.5,1.2,2]){const f=await page.evaluate(({id,b})=>{asciiWorlds.renderAt(2,b);const c=document.querySelector('.aw-canvas');return {url:c.toDataURL(),stats:asciiWorlds.stats};},{id,b});frames.push(f);}
  // Legacy creatures use the original single clock; sample actual t for them.
  if(id==='koi'||id==='jellyfish')for(let i=0;i<4;i++)frames[i]=await page.evaluate(t=>{asciiWorlds.renderAt(t);return {url:document.querySelector('.aw-canvas').toDataURL(),stats:asciiWorlds.stats};},2+i*0.5);
  assert.ok(new Set(frames.map(f=>f.url)).size>1,id+' actual articulated output');
  const strip=await page.evaluate(async frames=>{const c=document.createElement('canvas');c.width=1200;c.height=240;const x=c.getContext('2d');for(let i=0;i<frames.length;i++){const im=new Image();im.src=frames[i].url;await im.decode();x.drawImage(im,300*i,0,300,220);x.fillStyle='#fff';x.font='14px monospace';x.fillText('frame '+i,300*i+8,235);}return c.toDataURL();},frames);
  await writeFile(out+id+'-articulation.png',Buffer.from(strip.split(',')[1],'base64'));report.motion.push({id,distinctFrames:new Set(frames.map(f=>f.url)).size,clocks:frames.map(f=>({t:f.stats.time,b:f.stats.beat}))});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(warnings,[]);assert.deepEqual(remote,[]);report.passed=true;
}catch(e){report.passed=false;report.failure=e.stack;process.exitCode=1;}finally{report.errors=errors;report.warnings=warnings;report.remote=remote;await writeFile(out+'report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,controls:report.controls.length,stills:report.stills.length,motion:report.motion.length,failure:report.failure,errors,warnings,remote},null,2));await browser.close();await new Promise(r=>server.close(r));}
