// Final-file startup migration and storage-denial regressions.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {writeFile} from 'node:fs/promises';
const {chromium}=await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
const report={checks:[],errors:[],network:[]};
try{
 const c=await browser.newContext({viewport:{width:1000,height:850},offline:true});const p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url()))report.network.push(r.url());});
 await p.addInitScript(()=>{const set=Storage.prototype.setItem;set.call(localStorage,'ascii-worlds.settings.v2',JSON.stringify({scene:'jellyfish',jellyCount:7,jellyColour:'individual',jellyTint:'#123456',jellyColors:['#112233','#445566'],koiCount:4,koiColour:'forest',speed:1.1,density:'bold',paused:true,eco:true}));set.call(localStorage,'ascii-worlds.background.v1',JSON.stringify({enabled:true,placement:'front',strength:0.44}));Storage.prototype.setItem=function(){throw Error('quota denied')};Storage.prototype.removeItem=function(){throw Error('remove denied')};});
 await p.goto(new URL('../demo.html',import.meta.url).href+'?chat=1');await p.waitForFunction(()=>asciiWorlds?.stats?.glyphs>0);
 const initial=await p.evaluate(()=>({s:asciiWorlds.settings,durable:JSON.stringify(localStorage),opacity:getComputedStyle(document.querySelector('body > [data-ascii-worlds-bg="layer"] canvas')).opacity}));
 assert.equal(initial.s.scene,'jellyfish');assert.equal(initial.s.jellyCount,7);assert.equal(initial.s.koiCount,4);assert.equal(initial.s.koiColour,'forest');assert.equal(initial.s.speed,1.1);assert.equal(initial.s.paused,true);assert.equal(initial.opacity,'0.44');
 const before=await p.evaluate(()=>asciiWorlds.stats.frames);await p.waitForTimeout(250);assert.equal(await p.evaluate(()=>asciiWorlds.stats.frames),before);
 await p.evaluate(()=>{asciiWorlds.setSettings({scene:'owl',size:0.7});asciiWorlds.setSettings({scene:'manta-rays',size:1.4});asciiWorlds.setSettings({scene:'owl'});});assert.equal(await p.locator('[name=size]').inputValue(),'0.7');assert.ok((await p.locator('.aw-note').innerText()).includes('memory-only'));assert.equal(await p.evaluate(()=>JSON.stringify(localStorage)),initial.durable);report.checks.push('readable v2 and background preferences load unchanged under write+remove denial; saved Pause held; scene-isolated memory-only edits warn and preserve durable records');
 await p.evaluate(()=>{asciiWorldsBackground.hub.bg.set({strength:0.5});});assert.ok((await p.locator('.aw-bg-status').innerText()).includes('memory-only'));assert.equal(await p.evaluate(()=>JSON.stringify(localStorage)),initial.durable);report.checks.push('failed background edit changes session state, retains readable records, warns');
 await p.close();
 const denied=await c.newPage();await denied.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw Error('getter denied')}})});await denied.goto(new URL('../demo.html',import.meta.url).href);await denied.waitForFunction(()=>asciiWorlds?.stats?.glyphs>0);assert.equal(await denied.evaluate(()=>asciiWorlds.settings.scene),'koi');report.checks.push('denied localStorage getter falls back safely to default render');await c.close();
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.network,[]);report.passed=true;
}catch(e){report.passed=false;report.failure=e.stack;process.exitCode=1;}finally{await writeFile(new URL('../evidence/integration/storage-browser-results.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
