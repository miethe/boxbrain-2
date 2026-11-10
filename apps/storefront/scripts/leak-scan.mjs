import fs from 'node:fs';
import path from 'node:path';
import {gunzipSync, brotliDecompressSync, inflateSync} from 'node:zlib';

export function scan(root, canaries) {
 const needles=canaries.filter(Boolean).map(x=>Buffer.from(x));
 const inspect=(data, file, depth=0)=>{
  for(const needle of needles) if(data.includes(needle)) throw Error(`Leak detected in ${file}: ${needle}`);
  if(depth>=3) return;
  let decoded;
  if(data[0]===0x1f && data[1]===0x8b) decoded=gunzipSync(data);
  else if(/\.br$/i.test(file)) decoded=brotliDecompressSync(data);
  else if(/\.(?:zz|zlib)$/i.test(file)) decoded=inflateSync(data);
  if(decoded) inspect(decoded,`${file} (decompressed)`,depth+1);
  // Encoded strings in text bundles are inspected as well as their raw representation.
  const text=data.toString('utf8');
  if(!text.includes('\ufffd')) {
   for(const match of text.matchAll(/[A-Za-z0-9+/]{16,}={0,2}/g)) {
    const candidate=Buffer.from(match[0],'base64');
    if(candidate.length) inspect(candidate,`${file} (base64)`,depth+1);
   }
   if(/%[0-9a-f]{2}/i.test(text)) {try {const value=decodeURIComponent(text);if(value!==text) inspect(Buffer.from(value),`${file} (URL decoded)`,depth+1);} catch { /* mixed text is not a single URL encoding */ }}
  }
 };
 const walk=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else inspect(fs.readFileSync(file),file);}};
 walk(root);
}
