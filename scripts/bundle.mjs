// Deliberately small ESM subset, no evaluation or dependencies. Each source
// module has a lexical scope; only explicit exports cross module boundaries.
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const allowed=new Set(['react','react/jsx-runtime','@hermes/plugin-sdk']);
export async function bundle(root, entry, transform=s=>s) {
 const modules=new Map(), externals=new Map(), visiting=new Set();
 const quote=JSON.stringify;
 function bindings(spec, ref) {
  const s=spec.trim();
  if(s.startsWith('{')) return `const ${s.replace(/\bas\b/g,':')} = ${ref};`;
  if(s.startsWith('* as ')) return `const ${s.slice(5).trim()} = ${ref};`;
  if(/^[A-Za-z_$][\w$]*$/.test(s)) return `const ${s} = ${ref}.default;`;
  throw Error('Unsupported import binding: '+s);
 }
 async function visit(id) {
  if(modules.has(id)) return;
  if(visiting.has(id)) throw Error('Circular module: '+id);
  visiting.add(id);
  let src=transform(await readFile(path.join(root,id),'utf8'));
  const imports=[...src.matchAll(/^import\s+([\s\S]*?)\s+from\s+["']([^"']+)["'];/gm)];
  for(const m of imports) {
   const request=m[2];let ref;
   if(request.startsWith('.')) {
    const target=path.posix.normalize(path.posix.join(path.posix.dirname(id),request));
    if(!target.startsWith('src/')||!target.endsWith('.js')) throw Error('Out-of-scope import '+request);
    await visit(target); ref=`__modules[${quote(target)}]`;
   } else {
    if(!allowed.has(request)) throw Error('Unsupported external import '+request);
    if(!externals.has(request)) externals.set(request,`__external${externals.size}`);
    ref=externals.get(request);
   }
   src=src.replace(m[0],bindings(m[1],ref));
  }
  const exports=[...src.matchAll(/^export\s+(?:const|let|function|class)\s+([\w$]+)/gm)].map(m=>m[1]);
  const hasDefault=/^export default /m.test(src);
  src=src.replace(/^export (?=(?:const|let|function|class) )/gm,'').replace(/^export default /gm,'const __default = ');
  if(/^import\s|^export\s/m.test(src)) throw Error('Unsupported module syntax '+id);
  modules.set(id,`__modules[${quote(id)}] = (() => {\n${src}\nreturn {${exports.join(',')}${hasDefault?(exports.length?',':'')+'default:__default':''}};\n})();`);
  visiting.delete(id);
 }
 await visit(entry);
 return [...externals].map(([name,id])=>`import * as ${id} from ${quote(name)};`).join('\n')+'\nconst __modules = Object.create(null);\n'+[...modules.values()].join('\n')+`\nconst __entry = __modules[${quote(entry)}];\n`;
}
