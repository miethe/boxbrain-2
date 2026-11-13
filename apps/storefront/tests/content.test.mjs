import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {loadContent} from '../src/lib/content.mjs';
import {scan} from '../scripts/leak-scan.mjs';
import {matches} from '../src/lib/filters.mjs';
const sample=path.resolve('content');
function fixture(fn) {const root=fs.mkdtempSync(path.join(os.tmpdir(),'storefront-test-'));fs.cpSync(sample,root,{recursive:true});try{return fn(root);}finally{fs.rmSync(root,{recursive:true,force:true});}}
function edit(root,rel,fn){const file=path.join(root,rel);fs.writeFileSync(file,fn(fs.readFileSync(file,'utf8')));}
test('valid graph has two practices and projects seller records',()=>{const seller=loadContent(sample,'seller'),org=loadContent(sample,'org-wide');assert.equal(seller.items.filter(x=>x.type==='practice').length,2);assert.ok(seller.items.some(x=>x.audience==='seller-only'));assert.ok(org.items.every(x=>x.audience==='org-wide'));assert.ok(org.items.some(x=>x.title==='Learning Lab'));});
test('invalid field fails with a path',()=>fixture(root=>{edit(root,'meadow-learning/practice.md',s=>s.replace('"title": "Meadow Learning"','"title": ""'));assert.throws(()=>loadContent(root,'seller'),/practice\.md: title/);}));
test('invalid asset path fails',()=>fixture(root=>{edit(root,'meadow-learning/collateral/exercise.md',s=>s.replace('assets/org-wide/exercise.md','../exercise.md'));assert.throws(()=>loadContent(root,'seller'),/asset audience mismatch|unsafe path/);}));
test('colliding route aliases fail',()=>fixture(root=>{edit(root,'meadow-learning/offerings/learning-lab.md',s=>s.replace('"slug": "learning-lab"','"slug": "learning-lab",\n  "aliases": ["learning-lab"]'));assert.throws(()=>loadContent(root,'seller'),/slug\/alias collision/);}));
test('rename retains stable identity and alias',()=>fixture(root=>{const before=loadContent(root,'seller').items.find(x=>x.title==='Learning Lab');edit(root,'meadow-learning/offerings/learning-lab.md',s=>s.replace('"slug": "learning-lab"','"slug": "workshop",\n  "aliases": ["learning-lab"]'));const after=loadContent(root,'seller').items.find(x=>x.title==='Learning Lab');assert.equal(after.id,before.id);assert.deepEqual(after.aliases,['learning-lab']);}));
test('leak scanner rejects planted control in built output',()=>{const root=fs.mkdtempSync(path.join(os.tmpdir(),'storefront-leak-'));try{fs.cpSync(path.resolve('dist/org-wide'),root,{recursive:true});fs.writeFileSync(path.join(root,'control.js'),'seller-only-control-8357');assert.throws(()=>scan(root,['seller-only-control-8357']),/Leak detected/);assert.doesNotThrow(()=>scan(root,['different-control']));}finally{fs.rmSync(root,{recursive:true,force:true});}});
test('org build contains second practice and excludes seller-only pages',()=>{const out=path.resolve('dist/org-wide');assert.match(fs.readFileSync(path.join(out,'index.html'),'utf8'),/Meadow Learning/);assert.ok(fs.existsSync(path.join(out,'practices/meadow-learning/offerings/learning-lab/index.html')));assert.ok(!fs.existsSync(path.join(out,'practices/northstar-operations/plays')));});

test('renamed offering emits a redirect to the new route',()=>fixture(root=>{
 edit(root,'meadow-learning/offerings/learning-lab.md',s=>s.replace('"slug": "learning-lab"','"slug": "workshop",\n  "aliases": ["learning-lab"]'));
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'storefront-redirect-'));
 try {const result=spawnSync('pnpm',['exec','astro','build'],{env:{...process.env,STOREFRONT_CONTENT_ROOT:root,STOREFRONT_EDITION:'org-wide',STOREFRONT_OUTPUT_DIR:out},encoding:'utf8'});assert.equal(result.status,0,result.stderr);const html=fs.readFileSync(path.join(out,'practices/meadow-learning/offerings/learning-lab/index.html'),'utf8');assert.match(html,/url=\/practices\/meadow-learning\/offerings\/workshop\//);} finally {fs.rmSync(out,{recursive:true,force:true});}
}));
test('unsafe Markdown fails validation',()=>fixture(root=>{
 edit(root,'meadow-learning/offerings/learning-lab.md',s=>s.replace('A fictional learning workshop.','[bad](javascript:alert(1))'));
 assert.throws(()=>loadContent(root,'seller'),/unsafe Markdown/);
}));
test('orphan assets fail validation',()=>fixture(root=>{
 fs.writeFileSync(path.join(root,'meadow-learning/assets/org-wide/orphan.md'),'orphan');
 assert.throws(()=>loadContent(root,'seller'),/orphan asset/);
}));

test('library facets combine query with OR within each facet and AND across facets',()=>{const item={text:'Service design exercise',kind:'deck',offerings:['one','two'],tags:['planning']};assert.equal(matches(item,{q:'design',kinds:['case-study','deck'],offerings:['two'],tags:['planning']}),true);assert.equal(matches(item,{q:'design',kinds:['deck'],offerings:['other']}),false);assert.equal(matches(item,{q:'missing'}),false);assert.equal(matches(item,{}),true);});

test('alternate theme typography and background are not overridden by root tokens',()=>{const css=fs.readFileSync(path.resolve('src/themes/alternate/tokens.css'),'utf8');assert.doesNotMatch(css.match(/:root\s*\{[^}]*\}/)[0],/font-family|background/);assert.match(css,/html\s*\{[^}]*Georgia[^}]*#f4f4f4/);});
test('tagged content renders a tag facet in both themes',()=>fixture(root=>{
 edit(root,'meadow-learning/collateral/exercise.md',s=>s.replace('\"tags\": []','\"tags\": [\"planning\"]'));
 for(const theme of ['neutral','alternate']) {const out=fs.mkdtempSync(path.join(os.tmpdir(),'storefront-tag-'));try {const result=spawnSync('pnpm',['exec','astro','build'],{env:{...process.env,STOREFRONT_CONTENT_ROOT:root,STOREFRONT_EDITION:'org-wide',STOREFRONT_ORG_THEME:theme,STOREFRONT_OUTPUT_DIR:out},encoding:'utf8'});assert.equal(result.status,0,result.stderr);const html=fs.readFileSync(path.join(out,'practices/meadow-learning/library/index.html'),'utf8');assert.match(html,/<legend>Tag<\/legend>/);assert.match(html,/name=\"tag\" value=\"planning\"/);}finally{fs.rmSync(out,{recursive:true,force:true});}}
 assert.equal(matches({text:'',kind:'deck',offerings:[],tags:['planning']},{tags:['planning']}),true);
}));
test('unknown keys fail',()=>fixture(root=>{edit(root,'meadow-learning/practice.md',s=>s.replace('"title": "Meadow Learning"','"unknown_field": true,\n  "title": "Meadow Learning"'));assert.throws(()=>loadContent(root,'seller'),/Unrecognized key/);}));
test('relative links resolve to published routes and reject restricted targets',()=>fixture(root=>{
 edit(root,'meadow-learning/offerings/learning-lab.md',s=>s.replace('A fictional learning workshop.','A [sample](../collateral/exercise.md).'));
 assert.match(loadContent(root,'org-wide').items.find(x=>x.title==='Learning Lab').html,/href="\/practices\/meadow-learning\/library\/exercise\/"/);
 edit(root,'meadow-learning/offerings/learning-lab.md',s=>s.replace('../collateral/exercise.md','../seller/learning-lab.md'));
 assert.throws(()=>loadContent(root,'org-wide'),/broken or restricted/);
}));
test('governance triples require a matching supplied registry',()=>fixture(root=>{
 edit(root,'meadow-learning/practice.md',s=>s.replace('"title": "Meadow Learning"','"governance": {"family_id":"f","variant_id":"v","version_id":"r"},\n  "title": "Meadow Learning"'));
 assert.throws(()=>loadContent(root,'seller'),/requires a mapping registry/);const registry=path.join(root,'registry.json');fs.writeFileSync(registry,JSON.stringify([{family_id:'f',variant_id:'v',version_id:'r'}]));process.env.STOREFRONT_GOVERNANCE_REGISTRY=registry;
 try {fs.renameSync(registry,`${root}-registry.json`);process.env.STOREFRONT_GOVERNANCE_REGISTRY=`${root}-registry.json`;assert.doesNotThrow(()=>loadContent(root,'seller'));} finally {delete process.env.STOREFRONT_GOVERNANCE_REGISTRY;fs.rmSync(`${root}-registry.json`,{force:true});}
}));

test('leak scanner decompresses gzip fragments and decodes bundle strings', async()=>{
 const {gzipSync}=await import('node:zlib');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'storefront-gzip-'));
 try {fs.writeFileSync(path.join(root,'fragment.pf_fragment'),gzipSync('seller-only-gzip-canary'));assert.throws(()=>scan(root,['seller-only-gzip-canary']),/Leak detected.*decompressed/);fs.writeFileSync(path.join(root,'fragment.pf_fragment'),gzipSync('clean'));fs.writeFileSync(path.join(root,'bundle.js'),Buffer.from('seller-only-encoded-canary').toString('base64'));assert.throws(()=>scan(root,['seller-only-encoded-canary']),/Leak detected.*base64/);assert.doesNotThrow(()=>scan(root,['absent-control']));}finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('themes change hierarchy and ship only selected CSS; a third theme registers in isolation',()=>{
 const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'storefront-theme-'));
 try {
  for(const name of ['src','astro.config.mjs','package.json'])fs.cpSync(path.resolve(name),path.join(scratch,name),{recursive:true});
  fs.symlinkSync(path.resolve('node_modules'),path.join(scratch,'node_modules'),'dir');
  const themes=path.join(scratch,'src/themes');fs.cpSync(path.join(themes,'neutral'),path.join(themes,'fixture'),{recursive:true});
  fs.appendFileSync(path.join(themes,'fixture/tokens.css'),'\n:root { --fixture-theme-proof: 1; }\n');
  const config=path.join(themes,'config.mjs');fs.writeFileSync(config,fs.readFileSync(config,'utf8').replace("neutral: './neutral'", "fixture: './fixture', neutral: './neutral'"));
  const build=(theme)=>{const out=path.join(scratch,'out-'+theme);const result=spawnSync(path.resolve('node_modules/.bin/astro'),['build'],{cwd:scratch,env:{...process.env,STOREFRONT_CONTENT_ROOT:sample,STOREFRONT_EDITION:'seller',STOREFRONT_SELLER_THEME:theme,STOREFRONT_OUTPUT_DIR:out},encoding:'utf8'});assert.equal(result.status,0,result.stderr);return out;};
  const neutral=build('neutral'), alternate=build('alternate'), fixture=build('fixture');
  const read=(root,rel)=>fs.readFileSync(path.join(root,rel,'index.html'),'utf8');
  const assets=root=>{const dir=path.join(root,'_astro');return read(root,'')+(fs.existsSync(dir)?fs.readdirSync(dir).filter(x=>x.endsWith('.css')).map(x=>fs.readFileSync(path.join(dir,x),'utf8')).join(''):'');};
  assert.match(assets(neutral),/theme-identity-neutral/);assert.doesNotMatch(assets(neutral),/theme-identity-alternate/);assert.match(assets(alternate),/theme-identity-alternate/);assert.doesNotMatch(assets(alternate),/theme-identity-neutral/);assert.match(assets(fixture),/fixture-theme-proof/);
  for(const rel of ['practices/northstar-operations','practices/northstar-operations/offerings/service-blueprint']){
   const a=read(neutral,rel),b=read(alternate,rel);const main=s=>s.match(/<main[^>]*>([\s\S]*?)<\/main>/)[1];
   const tokens=s=>main(s).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().split(' ').sort();
   assert.deepEqual(tokens(a),tokens(b));
   if(rel.endsWith('service-blueprint')){assert.ok(a.indexOf('How to sell it')>a.indexOf('Outcomes'));assert.ok(b.indexOf('How to sell it')<b.indexOf('Outcomes'));}else{assert.ok(a.indexOf('<h2>Offerings')<a.indexOf('<h2>Plays'));assert.ok(b.indexOf('<h2>Offerings')>b.indexOf('<h2>Plays'));}
  }
 } finally {fs.rmSync(scratch,{recursive:true,force:true});}
});

test('edition outputs contain only their configured theme and usable library controls',()=>{
 for(const [edition,selected] of [['seller',process.env.STOREFRONT_SELLER_THEME||'neutral'],['org-wide',process.env.STOREFRONT_ORG_THEME||'neutral']]){
  const root=path.resolve('dist',edition);const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  if(['neutral','alternate'].includes(selected)){assert.match(html,new RegExp(`theme-identity-${selected}`));assert.doesNotMatch(html,new RegExp(`theme-identity-${selected==='neutral'?'alternate':'neutral'}`));}
  const library=fs.readFileSync(path.join(root,'practices/northstar-operations/library/index.html'),'utf8');assert.match(library,/type="checkbox" name="kind"/);assert.doesNotMatch(library,/<select[^>]*multiple/);
  const offering=fs.readFileSync(path.join(root,'practices/northstar-operations/offerings/service-blueprint/index.html'),'utf8');if(edition==='seller')assert.match(offering,/<h2>How to sell it<\/h2>\s*<div[^>]*><h3/);
 }
});
