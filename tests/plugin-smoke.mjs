// Actual generated plugin Settings registration under a documented mock JSX
// boundary. Real Chromium pixels/DOM; no real React or Mac claim.
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {launch,waitFor} from './cdp.mjs';
const out=new URL('../evidence/browser/',import.meta.url);mkdirSync(out,{recursive:true});
const browser=await launch();
try {
 await browser.send('Emulation.setDeviceMetricsOverride',{width:1100,height:800,deviceScaleFactor:1,mobile:false});
 await browser.send('Page.navigate',{url:new URL('./fixtures/integration-plugin.html',import.meta.url).href});
 await waitFor(browser,'document.documentElement?.dataset.complete === "true"',45000);
 const report=await browser.evaluate('JSON.parse(document.querySelector("#result").textContent)');
 writeFileSync(new URL('plugin-probe-results.json',out),JSON.stringify(report,null,2)+'\n');
 writeFileSync(new URL('plugin-probe-dom.html',out),await browser.evaluate('document.documentElement.outerHTML'));
 console.log(JSON.stringify(report,null,2));assert.equal(report.ok,true,report.errors.join('\n'));assert.equal(report.scenes.length,37);
} finally {await browser.close();}
