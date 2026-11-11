import fs from 'node:fs';
import path from 'node:path';
import { parseDocument } from 'yaml';
import { z } from 'zod';
import { marked } from 'marked';

const text = z.string().trim().min(1);
const slug = text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const id = text.regex(/^bb:[a-z][a-z0-9-]{1,31}:(practice|offering|play|collateral):[a-zA-Z0-9-]+$/);
const date = z.string().refine(s => /^\d{4}-\d\d-\d\d$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s && s <= new Date().toISOString().slice(0,10), 'invalid or future date');
const list = s => z.array(s).refine(a => new Set(a.map(x => JSON.stringify(x))).size === a.length, 'duplicate values');
const ids = list(id);
const common = {schema_version:z.literal(1), id, slug, title:text.max(100), summary:text.max(240), audience:z.enum(['org-wide','seller-only']), status:z.enum(['draft','approved','retired']), owner:text, reviewed_on:date.optional(), reviewed_by:text.optional(), tags:list(slug), aliases:list(slug).default([]), governance:z.object({family_id:text,variant_id:text,version_id:text}).strict().optional()};
const situation = z.object({key:slug,label:text,offering_id:id,play_id:id.nullable(),collateral_id:id.nullable()}).strict();
const stage = z.object({key:slug,title:text,action:text,exit_criterion:text,collateral_ids:ids}).strict();
const schemas = {
 practice:z.object({...common,type:z.literal('practice'),key:slug.regex(/^[a-z][a-z0-9-]{1,31}$/),tagline:text,offering_ids:ids.refine(a=>a.length>0),play_ids:ids,featured_collateral_ids:ids,situations:list(situation).refine(a=>a.length>0 && new Set(a.map(x=>x.key)).size===a.length)}).strict(),
 offering:z.object({...common,type:z.literal('offering'),practice_id:id,outcomes:list(text).refine(a=>a.length>0),good_fit:list(text).refine(a=>a.length>0),not_fit:list(text).refine(a=>a.length>0),alternative_offering_ids:ids,seller_guide:text}).strict(),
 play:z.object({...common,type:z.literal('play'),practice_id:id,trigger:text,offering_ids:ids.refine(a=>a.length>0),stages:list(stage).refine(a=>a.length>0 && new Set(a.map(x=>x.key)).size===a.length)}).strict(),
 collateral:z.object({...common,type:z.literal('collateral'),practice_id:id,kind:z.enum(['deck','case-study','white-paper','one-pager','external-link']),offering_ids:ids.refine(a=>a.length>0),asset_path:text.optional(),external_url:z.string().url().refine(s=>s.startsWith('https://')).optional(),format:z.enum(['markdown','pdf','pptx','html']),source:z.object({origin:text,locator:text,captured_on:date}).strict(),rights:z.enum(['fictional-original','approved-internal','link-only'])}).strict(),
 'seller-guide':z.object({schema_version:z.literal(1),type:z.literal('seller-guide'),offering_id:id,audience:z.literal('seller-only'),status:z.enum(['draft','approved','retired']),reviewed_on:date.optional(),reviewed_by:text.optional()}).strict()
};
const headings = {practice:['About','Who we help'],offering:['What it is','What it entails','Examples'],play:['Intent','Boundaries'],collateral:['Use','Limits'],'seller-guide':['Listen for','Ask','Position','Avoid promising','Next step']};
function fail(file, message) { throw new Error(`${file}: ${message}`); }
function safePath(root, rel) {
 if (path.isAbsolute(rel) || rel.split(/[\\/]/).some(x=>x==='..' || x==='') || rel.includes('\\')) fail(root, `unsafe path ${rel}`);
 let p=root; for (const part of rel.split('/')) { p=path.join(p,part); if (fs.existsSync(p) && fs.lstatSync(p).isSymbolicLink()) fail(p,'symlink forbidden'); }
 if (!fs.existsSync(p) || !fs.statSync(p).isFile()) fail(p,'missing file'); return p;
}
function parse(file) {
 const raw=fs.readFileSync(file,'utf8'); const m=raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/); if(!m) fail(file,'frontmatter required');
 if (/(^|[\s\[{,])(?:[&*!][\w-]+)/m.test(m[1])) fail(file,'YAML tags and anchors forbidden');
 const doc=parseDocument(m[1],{uniqueKeys:true, maxAliasCount:0}); if(doc.errors.length) fail(file,doc.errors.map(e=>e.message).join('; '));
 const data=doc.toJS({maxAliasCount:0}); const schema=schemas[data?.type]; if(!schema) fail(file,'unknown type');
 const result=schema.safeParse(data); if(!result.success) fail(file,result.error.issues.map(e=>`${e.path.join('.')}: ${e.message}`).join('; '));
 const d=result.data, body=m[2]; if (/<\/?[a-z!][^>]*>|javascript\s*:/i.test(body)) fail(file,'unsafe Markdown');
 marked.walkTokens(marked.lexer(body), token=>{if(token.type==='link' || token.type==='image') {const href=token.href || ''; if(/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(href) && !href.startsWith('https://')) fail(file, `unsafe Markdown link ${href}`); if(href.startsWith('#') && !body.toLowerCase().includes(href.slice(1).replaceAll('-', ' '))) fail(file, `broken Markdown anchor ${href}`);}});
 for(const h of headings[d.type]) if(!new RegExp(`^## ${h}$`,'m').test(body)) fail(file,`missing heading ${h}`);
 if(d.status==='approved' && (!d.reviewed_on || !d.reviewed_by)) fail(file,'approved content requires review metadata');
 if(d.governance) {const registry=process.env.STOREFRONT_GOVERNANCE_REGISTRY; if(!registry) fail(file,'governance requires a mapping registry'); let mappings; try {mappings=JSON.parse(fs.readFileSync(registry,'utf8'));} catch {fail(file,'invalid governance mapping registry');} if(!Array.isArray(mappings) || !mappings.some(m=>m.family_id===d.governance.family_id && m.variant_id===d.governance.variant_id && m.version_id===d.governance.version_id)) fail(file,'governance mapping not found');}
 if(d.type==='collateral' && (!!d.asset_path === !!d.external_url || (d.kind==='external-link') !== !!d.external_url || (d.external_url && (d.format!=='html'||d.rights!=='link-only')) || (d.asset_path && d.rights==='link-only'))) fail(file,'invalid asset/link combination');
 return {...d,body,html:marked.parse(body),file};
}
export function loadContent(root, edition) {
 if(!['seller','org-wide'].includes(edition)) throw Error('STOREFRONT_EDITION must be seller or org-wide');
 if(!root || !fs.existsSync(root)) throw Error('STOREFRONT_CONTENT_ROOT must exist');
 const all=[], guides=[], practices=[]; const byId=new Map(); const assetRefs=new Set();
 for(const dirent of fs.readdirSync(root,{withFileTypes:true})) {
  if(!dirent.isDirectory() || dirent.isSymbolicLink()) fail(root,`unexpected entry ${dirent.name}`);
  const dir=path.join(root,dirent.name); for(const entry of fs.readdirSync(dir)) if(!['practice.md','offerings','plays','collateral','seller','assets'].includes(entry)) fail(dir,`unexpected entry ${entry}`); const p=parse(safePath(dir,'practice.md')); if(p.type!=='practice') fail(p.file,'expected practice'); p.dir=dir; practices.push(p); all.push(p);
  for(const [folder,type] of [['offerings','offering'],['plays','play'],['collateral','collateral'],['seller','seller-guide']]) {
   const folderPath=path.join(dir,folder); if(!fs.existsSync(folderPath)) continue; if(fs.lstatSync(folderPath).isSymbolicLink()) fail(folderPath,'symlink forbidden');
   for(const name of fs.readdirSync(folderPath)) { if(!name.endsWith('.md')) fail(folderPath,`unsupported file ${name}`); const item=parse(safePath(dir,`${folder}/${name}`)); if(item.type!==type) fail(item.file,`expected ${type}`); item.dir=dir; (type==='seller-guide'?guides:all).push(item); }
  }
 }
 for(const o of all) { if(byId.has(o.id)) fail(o.file,'duplicate id'); byId.set(o.id,o); if(o.id.split(':')[2]!==o.type) fail(o.file,'id type mismatch'); }
 const routes=new Set(); const practiceSlugs=new Set(); for(const p of practices) for(const s of [p.slug,...p.aliases]) {if(practiceSlugs.has(s)) fail(p.file,`practice slug/alias collision ${s}`); practiceSlugs.add(s);}
 for(const o of all) { const p=o.type==='practice'?o:byId.get(o.practice_id); if(!p || p.type!=='practice' || p.dir!==o.dir || o.id.split(':')[1]!==p.key) fail(o.file,'invalid practice ownership'); for(const s of [o.slug,...o.aliases]) {const key=`${p.id}:${o.type}:${s}`; if(routes.has(key)) fail(o.file,`slug/alias collision ${s}`); routes.add(key);} }
 const ref=(owner, target, type) => {const o=byId.get(target); if(!o || o.type!==type || o.dir!==owner.dir) fail(owner.file,`invalid ${type} reference ${target}`); if(owner.status==='approved' && o.status!=='approved') fail(owner.file,`unapproved reference ${target}`); return o;};
 for(const p of practices) {
  for(const [field,type] of [['offering_ids','offering'],['play_ids','play']]) { for(const x of p[field]) ref(p,x,type); const owned=all.filter(o=>o.dir===p.dir && o.type===type).map(o=>o.id); if(owned.length!==p[field].length || owned.some(x=>!p[field].includes(x))) fail(p.file,`${field} must cover owned records`); }
  p.featured_collateral_ids.forEach(x=>ref(p,x,'collateral')); p.situations.forEach(s=>{ref(p,s.offering_id,'offering'); if(s.play_id) ref(p,s.play_id,'play'); if(s.collateral_id) ref(p,s.collateral_id,'collateral');});
 }
 for(const o of all.filter(x=>x.type!=='practice')) {
  if(o.type==='offering') {o.alternative_offering_ids.forEach(x=>{if(x===o.id) fail(o.file,'self edge'); ref(o,x,'offering');}); if(path.isAbsolute(o.seller_guide) || !/^seller\/[a-z0-9-]+\.md$/.test(o.seller_guide)) fail(o.file,'unsafe seller guide path'); const guidePath=path.join(o.dir,o.seller_guide); const g=guides.find(x=>x.file===guidePath); if(g && g.offering_id!==o.id) fail(o.file,'invalid seller guide'); if(!g || g.status!=='approved') console.warn(`${o.file}: seller guide unavailable or unapproved`);}
  if(o.offering_ids) o.offering_ids.forEach(x=>ref(o,x,'offering'));
  if(o.stages) o.stages.forEach(s=>s.collateral_ids.forEach(x=>ref(o,x,'collateral')));
  if(o.asset_path) { if(!o.asset_path.startsWith(`assets/${o.audience}/`)) fail(o.file,'asset audience mismatch'); const asset=safePath(o.dir,o.asset_path); const ext=path.extname(asset).slice(1); if(ext!==({markdown:'md',pdf:'pdf',pptx:'pptx',html:'html'})[o.format]) fail(o.file,'asset format mismatch'); assetRefs.add(asset); }
 }
 for(const g of guides) {const owner=byId.get(g.offering_id); if(!owner || owner.type!=='offering' || owner.dir!==g.dir || path.join(owner.dir,owner.seller_guide)!==g.file) fail(g.file,'orphan seller guide');}
 for(const p of practices) {const assetRoot=path.join(p.dir,'assets'); if(!fs.existsSync(assetRoot)) continue; const walk=dir=>{if(fs.lstatSync(dir).isSymbolicLink()) fail(dir,'symlink forbidden'); for(const ent of fs.readdirSync(dir,{withFileTypes:true})) {const file=path.join(dir,ent.name);if(ent.isSymbolicLink()) fail(file,'symlink forbidden');if(ent.isDirectory()) walk(file);else if(!assetRefs.has(file)) fail(file,'orphan asset');}};walk(assetRoot);}
 // Resolve relative Markdown links against the complete registry, then render only
 // projected records. A shared record may never link into seller-only content.
 const urlFor=o=>{const p=o.type==='practice'?o:byId.get(o.practice_id);const base=`/practices/${p.slug}/`;return o.type==='practice'?base:`${base}${{offering:'offerings',play:'plays',collateral:'library'}[o.type]}/${o.slug}/`;};
 for(const o of [...all,...guides]) {const tokens=marked.lexer(o.body);marked.walkTokens(tokens,t=>{if((t.type!=='link' && t.type!=='image') || !t.href || t.href.startsWith('https://') || t.href.startsWith('#'))return; const [relative,fragment]=t.href.split('#'); const target=path.resolve(path.dirname(o.file),decodeURIComponent(relative)); const rel=path.relative(o.dir,target); if(rel.startsWith('..') || path.isAbsolute(rel)) fail(o.file,`unsafe Markdown link ${t.href}`);safePath(o.dir,rel.split(path.sep).join('/'));const dest=all.find(x=>x.file===target);if(!dest || dest.status!=='approved' || (o.audience==='org-wide' && dest.audience!=='org-wide')) fail(o.file,`broken or restricted Markdown link ${t.href}`);t.href=urlFor(dest)+(fragment?`#${fragment}`:'');});o.html=marked.parser(tokens);}
 const visiblePractices=new Set(practices.filter(p=>p.status==='approved' && (edition==='seller'||p.audience==='org-wide')).map(p=>p.id)); const visible=all.filter(o=>o.status==='approved' && (edition==='seller'||o.audience==='org-wide') && (o.type==='practice'||visiblePractices.has(o.practice_id))); const idsVisible=new Set(visible.map(o=>o.id));
 const projected=visible.map(o=>{const n={...o}; for(const f of ['offering_ids','play_ids','featured_collateral_ids','alternative_offering_ids']) if(n[f]) n[f]=n[f].filter(x=>idsVisible.has(x)); if(n.situations) n.situations=n.situations.filter(s=>idsVisible.has(s.offering_id)).map(s=>({...s,play_id:idsVisible.has(s.play_id)?s.play_id:null,collateral_id:idsVisible.has(s.collateral_id)?s.collateral_id:null})); if(n.stages) n.stages=n.stages.map(s=>({...s,collateral_ids:s.collateral_ids.filter(x=>idsVisible.has(x))})); if(n.type==='offering' && edition==='seller') n.guide=guides.find(g=>g.file===path.join(n.dir,n.seller_guide) && g.status==='approved'); return n;});
 return {items:projected, excluded:all.filter(o=>!idsVisible.has(o.id)).concat(edition==='org-wide'?guides:guides.filter(g=>g.status!=='approved'))};
}
