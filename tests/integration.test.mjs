import test from 'node:test';
import assert from 'node:assert/strict';
const api = await import('../src/settings-v3.js').catch(() => null);
const required = ['koi','jellyfish','manta-rays','sea-turtles','seahorses','tiny-fish-school','solitary-whale','octopus','hammerhead','anglerfish','butterflies','luna-moths','dragonflies','swallows','sleeping-cat','axolotl','owl','ginkgo-leaves','cherry-blossom-petals','fireflies','bubbles','dandelion-seeds','night-sky'];
const memory = seed => { const data = structuredClone(seed || {}); return {data, get:(k,f)=>data[k] ?? f, set:(k,v)=>{data[k]=structuredClone(v);}}; };
test('integrated registry exposes exactly 23 native habitats', () => {
  assert.ok(api, 'v3 integration API must exist');
  assert.deepEqual([...api.WORLD_IDS].sort(), [...required].sort());
});
test('v3 migration reads legacy without writes, isolates scenes and preserves rollback records', () => {
  assert.ok(api, 'v3 migration API must exist');
  const s=memory({'settings.v1':{scene:'jellyfish',colour:'custom',tint:'#ff7722',speed:1.1}});
  const before=structuredClone(s.data);
  let a=api.readWorldSettings(s);
  assert.deepEqual(s.data,before,'startup does not write');
  assert.equal(a.jellyTint,'#ff7722'); assert.equal(a.koiColour,'natural');
  a=api.patchWorldSettings(a,{scene:'manta-rays',speed:0.35,size:0.7,density:'bold',count:0,colors:['#112233']});
  a=api.patchWorldSettings(a,{scene:'owl',speed:1.7,size:1.3,extras:{perch:false}});
  a=api.patchWorldSettings(a,{scene:'manta-rays'});
  assert.equal(a.speed,0.35);assert.equal(a.size,0.7);assert.equal(a.count,0);assert.equal(a.density,'bold');assert.equal(a.colors[0],'#112233');
  assert.ok(api.writeWorldSettings(s,a)); assert.deepEqual(s.data['settings.v1'],before['settings.v1']); assert.ok(!('settings.v2' in s.data));
  assert.equal(s.data['settings.v3'].schemaVersion,3);assert.equal(api.readWorldSettings(s).scene,'manta-rays');
});
test('v3 read precedence, failed writes and scoped reset retain readable data', () => {
  assert.ok(api, 'v3 persistence API must exist');
  const s=memory({'settings.v2':{scene:'koi',koiCount:7,speed:1.2}});
  let a=api.readWorldSettings(s);assert.equal(a.koiCount,7);
  a=api.patchWorldSettings(a,{scene:'owl',count:2,size:0.8});
  a=api.patchWorldSettings(a,{scene:'manta-rays',size:1.4});api.writeWorldSettings(s,a);
  const before=structuredClone(s.data); s.set=()=>{throw Error('quota')};
  assert.equal(api.writeWorldSettings(s,api.patchWorldSettings(a,{size:0.6})),false);
  assert.deepEqual(s.data,before);assert.equal(api.readWorldSettings(s).size,1.4);
  a=api.resetWorldScene(a);assert.equal(a.size,1);a=api.patchWorldSettings(a,{scene:'owl'});assert.equal(a.size,0.8);assert.equal(a.count,2);
});
