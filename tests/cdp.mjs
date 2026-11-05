// Test-only dependency-free CDP pipe driver. No listening port or server.
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
export async function launch() {
 const profile=mkdtempSync(path.join(tmpdir(),'aw-cdp-'));
 const proc=spawn(process.env.CHROMIUM_PATH,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--disable-background-networking','--no-first-run','--disable-sync','--disable-default-apps','--disable-component-update','--host-resolver-rules=MAP * ~NOTFOUND','--allow-file-access-from-files','--remote-debugging-pipe',`--user-data-dir=${profile}`],{stdio:['ignore','ignore','pipe','pipe','pipe']});
 let next=0,buffer='',session;const pending=new Map();let stderr='';proc.stderr.on('data',d=>stderr+=d);
 proc.stdio[4].on('data',data=>{buffer+=data.toString();let at;while((at=buffer.indexOf('\0'))>=0){const text=buffer.slice(0,at);buffer=buffer.slice(at+1);if(!text)continue;const m=JSON.parse(text),p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}}});
 const send=(method,params={},sid=session)=>new Promise((resolve,reject)=>{const id=++next;const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method+' '+stderr.slice(-500)));},20000);pending.set(id,{resolve,reject,timer});proc.stdio[3].write(JSON.stringify({id,method,params,...(sid?{sessionId:sid}:{})})+'\0');});
 const target=await send('Target.createTarget',{url:'about:blank'},null);session=(await send('Target.attachToTarget',{targetId:target.targetId,flatten:true},null)).sessionId;
 await send('Page.enable');await send('Runtime.enable');
 return {send,async evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||JSON.stringify(r.exceptionDetails));return r.result.value;},async close(){try{await send('Browser.close',{},null);}catch{}await new Promise(r=>{if(proc.exitCode!==null)return r();proc.once('exit',r);setTimeout(()=>{proc.kill('SIGKILL');r();},2000).unref();});try{rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});}catch{}}};
}
export async function waitFor(browser,expression,timeout=20000){const end=Date.now()+timeout;while(Date.now()<end){if(await browser.evaluate(expression))return;await new Promise(r=>setTimeout(r,50));}throw Error('Wait timeout '+expression);}
