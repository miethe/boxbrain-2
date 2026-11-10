"""M0 design-fixture audit only; not the future storefront validator."""
from pathlib import Path
from collections import Counter
from datetime import date
import json,re,struct
root=Path(__file__).resolve().parents[1]
p=root/'sample-practice/northstar-operations'
registry={}; guides=[]; bodies={}
common={'schema_version','type','id','slug','title','summary','audience','status','owner','reviewed_on','reviewed_by','tags'}
extra={'practice':{'key','tagline','offering_ids','play_ids','featured_collateral_ids','situations'},'offering':{'practice_id','outcomes','good_fit','not_fit','alternative_offering_ids','seller_guide'},'play':{'practice_id','trigger','offering_ids','stages'},'collateral':{'practice_id','kind','offering_ids','format','source','rights'}}
headings={'practice':['About','Who we help'],'offering':['What it is','What it entails','Examples'],'play':['Intent','Boundaries'],'collateral':['Use','Limits'],'seller-guide':['Listen for','Ask','Position','Avoid promising','Next step']}
files=sorted(p.rglob('*.md'))
for f in files:
 s=f.read_text()
 if not s.startswith('---\n'):continue
 _,front,body=s.split('---',2);d=json.loads(front);kind=d['type']
 assert d['schema_version']==1 and d['status']=='approved',f
 assert d['audience'] in {'seller-only','org-wide'},f
 assert date.fromisoformat(d['reviewed_on'])<=date(2026,11,10) and d['reviewed_by'],f
 for heading in headings[kind]:assert '## '+heading+'\n' in body,(f,heading)
 assert not re.search(r'<script|javascript:|<iframe',body,re.I),f
 if kind=='seller-guide':
  assert set(d)=={'schema_version','type','offering_id','audience','status','reviewed_on','reviewed_by'} and d['audience']=='seller-only',f
  guides.append((f,d));continue
 assert common|extra[kind] <= set(d),f
 assert set(d)<=common|extra[kind]|{'asset_path','external_url','aliases','governance'},f
 assert re.fullmatch(r'bb:northstar:'+kind+r':\d{3}',d['id']),f
 assert d['id'] not in registry,f
 assert re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*',d['slug']),f
 assert 0<len(d['title'])<=100 and 0<len(d['summary'])<=240,f
 assert isinstance(d['tags'],list),f
 registry[d['id']]=d;bodies[d['id']]=body
counts=Counter(d['type'] for d in registry.values())
assert counts=={'practice':1,'offering':3,'play':2,'collateral':6},counts
practice=next(d for d in registry.values() if d['type']=='practice');pid=practice['id']
assert practice['key']=='northstar'
for kind,field in [('offering','offering_ids'),('play','play_ids')]:
 assert set(practice[field])=={d['id'] for d in registry.values() if d['type']==kind}
assets=[]
for identity,d in registry.items():
 if d['type']!='practice':assert d['practice_id']==pid,identity
 refs=[]
 for key,kind in [('offering_ids','offering'),('alternative_offering_ids','offering'),('play_ids','play'),('featured_collateral_ids','collateral')]:
  values=d.get(key,[]);assert len(values)==len(set(values)),(identity,key)
  refs.extend((r,kind) for r in values)
 if d['type']=='practice':
  assert len({x['key'] for x in d['situations']})==len(d['situations'])
  for x in d['situations']:
   assert set(x)=={'key','label','offering_id','play_id','collateral_id'}
   refs.extend((x[k],t) for k,t in [('offering_id','offering'),('play_id','play'),('collateral_id','collateral')] if x[k])
 if d['type']=='play':
  assert d['stages'] and len({s['key'] for s in d['stages']})==len(d['stages'])
  for stage in d['stages']:
   assert set(stage)=={'key','title','action','exit_criterion','collateral_ids'}
   assert all(stage[k] for k in ['key','title','action','exit_criterion'])
   refs.extend((r,'collateral') for r in stage['collateral_ids'])
 if d['type']=='offering':
  assert all(isinstance(d[k],list) and d[k] for k in ['outcomes','good_fit','not_fit'])
  guide=p/d['seller_guide'];assert guide.is_file() and guide.resolve().is_relative_to(p.resolve())
  assert any(g==guide and x['offering_id']==identity for g,x in guides)
 if d['type']=='collateral':
  assert ('asset_path' in d)^('external_url' in d),identity
  assert set(d['source'])=={'origin','locator','captured_on'}
  assert date.fromisoformat(d['source']['captured_on'])<=date(2026,11,10)
  if d['kind']=='external-link':assert d['external_url']=='https://example.org/' and d['rights']=='link-only' and d['format']=='html'
  else:
   assert d['kind'] in {'deck','case-study','white-paper','one-pager'} and d['format']=='markdown'
   asset=p/d['asset_path'];assert asset.is_file() and asset.resolve().is_relative_to(p.resolve())
   assert d['asset_path'].startswith('assets/'+d['audience']+'/') and len(asset.read_text())>200
   assets.append(asset)
 for target,kind in refs:assert target in registry and registry[target]['type']==kind,(identity,target)
assert len(guides)==3 and len(assets)==5
assert set(assets)==set((p/'assets').rglob('*.md'))
assert {d['kind'] for d in registry.values() if d['type']=='collateral'}=={'deck','case-study','white-paper','one-pager','external-link'}
# Check the specification's object-level audience projection, not a rendered build.
org={k:d for k,d in registry.items() if d['audience']=='org-wide'}
assert len(org)==8 and len(registry)==12
assert Counter(d['type'] for d in org.values())=={'practice':1,'offering':3,'collateral':4}
assert sum('asset_path' in d for d in org.values())==3
for f in root.rglob('*.md'):
 for link in re.findall(r'\]\(([^)]+)\)',f.read_text()):
  if not link.startswith(('https://','http://','#')):assert (f.parent/link.split('#')[0]).exists(),(f,link)
images=sorted((root/'mockups').glob('*.png'));assert len(images)==6
for f in images:
 b=f.read_bytes();assert b[:8]==b'\x89PNG\r\n\x1a\n' and struct.unpack('>II',b[16:24])==(1600,1000),f
print('PASS: 12 catalog objects (1 Practice, 3 Offerings, 2 Plays, 6 Collateral); 3 seller guides; 5 complete local assets; 1 external link.')
print('PASS: frontmatter fields, headings, review dates, IDs, relation types, curation coverage, stages, guide/asset paths and Markdown links.')
print('PASS: object projection = seller 12 / org-wide 8; local assets = seller 5 / org-wide 3; all five collateral kinds represented.')
print('PASS: 6 PNG headers verified at 1600x1000. Raster inspection is recorded separately in OPTIONS.md.')
