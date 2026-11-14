import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHub } from '../src/background.js';
import { WORLD_IDS, normalizeWorldSettings, patchWorldSettings, writeWorldSettings } from '../src/settings-v3.js';

function memory(data = {}) {
  return { data, get(key) { return this.data[key] ?? null; }, set(key, value) { this.data[key] = structuredClone(value); } };
}

test('Settings offers one clearly labelled Background opacity control and no scene strength control', () => {
  const source = readFileSync(new URL('../src/world.js', import.meta.url), 'utf8');
  assert.match(source, /aria-label="Background opacity"/);
  assert.doesNotMatch(source, /add\('strength'/);
  assert.match(source, /name="bgStrength" min="1" max="60" step="0\.1"/);
});

test('one global opacity replaces the active scene strength without brightening the background', () => {
  const storage = memory({
    'settings.v3': {schemaVersion:3, scene:'koi', scenes:{koi:{strength:0.4},'wizard-tower':{strength:0.6}}},
    'background.v1': {schemaVersion:1, enabled:true, strength:0.5, placement:'front'},
  });
  const hub = createHub(storage);
  assert.equal(hub.bg.get().strength, 0.2, 'old background opacity × active scene strength');
  assert.equal(hub.bg.get().enabled, true);
  for (const id of WORLD_IDS) assert.equal(hub.settings.get().scenes[id].strength, 1, id);
  assert.equal(normalizeWorldSettings({scenes:{koi:{strength:0.2}}}).strength, 1);
});

function oldStorage(strength = 0.4, opacity = 0.5) {
  return memory({'settings.v3':{schemaVersion:3,scene:'koi',scenes:{koi:{strength},'wizard-tower':{strength:0.2}}},
    'background.v1':{schemaVersion:1,enabled:true,strength:opacity,placement:'front'}});
}

test('opacity migration runs once across reload, scene switches and normal scene saves', () => {
  const storage = oldStorage();
  const a = createHub(storage);
  assert.equal(storage.data['background.v1'].opacityVersion,1);
  const s = patchWorldSettings(a.settings.get(),{scene:'wizard-tower',strength:0.2});
  assert.equal(s.strength,1);
  assert.equal(writeWorldSettings(storage,s),true);
  assert.equal(createHub(storage).bg.get().strength,0.2);
  a.bg.set({strength:0.35});
  assert.equal(createHub(storage).bg.get().strength,0.35,'explicit user opacity is not migrated again');
});

test('the old lowest opacity combination remains representable instead of brightening to the old minimum', () => {
  const hub=createHub(oldStorage(0.2,0.08));
  assert.equal(hub.bg.get().strength,0.016);
});

test('independently failing writes do not lose attenuation or apply it twice', () => {
  for(const denied of ['background.v1','settings.v3','both']){
    const storage=oldStorage(),save=storage.set;
    storage.set=function(k,v){if(k===denied||denied==='both')throw Error('denied');return save.call(this,k,v);};
    const a=createHub(storage);
    writeWorldSettings(storage,patchWorldSettings(a.settings.get(),{scene:'wizard-tower'}));
    assert.equal(createHub(storage).bg.get().strength,0.2,denied);
    if(denied!=='settings.v3')assert.equal(a.persistence.get().background,false);
    storage.set=save;
    assert.equal(createHub(storage).bg.get().strength,0.2,'recovery');
    assert.equal(createHub(storage).bg.get().strength,0.2,'durable marker prevents a second migration');
  }
});

test('unreadable background storage still uses the old active scene attenuation in memory', () => {
  const storage=oldStorage(),get=storage.get;
  storage.get=function(k){if(k==='background.v1')throw Error('read denied');return get.call(this,k);};
  const hub=createHub(storage);
  assert.ok(Math.abs(hub.bg.get().strength-0.112)<1e-12);
  assert.equal(hub.persistence.get().background,false);
});

test('new and legacy-v2 installations keep the existing default opacity', () => {
  assert.equal(createHub(memory()).bg.get().strength,0.28);
  assert.equal(createHub(memory({'settings.v2':{scene:'jellyfish'},'background.v1':{strength:0.44}})).bg.get().strength,0.44);
});
