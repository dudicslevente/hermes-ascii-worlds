import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,mkdtempSync,cpSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
const root=new URL('../',import.meta.url).pathname;
test('build is scoped, has all scenes and is identical in a relocated source export',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'aw-relocated-'));
 try {
  for(const f of ['src','scripts','package.json']) cpSync(path.join(root,f),path.join(dir,f),{recursive:true});
  const a=path.join(dir,'a.js'),b=path.join(dir,'b.js');
  execFileSync('node',['scripts/build.mjs','--out',a],{cwd:root});
  const code=readFileSync(a,'utf8');
  assert.ok(code.includes('manta-rays'),'generated plugin must include Lab registry');
  assert.ok(code.includes('__modules["src/lab/'),'relative scoped module IDs');
  execFileSync('node',['scripts/build.mjs','--out',b],{cwd:dir});
  assert.equal(readFileSync(b,'utf8'),code);
  assert.ok(!code.includes(root));execFileSync('node',['--check',a]);
 } finally {rmSync(dir,{recursive:true,force:true});}
});
