import path from 'node:path';
import {loadContent} from './content.mjs';
export const edition=process.env.STOREFRONT_EDITION;
export const root=path.resolve(process.env.STOREFRONT_CONTENT_ROOT || './content');
export const {items,excluded}=loadContent(root,edition);
export const lookup=id=>items.find(x=>x.id===id);
export const practice=o=>o.type==='practice'?o:lookup(o.practice_id);
export const url=o=>{const p=practice(o); const base=`/practices/${p.slug}/`; return o.type==='practice'?base:`${base}${{offering:'offerings',play:'plays',collateral:'library'}[o.type]}/${o.slug}/`;};
