import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {loadContent} from '../src/lib/content.mjs';
import {scan} from './leak-scan.mjs';
const root=path.resolve(process.env.STOREFRONT_CONTENT_ROOT || 'content');
const editions=process.env.STOREFRONT_EDITION?[process.env.STOREFRONT_EDITION]:['seller','org-wide'];
for(const edition of editions){
 const {items,excluded}=loadContent(root,edition);
 const out=path.resolve('dist',edition);fs.rmSync(out,{recursive:true,force:true});
 const env={...process.env,STOREFRONT_CONTENT_ROOT:root,STOREFRONT_EDITION:edition};
 for(const [cmd,args] of [['astro',['build']],['pagefind',['--site',out]]]) {const r=spawnSync(cmd,args,{stdio:'inherit',env});if(r.status!==0)process.exit(r.status||1);}
 for(const item of items.filter(x=>x.asset_path)){const p=items.find(x=>x.id===item.practice_id);const dest=path.join(out,'assets',p.slug,path.basename(item.asset_path));fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(item.dir,item.asset_path),dest);}
 if(edition==='org-wide') {const canaries=excluded.flatMap(x=>[x.id,x.title,x.asset_path,...x.body.split('\n').filter(line=>line.length>=45 && !line.startsWith('#') && !items.some(item=>item.body.includes(line)))].filter(Boolean));scan(out,canaries);}
 console.log(`${edition}: ${items.length} records, leak scan ${edition==='org-wide'?'passed':'not applicable'}`);
}
