// Capture actual glyph frames, not vector mockups. Optional approved-preview
// modules can be supplied to check identical output at the same size/settings.
// Setup: ASCII_WORLDS_TOOLS, PLAYWRIGHT_MODULE, CHROMIUM_PATH (see DEVELOPMENT).
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../', import.meta.url));
const tools = process.env.ASCII_WORLDS_TOOLS;
if (!tools) throw Error('Set ASCII_WORLDS_TOOLS to the optional development tools directory.');
const { build } = await import(pathToFileURL(path.join(tools, 'node_modules/esbuild/lib/main.js')));
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE));
const q = JSON.stringify;
const reference = process.env.ASCII_WORLDS_REFERENCE;
const imports = reference ? (await import(pathToFileURL(path.join(root, 'src/settings-v3.js')))).WORLD_IDS
  .filter(id => !['koi', 'jellyfish', 'pipes'].includes(id)) : [];
let refSource = '';
if (reference) {
  const { access } = await import('node:fs/promises');
  const available = [];
  for (const id of imports) { try { await access(path.join(reference, 'scenes', id + '.js')); available.push(id); } catch {} }
  refSource = `import { createRenderer as referenceRenderer } from ${q(path.join(reference, 'core/engine.js'))};\n` +
    available.map((id, i) => `import r${i} from ${q(path.join(reference, 'scenes', id + '.js'))};`).join('\n') +
    `\nconst references = {${available.map((id, i) => q(id) + ':r' + i).join(',')}};`;
} else refSource = 'const references = {};';
const code = `${refSource}
import { createSceneRenderer } from ${q(path.join(root, 'src/engine.js'))};
import { normalizeWorldSettings, WORLD_IDS } from ${q(path.join(root, 'src/settings-v3.js'))};
const c=document.createElement('canvas'),r=document.createElement('canvas');
document.body.append(c);
const renderer=createSceneRenderer(c,{});
renderer.resize(1200,700,1);
const ref=${reference ? 'referenceRenderer(r)' : 'null'};
if(ref)ref.resize(1200,700,1);
window.galleryCapture={ids:WORLD_IDS, render(id,t,dark){
 const s=normalizeWorldSettings({scene:id,scenes:{},paused:true,moon:'off'});
 renderer.render(t,s,dark,t,null);
 let parity=null;
 if(references[id]){ref.render(references[id],s.scenes[id],t,t,dark,null);parity=c.toDataURL()===r.toDataURL();}
 return {png:c.toDataURL(),parity,stats:{...renderer.stats}};
}};`;
const bundled = await build({ stdin: { contents: code, resolveDir: root }, bundle: true, write: false, format: 'iife', target: 'es2020' });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errors = []; page.on('pageerror', e => errors.push(e.message));
const report = [];
try {
  await page.goto('about:blank');
  await page.addScriptTag({ content: bundled.outputFiles[0].text });
  const ids = await page.evaluate(() => galleryCapture.ids);
  await mkdir(path.join(root, 'docs/images/habitats'), { recursive: true });
  for (const id of ids) for (const tone of ['dark', 'light']) {
    const frame = await page.evaluate(({id,tone}) => galleryCapture.render(id,9,tone==='dark'), {id,tone});
    assert.ok(frame.stats.glyphs > 0, id + ' empty frame');
    assert.notEqual(frame.parity, false, id + ' differs from the approved preview');
    // Keep the existing, approved captures of old habitats. New images and
    // pipes are generated from the same renderer used by the installed plugin.
    if (frame.parity !== null || id === 'pipes' || !reference)
      await writeFile(path.join(root, 'docs/images/habitats', id + '-' + tone + '.png'), Buffer.from(frame.png.split(',')[1], 'base64'));
    report.push({id,tone,parity:frame.parity,glyphs:frame.stats.glyphs});
  }
  // Capture the actual generated Settings page too, with its native controls.
  await page.setViewportSize({width:1100,height:1000});
  await page.emulateMedia({colorScheme:'dark'});
  await page.goto(pathToFileURL(path.join(root,'demo.html')).href+'?chat=1&paused=true');
  await page.waitForFunction(()=>window.asciiWorlds?.stats?.glyphs>0);
  await page.evaluate(()=>{
    asciiWorlds.setSettings({scene:'wizard-tower',paused:true});asciiWorlds.renderAt(9,9);
    document.querySelector('#world').style.cssText='height:auto;max-height:none;overflow:visible;width:100%;max-width:none';
    document.body.style.cssText='display:block;height:auto';
    document.querySelector('[data-chat-surface]').style.display='none';
  });
  await page.locator('.aw-world').screenshot({path:path.join(root,'docs/images/settings.png')});
  assert.deepEqual(errors, []);
  await mkdir(path.join(root, 'evidence/1.4.0'), { recursive: true });
  await writeFile(path.join(root, 'evidence/1.4.0/preview-parity.json'), JSON.stringify({passed:true,errors,frames:report},null,2)+'\n');
  console.log(JSON.stringify({frames:report.length,identicalToPreview:report.filter(r=>r.parity===true).length,errors}));
} finally { await browser.close(); }
