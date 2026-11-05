import {launch,waitFor} from './cdp.mjs';
import {WORLD_IDS} from '../src/settings-v3.js';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const out=new URL('../evidence/integration/',import.meta.url);mkdirSync(out,{recursive:true});
const b=await launch(),report={scenes:[],checks:[],errors:[]};
try {
 await b.send('Emulation.setDeviceMetricsOverride',{width:1000,height:800,deviceScaleFactor:1,mobile:false});
 await b.send('Page.navigate',{url:new URL('../demo.html',import.meta.url).href+'?paused=true'});
 await waitFor(b,'window.asciiWorlds?.stats?.glyphs>0');
 for(const tone of ['dark','light']) {
  await b.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:tone}]});
  await b.evaluate(`window.tiles=[]`);
  for(const id of WORLD_IDS){
   const result=await b.evaluate(`(async()=>{asciiWorlds.setSettings({scene:${JSON.stringify(id)},paused:true});asciiWorlds.resetScene();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));asciiWorlds.renderAt(2,2);const c=document.querySelector('.aw-canvas'),first=c.toDataURL(),s=asciiWorlds.stats;asciiWorlds.renderAt(2,2);const deterministic=first===c.toDataURL();tiles.push({id:${JSON.stringify(id)},url:first});return {id:${JSON.stringify(id)},tone:${JSON.stringify(tone)},height:c.getBoundingClientRect().height,glyphs:s.glyphs,deterministic,palette:s.palette};})()`);
   assert.ok(result.height>=320||['koi','jellyfish'].includes(id),id+' Lab preview needs useful height');assert.ok(result.glyphs>0,id+' '+tone+' nonempty');assert.ok(result.deterministic,id+' deterministic');assert.equal(result.palette,tone);report.scenes.push(result);
  }
  const data=await b.evaluate(`(async()=>{const c=document.createElement('canvas');c.width=1200;c.height=1100;const x=c.getContext('2d');x.fillStyle=${JSON.stringify(tone==='dark'?'#0f1214':'#f1ede4')};x.fillRect(0,0,c.width,c.height);for(let i=0;i<tiles.length;i++){const image=new Image();image.src=tiles[i].url;await image.decode();const a=(i%4)*300,y=Math.floor(i/4)*220;x.drawImage(image,a,y+22,300,190);x.fillStyle=${JSON.stringify(tone==='dark'?'#eeeeee':'#222222')};x.font='14px monospace';x.fillText(tiles[i].id,a+8,y+18);}return c.toDataURL();})()`);
  writeFileSync(new URL('all20-'+tone+'.png',out),Buffer.from(data.split(',')[1],'base64'));
 }
 await b.send('Emulation.setDeviceMetricsOverride',{width:375,height:800,deviceScaleFactor:1,mobile:false});
 for(const scene of ['sleeping-cat','owl','night-sky']){
  await b.evaluate(`asciiWorlds.setSettings({scene:${JSON.stringify(scene)}});asciiWorlds.renderAt(2,2)`);
  const layout=await b.evaluate('({scroll:document.documentElement.scrollWidth,width:innerWidth})');assert.ok(layout.scroll<=layout.width,scene+' phone overflow');
  const shot=await b.send('Page.captureScreenshot',{format:'png'});writeFileSync(new URL(scene+'-375-light.png',out),Buffer.from(shot.data,'base64'));
 }
 const disposed=await b.evaluate(`(()=>{asciiWorlds.destroy();const before=JSON.stringify(asciiWorlds.settings),saved=JSON.stringify(localStorage);asciiWorlds.resetScene();asciiWorlds.setSettings({scene:'koi'});asciiWorlds.resume();asciiWorlds.renderAt(3);return before===JSON.stringify(asciiWorlds.settings)&&saved===JSON.stringify(localStorage);})()`);assert.ok(disposed,'disposed mutators inert');
 report.checks.push('40 actual default glyph render/determinism/theme cases','375px Cat/Owl/Sky no horizontal overflow','disposed mutators do not change settings/storage');
 writeFileSync(new URL('demo-probe-results.json',out),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({cases:report.scenes.length,checks:report.checks}));
}finally{await b.close();}
