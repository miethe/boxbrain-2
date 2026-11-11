import {items, lookup, url} from './site.mjs';
/** @returns {import('./view-models').PageViewModel} */
export function viewModel(kind, p, o, redirect) {
 const owned=type=>items.filter(x=>x.practice_id===p?.id && x.type===type);
 const ordered=ids=>ids.map(lookup).filter(Boolean);
 const links=arr=>arr.map(x=>({title:x.title,url:url(x)}));
 const list=kind==='offerings'?ordered(p.offering_ids):kind==='plays'?ordered(p.play_ids):kind==='library'?owned('collateral'):[];
 const related=o?.type==='offering'?owned('collateral').filter(x=>x.offering_ids.includes(o.id)):[];
 const relatedPlays=o?.type==='offering'?owned('play').filter(x=>x.offering_ids.includes(o.id)):[];
 const title=o?.title || (kind==='redirect'?'Page moved':kind==='home'?p.title:kind==='index'?'Practices':kind[0].toUpperCase()+kind.slice(1));
 return {kind,p,o,redirect,title,items,list,related,relatedPlays,ordered,links,lookup,url,slots:{doorway:kind==='home'?p.situations:[],howToSell:o?.type==='offering'?o.guide:null,evidence:kind==='home'?ordered(p.featured_collateral_ids):related}};
}
