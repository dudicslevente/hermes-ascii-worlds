// Artifact-bound R1/R2/R3 regressions against the real bundle + real React.
// No live Desktop claim. Optional ASCII_WORLDS_PLUGIN targets extracted bytes.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=process.env.ASCII_WORLDS_TEST_OUT||path.join(root,'evidence/browser');
await mkdir(output,{recursive:true});
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
const origin='https://ascii-worlds-correction.invalid/';
const report={plugin:process.env.ASCII_WORLDS_PLUGIN||path.join(root,'desktop/plugin.js'),checks:[],errors:[],warnings:[],remote:[]};
const chosen=process.argv[2]||'all';
async function open(reducedMotion='no-preference'){
 const c=await browser.newContext({viewport:{width:1000,height:850},colorScheme:'dark',reducedMotion});
 await c.route('**/*',async r=>{
  const u=new URL(r.request().url());if(u.origin!==new URL(origin).origin){report.remote.push(u.href);return r.abort();}
  const file=u.pathname==='/'?'tests/fixtures/host-bg.html':u.pathname==='/plugin.js'?null:u.pathname.startsWith('/browser-deps/')?'tests/.harness'+u.pathname:'tests'+u.pathname;
  try{await r.fulfill({status:200,contentType:file?.endsWith('.html')?'text/html':'text/javascript',body:await readFile(file?path.join(root,file):report.plugin)});}catch{report.remote.push(u.href);await r.fulfill({status:404,body:'not found'});}
 });
 const p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(['error','warning'].includes(m.type()))report.warnings.push(m.text());});
 await p.addInitScript(()=>{
  const set=Storage.prototype.setItem;window.denyRecords=[];
  Storage.prototype.setItem=function(k,v){if(denyRecords.some(x=>k.endsWith(x)))throw Error('test quota');return set.call(this,k,v)};
  const draws=new WeakMap(),fill=CanvasRenderingContext2D.prototype.fillText;
  window.drawCount=c=>draws.get(c)||0;
  CanvasRenderingContext2D.prototype.fillText=function(...a){draws.set(this.canvas,(draws.get(this.canvas)||0)+1);return fill.apply(this,a)};
  const raf=requestAnimationFrame,caf=cancelAnimationFrame;window.framesActive=new Set();
  window.requestAnimationFrame=fn=>{const id=raf(t=>{framesActive.delete(id);fn(t)});framesActive.add(id);return id};
  window.cancelAnimationFrame=id=>{framesActive.delete(id);caf(id)};
  const timeout=setTimeout,clear=clearTimeout;window.timersActive=new Set();
  window.setTimeout=(fn,ms,...args)=>{const id=timeout(()=>{timersActive.delete(id);fn(...args)},ms);timersActive.add(id);return id};
  window.clearTimeout=id=>{timersActive.delete(id);clear(id)};
 });
 await p.goto(origin+'?only=1');await p.waitForSelector('.aw-canvas');await p.locator('.aw-canvas').scrollIntoViewIfNeeded();await settle(p);return {p,c};
}
async function settle(p){await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))}
async function native(p,name,value){await p.evaluate(({name,value})=>{const e=document.querySelector(`[name="${name}"]`);if(!e)throw Error('missing '+name);if(e.type==='checkbox')e.checked=value;else e.value=String(value);e.dispatchEvent(new Event(['number','range'].includes(e.type)?'input':'change',{bubbles:true}));},{name,value});await settle(p)}
const canvases=p=>p.evaluate(()=>['.aw-canvas','body > [data-ascii-worlds-bg="layer"] canvas'].map(s=>{const c=document.querySelector(s);return {draws:drawCount(c),png:c.toDataURL()}}));
async function bg(p){await native(p,'bgEnabled',true);await p.locator('[name=bgPlacement][value=front]').check();await p.locator('.aw-canvas').scrollIntoViewIfNeeded();await settle(p)}
try{
 if(['all','R1'].includes(chosen)){
  const {p,c}=await open();
  await p.evaluate(()=>denyRecords=['settings.v3','background.v1']);await native(p,'speed',1.05);await native(p,'bgStrength',45);
  assert.match(await p.locator('.aw-note').innerText(),/memory-only/);assert.match(await p.locator('.aw-bg-status').innerText(),/memory-only/);
  await p.evaluate(()=>denyRecords=['background.v1']);await native(p,'speed',1.1);
  assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('mock-ascii:settings.v3')).scenes.koi.speed),1.1);
  assert.doesNotMatch(await p.locator('.aw-note').innerText(),/memory-only/,'R1 recovered scene warning must clear');
  assert.match(await p.locator('.aw-bg-status').innerText(),/memory-only/,'R1 other failed record remains unsaved');
  await p.evaluate(()=>denyRecords=[]);await native(p,'bgStrength',46);
  assert.doesNotMatch(await p.locator('.aw-bg-status').innerText(),/memory-only/);
  assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('mock-ascii:background.v1')).strength),0.46);
  await p.evaluate(()=>denyRecords=['settings.v3']);await native(p,'speed',1.15);await native(p,'bgStrength',47);
  assert.match(await p.locator('.aw-note').innerText(),/memory-only/,'R1 background success cannot clear failed settings');
  await p.evaluate(()=>denyRecords=[]);await native(p,'speed',1.2);assert.doesNotMatch(await p.locator('.aw-note').innerText(),/memory-only/);
  report.checks.push('R1 separate-record save failure/recovery in both orders, exact durable values');await c.close();
 }
 if(['all','R2'].includes(chosen)){
  const {p,c}=await open('reduce');await native(p,'scene','owl');await bg(p);
  assert.equal(await p.locator('.aw-pause').innerText(),'Resume motion');let a=await canvases(p);await p.waitForTimeout(350);let b=await canvases(p);assert.ok(a.every((x,i)=>x.draws===b[i].draws),'R2 initial safe stills');
  await p.locator('.aw-pause').click();await p.waitForTimeout(160);a=await canvases(p);await p.waitForTimeout(500);b=await canvases(p);
  assert.ok(a.every((x,i)=>b[i].draws>x.draws),'R2 explicit Resume animates BOTH canvases beyond one repaint');
  // Close only Settings, leave the titlebar/background mounted.
  await p.evaluate(async()=>{const {createRoot}=await import('react-dom/client');const React=await import('react');hostTest.unmount();const r=createRoot(document.querySelector('#tb-right'));r.render(React.createElement(React.StrictMode,null,hostTest.contributions.find(x=>x.area==='titlebar.right').render()));window.onlyTitlebar=r;});await p.waitForTimeout(150);
  a=await p.evaluate(()=>drawCount(document.querySelector('body > [data-ascii-worlds-bg="layer"] canvas')));await p.waitForTimeout(350);b=await p.evaluate(()=>drawCount(document.querySelector('body > [data-ascii-worlds-bg="layer"] canvas')));assert.ok(b>a,'R2 opt-in survives Settings close');
  await p.evaluate(()=>{onlyTitlebar.unmount();hostTest.mount()});await p.waitForSelector('.aw-canvas');await p.locator('.aw-canvas').scrollIntoViewIfNeeded();assert.equal(await p.locator('.aw-pause').innerText(),'Pause motion','R2 opt-in survives reopen');
  await p.emulateMedia({reducedMotion:'no-preference'});await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(180);a=await canvases(p);await p.waitForTimeout(350);b=await canvases(p);assert.ok(a.every((x,i)=>x.draws===b[i].draws),'R2 new OS hold revokes opt-in');assert.equal(await p.locator('.aw-pause').innerText(),'Resume motion');
  await p.evaluate(()=>hostTest.dispose());await p.waitForTimeout(30);assert.equal(await p.evaluate(()=>framesActive.size),0);assert.equal(await p.locator('[data-ascii-worlds-bg=layer]').count(),0);
  report.checks.push('R2 safe reduced-motion startup, explicit shared Resume, close/reopen, new hold, disposal');await c.close();
 }
 if(['all','R3'].includes(chosen))for(const id of ['koi','owl']){
  const {p,c}=await open();await native(p,'scene',id);await bg(p);await p.locator('.aw-pause').click();await p.waitForTimeout(100);let a=await canvases(p);
  await p.evaluate(()=>document.documentElement.style.setProperty('--ui-text-primary','#1d2a2e','important'));await p.waitForTimeout(1600);let b=await canvases(p);
  assert.ok(a.every((x,i)=>x.png!==b[i].png),'R3 '+id+' host-token-only switch repaints BOTH paused stills');
  assert.equal(await p.locator('.aw-pause').innerText(),'Resume motion');await p.waitForTimeout(1200);a=await canvases(p);assert.ok(a.every((x,i)=>x.draws===b[i].draws),'R3 no resumed motion/redundant painting');
  await p.evaluate(()=>document.documentElement.style.setProperty('--ui-text-primary','#e1e6e9','important'));await p.waitForTimeout(1600);b=await canvases(p);assert.ok(a.every((x,i)=>x.png!==b[i].png),'R3 dark reversal');
  assert.equal(await p.evaluate(()=>framesActive.size),0,'R3 no paused RAF loop');assert.ok(await p.evaluate(()=>timersActive.size<=2),'R3 bounded theme checks');
  await p.setViewportSize({width:1000,height:350});await p.evaluate(()=>{document.querySelector('#side').scrollTop=1e6});await p.waitForTimeout(120);assert.ok(await p.evaluate(()=>document.querySelector('.aw-canvas').getBoundingClientRect().bottom<0),'R3 truly offscreen');assert.equal(await p.evaluate(()=>timersActive.size),1,'R3 offscreen preview cancels its watcher');
  await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))});assert.equal(await p.evaluate(()=>timersActive.size),0,'R3 hidden suspends all theme checks');
  await p.evaluate(()=>hostTest.dispose());await p.waitForTimeout(30);assert.equal(await p.evaluate(()=>timersActive.size),0);assert.equal(await p.evaluate(()=>framesActive.size),0);
  report.checks.push('R3 '+id+' both paused paths light/dark, no resumed motion, bounded/hidden/offscreen/disposed timers');await c.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.warnings,[]);assert.deepEqual(report.remote,[]);report.passed=true;
}catch(e){report.passed=false;report.failure=e.stack;process.exitCode=1;}finally{await writeFile(path.join(output,'recovery-'+chosen+'.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));await browser.close();}
