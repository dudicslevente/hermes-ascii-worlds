// Runtime v3 envelope. Legacy settings.js remains an explicit v2 compatibility
// API; the integrated UI/host use only this module and never write v1 or v2.
import { normalizeSettings, readSettings, KOI_MODES, JELLY_MODES } from './settings.js';
import { SCENES, sceneById } from './lab/scenes/registry.js';
import { defaultsFor, normalizeScene } from './lab/core/settings.js';
import { modesFor } from './lab/core/palettes.js';
import { MOON_MODES, MOON_PHASES } from './lab/core/sky.js';
import { DEPTH_DEFAULT } from './lab/core/depth.js';
export const WORLD_IDS = Object.freeze(['koi','jellyfish','manta-rays','sea-turtles','seahorses','tiny-fish-school','solitary-whale','octopus','hammerhead','anglerfish','butterflies','luna-moths','dragonflies','swallows','sleeping-cat','axolotl','owl','ginkgo-leaves','cherry-blossom-petals','fireflies','bubbles','dandelion-seeds','night-sky']);
export const WORLD_SCENES = Object.freeze(WORLD_IDS.map(id => sceneById(id) || {id, name:id==='koi'?'Koi pond':'Jellyfish drift', legacy:true}));
export const WORLD_STORAGE_KEY = 'settings.v3';
const object = v => v && typeof v==='object' && !Array.isArray(v) ? v : {};
const finite = (v,min,max,d) => typeof v==='number' && Number.isFinite(v) ? Math.max(min,Math.min(max,v)) : d;
const legacy = id => id==='koi' || id==='jellyfish';
function legacyScene(id, value={}) {
  const p=id==='koi'?'koi':'jelly';
  const s=normalizeSettings({scene:id, [`${p}Count`]:value.count, [`${p}Colour`]:value.colour, [`${p}Tint`]:value.tint, [`${p}Colors`]:value.colors, speed:value.speed, density:value.density});
  // 1.3.0: the same Size, Scene strength, Current and Depth as the other
  // scenes. Records from 1.2.0 get these defaults.
  return {count:s[`${p}Count`], colour:s[`${p}Colour`], tint:s[`${p}Tint`], colors:[...s[`${p}Colors`]], speed:s.speed,density:s.density,
    size:finite(value.size,0.5,1.6,1), strength:finite(value.strength,0.2,1,1), flow:finite(value.flow,0,1.5,1), depth:finite(value.depth,0,1,DEPTH_DEFAULT)};
}
export const sceneDefaults = id => legacy(id) ? legacyScene(id) : defaultsFor(sceneById(id));
const normalizeOne = (id,v) => legacy(id)?legacyScene(id,object(v)):normalizeScene(sceneById(id),v);
export function colourModes(id) { return legacy(id)?(id==='koi'?KOI_MODES:JELLY_MODES):modesFor(sceneById(id)); }
function expose(raw) {
  const v=object(raw), scenes={};
  for (const id of WORLD_IDS) scenes[id]=normalizeOne(id,object(v.scenes)[id]);
  const scene=WORLD_IDS.includes(v.scene)?v.scene:'koi';
  const k=scenes.koi,j=scenes.jellyfish;
  // Moon: shown or hidden, and today's real phase or a chosen one.
  const sky={moon:MOON_MODES.includes(v.moon)?v.moon:'on',moonPhase:Object.hasOwn(MOON_PHASES,v.moonPhase)?v.moonPhase:'date'};
  return {schemaVersion:3,scene,palette:'auto',paused:v.paused===true,eco:v.eco===true,...sky,scenes,
    koiCount:k.count,koiColour:k.colour,koiTint:k.tint,koiColors:[...k.colors],
    jellyCount:j.count,jellyColour:j.colour,jellyTint:j.tint,jellyColors:[...j.colors],
    ...scenes[scene],schemaVersion:3};
}
function fromLegacy(raw) {
  const s=normalizeSettings(raw), scenes={};
  for (const [id,p] of [['koi','koi'],['jellyfish','jelly']]) scenes[id]={count:s[`${p}Count`],colour:s[`${p}Colour`],tint:s[`${p}Tint`],colors:s[`${p}Colors`],speed:s.speed,density:s.density};
  return expose({scene:s.scene,paused:s.paused,eco:s.eco,scenes});
}
export function normalizeWorldSettings(value) {
  return object(value).scenes ? expose(value) : fromLegacy(value);
}
export function readWorldSettings(storage) {
  try { const v=storage.get(WORLD_STORAGE_KEY,null); if(object(v)===v && v.schemaVersion===3 && object(v.scenes)===v.scenes) return expose(v); } catch {}
  return fromLegacy(readSettings(storage));
}
export function patchWorldSettings(current, patch={}) {
  const s=normalizeWorldSettings(current), p=object(patch);
  const scene=WORLD_IDS.includes(p.scene)?p.scene:s.scene;
  const scenes={...s.scenes};
  // Compatibility aliases may update either old habitat without touching the
  // active Lab scene. Only named bounded fields enter a persisted record.
  for (const [id,prefix] of [['koi','koi'],['jellyfish','jelly']]) {
    const next={...scenes[id]};
    for (const [old,key] of [['Count','count'],['Colour','colour'],['Tint','tint'],['Colors','colors']]) if(Object.hasOwn(p,prefix+old)) next[key]=p[prefix+old];
    scenes[id]=normalizeOne(id,next);
  }
  const active={...scenes[scene]};
  for(const key of ['count','speed','size','flow','strength','depth','density','colour','tint','colors']) if(Object.hasOwn(p,key)) active[key]=p[key];
  if(Object.hasOwn(p,'extras')) active.extras={...active.extras,...object(p.extras)};
  scenes[scene]=normalizeOne(scene,active);
  const skyPatch={};for(const key of ['moon','moonPhase'])skyPatch[key]=Object.hasOwn(p,key)?p[key]:s[key];
  return expose({scene,scenes,paused:typeof p.paused==='boolean'?p.paused:s.paused,eco:typeof p.eco==='boolean'?p.eco:s.eco,...skyPatch});
}
export function resetWorldScene(current) {
  const s=normalizeWorldSettings(current);
  return expose({...s,scenes:{...s.scenes,[s.scene]:sceneDefaults(s.scene)}});
}
export function writeWorldSettings(storage, value) {
  const s=normalizeWorldSettings(value);
  try { storage.set(WORLD_STORAGE_KEY,{schemaVersion:3,scene:s.scene,paused:s.paused,eco:s.eco,moon:s.moon,moonPhase:s.moonPhase,scenes:s.scenes}); return true; } catch { return false; }
}
export function advanceClocks(time,beat,dt,speed) {
  const delta=finite(dt,0,0.1,0), rate=finite(speed,0.1,2,1);
  return {time:time+delta*rate,beat:beat+delta*Math.pow(rate,0.6)};
}
