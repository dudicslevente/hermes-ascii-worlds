import test from 'node:test';
import assert from 'node:assert/strict';
import {createHub} from '../src/background.js';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

test('background save recovery changes only its record health',()=>{
 let denied=true;const hub=createHub({get:(k,f)=>f,set(){if(denied)throw Error('quota')}});
 hub.bg.set({strength:0.4});assert.deepEqual(hub.persistence.get(),{settings:true,background:false});
 hub.persistence.set({...hub.persistence.get(),settings:false});denied=false;
 hub.bg.set({strength:0.45});assert.deepEqual(hub.persistence.get(),{settings:false,background:true});
});
test('reduced-motion consent is session-only and startup performs no writes',()=>{
 const records={},writes=[];const storage={get:(k,f)=>records[k]??f,set(k,v){writes.push(k);records[k]=v}};
 const first=createHub(storage);assert.deepEqual(writes,[]);assert.equal(first.motionOptIn.get(),false);
 first.motionOptIn.set(true);assert.equal(first.motionOptIn.get(),true);assert.deepEqual(writes,[]);
 assert.equal(createHub(storage).motionOptIn.get(),false);assert.deepEqual(writes,[]);
});
test('local install/source archives include controls and rollback, exclude internal records and runtime dependencies',async()=>{
 const out=await mkdtemp(path.join(tmpdir(),'ascii-worlds-package-test-'));
 try{
  const pack=spawnSync('python3',['scripts/package-release.py',out],{encoding:'utf8'});assert.equal(pack.status,0,pack.stderr+pack.stdout);
  const inspect=spawnSync('python3',['-c',`import pathlib,zipfile,json,sys
out=pathlib.Path(sys.argv[1]); version=json.loads(pathlib.Path('package.json').read_text())['version']
for kind in ['-plugin','']:
 p=out/f'ascii-worlds-{version}{kind}.zip'
 with zipfile.ZipFile(p) as z:
  assert z.testzip() is None
  prefix=f'ascii-worlds-{version}{kind}/'
  names=[n.removeprefix(prefix) for n in z.namelist()]
  for required in ['docs/FEATURE-CONTROLS.md','docs/SETTINGS-MIGRATION.md','docs/MANUAL-MAC-CHECKLIST.md','INSTALL.md','docs/LOCAL-TEST-CANDIDATE.md']: assert required in names,required
  assert not any(any(part in n.split('/') for part in ['.git','node_modules','.harness','evidence']) for n in names)
  assert 'STATUS.md' not in names and 'docs/INTEGRATION-REVIEW.md' not in names
  plugin='ascii-worlds/plugin.js' if kind else 'desktop/plugin.js'
  assert z.read(prefix+plugin)==pathlib.Path('desktop/plugin.js').read_bytes()
  assert z.read(prefix+'demo.html')==pathlib.Path('demo.html').read_bytes()
  for n in names:
   if pathlib.Path(n).suffix in ['.js','.mjs','.py','.md','.html','.json','.yaml']:
    b=z.read(prefix+n)
    assert (b'/home/'+b'levi/') not in b and (b'/'+b'Users/') not in b,n
print('install/source CRC, mapping, docs, privacy and exact bundle PASS')`,out],{encoding:'utf8'});
  assert.equal(inspect.status,0,inspect.stderr+inspect.stdout);
 }finally{await rm(out,{recursive:true,force:true})}
});
