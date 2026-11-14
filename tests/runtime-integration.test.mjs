import test from 'node:test';
import assert from 'node:assert/strict';
import * as engine from '../src/engine.js';
import {WORLD_IDS,normalizeWorldSettings,patchWorldSettings,advanceClocks,colourModes} from '../src/settings-v3.js';
import {sceneById} from '../src/lab/scenes/registry.js';
import {resolveKit} from '../src/lab/core/palettes.js';
test('integrated renderer is exported without replacing legacy renderer',()=>{assert.equal(typeof engine.createSceneRenderer,'function');assert.equal(typeof engine.createRenderer,'function');});
for(const id of WORLD_IDS.slice(2)) test(`${id}: controls normalize count-zero, caps, slots, palettes and extras`,()=>{
 const def=sceneById(id);let s=patchWorldSettings(normalizeWorldSettings(null),{scene:id,count:0,speed:Infinity,size:100,strength:-1,colors:['#123456','#bad'],extras:{bogus:4}});
 assert.equal(s.count,0);assert.equal(s.size,1.6);assert.equal(s.strength,1);assert.equal(s.speed,1);assert.equal(s.colors.length,10);assert.equal(s.colors[0],'#123456');assert.notEqual(s.colors[1],'#bad');assert.ok(!('bogus' in s.extras));
 s=patchWorldSettings(s,{count:1e9});assert.equal(s.count,def.count.max);
 for(const colour of colourModes(id)) {const a=patchWorldSettings(s,{colour});assert.equal(a.colour,colour);const kit=resolveKit(def,a,0);for(const v of Object.values(kit))assert.match(v,/^#[0-9a-f]{6}$/i);}
 if(def.individual!==false) {s=patchWorldSettings(s,{colour:'individual'});assert.deepEqual(resolveKit(def,s,0),resolveKit(def,s,10));}
 const copy=normalizeWorldSettings(s);copy.scenes[id].colors[0]='#ffffff';assert.equal(s.colors[0],'#123456');
});
test('travel and articulation use separate bounded clocks at slow and fast speed',()=>{
 for(const speed of [0.1,0.35,1,2]) {const c=advanceClocks(2,3,0.1,speed);assert.equal(c.time,2+0.1*speed);assert.equal(c.beat,3+0.1*Math.pow(speed,0.6));}
 assert.deepEqual(advanceClocks(0,0,5,1),{time:0.1,beat:0.1});
});
