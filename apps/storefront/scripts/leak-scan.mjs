import fs from 'node:fs';
import path from 'node:path';
export function scan(root, canaries) {
 for(const entry of fs.readdirSync(root,{withFileTypes:true})) {const file=path.join(root,entry.name);if(entry.isDirectory())scan(file,canaries);else {const data=fs.readFileSync(file);for(const canary of canaries) if(canary && data.includes(Buffer.from(canary))) throw Error(`Leak detected in ${file}: ${canary}`);}}
}
