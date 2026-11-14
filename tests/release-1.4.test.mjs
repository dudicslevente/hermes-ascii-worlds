import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { sceneById } from '../src/lab/scenes/registry.js';
import { buildState } from '../src/lab/core/engine.js';
import { defaultsFor, normalizeScene } from '../src/lab/core/settings.js';
import { COLOUR_MODES } from '../src/lab/core/palettes.js';
import { depthSupported } from '../src/lab/core/depth.js';
import { showsMoon } from '../src/lab/core/sky.js';
import { normalizeWorldSettings, patchWorldSettings, resetWorldScene, readWorldSettings, writeWorldSettings } from '../src/settings-v3.js';
import { nyanPoseAt } from '../src/lab/scenes/nyan-cat.js';
import { _internals as penguins } from '../src/lab/scenes/penguin-slide.js';

export const NEW_IDS = ['platypus-creek','capybara-onsen','penguin-slide','rubber-ducks','nyan-cat','dino-runner','dragon-hoard','beehive','wizard-tower','retro-arcade','snake-game','pirate-ship','rooftop-ninja'];
function record(id, patch = {}, t = 9, b = t, dark = true, w = 900, h = 560, memo = {}) {
  const def = sceneById(id), cfg = normalizeScene(def, patch);
  const hash = createHash('sha256'), values = { globalAlpha: 1 }, stack = [];
  let calls = 0;
  const put = (...args) => hash.update(JSON.stringify(args));
  const ctx = new Proxy(values, {
    get(o,k) {
      if(k in o)return o[k];
      if(k==='save')return()=>{stack.push({...o});put(k);};
      if(k==='restore')return()=>{assert.ok(stack.length,`${id}: unmatched restore`);const v=stack.pop();for(const key of Object.keys(o))delete o[key];Object.assign(o,v);put(k);};
      if(/^create.*Gradient$/.test(k))return(...args)=>{for(const n of args)assert.ok(Number.isFinite(n));put(k,args);return {addColorStop(p,c){assert.ok(p>=0&&p<=1);assert.ok(!/NaN|undefined/.test(c));put(p,c);}};};
      return(...args)=>{
        calls++;
        for(const v of args)if(typeof v==='number')assert.ok(Number.isFinite(v),`${id}: ${k} finite`);
        if(k==='arc')assert.ok(args[2]>=0,`${id}: arc radius`);
        if(k==='ellipse')assert.ok(args[2]>=0&&args[3]>=0,`${id}: ellipse radii`);
        put(k,args);
      };
    },
    set(o,k,v){
      if(k==='globalAlpha')assert.ok(Number.isFinite(v)&&v>=0&&v<=1,`${id}: alpha ${v}`);
      if(k==='lineWidth')assert.ok(Number.isFinite(v)&&v>=0);
      if(typeof v==='string')assert.ok(!/NaN|undefined/.test(v));
      o[k]=v;put(k,typeof v==='object'?'gradient':v);return true;
    },
  });
  def.draw(ctx,w,h,buildState(def,cfg,t,b,w,h,dark,null,memo));
  assert.equal(stack.length,0,`${id}: balanced save/restore`);
  return {hash:hash.digest('hex'),calls,memo};
}
for(const id of NEW_IDS){
  test(`${id}: registered controls, pure bounded geometry, themes and repeatable frames`,()=>{
    const d=sceneById(id);assert.ok(d);assert.equal(depthSupported(d),false);assert.equal(showsMoon(d),false);
    assert.deepEqual(COLOUR_MODES.length,10);
    const text=readFileSync(new URL(`../src/lab/scenes/${id}.js`,import.meta.url),'utf8');
    assert.ok(!/\bMath\.random\s*\(|\b(?:Date|performance)\.|\b(?:setInterval|setTimeout|fetch)\s*\(/.test(text));
    assert.equal(record(id).hash,record(id).hash);
    for(const count of [1,d.count.max])for(const size of [0.5,1.6])for(const dark of [true,false])for(const [w,h] of [[360,640],[1500,600]]){
      const r=record(id,{count,size},29.6,17.4,dark,w,h);assert.ok(r.calls>0);
    }
  });
  test(`${id}: every palette, extra and size setting changes output`,()=>{
    const d=sceneById(id),base=record(id).hash;
    for(const colour of COLOUR_MODES.filter(m=>m!=='natural')){
      const patch={colour,tint:'#dd4477',colors:Array(10).fill('#4488ee')};
      assert.notEqual(record(id,patch).hash,base,colour);
    }
    assert.notEqual(record(id,{size:0.5}).hash,record(id,{size:1.6}).hash);
    for(const e of d.extras||[]){
      const [lo,hi]=e.type==='toggle'?[false,true]:[e.min,e.max];
      assert.ok([0.1,3,6.4,7.1,9,19,22,31,61].some(t=>record(id,{extras:{[e.key]:lo}},t).hash!==record(id,{extras:{[e.key]:hi}},t).hash),e.key);
    }
    if(d.flow)assert.notEqual(record(id,{flow:0},12).hash,record(id,{flow:1.5},12).hash);
  });
  test(`${id}: per-scene persistence, hidden slots, defaults and isolated reset`,()=>{
    const d=sceneById(id);let s=normalizeWorldSettings(null);
    const before=structuredClone(s.scenes.pipes);
    const extras=Object.fromEntries((d.extras||[]).map(e=>[e.key,e.type==='toggle'?!e.default:e.max]));
    s=patchWorldSettings(s,{scene:id,count:0,size:1.25,speed:0.35,colour:'individual',colors:['#dd4477','#4488ee'],extras});
    const store={value:null,get(k,f){return this.value??f;},set(k,v){this.value=structuredClone(v);}};
    assert.equal(writeWorldSettings(store,s),true);s=readWorldSettings(store);
    assert.equal(s.scene,id);assert.equal(s.count,0);assert.equal(s.speed,0.35);assert.deepEqual(s.extras,extras);
    s=patchWorldSettings(s,{scene:'pipes'});assert.deepEqual(s.scenes.pipes,before);
    s=patchWorldSettings(s,{scene:id,count:d.count.max});assert.equal(s.colors[0],'#dd4477');
    s=resetWorldScene(s);assert.deepEqual(s.scenes[id],defaultsFor(d));assert.deepEqual(s.scenes.pipes,before);
  });
}
test('Nyan Cat head moves independently, poses hold and the loop repeats',()=>{
  assert.equal(nyanPoseAt(0).body,nyanPoseAt(.07).body);
  assert.notEqual(nyanPoseAt(0).hx,nyanPoseAt(.07).hx);
  assert.equal(nyanPoseAt(.28).body,nyanPoseAt(.35).body);
  assert.notEqual(nyanPoseAt(.28).hy,nyanPoseAt(.35).hy);
  for(let i=0;i<6;i++){assert.deepEqual(nyanPoseAt(i*.07),nyanPoseAt(i*.07+.42));assert.deepEqual(nyanPoseAt(i*.07),nyanPoseAt(i*.07+.02));}
});
test('Snake replay is independent of forward/backward seeks, never self-collides and keeps bounded state',()=>{
  const memo={};
  for(const t of [0,9,30,120,300,9,300]){
    const a=record('snake-game',{count:3},t,t,true,900,560,memo);
    assert.equal(a.hash,record('snake-game',{count:3},t).hash);
    for(const sim of memo.snk.sims){
      assert.equal(new Set(sim.segs).size,sim.segs.length);
      assert.ok(sim.segs.length<=sim.cap);assert.ok(sim.trail.length<=16);
      assert.ok(!sim.segs.includes(sim.apple));
      for(let j=1;j<sim.segs.length;j++){
        const x=sim.segs[j]%sim.cols,y=Math.floor(sim.segs[j]/sim.cols),p=sim.segs[j-1];
        assert.equal(Math.abs(x-p%sim.cols)+Math.abs(y-Math.floor(p/sim.cols)),1);
      }
    }
  }
});
test('Snake hours-long seeks and board changes finish exactly and remain history independent',()=>{
  const memo={};
  for(const t of [64001,64001,1e9,9,64001])for(const [w,h,size] of [[900,480,1],[360,640,1.6],[1500,600,0.5]]){
    const cfg={count:3,size};
    const a=record('snake-game',cfg,t,t,true,w,h,memo);
    assert.equal(a.hash,record('snake-game',cfg,t,t,true,w,h,memo).hash,'same timestamp twice');
    assert.equal(a.hash,record('snake-game',cfg,t,t,true,w,h).hash,'fresh versus reused memo');
    for(const sim of memo.snk.sims)assert.ok(sim.k>=0&&sim.k<4096,'replay is bounded to one complete round');
  }
});
test('Penguin return route and phase boundaries are continuous',()=>{
  for(const n of [1,3,4])for(const [w,h] of [[360,640],[1200,700]]){
    const L=penguins.layout(w,h,1),s=penguins.schedule(n);
    const times=[0,s.Pd,s.Pd+penguins.SLD,s.Pd+penguins.SLD+penguins.POOL,s.Pd+penguins.SLD+penguins.POOL+penguins.SET,s.Tl];
    for(const t of times){
      const a=penguins.poseAt(L,s,(t-.00001+s.Tl)%s.Tl),b=penguins.poseAt(L,s,(t+.00001)%s.Tl);
      assert.ok(Math.hypot(a.x-b.x,a.y-b.y)<L.H*.22,`${n} ${w} phase ${t}`);
    }
  }
});
